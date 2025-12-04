/**
 * Polyshed Indexer - Main Worker Entry Point
 * 
 * Real-time whale tracking and market indexing service
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { swaggerUI } from '@hono/swagger-ui'
import { WhaleTrackerDO } from './durable-objects/WhaleTrackerDO.js'

// Controllers
import whaleController from './controllers/whaleController.js'
import marketController from './controllers/marketController.js'
import indexingController from './controllers/indexingController.js'
import websocketController from './controllers/websocketController.js'

// Services
import { WhaleTrackerService } from './services/WhaleTrackerService.js'
import { MarketService } from './services/MarketService.js'
import { MetricsService } from './services/MetricsService.js'

// OpenAPI
import { openApiSpec } from './openapi.js'

// Initialize database schema
async function initializeDatabase(db) {
  try {
    // Check if tables exist
    const result = await db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all().catch(e => {
      console.error('Schema check failed:', e);
      return null;
    });
    
    // If no tables exist, initialize them
    if (!result || result.results.length === 0) {
      console.log('Initializing database schema...');
      
      // Read schema from file
      const schemaPath = new URL('../schema.sql', import.meta.url);
      let schema;
      try {
        const response = await fetch(schemaPath.href);
        schema = await response.text();
      } catch (e) {
        // If we can't load from file, use inline schema
        console.log('Loading schema from inline definition...');
        schema = INLINE_SCHEMA;
      }
      
      // Execute schema statements one by one
      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('--'));
      
      let createdCount = 0;
      for (const stmt of statements) {
        try {
          await db.prepare(stmt).run();
          createdCount++;
        } catch (e) {
          // Log but continue - some statements may fail due to IF NOT EXISTS
          console.debug(`Skipped: ${e.message.substring(0, 50)}...`);
        }
      }
      console.log(`Database schema initialized (${createdCount} statements executed)`);
    }
  } catch (error) {
    console.error('Failed to initialize database:', error.message);
  }
}

// Inline schema definition as fallback
const INLINE_SCHEMA = `
-- Polyshed Indexer Database Schema
-- Complete D1 schema for whale tracking and market indexing

-- ============================================================================
-- WHALE TRACKING TABLES
-- ============================================================================

-- Core whale registry
CREATE TABLE IF NOT EXISTS whales (
    wallet_address TEXT PRIMARY KEY,
    display_name TEXT,
    total_volume REAL DEFAULT 0,
    total_pnl REAL DEFAULT 0,
    total_roi REAL DEFAULT 0,
    win_rate REAL DEFAULT 0,
    sharpe_ratio REAL DEFAULT 0,
    active_positions_count INTEGER DEFAULT 0,
    total_trades INTEGER DEFAULT 0,
    first_seen_at INTEGER NOT NULL,
    last_activity_at INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    tracking_enabled BOOLEAN DEFAULT 1,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_whales_last_activity ON whales(last_activity_at DESC);
CREATE INDEX IF NOT EXISTS idx_whales_volume ON whales(total_volume DESC);
CREATE INDEX IF NOT EXISTS idx_whales_roi ON whales(total_roi DESC);
CREATE INDEX IF NOT EXISTS idx_whales_tracking ON whales(tracking_enabled) WHERE tracking_enabled = 1;

-- Whale trades
CREATE TABLE IF NOT EXISTS whale_trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    market_id TEXT NOT NULL,
    outcome TEXT,
    order_id TEXT UNIQUE,
    size_number REAL,
    price REAL,
    side TEXT,
    pnl REAL,
    roi REAL,
    traded_at INTEGER NOT NULL,
    order_type TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (wallet_address) REFERENCES whales(wallet_address) ON DELETE CASCADE,
    FOREIGN KEY (market_id) REFERENCES markets(market_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_whale_trades_wallet ON whale_trades(wallet_address, traded_at DESC);
CREATE INDEX IF NOT EXISTS idx_whale_trades_market ON whale_trades(market_id);
CREATE INDEX IF NOT EXISTS idx_whale_trades_time ON whale_trades(traded_at DESC);

-- Positions
CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    market_id TEXT NOT NULL,
    outcome TEXT,
    size REAL DEFAULT 0,
    entry_price REAL,
    current_price REAL,
    pnl REAL DEFAULT 0,
    roi REAL DEFAULT 0,
    position_created_at INTEGER,
    last_updated_at INTEGER DEFAULT (unixepoch()),
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (wallet_address) REFERENCES whales(wallet_address) ON DELETE CASCADE,
    FOREIGN KEY (market_id) REFERENCES markets(market_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_positions_wallet ON positions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_positions_market ON positions(market_id);
CREATE INDEX IF NOT EXISTS idx_positions_updated ON positions(last_updated_at DESC);

-- ============================================================================
-- MARKET TABLES
-- ============================================================================

-- Markets registry
CREATE TABLE IF NOT EXISTS markets (
    market_id TEXT PRIMARY KEY,
    question TEXT NOT NULL,
    description TEXT,
    outcome_type TEXT,
    outcomes TEXT,
    initial_probability REAL,
    current_probability REAL,
    volume_num REAL DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    is_active BOOLEAN DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_markets_volume ON markets(volume_num DESC);
CREATE INDEX IF NOT EXISTS idx_markets_updated ON markets(updated_at DESC);

-- Market snapshots
CREATE TABLE IF NOT EXISTS market_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    market_id TEXT NOT NULL,
    liquidity REAL,
    volume_24h REAL,
    volume_7d REAL,
    yes_price REAL,
    no_price REAL,
    timestamp INTEGER DEFAULT (unixepoch()),
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (market_id) REFERENCES markets(market_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_market_snapshots_market ON market_snapshots(market_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_market_snapshots_time ON market_snapshots(timestamp DESC);

-- ============================================================================
-- TRADE DATA TABLES
-- ============================================================================

-- All trades
CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    market_id TEXT NOT NULL,
    wallet_address TEXT,
    order_id TEXT UNIQUE,
    side TEXT,
    size_number REAL,
    price REAL,
    pnl REAL,
    roi REAL,
    traded_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (market_id) REFERENCES markets(market_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_trades_market ON trades(market_id);
CREATE INDEX IF NOT EXISTS idx_trades_wallet ON trades(wallet_address);
CREATE INDEX IF NOT EXISTS idx_trades_time ON trades(traded_at DESC);

-- Events
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    wallet_address TEXT,
    market_id TEXT,
    data TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (wallet_address) REFERENCES whales(wallet_address) ON DELETE CASCADE,
    FOREIGN KEY (market_id) REFERENCES markets(market_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_events_wallet ON events(wallet_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_market ON events(market_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);

-- ============================================================================
-- INDEXING STATUS TABLES
-- ============================================================================

-- Indexing log
CREATE TABLE IF NOT EXISTS indexing_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_type TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    started_at INTEGER,
    completed_at INTEGER,
    details TEXT,
    error_message TEXT,
    created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_indexing_log_type ON indexing_log(job_type);
CREATE INDEX IF NOT EXISTS idx_indexing_log_status ON indexing_log(status);
CREATE INDEX IF NOT EXISTS idx_indexing_log_time ON indexing_log(created_at DESC);

-- ============================================================================
-- METRICS TABLES
-- ============================================================================

-- Hourly metrics
CREATE TABLE IF NOT EXISTS hourly_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    hour_start INTEGER NOT NULL,
    trades INTEGER DEFAULT 0,
    volume REAL DEFAULT 0,
    pnl REAL DEFAULT 0,
    roi REAL DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (wallet_address) REFERENCES whales(wallet_address) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_hourly_metrics_wallet ON hourly_metrics(wallet_address, hour_start DESC);

-- Daily metrics
CREATE TABLE IF NOT EXISTS daily_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    day_start INTEGER NOT NULL,
    trades INTEGER DEFAULT 0,
    volume REAL DEFAULT 0,
    pnl REAL DEFAULT 0,
    roi REAL DEFAULT 0,
    win_rate REAL DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (wallet_address) REFERENCES whales(wallet_address) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_wallet ON daily_metrics(wallet_address, day_start DESC);

-- Weekly metrics
CREATE TABLE IF NOT EXISTS weekly_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    week_start INTEGER NOT NULL,
    trades INTEGER DEFAULT 0,
    volume REAL DEFAULT 0,
    pnl REAL DEFAULT 0,
    roi REAL DEFAULT 0,
    win_rate REAL DEFAULT 0,
    sharpe_ratio REAL DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (wallet_address) REFERENCES whales(wallet_address) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_weekly_metrics_wallet ON weekly_metrics(wallet_address, week_start DESC);

-- Monthly metrics
CREATE TABLE IF NOT EXISTS monthly_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    month_start INTEGER NOT NULL,
    trades INTEGER DEFAULT 0,
    volume REAL DEFAULT 0,
    pnl REAL DEFAULT 0,
    roi REAL DEFAULT 0,
    win_rate REAL DEFAULT 0,
    sharpe_ratio REAL DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (wallet_address) REFERENCES whales(wallet_address) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_monthly_metrics_wallet ON monthly_metrics(wallet_address, month_start DESC);
`;

      // Execute schema
      const statements = schema.split(';').filter(s => s.trim());
      for (const stmt of statements) {
        if (stmt.trim()) {
          try {
            // Use prepare().run() for D1, not db.exec()
            await db.prepare(stmt).run()
          } catch (e) {
            // Some statements may fail (e.g., index creation if it already exists)
            // This is OK - we're creating IF NOT EXISTS anyway
            console.debug(`Schema statement skipped: ${e.message.substring(0, 50)}...`)
          }
        }
      }
      console.log('Database schema initialized successfully')
    }
  } catch (error) {
    console.error('Failed to initialize database:', error)
  }
}

const app = new Hono()

// Security middleware - Only accept requests from service binding or cron
app.use('/*', async (c, next) => {
  // Allow cron triggers
  const isCron = c.req.header('cf-cron')
  if (isCron) {
    return await next()
  }
  
  // Allow localhost/local development requests
  const url = new URL(c.req.url)
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    return await next()
  }
  
  // For service bindings, Cloudflare doesn't add cf-connecting-ip header
  // Public internet requests ALWAYS have cf-connecting-ip
  const cfConnecting = c.req.header('cf-connecting-ip')
  const cfRay = c.req.header('cf-ray')
  
  // If request has cf-connecting-ip, it's from the public internet - block it
  if (cfConnecting) {
    return c.json({ 
      error: 'Forbidden',
      message: 'This service is only accessible via service binding'
    }, 403)
  }
  
  // Additional check: service binding requests should not have cf-ray from internet
  // but should have it from Cloudflare internal routing
  await next()
})

// CORS middleware (for service binding requests)
app.use('/*', cors())

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'polyshed-indexer',
    timestamp: Date.now()
  })
})

// Swagger UI Documentation
app.get('/docs', swaggerUI({ url: '/openapi.json' }))

// OpenAPI spec endpoint
app.get('/openapi.json', (c) => {
  return c.json(openApiSpec)
})

// API routes
app.route('/api/whales', whaleController)
app.route('/api/markets', marketController)
app.route('/api/index', indexingController)

// WebSocket endpoint
app.get('/ws', websocketController.connect)

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404)
})

// Error handler
app.onError((err, c) => {
  console.error('Worker error:', err)
  return c.json({
    error: 'Internal server error',
    message: err.message
  }, 500)
})

export default {
  /**
   * Fetch handler for HTTP requests
   */
  async fetch(request, env, ctx) {
    // Initialize database on first request
    await initializeDatabase(env.DB)
    return app.fetch(request, env, ctx)
  },

  /**
   * Scheduled handler for cron triggers
   */
  async scheduled(event, env, ctx) {
    // Initialize database on first scheduled run
    await initializeDatabase(env.DB)
    const cron = event.cron
    console.log(`Cron triggered: ${cron}`)

    try {
      switch (cron) {
        case '*/5 * * * *': // Every 5 minutes
          await handleQuickUpdate(env, ctx)
          break
        
        case '*/15 * * * *': // Every 15 minutes
          await handleMarketSnapshots(env, ctx)
          break
        
        case '*/30 * * * *': // Every 30 minutes - Default indexing schedule
          // Run whale update and market snapshots on 30-minute cycle
          await handleQuickUpdate(env, ctx)
          await handleMarketSnapshots(env, ctx)
          break
        
        case '0 * * * *': // Every hour
          await handleHourlyMetrics(env, ctx)
          break
        
        case '0 0 * * *': // Daily
          await handleDailyTasks(env, ctx)
          break
        
        default:
          console.log(`Unknown cron pattern: ${cron}, skipping handler`)
      }
    } catch (error) {
      console.error('Cron job error:', error)
    }
  }
}

