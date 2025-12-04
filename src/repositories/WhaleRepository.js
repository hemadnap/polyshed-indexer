/**
 * Whale Repository
 * 
 * Database operations for whales table
 */

export class WhaleRepository {
  constructor(db) {
    this.db = db
  }

  async findAll(options = {}) {
    const { active, tracking_enabled, sortBy = 'total_volume', limit = 100, offset = 0 } = options
    
    // Validate sortBy to prevent SQL injection
    const validSortColumns = ['total_volume', 'total_roi', 'total_pnl', 'win_rate', 'sharpe_ratio', 'total_trades', 'last_activity_at']
    const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'total_volume'
    
    let query = 'SELECT * FROM whales WHERE 1=1'
    const params = []
    
    if (active !== undefined) {
      query += ' AND is_active = ?'
      params.push(active ? 1 : 0)
    }
    
    if (tracking_enabled !== undefined) {
      query += ' AND tracking_enabled = ?'
      params.push(tracking_enabled ? 1 : 0)
    }
    
    query += ` ORDER BY ${safeSortBy} DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)
    
    try {
      const result = await this.db.prepare(query).bind(...params).all()
      return result.results || []
    } catch (error) {
      console.error('[WhaleRepository] findAll error:', error.message, 'Query:', query, 'Params:', params)
      throw error
    }
  }

  async findByAddress(address) {
    const result = await this.db.prepare(`
      SELECT * FROM whales WHERE wallet_address = ?
    `).bind(address).first()
    
    return result
  }

  async create(data) {
    await this.db.prepare(`
      INSERT INTO whales (
        wallet_address, display_name, tracking_enabled, first_seen_at, last_activity_at
      ) VALUES (?, ?, ?, ?, ?)
    `).bind(
      data.wallet_address,
      data.display_name,
      data.tracking_enabled ? 1 : 0,
      data.first_seen_at,
      data.last_activity_at
    ).run()
    
    return this.findByAddress(data.wallet_address)
  }

  async update(address, data) {
    const updates = []
    const params = []
    
    for (const [key, value] of Object.entries(data)) {
      updates.push(`${key} = ?`)
      params.push(value)
    }
    
    updates.push('updated_at = ?')
    params.push(Math.floor(Date.now() / 1000))
    
    params.push(address)
    
    await this.db.prepare(`
      UPDATE whales SET ${updates.join(', ')} WHERE wallet_address = ?
    `).bind(...params).run()
    
    return this.findByAddress(address)
  }

  async delete(address) {
    const result = await this.db.prepare(`
      DELETE FROM whales WHERE wallet_address = ?
    `).bind(address).run()

    return result.success || true
  }

  /**
   * Find top whales by a metric
   */
  async findTop(metric = 'total_roi', options = {}) {
    const { limit = 10, minVolume = 0 } = options

    const validMetrics = ['total_roi', 'total_volume', 'win_rate', 'sharpe_ratio', 'total_pnl']
    const sortMetric = validMetrics.includes(metric) ? metric : 'total_roi'

    const result = await this.db.prepare(`
      SELECT * FROM whales
      WHERE total_volume >= ? AND is_active = 1
      ORDER BY ${sortMetric} DESC
      LIMIT ?
    `).bind(minVolume, limit).all()

    return result.results || []
  }

  /**
   * Find whales by performance criteria
   */
  async findByMetrics(criteria = {}, options = {}) {
    const { limit = 100, offset = 0 } = options
    const {
      minRoi,
      maxRoi,
      minWinRate,
      maxWinRate,
      minVolume,
      maxVolume,
      minSharpe,
      maxSharpe
    } = criteria

    let query = 'SELECT * FROM whales WHERE 1=1'
    const params = []

    if (minRoi !== undefined) {
      query += ' AND total_roi >= ?'
      params.push(minRoi)
    }

    if (maxRoi !== undefined) {
      query += ' AND total_roi <= ?'
      params.push(maxRoi)
    }

    if (minWinRate !== undefined) {
      query += ' AND win_rate >= ?'
      params.push(minWinRate)
    }

    if (maxWinRate !== undefined) {
      query += ' AND win_rate <= ?'
      params.push(maxWinRate)
    }

    if (minVolume !== undefined) {
      query += ' AND total_volume >= ?'
      params.push(minVolume)
    }

    if (maxVolume !== undefined) {
      query += ' AND total_volume <= ?'
      params.push(maxVolume)
    }

    if (minSharpe !== undefined) {
      query += ' AND sharpe_ratio >= ?'
      params.push(minSharpe)
    }

    if (maxSharpe !== undefined) {
      query += ' AND sharpe_ratio <= ?'
      params.push(maxSharpe)
    }

    query += ' ORDER BY total_roi DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)

    const result = await this.db.prepare(query).bind(...params).all()
    return result.results || []
  }

  /**
   * Bulk update whales
   */
  async bulkUpdate(updates) {
    for (const { address, data } of updates) {
      await this.update(address, data)
    }
  }

  /**
   * Bulk create whales
   */
  async bulkCreate(whales) {
    for (const whale of whales) {
      await this.create(whale)
    }
  }

  async getEvents(address, options = {}) {
    const { limit = 50, offset = 0, type, severity } = options
    
    let query = 'SELECT * FROM whale_events WHERE wallet_address = ?'
    const params = [address]
    
    if (type) {
      query += ' AND event_type = ?'
      params.push(type)
    }
    
    if (severity) {
      query += ' AND severity = ?'
      params.push(severity)
    }
    
    query += ' ORDER BY detected_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)
    
    const result = await this.db.prepare(query).bind(...params).all()
    return result.results || []
  }
}

export class TradeRepository {
  constructor(db) {
    this.db = db
  }

  async findById(id) {
    return await this.db.prepare(`
      SELECT * FROM trades WHERE id = ?
    `).bind(id).first()
  }

  async findByWallet(address, options = {}) {
    const { limit = 100, offset = 0, from, to } = options
    
    let query = 'SELECT * FROM trades WHERE wallet_address = ?'
    const params = [address]
    
    if (from) {
      query += ' AND traded_at >= ?'
      params.push(from)
    }
    
    if (to) {
      query += ' AND traded_at <= ?'
      params.push(to)
    }
    
    query += ' ORDER BY traded_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)
    
    const result = await this.db.prepare(query).bind(...params).all()
    return result.results || []
  }

  async findByMarketAndOutcome(address, conditionId, outcomeIndex, options = {}) {
    const { limit = 100 } = options
    
    const result = await this.db.prepare(`
      SELECT * FROM trades 
      WHERE wallet_address = ? AND condition_id = ? AND outcome_index = ?
      ORDER BY traded_at DESC
      LIMIT ?
    `).bind(address, conditionId, outcomeIndex, limit).all()
    
    return result.results || []
  }

  async create(data) {
    await this.db.prepare(`
      INSERT INTO trades (
        id, wallet_address, condition_id, outcome_index, side, size, price, value, fee, 
        transaction_hash, block_number, traded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.id,
      data.wallet_address,
      data.condition_id,
      data.outcome_index,
      data.side,
      data.size,
      data.price,
      data.value,
      data.fee || 0,
      data.transaction_hash,
      data.block_number,
      data.traded_at
    ).run()
  }
}

