/**
 * Market Controller
 * 
 * HTTP endpoints for market data
 */

import { Hono } from 'hono'
import { MarketRepository } from '../repositories/MarketRepository.js'
import { MarketService } from '../services/MarketService.js'

const app = new Hono()

/**
 * POST /api/markets/sync
 * Sync markets from Polymarket
 */
app.post('/sync', async (c) => {
  try {
    const { pagination = false, pageSize = 500 } = await c.req.json().catch(() => ({}))
    
    const marketService = new MarketService(c.env)
    
    let result;
    if (pagination) {
      result = await marketService.syncMarketsWithPagination(pageSize)
    } else {
      result = await marketService.syncMarketsFromPolymarket()
    }
    
    return c.json({
      success: true,
      message: 'Markets synced successfully',
      result
    })
  } catch (error) {
    console.error('Error syncing markets:', error)
    return c.json({
      success: false,
      error: error.message
    }, 500)
  }
})

/**
 * POST /api/markets/sync/paginated
 * Sync markets with pagination (convenience endpoint)
 */
app.post('/sync/paginated', async (c) => {
  try {
    const { pageSize = 500 } = await c.req.json().catch(() => ({}))
    
    const marketService = new MarketService(c.env)
    const result = await marketService.syncMarketsWithPagination(pageSize)
    
    return c.json({
      success: true,
      message: 'Markets synced with pagination',
      result
    })
  } catch (error) {
    console.error('Error syncing markets:', error)
    return c.json({
      success: false,
      error: error.message
    }, 500)
  }
})

/**
 * GET /api/markets
 * List all markets
 */
app.get('/', async (c) => {
  const { active, category, limit = 100, offset = 0 } = c.req.query()
  
  const marketRepo = new MarketRepository(c.env.DB)
  
  let markets;
  if (active === 'true') {
    markets = await marketRepo.getActiveMarkets(parseInt(limit));
  } else if (category) {
    markets = await marketRepo.getMarketsByCategory(category, parseInt(limit));
  } else {
    markets = await marketRepo.getMarketsWithWhaleActivity(parseInt(limit));
  }
  
  return c.json({
    markets,
    count: markets.length
  })
})

/**
 * GET /api/markets/:id
 * Get market details
 */
app.get('/:id', async (c) => {
  const marketId = c.req.param('id')
  
  const marketRepo = new MarketRepository(c.env.DB)
  const market = await marketRepo.getMarketById(marketId)
  
  if (!market) {
    return c.json({ error: 'Market not found' }, 404)
  }
  
  return c.json(market)
})

/**
 * GET /api/markets/:id/snapshots
 * Get market price history
 */
app.get('/:id/snapshots', async (c) => {
  const conditionId = c.req.param('id')
  const { from, to, limit = 500 } = c.req.query()
  
  const marketRepo = new MarketRepository(c.env.DB)
  const snapshots = await marketRepo.getSnapshots(conditionId, {
    from: from ? parseInt(from) : undefined,
    to: to ? parseInt(to) : undefined,
    limit: parseInt(limit)
  })
  
  return c.json({
    snapshots,
    count: snapshots.length
  })
})

export default app
