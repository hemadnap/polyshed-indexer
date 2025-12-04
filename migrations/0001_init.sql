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

CREATE INDEX idx_whales_last_activity ON whales(last_activity_at DESC);
CREATE INDEX idx_whales_volume ON whales(total_volume DESC);
CREATE INDEX idx_whales_roi ON whales(total_roi DESC);
CREATE INDEX idx_whales_tracking ON whales(tracking_enabled) WHERE tracking_enabled = 1;

-- Whale metadata and tags
CREATE TABLE IF NOT EXISTS whale_metadata (
    wallet_address TEXT PRIMARY KEY,
    bio TEXT,
    twitter_handle TEXT,
    telegram_handle TEXT,
    avatar_url TEXT,
    tags TEXT, -- JSON array of tags
    notes TEXT,
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (wallet_address) REFERENCES whales(wallet_address) ON DELETE CASCADE
);

-- ============================================================================
-- MARKET TABLES
-- ============================================================================

-- Markets registry
CREATE TABLE IF NOT EXISTS markets (
    condition_id TEXT PRIMARY KEY,
    market_slug TEXT UNIQUE,
    question TEXT NOT NULL,
    description TEXT,
    category TEXT,
    end_date INTEGER,
    is_active BOOLEAN DEFAULT 1,
    total_volume REAL DEFAULT 0,
    total_liquidity REAL DEFAULT 0,
    outcomes TEXT NOT NULL, -- JSON array of outcomes
    created_at INTEGER DEFAULT (unixepoch()),
    updated_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_markets_active ON markets(is_active) WHERE is_active = 1;
CREATE INDEX idx_markets_category ON markets(category);
CREATE INDEX idx_markets_volume ON markets(total_volume DESC);

-- Market snapshots for historical data
CREATE TABLE IF NOT EXISTS market_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    condition_id TEXT NOT NULL,
    outcome_index INTEGER NOT NULL,
    price REAL NOT NULL,
    volume_24h REAL DEFAULT 0,
    liquidity REAL DEFAULT 0,
    snapshot_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (condition_id) REFERENCES markets(condition_id) ON DELETE CASCADE
);

CREATE INDEX idx_market_snapshots_condition ON market_snapshots(condition_id, snapshot_at DESC);
CREATE INDEX idx_market_snapshots_time ON market_snapshots(snapshot_at DESC);

-- ============================================================================
-- TRADE & POSITION TABLES
-- ============================================================================

-- All trades (raw data)
CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    condition_id TEXT NOT NULL,
    outcome_index INTEGER NOT NULL,
    side TEXT NOT NULL, -- BUY or SELL
    size REAL NOT NULL,
    price REAL NOT NULL,
    value REAL NOT NULL,
    fee REAL DEFAULT 0,
    transaction_hash TEXT,
    block_number INTEGER,
    traded_at INTEGER NOT NULL,
    indexed_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (wallet_address) REFERENCES whales(wallet_address) ON DELETE CASCADE,
    FOREIGN KEY (condition_id) REFERENCES markets(condition_id) ON DELETE CASCADE
);

CREATE INDEX idx_trades_wallet ON trades(wallet_address, traded_at DESC);
CREATE INDEX idx_trades_market ON trades(condition_id, traded_at DESC);
CREATE INDEX idx_trades_time ON trades(traded_at DESC);
CREATE INDEX idx_trades_indexed ON trades(indexed_at DESC);

-- Open positions (current holdings)
CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    condition_id TEXT NOT NULL,
    outcome_index INTEGER NOT NULL,
    size REAL NOT NULL,
    avg_entry_price REAL NOT NULL,
    total_invested REAL NOT NULL,
    current_price REAL NOT NULL,
    current_value REAL NOT NULL,
    unrealized_pnl REAL NOT NULL,
    unrealized_roi REAL NOT NULL,
    opened_at INTEGER NOT NULL,
    last_updated_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(wallet_address, condition_id, outcome_index),
    FOREIGN KEY (wallet_address) REFERENCES whales(wallet_address) ON DELETE CASCADE,
    FOREIGN KEY (condition_id) REFERENCES markets(condition_id) ON DELETE CASCADE
);

CREATE INDEX idx_positions_wallet ON positions(wallet_address);
CREATE INDEX idx_positions_market ON positions(condition_id);
CREATE INDEX idx_positions_value ON positions(current_value DESC);
CREATE INDEX idx_positions_pnl ON positions(unrealized_pnl DESC);

-- Closed positions (historical)
CREATE TABLE IF NOT EXISTS closed_positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    condition_id TEXT NOT NULL,
    outcome_index INTEGER NOT NULL,
    size REAL NOT NULL,
    avg_entry_price REAL NOT NULL,
    avg_exit_price REAL NOT NULL,
    total_invested REAL NOT NULL,
    total_returned REAL NOT NULL,
    realized_pnl REAL NOT NULL,
    realized_roi REAL NOT NULL,
    opened_at INTEGER NOT NULL,
    closed_at INTEGER NOT NULL,
    hold_duration INTEGER NOT NULL, -- seconds
    FOREIGN KEY (wallet_address) REFERENCES whales(wallet_address) ON DELETE CASCADE,
    FOREIGN KEY (condition_id) REFERENCES markets(condition_id) ON DELETE CASCADE
);

CREATE INDEX idx_closed_positions_wallet ON closed_positions(wallet_address, closed_at DESC);
CREATE INDEX idx_closed_positions_market ON closed_positions(condition_id);
CREATE INDEX idx_closed_positions_pnl ON closed_positions(realized_pnl DESC);
CREATE INDEX idx_closed_positions_roi ON closed_positions(realized_roi DESC);