export class PositionRepository {
  constructor(db) {
    this.db = db
  }

  async findByWallet(address, options = {}) {
    const { limit = 100, offset = 0 } = options
    
    const result = await this.db.prepare(`
      SELECT * FROM positions 
      WHERE wallet_address = ?
      ORDER BY current_value DESC
      LIMIT ? OFFSET ?
    `).bind(address, limit, offset).all()
    
    return result.results || []
  }

  async findByMarketAndOutcome(address, conditionId, outcomeIndex) {
    return await this.db.prepare(`
      SELECT * FROM positions 
      WHERE wallet_address = ? AND condition_id = ? AND outcome_index = ?
    `).bind(address, conditionId, outcomeIndex).first()
  }

  async create(data) {
    const result = await this.db.prepare(`
      INSERT INTO positions (
        wallet_address, condition_id, outcome_index, size, avg_entry_price, 
        total_invested, current_price, current_value, unrealized_pnl, unrealized_roi, opened_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `).bind(
      data.wallet_address,
      data.condition_id,
      data.outcome_index,
      data.size,
      data.avg_entry_price,
      data.total_invested,
      data.current_price,
      data.current_value,
      data.unrealized_pnl,
      data.unrealized_roi,
      data.opened_at
    ).first()
    
    return result
  }

