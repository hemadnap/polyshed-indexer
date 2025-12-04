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
   * Find position by market and outcome (using correct schema)
   */
  async findByMarketAndOutcome(walletAddress, conditionId, outcomeIndex) {
    const stmt = this.db.prepare(`
      SELECT * FROM positions
      WHERE wallet_address = ? AND condition_id = ? AND outcome_index = ?
    `);

    return await stmt.bind(walletAddress, conditionId, outcomeIndex).first();
  }

  /**
   * Find closed positions by wallet
   */
  async findClosedByWallet(walletAddress, options = {}) {
    const { limit = 100, offset = 0 } = options;

    const stmt = this.db.prepare(`
      SELECT * FROM closed_positions
      WHERE wallet_address = ?
      ORDER BY closed_at DESC
      LIMIT ? OFFSET ?
    `);

    const result = await stmt.bind(walletAddress, limit, offset).all();
    return result.results || [];
  }

  /**
   * Update position
   */
  async updatePosition(id, updates) {
    const updatePairs = [];
    const params = [];

    for (const [key, value] of Object.entries(updates)) {
      updatePairs.push(`${key} = ?`);
      params.push(value);
    }

    updatePairs.push('last_updated_at = ?');
    params.push(Math.floor(Date.now() / 1000));

    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE positions
      SET ${updatePairs.join(', ')}
      WHERE id = ?
    `);

    await stmt.bind(...params).run();
  }

  /**
   * Close position
   */
  async closePosition(id, exitData) {
    // Get position
    const position = await this.db.prepare('SELECT * FROM positions WHERE id = ?').bind(id).first();

    if (!position) {
      return;
    }

    // Insert into closed_positions
    await this.db.prepare(`
      INSERT INTO closed_positions (
        wallet_address, condition_id, outcome_index, size, avg_entry_price, avg_exit_price,
        total_invested, total_returned, realized_pnl, realized_roi, opened_at, closed_at, hold_duration
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      position.wallet_address,
      position.condition_id,
      position.outcome_index,
      position.size,
      position.avg_entry_price,
      exitData.avg_exit_price,
      position.total_invested,
      exitData.total_returned,
      exitData.realized_pnl,
      exitData.realized_roi,
      position.opened_at,
      exitData.closed_at,
      exitData.hold_duration
    ).run();

    // Delete from positions
    await this.db.prepare('DELETE FROM positions WHERE id = ?').bind(id).run();
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

  /**
   * Get wallet portfolio value
   */
  async getWalletPortfolioValue(walletAddress) {
    const stmt = this.db.prepare(`
      SELECT
        SUM(current_value) as total_value,
        SUM(unrealized_pnl) as total_pnl,
        COUNT(*) as position_count
      FROM positions
      WHERE wallet_address = ? AND size > 0
    `);

    const result = await stmt.bind(walletAddress).first();

    return {
      total_value: result?.total_value || 0,
      total_pnl: result?.total_pnl || 0,
      position_count: result?.position_count || 0
    };
  }

  /**
   * Get open position count for wallet
   */
  async getOpenPositionCount(walletAddress) {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM positions
      WHERE wallet_address = ? AND size > 0
    `);

    const result = await stmt.bind(walletAddress).first();
    return result?.count || 0;
  }

  /**
   * Get average position value for wallet
   */
  async getAveragePositionValue(walletAddress) {
    const stmt = this.db.prepare(`
      SELECT AVG(current_value) as avg_value
      FROM positions
      WHERE wallet_address = ? AND size > 0
    `);

    const result = await stmt.bind(walletAddress).first();
    return result?.avg_value || 0;
  }

  /**
   * Bulk upsert positions
   */
  async bulkUpsert(positions) {
    for (const position of positions) {
      await this.upsertPosition(position);
    }
  }
}