/**
 * Quick update: Fetch latest trades for active whales
 */
async function handleQuickUpdate(env, ctx) {
  console.log('Running quick whale update...')
  const whaleService = new WhaleTrackerService(env)
  
  try {
    const result = await whaleService.updateActiveWhales()
    console.log(`Quick update completed: ${result.processed} whales, ${result.newTrades} new trades`)
  } catch (error) {
    console.error('Quick update failed:', error)
  }
}

/**
 * Market snapshots: Capture current prices and volumes
 */
async function handleMarketSnapshots(env, ctx) {
  console.log('Capturing market snapshots...')
  const marketService = new MarketService(env)
  
  try {
    const result = await marketService.captureSnapshots()
    console.log(`Market snapshots completed: ${result.markets} markets, ${result.snapshots} snapshots`)
  } catch (error) {
    console.error('Market snapshots failed:', error)
  }
}

/**
 * Hourly metrics: Calculate performance metrics
 */
async function handleHourlyMetrics(env, ctx) {
  console.log('Calculating hourly metrics...')
  const metricsService = new MetricsService(env)
  
  try {
    const result = await metricsService.calculateHourlyMetrics()
    console.log(`Hourly metrics completed: ${result.whales} whales processed`)
  } catch (error) {
    console.error('Hourly metrics failed:', error)
  }
}

/**
 * Daily tasks: Rollups, cleanup, full reindex if needed
 */
async function handleDailyTasks(env, ctx) {
  console.log('Running daily tasks...')
  const metricsService = new MetricsService(env)
  
  try {
    // Generate daily rollups
    await metricsService.generateDailyRollups()
    
    // Generate weekly/monthly rollups if needed
    await metricsService.generateWeeklyRollups()
    await metricsService.generateMonthlyRollups()
    
    // Cleanup old data
    await metricsService.cleanupOldData()
    
    console.log('Daily tasks completed')
  } catch (error) {
    console.error('Daily tasks failed:', error)
  }
}

// Export Durable Object
export { WhaleTrackerDO }
