/**
 * Whale Tracker Service
 * 
 * Core business logic for whale tracking and trade indexing
 */

import { WhaleRepository } from '../repositories/WhaleRepository.js'
import { TradeRepository } from '../repositories/TradeRepository.js'
import { PositionRepository } from '../repositories/PositionRepository.js'
import { IndexingRepository } from '../repositories/IndexingRepository.js'
import { ClobService } from './ClobService.js'
import { TradeProcessorService } from './TradeProcessorService.js'
import { EventDetector } from './EventDetector.js'

export class WhaleTrackerService {
  constructor(env) {
    this.env = env
    this.whaleRepo = new WhaleRepository(env.DB)
    this.tradeRepo = new TradeRepository(env.DB)
    this.positionRepo = new PositionRepository(env.DB)
    this.indexingRepo = new IndexingRepository(env.DB)
    this.clobService = new ClobService(env)
    this.tradeProcessor = new TradeProcessorService(env)
    this.eventDetector = new EventDetector(env)
  }

  /**
   * Update all active whales (called by cron)
   */
  async updateActiveWhales() {
    const startTime = Date.now()
    
    // Log job start
    const jobId = await this.indexingRepo.logJobStart('WHALE_UPDATE')
    
    try {
      // Get active whales
      const whales = await this.whaleRepo.findAll({
        tracking_enabled: true,
        limit: parseInt(this.env.MAX_WHALES_PER_UPDATE || 50)
      })
      
      let totalNewTrades = 0
      let processedCount = 0
      
      // Process each whale
      for (const whale of whales) {
        try {
          const result = await this.updateWhalePositions(whale.wallet_address)
          totalNewTrades += result.newTrades
          processedCount++
          
          // Rate limiting
          await this.sleep(parseInt(this.env.RATE_LIMIT_MS || 100))
        } catch (error) {
          console.error(`Failed to update whale ${whale.wallet_address}:`, error)
        }
      }
      
      // Log job completion
      await this.indexingRepo.logJobComplete(jobId, {
        records_processed: processedCount,
        duration_ms: Date.now() - startTime
      })
      
      return {
        processed: processedCount,
        newTrades: totalNewTrades,
        duration: Date.now() - startTime
      }
    } catch (error) {
      // Log job failure
      await this.indexingRepo.logJobFailed(jobId, error.message, {
        duration_ms: Date.now() - startTime
      })
      throw error
    }
  }

  /**
   * Update positions for a specific whale
   */
  async updateWhalePositions(walletAddress) {
    // Get current indexing status
    const status = await this.indexingRepo.getStatus(walletAddress)
    const lastIndexedAt = status?.last_indexed_at || 0
    
    // Fetch latest trades from CLOB API
    const trades = await this.clobService.getTradeHistory(walletAddress, {
      since: lastIndexedAt
    })
    
    if (trades.length === 0) {
      return { newTrades: 0, processed: 0 }
    }
    
    // Process each trade
    let newTrades = 0
    for (const trade of trades) {
      const isNew = await this.tradeProcessor.processTrade(walletAddress, trade)
      if (isNew) newTrades++
    }
    
    // Update indexing status
    await this.indexingRepo.updateStatus(walletAddress, {
      last_indexed_at: Math.floor(Date.now() / 1000),
      total_trades_indexed: (status?.total_trades_indexed || 0) + newTrades
    })
    
    // Update whale's last activity
    await this.whaleRepo.update(walletAddress, {
      last_activity_at: Math.floor(Date.now() / 1000)
    })
    
    return { newTrades, processed: trades.length }
  }

  /**
   * Full historical indexing for a whale
   */
  async indexWhale(walletAddress, options = {}) {
    const { fullReindex = false } = options
    
    // Check if whale exists
    let whale = await this.whaleRepo.findByAddress(walletAddress)
    if (!whale) {
      // Auto-create whale
      whale = await this.whaleRepo.create({
        wallet_address: walletAddress,
        display_name: walletAddress.substring(0, 10),
        tracking_enabled: true,
        first_seen_at: Math.floor(Date.now() / 1000),
        last_activity_at: Math.floor(Date.now() / 1000)
      })
    }
    
    // Mark as indexing
    await this.indexingRepo.updateStatus(walletAddress, {
      is_indexing: true,
      indexing_progress: 0
    })
    
    try {
      // Fetch all historical trades
      let allTrades = []
      let offset = 0
      const batchSize = parseInt(this.env.BATCH_SIZE || 100)
      
      while (true) {
        const trades = await this.clobService.getTradeHistory(walletAddress, {
          limit: batchSize,
          offset
        })
        
        if (trades.length === 0) break
        
        allTrades = allTrades.concat(trades)
        offset += batchSize
        
        // Update progress
        await this.indexingRepo.updateStatus(walletAddress, {
          indexing_progress: Math.min(0.9, allTrades.length / 1000)
        })
        
        // Rate limiting
        await this.sleep(parseInt(this.env.RATE_LIMIT_MS || 100))
      }
      
      // Process all trades
      let newCount = 0
      for (const trade of allTrades) {
        const isNew = await this.tradeProcessor.processTrade(walletAddress, trade)
        if (isNew) newCount++
      }
      
      // Update status
      await this.indexingRepo.updateStatus(walletAddress, {
        is_indexing: false,
        indexing_progress: 1,
        last_indexed_at: Math.floor(Date.now() / 1000),
        total_trades_indexed: allTrades.length,
        error_count: 0,
        last_error: null
      })
      
      return {
        totalTrades: allTrades.length,
        newTrades: newCount,
        wallet_address: walletAddress
      }
    } catch (error) {
      // Update error status
      await this.indexingRepo.updateStatus(walletAddress, {
        is_indexing: false,
        error_count: (await this.indexingRepo.getStatus(walletAddress))?.error_count + 1 || 1,
        last_error: error.message
      })
      
      throw error
    }
  }

  /**
   * Queue all whales for reindexing
   */
  async queueAllWhales() {
    const whales = await this.whaleRepo.findAll({
      tracking_enabled: true,
      limit: 1000 // High limit to get all
    })
    
    for (const whale of whales) {
      await this.indexingRepo.addToQueue({
        wallet_address: whale.wallet_address,
        priority: 0,
        scheduled_at: Math.floor(Date.now() / 1000)
      })
    }
    
    return {
      queued: whales.length
    }
  }

  /**
   * Helper: Sleep for ms
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