  async update(id, data) {
    const updates = []
    const params = []
    
    for (const [key, value] of Object.entries(data)) {
      updates.push(`${key} = ?`)
      params.push(value)
    }
    
    updates.push('last_updated_at = ?')
    params.push(Math.floor(Date.now() / 1000))
    
    params.push(id)
    
    await this.db.prepare(`
      UPDATE positions SET ${updates.join(', ')} WHERE id = ?
    `).bind(...params).run()
  }

  async close(id, data) {
    // Get position data
    const position = await this.db.prepare('SELECT * FROM positions WHERE id = ?').bind(id).first()
    
    if (!position) return
    
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
      data.avg_exit_price,
      position.total_invested,
      data.total_returned,
      data.realized_pnl,
      data.realized_roi,
      position.opened_at,
      data.closed_at,
      data.hold_duration
    ).run()
    
    // Delete from positions
    await this.db.prepare('DELETE FROM positions WHERE id = ?').bind(id).run()
  }

  async findClosedByWallet(address, options = {}) {
    const { limit = 100, offset = 0 } = options
    
    const result = await this.db.prepare(`
      SELECT * FROM closed_positions 
      WHERE wallet_address = ?
      ORDER BY closed_at DESC
      LIMIT ? OFFSET ?
    `).bind(address, limit, offset).all()
    
    return result.results || []
  }
}

export class MarketRepository {
  constructor(db) {
    this.db = db
  }

  async findAll(options = {}) {
    const { active, category, limit = 100, offset = 0 } = options
    
    let query = 'SELECT * FROM markets WHERE 1=1'
    const params = []
    
    if (active !== undefined) {
      query += ' AND is_active = ?'
      params.push(active ? 1 : 0)
    }
    
    if (category) {
      query += ' AND category = ?'
      params.push(category)
    }
    
    query += ' ORDER BY total_volume DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)
    
    const result = await this.db.prepare(query).bind(...params).all()
    return result.results || []
  }

  async findByConditionId(conditionId) {
    return await this.db.prepare(`
      SELECT * FROM markets WHERE condition_id = ?
    `).bind(conditionId).first()
  }

  async upsert(data) {
    await this.db.prepare(`
      INSERT INTO markets (condition_id, market_slug, question, description, category, end_date, is_active, outcomes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(condition_id) DO UPDATE SET
        market_slug = excluded.market_slug,
        question = excluded.question,
        description = excluded.description,
        category = excluded.category,
        end_date = excluded.end_date,
        is_active = excluded.is_active,
        outcomes = excluded.outcomes,
        updated_at = unixepoch()
    `).bind(
      data.condition_id,
      data.market_slug,
      data.question,
      data.description,
      data.category,
      data.end_date,
      data.is_active ? 1 : 0,
      data.outcomes
    ).run()
  }

  async createSnapshot(data) {
    await this.db.prepare(`
      INSERT INTO market_snapshots (condition_id, outcome_index, price, snapshot_at)
      VALUES (?, ?, ?, ?)
    `).bind(
      data.condition_id,
      data.outcome_index,
      data.price,
      data.snapshot_at
    ).run()
  }

  async getSnapshots(conditionId, options = {}) {
    const { from, to, limit = 500 } = options
    
    let query = 'SELECT * FROM market_snapshots WHERE condition_id = ?'
    const params = [conditionId]
    
    if (from) {
      query += ' AND snapshot_at >= ?'
      params.push(from)
    }
    
    if (to) {
      query += ' AND snapshot_at <= ?'
      params.push(to)
    }
    
    query += ' ORDER BY snapshot_at DESC LIMIT ?'
    params.push(limit)
    
    const result = await this.db.prepare(query).bind(...params).all()
    return result.results || []
  }
}

