/**
 * Repository for whale metrics database operations
 */
export class MetricsRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Insert or update metrics for a whale
   */
  async upsertMetrics(metrics) {
    const stmt = this.db.prepare(`
      INSERT INTO whale_metrics (
        whale_address, total_volume, trade_count, win_rate,
        avg_position_size, largest_position, total_pnl,
        active_positions, last_trade_time, last_calculated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(whale_address)
      DO UPDATE SET
        total_volume = excluded.total_volume,
        trade_count = excluded.trade_count,
        win_rate = excluded.win_rate,
        avg_position_size = excluded.avg_position_size,
        largest_position = excluded.largest_position,
        total_pnl = excluded.total_pnl,
        active_positions = excluded.active_positions,
        last_trade_time = excluded.last_trade_time,
        last_calculated = excluded.last_calculated
    `);

    await stmt.bind(
      metrics.whale_address,
      metrics.total_volume,
      metrics.trade_count,
      metrics.win_rate,
      metrics.avg_position_size,
      metrics.largest_position,
      metrics.total_pnl,
      metrics.active_positions,
      metrics.last_trade_time,
      metrics.last_calculated
    ).run();
  }

  /**
   * Get metrics for a specific whale
   */
  async getMetricsByWhale(whaleAddress) {
    const stmt = this.db.prepare(`
      SELECT * FROM whale_metrics
      WHERE whale_address = ?
    `);

    return await stmt.bind(whaleAddress).first();
  }

  /**
   * Get top whales by various metrics
   */
  async getTopWhales(metric = 'total_volume', limit = 50) {
    const validMetrics = ['total_volume', 'trade_count', 'win_rate', 'total_pnl', 'active_positions'];
    
    if (!validMetrics.includes(metric)) {
      metric = 'total_volume';
    }

    const stmt = this.db.prepare(`
      SELECT wm.*, w.label, w.tier
      FROM whale_metrics wm
      LEFT JOIN whales w ON wm.whale_address = w.address
      WHERE w.is_active = 1
      ORDER BY wm.${metric} DESC
      LIMIT ?
    `);

    const result = await stmt.bind(limit).all();
    return result.results || [];
  }

  /**
   * Get metrics for all whales
   */
  async getAllMetrics(limit = 100) {
    const stmt = this.db.prepare(`
      SELECT wm.*, w.label, w.tier
      FROM whale_metrics wm
      LEFT JOIN whales w ON wm.whale_address = w.address
      WHERE w.is_active = 1
      ORDER BY wm.total_volume DESC
      LIMIT ?
    `);

    const result = await stmt.bind(limit).all();
    return result.results || [];
  }

  /**
   * Get aggregate metrics across all whales
   */
  async getAggregateMetrics() {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total_whales,
        SUM(total_volume) as combined_volume,
        SUM(trade_count) as combined_trades,
        AVG(win_rate) as avg_win_rate,
        SUM(total_pnl) as combined_pnl,
        SUM(active_positions) as total_active_positions
      FROM whale_metrics wm
      LEFT JOIN whales w ON wm.whale_address = w.address
      WHERE w.is_active = 1
    `);

    return await stmt.first();
  }

  /**
   * Get metrics for whales that need recalculation
   */
  async getStaleMetrics(staleThresholdMs = 60 * 60 * 1000) {
    const cutoffTime = Date.now() - staleThresholdMs;
    
    const stmt = this.db.prepare(`
      SELECT wm.*, w.address
      FROM whale_metrics wm
      LEFT JOIN whales w ON wm.whale_address = w.address
      WHERE w.is_active = 1 AND wm.last_calculated < ?
      LIMIT 50
    `);

    const result = await stmt.bind(cutoffTime).all();
    return result.results || [];
  }

  /**
   * Update specific metric fields
   */
  async updateMetricField(whaleAddress, field, value) {
    const validFields = ['total_volume', 'trade_count', 'win_rate', 'avg_position_size', 
                        'largest_position', 'total_pnl', 'active_positions', 'last_trade_time'];
    
    if (!validFields.includes(field)) {
      throw new Error(`Invalid metric field: ${field}`);
    }

    const stmt = this.db.prepare(`
      UPDATE whale_metrics
      SET ${field} = ?, last_calculated = ?
      WHERE whale_address = ?
    `);

    await stmt.bind(value, Date.now(), whaleAddress).run();
  }

  /**
   * Get whale performance over time
   */
  async getWhalePerformance(whaleAddress, days = 30) {
    const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);

    const stmt = this.db.prepare(`
      SELECT
        DATE(timestamp / 1000, 'unixepoch') as date,
        COUNT(*) as trades,
        SUM(size * price) as volume,
        AVG(price) as avg_price
      FROM whale_trades
      WHERE whale_address = ? AND timestamp >= ?
      GROUP BY DATE(timestamp / 1000, 'unixepoch')
      ORDER BY date ASC
    `);

    const result = await stmt.bind(whaleAddress, startTime).all();
    return result.results || [];
  }

  /**
   * Find metrics by wallet (alias for findByWallet)
   */
  async findByWallet(walletAddress, period = 'daily', options = {}) {
    const { limit = 30 } = options;

    let table = 'whale_metrics_daily';
    let orderBy = 'date';

    if (period === 'weekly') {
      table = 'whale_metrics_weekly';
      orderBy = 'week_start';
    } else if (period === 'monthly') {
      table = 'whale_metrics_monthly';
      orderBy = 'month';
    }

    const stmt = this.db.prepare(`
      SELECT * FROM ${table}
      WHERE wallet_address = ?
      ORDER BY ${orderBy} DESC
      LIMIT ?
    `);

    const result = await stmt.bind(walletAddress, limit).all();
    return result.results || [];
  }

  /**
   * Find top whales by ROI
   */
  async findTopByRoi(options = {}) {
    const { limit = 10, minVolume = 0 } = options;

    const stmt = this.db.prepare(`
      SELECT w.*, m.total_roi, m.win_rate, m.sharpe_ratio
      FROM whales w
      LEFT JOIN whale_metrics_monthly m ON w.wallet_address = m.wallet_address
      WHERE w.total_volume >= ? AND w.is_active = 1
      ORDER BY w.total_roi DESC
      LIMIT ?
    `);

    const result = await stmt.bind(minVolume, limit).all();
    return result.results || [];
  }

  /**
   * Generate daily metrics for a wallet
   */
  async generateDailyMetrics(walletAddress, date) {
    // This would be called by MetricsService to create daily rollup
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO whale_metrics_daily (
        wallet_address, date, trades_count, volume, realized_pnl, total_pnl, roi, win_rate
      )
      SELECT
        wallet_address,
        ? as date,
        COUNT(*) as trades_count,
        SUM(value) as volume,
        SUM(CASE WHEN side = 'SELL' THEN value ELSE 0 END) as realized_pnl,
        0 as total_pnl,
        0 as roi,
        0 as win_rate
      FROM trades
      WHERE wallet_address = ?
        AND DATE(traded_at, 'unixepoch') = ?
      GROUP BY wallet_address
    `);

    await stmt.bind(date, walletAddress, date).run();
  }

  /**
   * Generate weekly metrics
   */
  async generateWeeklyMetrics(walletAddress, weekStart) {
    // Similar to daily but aggregates by week
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO whale_metrics_weekly (
        wallet_address, week_start, trades_count, volume, realized_pnl, total_pnl, roi, win_rate, sharpe_ratio
      )
      SELECT
        wallet_address,
        ? as week_start,
        SUM(trades_count) as trades_count,
        SUM(volume) as volume,
        SUM(realized_pnl) as realized_pnl,
        SUM(total_pnl) as total_pnl,
        AVG(roi) as roi,
        AVG(win_rate) as win_rate,
        AVG(CASE WHEN sharpe_ratio IS NOT NULL THEN sharpe_ratio ELSE 0 END) as sharpe_ratio
      FROM whale_metrics_daily
      WHERE wallet_address = ?
        AND date >= ?
        AND date < DATE(?, '+7 days')
      GROUP BY wallet_address
    `);

    await stmt.bind(weekStart, walletAddress, weekStart, weekStart).run();
  }

  /**
   * Generate monthly metrics
   */
  async generateMonthlyMetrics(walletAddress, month) {
    // Similar to weekly but aggregates by month
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO whale_metrics_monthly (
        wallet_address, month, trades_count, volume, realized_pnl, total_pnl, roi, win_rate, sharpe_ratio, max_drawdown
      )
      SELECT
        wallet_address,
        ? as month,
        SUM(trades_count) as trades_count,
        SUM(volume) as volume,
        SUM(realized_pnl) as realized_pnl,
        SUM(total_pnl) as total_pnl,
        AVG(roi) as roi,
        AVG(win_rate) as win_rate,
        AVG(CASE WHEN sharpe_ratio IS NOT NULL THEN sharpe_ratio ELSE 0 END) as sharpe_ratio,
        0 as max_drawdown
      FROM whale_metrics_daily
      WHERE wallet_address = ?
        AND date LIKE ? || '%'
      GROUP BY wallet_address
    `);

    await stmt.bind(month, walletAddress, month).run();
  }
}
