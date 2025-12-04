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

const app = new Hono()

// Security middleware - Only accept requests from service binding or cron
app.use('/*', async (c, next) => {
  // Allow cron triggers
  const isCron = c.req.header('cf-cron')
  if (isCron) {
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
    return app.fetch(request, env, ctx)
  },

  /**
   * Scheduled handler for cron triggers
   */
  async scheduled(event, env, ctx) {
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
