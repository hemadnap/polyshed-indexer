/**
 * Market Service
 * 
 * Market data management and snapshots
 */

import { MarketRepository } from '../repositories/MarketRepository.js'
import { ClobService } from './ClobService.js'

export class MarketService {
  constructor(env) {
    this.env = env
    this.marketRepo = new MarketRepository(env.DB)
    this.clobService = new ClobService(env)
  }

  /**
   * Sync all active markets from Polymarket API
   */
  async syncMarketsFromPolymarket() {
    console.log('Starting market sync from Polymarket...')
    
    try {
      // Fetch all active markets from Polymarket
      const polymarketMarkets = await this.clobService.getActiveMarkets({
        limit: 1000
      })
      
      console.log(`Fetched ${polymarketMarkets.length} active markets from Polymarket`)
      
      // Bulk upsert into database
      const result = await this.marketRepo.bulkUpsertFromPolymarket(polymarketMarkets)
      
      console.log(`Synced ${result.count} markets, ${result.errors} errors`)
      
      return result
    } catch (error) {
      console.error('Error syncing markets from Polymarket:', error)
      throw error
    }
  }

  /**
   * Sync markets with pagination
   */
  async syncMarketsWithPagination(pageSize = 500) {
    console.log(`Starting paginated market sync (page size: ${pageSize})...`)
    
    const results = {
      totalSynced: 0,
      totalErrors: 0,
      pages: 0
    }
    
    let offset = 0
    let hasMore = true
    
    while (hasMore) {
      try {
        const polymarketMarkets = await this.clobService.getAllMarkets({
          limit: pageSize,
          offset: offset
        })
        
        if (!polymarketMarkets || polymarketMarkets.length === 0) {
          hasMore = false
          break
        }
        
        const result = await this.marketRepo.bulkUpsertFromPolymarket(polymarketMarkets)
        
        results.totalSynced += result.count
        results.totalErrors += result.errors
        results.pages++
        
        console.log(`Page ${results.pages}: Synced ${result.count} markets, ${result.errors} errors`)
        
        offset += pageSize
        
        // Rate limiting
        await this.sleep(500)
      } catch (error) {
        console.error(`Error on page ${results.pages}:`, error)
        results.totalErrors++
        
        // Don't break on error, continue with next page
        offset += pageSize
      }
    }
    
    console.log(`Pagination complete: Total synced: ${results.totalSynced}, Total errors: ${results.totalErrors}, Pages: ${results.pages}`)
    
    return results
  }

  /**
   * Capture price snapshots for all active markets
   */
  async captureSnapshots() {
    const markets = await this.marketRepo.findAll({
      active: true,
      limit: 1000
    })
    
    let snapshotCount = 0
    
    for (const market of markets) {
      try {
        const outcomes = JSON.parse(market.outcomes || '[]')
        
        for (let i = 0; i < outcomes.length; i++) {
          const price = await this.clobService.getPrice(market.condition_id, i)

          if (price !== null) {
            await this.marketRepo.saveSnapshot({
              condition_id: market.condition_id,
              outcome_index: i,
              price,
              snapshot_at: Math.floor(Date.now() / 1000)
            })

            snapshotCount++
          }
        }
        
        // Rate limiting
        await this.sleep(100)
      } catch (error) {
        console.error(`Failed to capture snapshot for ${market.condition_id}:`, error)
      }
    }
    
    return {
      markets: markets.length,
      snapshots: snapshotCount
    }
  }

  /**
   * Update market metadata
   */
  async updateMarket(conditionId) {
    const marketData = await this.clobService.getMarket(conditionId)

    await this.marketRepo.upsert({
      condition_id: conditionId,
      market_slug: marketData.slug,
      question: marketData.question,
      description: marketData.description,
      category: marketData.category,
      end_date: marketData.end_date,
      is_active: marketData.active,
      outcomes: JSON.stringify(marketData.outcomes)
    })
  }

  /**
   * Save a market snapshot (alias for createSnapshot)
   */
  async saveSnapshot(snapshot) {
    return await this.marketRepo.createSnapshot(snapshot)
  }

  /**
   * Find market by condition ID
   */
  async findByConditionId(conditionId) {
    return await this.marketRepo.getMarketById(conditionId)
  }

  /**
   * Get market details with positions and trades
   */
  async getMarketDetails(conditionId) {
    const market = await this.marketRepo.findByConditionId(conditionId)

    if (!market) {
      return null
    }

    const positions = await this.marketRepo.getPositionsByMarket(conditionId)
    const trades = await this.marketRepo.getTradesByMarket(conditionId)

    return {
      market,
      positions,
      trades
    }
  }

  /**
   * Get market statistics
   */
  async getMarketStatistics(conditionId) {
    const market = await this.marketRepo.findByConditionId(conditionId)

    if (!market) {
      return null
    }

    const positions = await this.marketRepo.getPositionsByMarket(conditionId)

    const position_count = positions.length
    const total_position_value = positions.reduce((sum, p) => sum + (p.current_value || 0), 0)
    const average_position_value = position_count > 0 ? total_position_value / position_count : 0

    return {
      total_volume: market.total_volume || 0,
      total_liquidity: market.total_liquidity || 0,
      position_count,
      total_position_value,
      average_position_value
    }
  }

  /**
   * Helper: Sleep for ms
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