-- ============================================================================
-- PERFORMANCE METRICS TABLES
-- ============================================================================

-- Daily metrics snapshots
CREATE TABLE IF NOT EXISTS whale_metrics_daily (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD
    trades_count INTEGER DEFAULT 0,
    volume REAL DEFAULT 0,
    realized_pnl REAL DEFAULT 0,
    unrealized_pnl REAL DEFAULT 0,
    total_pnl REAL DEFAULT 0,
    roi REAL DEFAULT 0,
    win_rate REAL DEFAULT 0,
    avg_hold_time INTEGER DEFAULT 0,
    largest_win REAL DEFAULT 0,
    largest_loss REAL DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(wallet_address, date),
    FOREIGN KEY (wallet_address) REFERENCES whales(wallet_address) ON DELETE CASCADE
);

CREATE INDEX idx_metrics_daily_wallet ON whale_metrics_daily(wallet_address, date DESC);
CREATE INDEX idx_metrics_daily_date ON whale_metrics_daily(date DESC);

-- Weekly metrics rollup
CREATE TABLE IF NOT EXISTS whale_metrics_weekly (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    week_start TEXT NOT NULL, -- YYYY-MM-DD (Monday)
    trades_count INTEGER DEFAULT 0,
    volume REAL DEFAULT 0,
    realized_pnl REAL DEFAULT 0,
    total_pnl REAL DEFAULT 0,
    roi REAL DEFAULT 0,
    win_rate REAL DEFAULT 0,
    sharpe_ratio REAL DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(wallet_address, week_start),
    FOREIGN KEY (wallet_address) REFERENCES whales(wallet_address) ON DELETE CASCADE
);

CREATE INDEX idx_metrics_weekly_wallet ON whale_metrics_weekly(wallet_address, week_start DESC);

-- Monthly metrics rollup
CREATE TABLE IF NOT EXISTS whale_metrics_monthly (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    month TEXT NOT NULL, -- YYYY-MM
    trades_count INTEGER DEFAULT 0,
    volume REAL DEFAULT 0,
    realized_pnl REAL DEFAULT 0,
    total_pnl REAL DEFAULT 0,
    roi REAL DEFAULT 0,
    win_rate REAL DEFAULT 0,
    sharpe_ratio REAL DEFAULT 0,
    max_drawdown REAL DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(wallet_address, month),
    FOREIGN KEY (wallet_address) REFERENCES whales(wallet_address) ON DELETE CASCADE
);

CREATE INDEX idx_metrics_monthly_wallet ON whale_metrics_monthly(wallet_address, month DESC);

-- ============================================================================
-- EVENT DETECTION TABLES
-- ============================================================================

-- Detected whale events
CREATE TABLE IF NOT EXISTS whale_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    condition_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- NEW_POSITION, REVERSAL, DOUBLE_DOWN, EXIT, LARGE_TRADE
    event_data TEXT, -- JSON with event-specific data
    severity TEXT DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, CRITICAL
    detected_at INTEGER NOT NULL,
    notified BOOLEAN DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (wallet_address) REFERENCES whales(wallet_address) ON DELETE CASCADE,
    FOREIGN KEY (condition_id) REFERENCES markets(condition_id) ON DELETE CASCADE
);

CREATE INDEX idx_whale_events_wallet ON whale_events(wallet_address, detected_at DESC);
CREATE INDEX idx_whale_events_type ON whale_events(event_type, detected_at DESC);
CREATE INDEX idx_whale_events_severity ON whale_events(severity, detected_at DESC);
CREATE INDEX idx_whale_events_notified ON whale_events(notified) WHERE notified = 0;

-- ============================================================================
-- INDEXING SYSTEM TABLES
-- ============================================================================

-- Indexing queue
CREATE TABLE IF NOT EXISTS indexing_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT NOT NULL,
    priority INTEGER DEFAULT 0, -- Higher = more important
    status TEXT DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    scheduled_at INTEGER NOT NULL,
    started_at INTEGER,
    completed_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (wallet_address) REFERENCES whales(wallet_address) ON DELETE CASCADE
);

CREATE INDEX idx_indexing_queue_status ON indexing_queue(status, priority DESC);
CREATE INDEX idx_indexing_queue_scheduled ON indexing_queue(scheduled_at);

-- Indexing status tracker
CREATE TABLE IF NOT EXISTS indexing_status (
    wallet_address TEXT PRIMARY KEY,
    last_indexed_at INTEGER NOT NULL,
    last_trade_id TEXT,
    total_trades_indexed INTEGER DEFAULT 0,
    is_indexing BOOLEAN DEFAULT 0,
    indexing_progress REAL DEFAULT 0, -- 0 to 1
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    updated_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (wallet_address) REFERENCES whales(wallet_address) ON DELETE CASCADE
);

CREATE INDEX idx_indexing_status_last_indexed ON indexing_status(last_indexed_at);
CREATE INDEX idx_indexing_status_active ON indexing_status(is_indexing) WHERE is_indexing = 1;

-- System-wide indexing log
CREATE TABLE IF NOT EXISTS indexing_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_type TEXT NOT NULL, -- WHALE_UPDATE, MARKET_SNAPSHOT, METRICS_CALC, FULL_REINDEX
    status TEXT NOT NULL, -- STARTED, COMPLETED, FAILED
    records_processed INTEGER DEFAULT 0,
    duration_ms INTEGER,
    error_message TEXT,
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX idx_indexing_log_type ON indexing_log(job_type, started_at DESC);
CREATE INDEX idx_indexing_log_status ON indexing_log(status, started_at DESC);
