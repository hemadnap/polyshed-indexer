/**
 * Whale Controller
 * 
 * HTTP endpoints for whale management and data retrieval
 */

import { Hono } from 'hono'
import { WhaleRepository } from '../repositories/WhaleRepository.js'
import { TradeRepository } from '../repositories/TradeRepository.js'
import { PositionRepository } from '../repositories/PositionRepository.js'
import { MetricsRepository } from '../repositories/MetricsRepository.js'

const app = new Hono()

/**
 * GET /api/whales
 * List all whales with optional filtering
 */
app.get('/', async (c) => {
  try {
    const query = c.req.query()
    const limit = Math.max(1, Math.min(1000, parseInt(query.limit) || 100))
    const offset = Math.max(0, parseInt(query.offset) || 0)
    
    if (!c.env?.DB) {
      return c.json({ error: 'Database not available' }, 500)
    }
    
    const whaleRepo = new WhaleRepository(c.env.DB)
    const whales = await whaleRepo.findAll({
      active: query.active === 'true' ? true : query.active === 'false' ? false : undefined,
      tracking_enabled: query.tracking_enabled === 'true' ? true : query.tracking_enabled === 'false' ? false : undefined,
      sortBy: query.sort_by || 'total_volume',
      limit,
      offset
    })
    
    return c.json({
      whales,
      count: whales.length,
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
  } catch (error) {
    console.error('GET /api/whales error:', error)
    return c.json({
      error: 'Failed to fetch whales',
      message: error.message
    }, 500)
  }
})

/**
 * GET /api/whales/:address
 * Get whale details
 */
app.get('/:address', async (c) => {
  try {
    const address = c.req.param('address')
    
    const whaleRepo = new WhaleRepository(c.env.DB)
    const whale = await whaleRepo.findByAddress(address)
    
    if (!whale) {
      return c.json({ error: 'Whale not found' }, 404)
    }
    
    return c.json(whale)
  } catch (error) {
    console.error('GET /api/whales/:address error:', error)
    return c.json({
      error: 'Failed to fetch whale',
      message: error.message
    }, 500)
  }
})

/**
 * POST /api/whales
 * Add a new whale to track
 */
app.post('/', async (c) => {
  try {
    const body = await c.req.json()
    const { wallet_address, display_name, tracking_enabled = true } = body
    
    if (!wallet_address) {
      return c.json({ error: 'wallet_address is required' }, 400)
    }
    
    const whaleRepo = new WhaleRepository(c.env.DB)
    
    // Check if already exists
    const existing = await whaleRepo.findByAddress(wallet_address)
    if (existing) {
      return c.json({ error: 'Whale already exists' }, 409)
    }
    
    const whale = await whaleRepo.create({
      wallet_address,
      display_name: display_name || wallet_address.substring(0, 10),
      tracking_enabled,
      first_seen_at: Math.floor(Date.now() / 1000),
      last_activity_at: Math.floor(Date.now() / 1000)
    })
    
    return c.json(whale, 201)
  } catch (error) {
    console.error('POST /api/whales error:', error)
    return c.json({
      error: 'Failed to create whale',
      message: error.message
    }, 500)
  }
})

/**
 * PUT /api/whales/:address
 * Update whale metadata
 */
app.put('/:address', async (c) => {
  try {
    const address = c.req.param('address')
    const body = await c.req.json()
    
    const whaleRepo = new WhaleRepository(c.env.DB)
    
    const whale = await whaleRepo.findByAddress(address)
    if (!whale) {
      return c.json({ error: 'Whale not found' }, 404)
    }
    
    const updated = await whaleRepo.update(address, body)
    
    return c.json(updated)
  } catch (error) {
    console.error('PUT /api/whales/:address error:', error)
    return c.json({
      error: 'Failed to update whale',
      message: error.message
    }, 500)
  }
})

/**
 * DELETE /api/whales/:address
 * Remove whale from tracking
 */
app.delete('/:address', async (c) => {
  try {
    const address = c.req.param('address')
    
    const whaleRepo = new WhaleRepository(c.env.DB)
    
    const whale = await whaleRepo.findByAddress(address)
    if (!whale) {
      return c.json({ error: 'Whale not found' }, 404)
    }
    
    await whaleRepo.delete(address)
    
    return c.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/whales/:address error:', error)
    return c.json({
      error: 'Failed to delete whale',
      message: error.message
    }, 500)
  }
})

/**
 * GET /api/whales/:address/positions
 * Get whale's current positions
 */
app.get('/:address/positions', async (c) => {
  try {
    const address = c.req.param('address')
    const { limit = 100, offset = 0 } = c.req.query()
    
    const positionRepo = new PositionRepository(c.env.DB)
    const positions = await positionRepo.findByWallet(address, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
    
    return c.json({
      positions,
      count: positions.length
    })
  } catch (error) {
    console.error('GET /api/whales/:address/positions error:', error)
    return c.json({
      error: 'Failed to fetch positions',
      message: error.message
    }, 500)
  }
})

/**
 * GET /api/whales/:address/trades
 * Get whale's trade history
 */
app.get('/:address/trades', async (c) => {
  try {
    const address = c.req.param('address')
    const { limit = 100, offset = 0, from, to } = c.req.query()
    
    const tradeRepo = new TradeRepository(c.env.DB)
    const trades = await tradeRepo.findByWallet(address, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      from: from ? parseInt(from) : undefined,
      to: to ? parseInt(to) : undefined
    })
    
    return c.json({
      trades,
      count: trades.length
    })
  } catch (error) {
    console.error('GET /api/whales/:address/trades error:', error)
    return c.json({
      error: 'Failed to fetch trades',
      message: error.message
    }, 500)
  }
})

/**
 * GET /api/whales/:address/metrics
 * Get whale's performance metrics
 */
app.get('/:address/metrics', async (c) => {
  try {
    const address = c.req.param('address')
    const { period = 'all' } = c.req.query()
    
    const metricsRepo = new MetricsRepository(c.env.DB)
    
    let metrics
    switch (period) {
      case 'daily':
        metrics = await metricsRepo.getDailyMetrics(address, 30) // Last 30 days
        break
      case 'weekly':
        metrics = await metricsRepo.getWeeklyMetrics(address, 12) // Last 12 weeks
        break
      case 'monthly':
        metrics = await metricsRepo.getMonthlyMetrics(address, 12) // Last 12 months
        break
      default:
        // Get current aggregate metrics from whale table
        const whaleRepo = new WhaleRepository(c.env.DB)
        const whale = await whaleRepo.findByAddress(address)
        metrics = whale ? {
          total_volume: whale.total_volume,
          total_pnl: whale.total_pnl,
          total_roi: whale.total_roi,
          win_rate: whale.win_rate,
          sharpe_ratio: whale.sharpe_ratio,
          total_trades: whale.total_trades
        } : null
    }
    
    if (!metrics) {
      return c.json({ error: 'Metrics not found' }, 404)
    }
    
    return c.json(metrics)
  } catch (error) {
    console.error('GET /api/whales/:address/metrics error:', error)
    return c.json({
      error: 'Failed to fetch metrics',
      message: error.message
    }, 500)
  }
})

/**
 * GET /api/whales/:address/events
 * Get whale's detected events
 */
app.get('/:address/events', async (c) => {
  try {
    const address = c.req.param('address')
    const { limit = 50, offset = 0, type, severity } = c.req.query()
    
    const whaleRepo = new WhaleRepository(c.env.DB)
    const events = await whaleRepo.getEvents(address, {
      limit: parseInt(limit),
      offset: parseInt(offset),
      type,
      severity
    })
    
    return c.json({
      events,
      count: events.length
    })
  } catch (error) {
    console.error('GET /api/whales/:address/events error:', error)
    return c.json({
      error: 'Failed to fetch events',
      message: error.message
    }, 500)
  }
})

export default app
