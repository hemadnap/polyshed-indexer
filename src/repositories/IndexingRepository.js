/**
 * Repository for indexing status database operations
 */
export class IndexingRepository {
  constructor(db) {
    this.db = db;
  }

  /**
   * Get indexing statistics
   */
  async getStats() {
    // Get counts from actual tables
    const tradeCount = await this.db.prepare('SELECT COUNT(*) as count FROM trades').first();
    const whaleCount = await this.db.prepare('SELECT COUNT(*) as count FROM whales WHERE is_active = 1').first();
    const marketCount = await this.db.prepare('SELECT COUNT(*) as count FROM markets WHERE is_active = 1').first();
    const positionCount = await this.db.prepare('SELECT COUNT(*) as count FROM positions WHERE size > 0').first();

    // Get last activity times
    const lastTrade = await this.db.prepare('SELECT MAX(traded_at) as last_time FROM trades').first();
    const lastWhaleUpdate = await this.db.prepare('SELECT MAX(updated_at) as last_time FROM whales').first();

    return {
      total_trades: tradeCount?.count || 0,
      total_whales: whaleCount?.count || 0,
      total_markets: marketCount?.count || 0,
      total_positions: positionCount?.count || 0,
      last_trade_time: lastTrade?.last_time || 0,
      last_whale_update: lastWhaleUpdate?.last_time || 0,
      status: 'running'
    };
  }

  /**
   * Get indexing health status
   */
  async getHealth() {
    const stats = await this.getStats();
    
    // Check if we have any data
    if (stats.total_whales === 0) {
      return { 
        healthy: true, 
        reason: 'Indexer running - no whales configured yet',
        stats
      };
    }

    // Check if indexing is stale (no activity in last 24 hours)
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    
    if (stats.last_whale_update && stats.last_whale_update < oneDayAgo) {
      return { 
        healthy: false, 
        reason: 'No whale updates in last 24 hours',
        stats
      };
    }

    return { 
      healthy: true, 
      reason: 'Indexer running normally',
      stats
    };
  }

  /**
   * Log the start of an indexing job
   */
  async logJobStart(jobType) {
    const result = await this.db.prepare(
      `INSERT INTO indexing_log (job_type, status, started_at)
       VALUES (?, ?, ?)
       RETURNING id`
    ).bind(jobType, 'STARTED', Date.now()).first();
    
    return result?.id;
  }

  /**
   * Log job completion
   */
  async logJobComplete(jobId, metadata = {}) {
    const { records_processed = 0, duration_ms = 0 } = metadata;
    
    await this.db.prepare(
      `UPDATE indexing_log
       SET status = ?, completed_at = ?, records_processed = ?, duration_ms = ?
       WHERE id = ?`
    ).bind('COMPLETED', Date.now(), records_processed, duration_ms, jobId).run();
    
    return true;
  }

  /**
   * Log job failure
   */
  async logJobFailed(jobId, errorMessage, metadata = {}) {
    const { duration_ms = 0 } = metadata;
    
    await this.db.prepare(
      `UPDATE indexing_log
       SET status = ?, completed_at = ?, error_message = ?, duration_ms = ?
       WHERE id = ?`
    ).bind('FAILED', Date.now(), errorMessage, duration_ms, jobId).run();
    
    return true;
  }

  /**
   * Get indexing queue
   */
  async getQueue(options = {}) {
    const { status, limit = 100, offset = 0 } = options;
    
    let query = 'SELECT * FROM indexing_queue';
    let bindings = [];
    
    if (status) {
      query += ' WHERE status = ?';
      bindings.push(status);
    }
    
    query += ' LIMIT ? OFFSET ?';
    bindings.push(limit, offset);
    
    const result = await this.db.prepare(query).bind(...bindings).all();
    return result?.results || [];
  }

  /**
   * Get indexing log
   */
  async getLog(options = {}) {
    const { jobType, status, limit = 100, offset = 0 } = options;
    
    let query = 'SELECT * FROM indexing_log WHERE 1=1';
    let bindings = [];
    
    if (jobType) {
      query += ' AND job_type = ?';
      bindings.push(jobType);
    }
    
    if (status) {
      query += ' AND status = ?';
      bindings.push(status);
    }
    
    query += ' ORDER BY started_at DESC LIMIT ? OFFSET ?';
    bindings.push(limit, offset);
    
    const result = await this.db.prepare(query).bind(...bindings).all();
    return result?.results || [];
  }

  /**
   * Get last indexing status for a specific whale
   */
  async getStatus(walletAddress) {
    const result = await this.db.prepare(
      `SELECT * FROM indexing_status WHERE wallet_address = ? LIMIT 1`
    ).bind(walletAddress).first();
    
    return result;
  }
}
