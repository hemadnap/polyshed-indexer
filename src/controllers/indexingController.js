/**
 * Indexing Controller
 * 
 * HTTP endpoints for managing indexing operations
 */

import { Hono } from 'hono'
import { WhaleTrackerService } from '../services/WhaleTrackerService.js'
import { MarketService } from '../services/MarketService.js'
import { IndexingRepository } from '../repositories/IndexingRepository.js'

const app = new Hono()

/**
 * POST /api/index/whale/:address
 * Trigger indexing for a specific whale
 */
app.post('/whale/:address', async (c) => {
  const address = c.req.param('address')
  const { full_reindex = false } = await c.req.json().catch(() => ({}))
  
  const whaleService = new WhaleTrackerService(c.env)
  
  try {
    const result = await whaleService.indexWhale(address, {
      fullReindex: full_reindex
    })
    
    return c.json({
      success: true,
      ...result
    })
  } catch (error) {
    return c.json({
      error: 'Indexing failed',
      message: error.message
    }, 500)
  }
})

/**
 * POST /api/index/all
 * Trigger full reindex for all whales
 */
app.post('/all', async (c) => {
  const whaleService = new WhaleTrackerService(c.env)
  
  try {
    // Queue all whales for reindexing
    const result = await whaleService.queueAllWhales()
    
    return c.json({
      success: true,
      message: 'All whales queued for reindexing',
      ...result
    })
  } catch (error) {
    return c.json({
      error: 'Indexing failed',
      message: error.message
    }, 500)
  }
})

/**
 * GET /api/index/status
 * Get indexing status and statistics
 */
app.get('/status', async (c) => {
  const indexingRepo = new IndexingRepository(c.env.DB)
  const status = await indexingRepo.getStats()
  
  return c.json(status)
})

/**
 * GET /api/index/health
 * Get indexing health status
 */
app.get('/health', async (c) => {
  const indexingRepo = new IndexingRepository(c.env.DB)
  const health = await indexingRepo.getHealth()
  
  return c.json(health)
})

/**
 * GET /api/index/queue
 * Get current indexing queue
 */
app.get('/queue', async (c) => {
  const { status, limit = 100, offset = 0 } = c.req.query()
  
  const indexingRepo = new IndexingRepository(c.env.DB)
  const queue = await indexingRepo.getQueue({
    status,
    limit: parseInt(limit),
    offset: parseInt(offset)
  })
  
  return c.json({
    queue,
    count: queue.length
  })
})

/**
 * GET /api/index/log
 * Get indexing log
 */
app.get('/log', async (c) => {
  const { job_type, status, limit = 100, offset = 0 } = c.req.query()
  
  const indexingRepo = new IndexingRepository(c.env.DB)
  const log = await indexingRepo.getLog({
    jobType: job_type,
    status,
    limit: parseInt(limit),
    offset: parseInt(offset)
  })
  
  return c.json({
    log,
    count: log.length
  })
})

/**
 * POST /api/index/trigger-cron
 * Manually trigger the scheduled cron job
 * 
 * This endpoint replicates the behavior of the 30-minute cron job:
 * - Fetches latest whale trades
 * - Updates positions
 * - Captures market snapshots
 */
app.post('/trigger-cron', async (c) => {
  console.log('[Manual Cron Trigger] Cron job trigger endpoint called')
  
  const startTime = Date.now()
  let results = {
    whaleUpdate: null,
    marketSnapshots: null,
    errors: []
  }
  
  try {
    // Run whale update
    console.log('[Manual Cron Trigger] Starting whale update...')
    const whaleService = new WhaleTrackerService(c.env)
    try {
      const whaleResult = await whaleService.updateActiveWhales()
      results.whaleUpdate = whaleResult
      console.log('[Manual Cron Trigger] Whale update completed:', whaleResult)
    } catch (error) {
      const msg = `Whale update failed: ${error.message}`
      console.error('[Manual Cron Trigger]', msg)
      results.errors.push(msg)
    }
    
    // Run market snapshots
    console.log('[Manual Cron Trigger] Starting market snapshots...')
    const marketService = new MarketService(c.env)
    try {
      const marketResult = await marketService.captureSnapshots()
      results.marketSnapshots = marketResult
      console.log('[Manual Cron Trigger] Market snapshots completed:', marketResult)
    } catch (error) {
      const msg = `Market snapshots failed: ${error.message}`
      console.error('[Manual Cron Trigger]', msg)
      results.errors.push(msg)
    }
    
    const durationMs = Date.now() - startTime
    
    return c.json({
      success: results.errors.length === 0,
      message: results.errors.length === 0 ? 'Cron job completed successfully' : 'Cron job completed with errors',
      timestamp: new Date().toISOString(),
      durationMs,
      results,
      endpoints: {
        status: 'GET /api/index/status',
        queue: 'GET /api/index/queue',
        log: 'GET /api/index/log',
        whale: 'POST /api/index/whale/:address',
        all: 'POST /api/index/all'
      }
    }, results.errors.length === 0 ? 200 : 207)
  } catch (error) {
    console.error('[Manual Cron Trigger] Unexpected error:', error)
    return c.json({
      success: false,
      error: 'Cron trigger failed',
      message: error.message,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime
    }, 500)
  }
})

export default app
