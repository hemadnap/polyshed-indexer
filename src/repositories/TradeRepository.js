/**
 * Repository for whale trades database operations
 */
export class TradeRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Insert a new trade
   */
  async insertTrade(trade) {
    const stmt = this.db.prepare(`
      INSERT INTO whale_trades (
        whale_address, market_id, outcome, side, size, price,
        timestamp, tx_hash, processed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await stmt.bind(
      trade.whale_address,
      trade.market_id,
      trade.outcome,
      trade.side,
      trade.size,
      trade.price,
      trade.timestamp,
      trade.tx_hash,
      trade.processed ? 1 : 0
    ).run();
  }

  /**
   * Get recent trades for a whale (alias for getRecentTradesByWhale)
   */
  async findByWallet(whaleAddress, options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    const stmt = this.db.prepare(`
      SELECT t.*, m.question as market_question
      FROM trades t
      LEFT JOIN markets m ON t.condition_id = m.condition_id
      WHERE t.wallet_address = ?
      ORDER BY t.traded_at DESC
      LIMIT ? OFFSET ?
    `);

    const result = await stmt.bind(whaleAddress, limit, offset).all();
    return result.results || [];
  }

  /**
   * Get recent trades for a whale
   */
  async getRecentTradesByWhale(whaleAddress, limit = 50) {
    const stmt = this.db.prepare(`
      SELECT * FROM whale_trades
      WHERE whale_address = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);

    const result = await stmt.bind(whaleAddress, limit).all();
    return result.results || [];
  }

  /**
   * Get recent trades for a market
   */
  async getRecentTradesByMarket(marketId, limit = 50) {
    const stmt = this.db.prepare(`
      SELECT wt.*, w.label as whale_label
      FROM whale_trades wt
      LEFT JOIN whales w ON wt.whale_address = w.address
      WHERE wt.market_id = ?
      ORDER BY wt.timestamp DESC
      LIMIT ?
    `);

    const result = await stmt.bind(marketId, limit).all();
    return result.results || [];
  }

  /**
   * Get all recent trades across all whales
   */
  async getRecentTrades(limit = 100) {
    const stmt = this.db.prepare(`
      SELECT wt.*, w.label as whale_label
      FROM whale_trades wt
      LEFT JOIN whales w ON wt.whale_address = w.address
      ORDER BY wt.timestamp DESC
      LIMIT ?
    `);

    const result = await stmt.bind(limit).all();
    return result.results || [];
  }

  /**
   * Get trade volume for a whale
   */
  async getWhaleTradeVolume(whaleAddress, startTime = null) {
    let query = `
      SELECT 
        COUNT(*) as trade_count,
        SUM(size * price) as total_volume
      FROM whale_trades
      WHERE whale_address = ?
    `;

    const bindings = [whaleAddress];

    if (startTime) {
      query += ' AND timestamp >= ?';
      bindings.push(startTime);
    }

    const stmt = this.db.prepare(query);
    const result = await stmt.bind(...bindings).first();
    
    return {
      trade_count: result?.trade_count || 0,
      total_volume: result?.total_volume || 0
    };
  }

  /**
   * Get trade by transaction hash
   */
  async getTradeByTxHash(txHash) {
    const stmt = this.db.prepare(`
      SELECT * FROM whale_trades
      WHERE tx_hash = ?
    `);

    return await stmt.bind(txHash).first();
  }

  /**
   * Mark trade as processed
   */
  async markTradeProcessed(txHash) {
    const stmt = this.db.prepare(`
      UPDATE whale_trades
      SET processed = 1
      WHERE tx_hash = ?
    `);

    await stmt.bind(txHash).run();
  }

  /**
   * Get unprocessed trades
   */
  async getUnprocessedTrades(limit = 100) {
    const stmt = this.db.prepare(`
      SELECT * FROM whale_trades
      WHERE processed = 0
      ORDER BY timestamp ASC
      LIMIT ?
    `);

    const result = await stmt.bind(limit).all();
    return result.results || [];
  }

  /**
   * Get trade statistics for a time period
   */
  async getTradeStats(startTime, endTime) {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(DISTINCT whale_address) as active_whales,
        COUNT(*) as total_trades,
        SUM(size * price) as total_volume,
        AVG(size * price) as avg_trade_size,
        COUNT(DISTINCT market_id) as markets_traded
      FROM whale_trades
      WHERE timestamp >= ? AND timestamp <= ?
    `);

    return await stmt.bind(startTime, endTime).first();
  }
}
