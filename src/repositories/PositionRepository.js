/**
 * Repository for whale positions database operations
 */
export class PositionRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Upsert a position (insert or update)
   */
  async upsertPosition(position) {
    const stmt = this.db.prepare(`
      INSERT INTO whale_positions (
        whale_address, market_id, outcome, size, avg_price,
        current_value, unrealized_pnl, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(whale_address, market_id, outcome)
      DO UPDATE SET
        size = excluded.size,
        avg_price = excluded.avg_price,
        current_value = excluded.current_value,
        unrealized_pnl = excluded.unrealized_pnl,
        last_updated = excluded.last_updated
    `);

    await stmt.bind(
      position.whale_address,
      position.market_id,
      position.outcome,
      position.size,
      position.avg_price,
      position.current_value,
      position.unrealized_pnl,
      position.last_updated
    ).run();
  }

  /**
   * Get all positions for a whale (alias for getPositionsByWhale)
   */
  async findByWallet(whaleAddress, options = {}) {
    const { limit = 100, offset = 0 } = options;
    
    const stmt = this.db.prepare(`
      SELECT p.*, m.question as market_question, m.end_date as market_end_date
      FROM positions p
      LEFT JOIN markets m ON p.condition_id = m.condition_id
      WHERE p.wallet_address = ? AND p.size > 0
      ORDER BY p.current_value DESC
      LIMIT ? OFFSET ?
    `);

    const result = await stmt.bind(whaleAddress, limit, offset).all();
    return result.results || [];
  }

  /**
   * Get all positions for a whale
   */
  async getPositionsByWhale(whaleAddress) {
    const stmt = this.db.prepare(`
      SELECT wp.*, m.question as market_question, m.end_date as market_end_date
      FROM whale_positions wp
      LEFT JOIN markets m ON wp.market_id = m.market_id
      WHERE wp.whale_address = ? AND wp.size > 0
      ORDER BY wp.current_value DESC
    `);

    const result = await stmt.bind(whaleAddress).all();
    return result.results || [];
  }

  /**
   * Get all positions for a market
   */
  async getPositionsByMarket(marketId) {
    const stmt = this.db.prepare(`
      SELECT wp.*, w.label as whale_label
      FROM whale_positions wp
      LEFT JOIN whales w ON wp.whale_address = w.address
      WHERE wp.market_id = ? AND wp.size > 0
      ORDER BY wp.size DESC
    `);

    const result = await stmt.bind(marketId).all();
    return result.results || [];
  }

  /**
   * Get a specific position
   */
  async getPosition(whaleAddress, marketId, outcome) {
    const stmt = this.db.prepare(`
      SELECT * FROM whale_positions
      WHERE whale_address = ? AND market_id = ? AND outcome = ?
    `);

    return await stmt.bind(whaleAddress, marketId, outcome).first();
  }

  /**
   * Get all non-zero positions
   */
  async getAllActivePositions(limit = 1000) {
    const stmt = this.db.prepare(`
      SELECT wp.*, w.label as whale_label, m.question as market_question
      FROM whale_positions wp
      LEFT JOIN whales w ON wp.whale_address = w.address
      LEFT JOIN markets m ON wp.market_id = m.market_id
      WHERE wp.size > 0
      ORDER BY wp.current_value DESC
      LIMIT ?
    `);

    const result = await stmt.bind(limit).all();
    return result.results || [];
  }

  /**
   * Get total position value for a whale
   */
  async getWhaleTotalValue(whaleAddress) {
    const stmt = this.db.prepare(`
      SELECT 
        SUM(current_value) as total_value,
        SUM(unrealized_pnl) as total_pnl,
        COUNT(*) as position_count
      FROM whale_positions
      WHERE whale_address = ? AND size > 0
    `);

    const result = await stmt.bind(whaleAddress).first();
    
    return {
      total_value: result?.total_value || 0,
      total_pnl: result?.total_pnl || 0,
      position_count: result?.position_count || 0
    };
  }

  /**
   * Update position after a trade
   */
  async updatePositionAfterTrade(whaleAddress, marketId, outcome, trade) {
    // Get current position
    const currentPosition = await this.getPosition(whaleAddress, marketId, outcome);
    
    let newSize, newAvgPrice;
    
    if (!currentPosition || currentPosition.size === 0) {
      // New position
      newSize = trade.side === 'BUY' ? trade.size : -trade.size;
      newAvgPrice = trade.price;
    } else {
      const currentSize = currentPosition.size;
      const currentAvgPrice = currentPosition.avg_price;
      
      if (trade.side === 'BUY') {
        // Adding to position
        newSize = currentSize + trade.size;
        newAvgPrice = ((currentSize * currentAvgPrice) + (trade.size * trade.price)) / newSize;
      } else {
        // Reducing position
        newSize = currentSize - trade.size;
        newAvgPrice = currentAvgPrice; // Keep same avg price when selling
      }
    }

    // Calculate current value (simplified - would need current market price)
    const currentValue = newSize * trade.price;
    const unrealizedPnl = currentValue - (newSize * newAvgPrice);

    await this.upsertPosition({
      whale_address: whaleAddress,
      market_id: marketId,
      outcome: outcome,
      size: newSize,
      avg_price: newAvgPrice,
      current_value: currentValue,
      unrealized_pnl: unrealizedPnl,
      last_updated: Date.now()
    });
  }

  /**
   * Get positions that need price updates
   */
  async getStalePositions(staleThresholdMs = 5 * 60 * 1000) {
    const cutoffTime = Date.now() - staleThresholdMs;
    
    const stmt = this.db.prepare(`
      SELECT * FROM whale_positions
      WHERE size > 0 AND last_updated < ?
      LIMIT 100
    `);

    const result = await stmt.bind(cutoffTime).all();
    return result.results || [];
  }

  /**
   * Delete positions with zero size (cleanup)
   */
  async deleteZeroPositions() {
    const stmt = this.db.prepare(`
      DELETE FROM whale_positions
      WHERE size = 0
    `);

    await stmt.run();
  }
}
