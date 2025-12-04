/**
 * Repository for whale trades database operations
 */
export class TradeRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Create a new trade
   */
  async create(trade) {
    const stmt = this.db.prepare(`
      INSERT INTO trades (
        id, wallet_address, condition_id, outcome_index, side, size, price, value, fee,
        transaction_hash, block_number, traded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    await stmt.bind(
      trade.id,
      trade.wallet_address,
      trade.condition_id,
      trade.outcome_index,
      trade.side,
      trade.size,
      trade.price,
      trade.value,
      trade.fee || 0,
      trade.transaction_hash,
      trade.block_number,
      trade.traded_at
    ).run();

    return trade;
  }

  /**
   * Insert a new trade (legacy alias)
   */
  async insertTrade(trade) {
    return this.create(trade);
  }

  /**
   * Find trade by transaction hash
   */
  async findByHash(transactionHash) {
    const stmt = this.db.prepare(`
      SELECT * FROM trades
      WHERE transaction_hash = ?
    `);

    return await stmt.bind(transactionHash).first();
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
   * Find trades by market
   */
  async findByMarket(conditionId, options = {}) {
    const { limit = 50, offset = 0 } = options;

    const stmt = this.db.prepare(`
      SELECT t.*, w.display_name as whale_label
      FROM trades t
      LEFT JOIN whales w ON t.wallet_address = w.wallet_address
      WHERE t.condition_id = ?
      ORDER BY t.traded_at DESC
      LIMIT ? OFFSET ?
    `);

    const result = await stmt.bind(conditionId, limit, offset).all();
    return result.results || [];
  }

  /**
   * Find trades by market and outcome
   */
  async findByMarketAndOutcome(conditionId, outcomeIndex, options = {}) {
    const { limit = 50, offset = 0 } = options;

    const stmt = this.db.prepare(`
      SELECT t.*
      FROM trades t
      WHERE t.condition_id = ? AND t.outcome_index = ?
      ORDER BY t.traded_at DESC
      LIMIT ? OFFSET ?
    `);

    const result = await stmt.bind(conditionId, outcomeIndex, limit, offset).all();
    return result.results || [];
  }

  /**
   * Get recent trades for a market (legacy method)
   */
  async getRecentTradesByMarket(marketId, limit = 50) {
    return this.findByMarket(marketId, { limit });
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
        COUNT(DISTINCT wallet_address) as active_whales,
        COUNT(*) as total_trades,
        SUM(size * price) as total_volume,
        AVG(size * price) as avg_trade_size,
        COUNT(DISTINCT condition_id) as markets_traded
      FROM trades
      WHERE traded_at >= ? AND traded_at <= ?
    `);

    return await stmt.bind(startTime, endTime).first();
  }

  /**
   * Get trade volume for a wallet
   */
  async getTradeVolume(walletAddress, options = {}) {
    const { from, to } = options;

    let query = `
      SELECT SUM(value) as total_volume
      FROM trades
      WHERE wallet_address = ?
    `;
    const params = [walletAddress];

    if (from) {
      query += ' AND traded_at >= ?';
      params.push(from);
    }

    if (to) {
      query += ' AND traded_at <= ?';
      params.push(to);
    }

    const stmt = this.db.prepare(query);
    const result = await stmt.bind(...params).first();

    return result?.total_volume || 0;
  }

  /**
   * Get trade count for a wallet
   */
  async getTradeCount(walletAddress, options = {}) {
    const { from, to, side } = options;

    let query = `
      SELECT COUNT(*) as count
      FROM trades
      WHERE wallet_address = ?
    `;
    const params = [walletAddress];

    if (from) {
      query += ' AND traded_at >= ?';
      params.push(from);
    }

    if (to) {
      query += ' AND traded_at <= ?';
      params.push(to);
    }

    if (side) {
      query += ' AND side = ?';
      params.push(side);
    }

    const stmt = this.db.prepare(query);
    const result = await stmt.bind(...params).first();

    return result?.count || 0;
  }

  /**
   * Bulk create trades
   */
  async bulkCreate(trades) {
    for (const trade of trades) {
      await this.create(trade);
    }
  }

  /**
   * Bulk upsert trades
   */
  async bulkUpsert(trades) {
    for (const trade of trades) {
      // Check if exists
      const existing = await this.findByHash(trade.transaction_hash);
      if (!existing) {
        await this.create(trade);
      }
    }
  }

  /**
   * Aggregate trades by wallet
   */
  async aggregateByWallet(options = {}) {
    const { from, to, limit = 100 } = options;

    let query = `
      SELECT
        wallet_address,
        COUNT(*) as trade_count,
        SUM(value) as total_volume,
        AVG(value) as avg_trade_size
      FROM trades
      WHERE 1=1
    `;
    const params = [];

    if (from) {
      query += ' AND traded_at >= ?';
      params.push(from);
    }

    if (to) {
      query += ' AND traded_at <= ?';
      params.push(to);
    }

    query += ' GROUP BY wallet_address ORDER BY total_volume DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    const result = await stmt.bind(...params).all();
    return result.results || [];
  }

  /**
   * Aggregate trades by market
   */
  async aggregateByMarket(options = {}) {
    const { from, to, limit = 100 } = options;

    let query = `
      SELECT
        condition_id,
        COUNT(*) as trade_count,
        SUM(value) as total_volume,
        COUNT(DISTINCT wallet_address) as unique_traders
      FROM trades
      WHERE 1=1
    `;
    const params = [];

    if (from) {
      query += ' AND traded_at >= ?';
      params.push(from);
    }

    if (to) {
      query += ' AND traded_at <= ?';
      params.push(to);
    }

    query += ' GROUP BY condition_id ORDER BY total_volume DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    const result = await stmt.bind(...params).all();
    return result.results || [];
  }
}
