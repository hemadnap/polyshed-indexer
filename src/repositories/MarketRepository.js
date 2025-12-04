/**
 * Repository for market data database operations
 */
export class MarketRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Upsert market information
   */
  async upsertMarket(market) {
    const stmt = this.db.prepare(`
      INSERT INTO markets (
        condition_id, question, description, end_date, 
        outcomes, category, total_volume, total_liquidity, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(condition_id)
      DO UPDATE SET
        question = excluded.question,
        description = excluded.description,
        end_date = excluded.end_date,
        outcomes = excluded.outcomes,
        category = excluded.category,
        total_volume = excluded.total_volume,
        total_liquidity = excluded.total_liquidity,
        updated_at = excluded.updated_at
    `);

    await stmt.bind(
      market.condition_id,
      market.question,
      market.description || '',
      market.end_date,
      JSON.stringify(market.outcomes),
      market.category || '',
      market.volume || 0,
      market.liquidity || 0,
      market.last_updated || Date.now()
    ).run();
  }

  /**
   * Get market by ID
   */
  async getMarketById(marketId) {
    const stmt = this.db.prepare(`
      SELECT * FROM markets
      WHERE condition_id = ?
    `);

    const result = await stmt.bind(marketId).first();
    
    if (result && result.outcomes) {
      result.outcomes = JSON.parse(result.outcomes);
    }
    
    return result;
  }

  /**
   * Get markets by category
   */
  async getMarketsByCategory(category, limit = 50) {
    const stmt = this.db.prepare(`
      SELECT * FROM markets
      WHERE category = ?
      ORDER BY total_volume DESC
      LIMIT ?
    `);

    const result = await stmt.bind(category, limit).all();
    
    return (result.results || []).map(m => {
      if (m.outcomes) m.outcomes = JSON.parse(m.outcomes);
      return m;
    });
  }

  /**
   * Get trending markets (by whale activity)
   */
  async getTrendingMarkets(hours = 24, limit = 50) {
    const startTime = Date.now() - (hours * 60 * 60 * 1000);
    
    const stmt = this.db.prepare(`
      SELECT 
        m.*,
        COUNT(DISTINCT t.wallet_address) as whale_count,
        COUNT(t.id) as trade_count,
        SUM(t.size * t.price) as whale_volume
      FROM markets m
      INNER JOIN trades t ON m.condition_id = t.condition_id
      WHERE t.traded_at >= ?
      GROUP BY m.condition_id
      ORDER BY whale_count DESC, whale_volume DESC
      LIMIT ?
    `);

    const result = await stmt.bind(startTime, limit).all();
    
    return (result.results || []).map(m => {
      if (m.outcomes) m.outcomes = JSON.parse(m.outcomes);
      return m;
    });
  }

  /**
   * Get markets with whale positions
   */
  async getMarketsWithWhaleActivity(limit = 100) {
    // For now, just return active markets since we don't have positions data yet
    return await this.getActiveMarkets(limit);
  }

  /**
   * Search markets by question
   */
  async searchMarkets(query, limit = 50) {
    const stmt = this.db.prepare(`
      SELECT * FROM markets
      WHERE question LIKE ? OR description LIKE ?
      ORDER BY total_volume DESC
      LIMIT ?
    `);

    const searchPattern = `%${query}%`;
    const result = await stmt.bind(searchPattern, searchPattern, limit).all();
    
    return (result.results || []).map(m => {
      if (m.outcomes) m.outcomes = JSON.parse(m.outcomes);
      return m;
    });
  }

  /**
   * Get active markets (not ended)
   */
  async getActiveMarkets(limit = 100) {
    const now = Date.now();
    
    const stmt = this.db.prepare(`
      SELECT * FROM markets
      WHERE end_date > ?
      ORDER BY total_volume DESC
      LIMIT ?
    `);

    const result = await stmt.bind(now, limit).all();
    
    return (result.results || []).map(m => {
      if (m.outcomes) m.outcomes = JSON.parse(m.outcomes);
      return m;
    });
  }

  /**
   * Get recently ended markets
   */
  async getRecentlyEndedMarkets(days = 7, limit = 50) {
    const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    const now = Date.now();
    
    const stmt = this.db.prepare(`
      SELECT * FROM markets
      WHERE end_date >= ? AND end_date <= ?
      ORDER BY end_date DESC
      LIMIT ?
    `);

    const result = await stmt.bind(startTime, now, limit).all();
    
    return (result.results || []).map(m => {
      if (m.outcomes) m.outcomes = JSON.parse(m.outcomes);
      return m;
    });
  }

  /**
   * Update market statistics
   */
  async updateMarketStats(marketId, volume, liquidity) {
    const stmt = this.db.prepare(`
      UPDATE markets
      SET total_volume = ?, total_liquidity = ?, updated_at = ?
      WHERE condition_id = ?
    `);

    await stmt.bind(volume, liquidity, Date.now(), marketId).run();
  }

  /**
   * Get market statistics
   */
  async getMarketStats(marketId) {
    const stmt = this.db.prepare(`
      SELECT 
        m.*,
        COUNT(DISTINCT wp.whale_address) as whale_count,
        SUM(wp.current_value) as total_whale_value,
        COUNT(DISTINCT wt.id) as trade_count,
        MAX(wt.timestamp) as last_trade_time
      FROM markets m
      LEFT JOIN whale_positions wp ON m.condition_id = wp.condition_id AND wp.size > 0
      LEFT JOIN whale_trades wt ON m.condition_id = wt.condition_id
      WHERE m.condition_id = ?
      GROUP BY m.condition_id
    `);

    const result = await stmt.bind(marketId).first();
    
    if (result && result.outcomes) {
      result.outcomes = JSON.parse(result.outcomes);
    }
    
    return result;
  }

  /**
   * Get markets that need data refresh
   */
  async getStaleMarkets(staleThresholdMs = 60 * 60 * 1000, limit = 50) {
    const cutoffTime = Date.now() - staleThresholdMs;
    
    const stmt = this.db.prepare(`
      SELECT * FROM markets
      WHERE last_updated < ?
      ORDER BY total_volume DESC
      LIMIT ?
    `);

    const result = await stmt.bind(cutoffTime, limit).all();
    
    return (result.results || []).map(m => {
      if (m.outcomes) m.outcomes = JSON.parse(m.outcomes);
      return m;
    });
  }

  /**
   * Batch upsert markets
   */
  async batchUpsertMarkets(markets) {
    for (const market of markets) {
      await this.upsertMarket(market);
    }
  }

  /**
   * Find all markets with filters
   */
  async findAll(options = {}) {
    const { active = false, limit = 100, offset = 0 } = options;
    
    let query = 'SELECT * FROM markets WHERE 1=1';
    let bindings = [];
    
    if (active) {
      query += ' AND end_date > ?';
      bindings.push(Date.now());
    }
    
    query += ' ORDER BY total_volume DESC LIMIT ? OFFSET ?';
    bindings.push(limit, offset);
    
    const result = await this.db.prepare(query).bind(...bindings).all();
    
    return (result?.results || []).map(m => {
      if (m.outcomes) {
        try {
          m.outcomes = JSON.parse(m.outcomes);
        } catch (e) {
          m.outcomes = [];
        }
      }
      return m;
    });
  }

  /**
   * Upsert a market
   */
  async upsert(market) {
    return this.upsertMarket(market);
  }

  /**
   * Create a market snapshot
   */
  async createSnapshot(snapshot) {
    const { condition_id, outcome_index, price, snapshot_at } = snapshot;

    const stmt = this.db.prepare(`
      INSERT INTO market_snapshots (condition_id, outcome_index, price, snapshot_at)
      VALUES (?, ?, ?, ?)
    `);

    return await stmt.bind(condition_id, outcome_index, price, snapshot_at).run();
  }

  /**
   * Save a market snapshot (alias for createSnapshot)
   */
  async saveSnapshot(snapshot) {
    return await this.createSnapshot(snapshot);
  }

  /**
   * Find market by condition ID (alias for getMarketById)
   */
  async findByConditionId(conditionId) {
    return await this.getMarketById(conditionId);
  }

  /**
   * Get positions by market (delegate to PositionRepository if available)
   */
  async getPositionsByMarket(conditionId) {
    // This is a placeholder - in real implementation, this would query positions table
    const stmt = this.db.prepare(`
      SELECT * FROM positions
      WHERE condition_id = ? AND size > 0
      ORDER BY current_value DESC
    `);
    const result = await stmt.bind(conditionId).all();
    return result?.results || [];
  }

  /**
   * Get trades by market (delegate to TradeRepository if available)
   */
  async getTradesByMarket(conditionId, limit = 100) {
    // This is a placeholder - in real implementation, this would query trades table
    const stmt = this.db.prepare(`
      SELECT * FROM trades
      WHERE condition_id = ?
      ORDER BY traded_at DESC
      LIMIT ?
    `);
    const result = await stmt.bind(conditionId, limit).all();
    return result?.results || [];
  }

  /**
   * Get latest snapshots for a market
   */
  async getLatestSnapshots(conditionId, limit = 100) {
    const stmt = this.db.prepare(`
      SELECT * FROM market_snapshots
      WHERE condition_id = ?
      ORDER BY snapshot_at DESC
      LIMIT ?
    `);
    
    const result = await stmt.bind(conditionId, limit).all();
    return result?.results || [];
  }

  /**
   * Transform Polymarket API market data to internal format
   */
  static transformPolymarketMarket(polymarketMarket) {
    const outcomes = polymarketMarket.tokens?.map(token => ({
      name: token.outcome,
      token_id: token.token_id,
      price: token.price
    })) || [];

    return {
      condition_id: polymarketMarket.condition_id,
      question: polymarketMarket.question,
      description: polymarketMarket.description || '',
      end_date: new Date(polymarketMarket.end_date_iso).getTime(),
      outcomes: outcomes,
      category: polymarketMarket.tags?.[0] || 'All',
      volume: polymarketMarket.total_volume || 0,
      liquidity: polymarketMarket.total_liquidity || 0,
      last_updated: Date.now(),
      market_slug: polymarketMarket.market_slug,
      active: polymarketMarket.active,
      closed: polymarketMarket.closed
    };
  }

  /**
   * Bulk upsert markets from Polymarket API
   */
  async bulkUpsertFromPolymarket(polymarketMarkets) {
    const insertedCount = { count: 0, errors: 0 };
    
    for (const market of polymarketMarkets) {
      try {
        const transformedMarket = MarketRepository.transformPolymarketMarket(market);
        await this.upsertMarket(transformedMarket);
        insertedCount.count++;
      } catch (error) {
        console.error(`Error upserting market ${market.condition_id}:`, error);
        insertedCount.errors++;
      }
    }
    
    return insertedCount;
  }
}