export class MetricsRepository {
  constructor(db) {
    this.db = db
  }

  async getDailyMetrics(address, days = 30) {
    const result = await this.db.prepare(`
      SELECT * FROM whale_metrics_daily 
      WHERE wallet_address = ?
      ORDER BY date DESC
      LIMIT ?
    `).bind(address, days).all()
    
    return result.results || []
  }

  async getWeeklyMetrics(address, weeks = 12) {
    const result = await this.db.prepare(`
      SELECT * FROM whale_metrics_weekly 
      WHERE wallet_address = ?
      ORDER BY week_start DESC
      LIMIT ?
    `).bind(address, weeks).all()
    
    return result.results || []
  }

  async getMonthlyMetrics(address, months = 12) {
    const result = await this.db.prepare(`
      SELECT * FROM whale_metrics_monthly 
      WHERE wallet_address = ?
      ORDER BY month DESC
      LIMIT ?
    `).bind(address, months).all()
    
    return result.results || []
  }

  async generateDailyMetrics(address, date) {
    // Implementation for daily rollup generation
    // This would aggregate trades and positions for the given date
  }

  async generateWeeklyMetrics(address) {
    // Implementation for weekly rollup generation
  }

  async generateMonthlyMetrics(address) {
    // Implementation for monthly rollup generation
  }
}

export class IndexingRepository {
  constructor(db) {
    this.db = db
  }

  async getStatus(address) {
    // Return sensible defaults - indexing_status table doesn't exist in current schema
    return {
      wallet_address: address,
      last_indexed_at: 0,
      error_count: 0
    }
  }

  async updateStatus(address, data) {
    // No-op - indexing_status table doesn't exist in current schema
    return true
  }

  async getAllStatus(options = {}) {
    // Return empty array - indexing_status table doesn't exist in current schema
    return []
  }

  async addToQueue(data) {
    await this.db.prepare(`
      INSERT INTO indexing_queue (wallet_address, priority, scheduled_at)
      VALUES (?, ?, ?)
    `).bind(
      data.wallet_address,
      data.priority || 0,
      data.scheduled_at
    ).run()
  }

  async getQueue(options = {}) {
    const { status, limit = 100, offset = 0 } = options
    
    let query = 'SELECT * FROM indexing_queue WHERE 1=1'
    const params = []
    
    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }
    
    query += ' ORDER BY priority DESC, scheduled_at ASC LIMIT ? OFFSET ?'
    params.push(limit, offset)
    
    const result = await this.db.prepare(query).bind(...params).all()
    return result.results || []
  }

  async logJobStart(jobType) {
    const result = await this.db.prepare(`
      INSERT INTO indexing_log (job_type, status, started_at)
      VALUES (?, 'STARTED', ?)
      RETURNING id
    `).bind(jobType, Math.floor(Date.now() / 1000)).first()
    
    return result.id
  }

  async logJobComplete(jobId, data) {
    await this.db.prepare(`
      UPDATE indexing_log 
      SET status = 'COMPLETED', records_processed = ?, duration_ms = ?, completed_at = ?
      WHERE id = ?
    `).bind(
      data.records_processed,
      data.duration_ms,
      Math.floor(Date.now() / 1000),
      jobId
    ).run()
  }

  async logJobFailed(jobId, errorMessage, data = {}) {
    await this.db.prepare(`
      UPDATE indexing_log 
      SET status = 'FAILED', error_message = ?, duration_ms = ?, completed_at = ?
      WHERE id = ?
    `).bind(
      errorMessage,
      data.duration_ms || 0,
      Math.floor(Date.now() / 1000),
      jobId
    ).run()
  }

  async getLog(options = {}) {
    const { jobType, status, limit = 100, offset = 0 } = options
    
    let query = 'SELECT * FROM indexing_log WHERE 1=1'
    const params = []
    
    if (jobType) {
      query += ' AND job_type = ?'
      params.push(jobType)
    }
    
    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }
    
    query += ' ORDER BY started_at DESC LIMIT ? OFFSET ?'
    params.push(limit, offset)
    
    const result = await this.db.prepare(query).bind(...params).all()
    return result.results || []
  }
}
