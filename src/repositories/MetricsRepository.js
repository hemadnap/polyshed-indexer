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
}
