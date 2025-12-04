/**
 * Trade Processor Service
 * 
 * Processes individual trades and updates positions
 */

import { TradeRepository } from '../repositories/TradeRepository.js'
import { PositionRepository } from '../repositories/PositionRepository.js'
import { WhaleRepository } from '../repositories/WhaleRepository.js'
import { EventDetector } from './EventDetector.js'

export class TradeProcessorService {
  constructor(env) {
    this.env = env
    this.tradeRepo = new TradeRepository(env.DB)
    this.positionRepo = new PositionRepository(env.DB)
    this.whaleRepo = new WhaleRepository(env.DB)
    this.eventDetector = new EventDetector(env)
  }

  /**
   * Process a single trade
   * Returns true if it's a new trade, false if it already exists
   */
  async processTrade(walletAddress, tradeData) {
    const tradeId = tradeData.id || `${tradeData.transaction_hash}_${tradeData.index}`
    
    // Check if trade already exists
    const existing = await this.tradeRepo.findById(tradeId)
    if (existing) {
      return false // Already processed
    }
    
    // Insert trade
    await this.tradeRepo.create({
      id: tradeId,
      wallet_address: walletAddress,
      condition_id: tradeData.condition_id,
      outcome_index: tradeData.outcome_index,
      side: tradeData.side, // BUY or SELL
      size: parseFloat(tradeData.size),
      price: parseFloat(tradeData.price),
      value: parseFloat(tradeData.value || tradeData.size * tradeData.price),
      fee: parseFloat(tradeData.fee || 0),
      transaction_hash: tradeData.transaction_hash,
      block_number: tradeData.block_number,
      traded_at: tradeData.timestamp || Math.floor(Date.now() / 1000)
    })
    
    // Update or create position
    await this.updatePosition(walletAddress, tradeData)
    
    // Detect events
    await this.eventDetector.detectEvents(walletAddress, tradeData)
    
    // Broadcast to WebSocket subscribers
    await this.broadcastTrade(walletAddress, tradeData)
    
    return true // New trade
  }

  /**
   * Update position based on trade
   */
  async updatePosition(walletAddress, trade) {
    const { condition_id, outcome_index, side, size, price } = trade
    
    // Get current position
    let position = await this.positionRepo.findByMarketAndOutcome(
      walletAddress,
      condition_id,
      outcome_index
    )
    
    if (side === 'BUY') {
      if (!position) {
        // New position
        position = await this.positionRepo.create({
          wallet_address: walletAddress,
          condition_id,
          outcome_index,
          size: parseFloat(size),
          avg_entry_price: parseFloat(price),
          total_invested: parseFloat(size) * parseFloat(price),
          current_price: parseFloat(price),
          current_value: parseFloat(size) * parseFloat(price),
          unrealized_pnl: 0,
          unrealized_roi: 0,
          opened_at: trade.timestamp || Math.floor(Date.now() / 1000)
        })
      } else {
        // Add to position
        const newSize = position.size + parseFloat(size)
        const newInvested = position.total_invested + (parseFloat(size) * parseFloat(price))
        const newAvgPrice = newInvested / newSize
        
        await this.positionRepo.update(position.id, {
          size: newSize,
          avg_entry_price: newAvgPrice,
          total_invested: newInvested,
          current_value: newSize * position.current_price,
          unrealized_pnl: (newSize * position.current_price) - newInvested,
          unrealized_roi: (((newSize * position.current_price) - newInvested) / newInvested) * 100
        })
      }
    } else if (side === 'SELL') {
      if (position) {
        const sellSize = parseFloat(size)
        const newSize = position.size - sellSize
        
        if (newSize <= 0.001) {
          // Position closed
          const avgExitPrice = parseFloat(price)
          const totalReturned = position.size * avgExitPrice
          const realizedPnl = totalReturned - position.total_invested
          const realizedRoi = (realizedPnl / position.total_invested) * 100
          
          // Move to closed_positions
          await this.positionRepo.close(position.id, {
            avg_exit_price: avgExitPrice,
            total_returned: totalReturned,
            realized_pnl: realizedPnl,
            realized_roi: realizedRoi,
            closed_at: trade.timestamp || Math.floor(Date.now() / 1000),
            hold_duration: (trade.timestamp || Math.floor(Date.now() / 1000)) - position.opened_at
          })
        } else {
          // Partial exit
          const newInvested = position.total_invested * (newSize / position.size)
          
          await this.positionRepo.update(position.id, {
            size: newSize,
            total_invested: newInvested,
            current_value: newSize * position.current_price,
            unrealized_pnl: (newSize * position.current_price) - newInvested,
            unrealized_roi: (((newSize * position.current_price) - newInvested) / newInvested) * 100
          })
        }
      }
    }
    
    // Update whale aggregate stats
    await this.updateWhaleStats(walletAddress)
  }

  /**
   * Update whale's aggregate statistics
   */
  async updateWhaleStats(walletAddress) {
    // Get all positions
    const positions = await this.positionRepo.findByWallet(walletAddress, { limit: 1000 })
    
    // Get all closed positions
    const closedPositions = await this.positionRepo.findClosedByWallet(walletAddress, { limit: 1000 })
    
    // Calculate metrics
    const activePositionsCount = positions.length
    const totalPnl = positions.reduce((sum, p) => sum + p.unrealized_pnl, 0) +
                      closedPositions.reduce((sum, p) => sum + p.realized_pnl, 0)
    
    const totalInvested = positions.reduce((sum, p) => sum + p.total_invested, 0) +
                          closedPositions.reduce((sum, p) => sum + p.total_invested, 0)
    
    const totalRoi = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0
    
    const winningTrades = closedPositions.filter(p => p.realized_pnl > 0).length
    const winRate = closedPositions.length > 0 ? (winningTrades / closedPositions.length) * 100 : 0
    
    // Update whale
    await this.whaleRepo.update(walletAddress, {
      total_pnl: totalPnl,
      total_roi: totalRoi,
      win_rate: winRate,
      active_positions_count: activePositionsCount,
      total_trades: closedPositions.length,
      updated_at: Math.floor(Date.now() / 1000)
    })
  }

  /**
   * Broadcast trade to WebSocket subscribers
   */
  async broadcastTrade(walletAddress, trade) {
    try {
      // Get Durable Object
      const doId = this.env.WHALE_TRACKER_DO.idFromName('whale-tracker')
      const stub = this.env.WHALE_TRACKER_DO.get(doId)
      
      // Send broadcast request
      await stub.fetch('https://fake-host/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: walletAddress,
          trade: {
            id: trade.id,
            market: trade.market_name || 'Unknown Market',
            side: trade.side,
            size: trade.size,
            price: trade.price,
            value: trade.value,
            timestamp: trade.timestamp
          }
        })
      })
    } catch (error) {
      console.error('Failed to broadcast trade:', error)
    }
  }
}
