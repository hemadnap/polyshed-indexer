/**
 * Event Detector Service
 * 
 * Detects interesting events in whale trading activity
 */

import { WhaleRepository } from '../repositories/WhaleRepository.js'
import { PositionRepository } from '../repositories/PositionRepository.js'
import { TradeRepository } from '../repositories/TradeRepository.js'

export class EventDetector {
  constructor(env) {
    this.env = env
    this.whaleRepo = new WhaleRepository(env.DB)
    this.positionRepo = new PositionRepository(env.DB)
    this.tradeRepo = new TradeRepository(env.DB)
  }

  /**
   * Detect events from a new trade
   */
  async detectEvents(walletAddress, trade) {
    const events = []
    
    // Check for different event types
    const newPosition = await this.detectNewPosition(walletAddress, trade)
    if (newPosition) events.push(newPosition)
    
    const reversal = await this.detectReversal(walletAddress, trade)
    if (reversal) events.push(reversal)
    
    const doubleDown = await this.detectDoubleDown(walletAddress, trade)
    if (doubleDown) events.push(doubleDown)
    
    const exit = await this.detectExit(walletAddress, trade)
    if (exit) events.push(exit)
    
    const largeTrade = await this.detectLargeTrade(walletAddress, trade)
    if (largeTrade) events.push(largeTrade)
    
    // Save events to database
    for (const event of events) {
      await this.saveEvent(walletAddress, event)
    }
    
    return events
  }

  /**
   * Detect new position entry
   */
  async detectNewPosition(walletAddress, trade) {
    if (trade.side !== 'BUY') return null
    
    // Check if this is a new position (no previous trades in this market/outcome)
    const previousTrades = await this.tradeRepo.findByMarketAndOutcome(
      walletAddress,
      trade.condition_id,
      trade.outcome_index,
      { limit: 1 }
    )
    
    if (previousTrades.length === 0) {
      return {
        type: 'NEW_POSITION',
        severity: trade.value > 1000 ? 'HIGH' : 'NORMAL',
        data: {
          size: trade.size,
          price: trade.price,
          value: trade.value,
          market: trade.market_name
        }
      }
    }
    
    return null
  }

  /**
   * Detect position reversal (switch from one outcome to opposite)
   */
  async detectReversal(walletAddress, trade) {
    if (trade.side !== 'BUY') return null
    
    // Check if whale has position in opposite outcome
    const oppositeOutcome = trade.outcome_index === 0 ? 1 : 0
    const oppositePosition = await this.positionRepo.findByMarketAndOutcome(
      walletAddress,
      trade.condition_id,
      oppositeOutcome
    )
    
    if (oppositePosition && oppositePosition.size > 0) {
      return {
        type: 'REVERSAL',
        severity: 'HIGH',
        data: {
          from_outcome: oppositeOutcome,
          to_outcome: trade.outcome_index,
          previous_size: oppositePosition.size,
          new_size: trade.size,
          market: trade.market_name
        }
      }
    }
    
    return null
  }

  /**
   * Detect double down (significantly increasing position)
   */
  async detectDoubleDown(walletAddress, trade) {
    if (trade.side !== 'BUY') return null
    
    const position = await this.positionRepo.findByMarketAndOutcome(
      walletAddress,
      trade.condition_id,
      trade.outcome_index
    )
    
    if (position && position.size > 0) {
      const increase = parseFloat(trade.size) / position.size
      
      if (increase > 0.5) { // 50% increase
        return {
          type: 'DOUBLE_DOWN',
          severity: increase > 1.0 ? 'HIGH' : 'NORMAL',
          data: {
            previous_size: position.size,
            added_size: trade.size,
            increase_percentage: increase * 100,
            market: trade.market_name
          }
        }
      }
    }
    
    return null
  }

  /**
   * Detect position exit
   */
  async detectExit(walletAddress, trade) {
    if (trade.side !== 'SELL') return null
    
    const position = await this.positionRepo.findByMarketAndOutcome(
      walletAddress,
      trade.condition_id,
      trade.outcome_index
    )
    
    // Position closed (or about to be)
    if (position) {
      const remainingSize = position.size - parseFloat(trade.size)
      
      if (remainingSize <= 0.001) {
        const pnl = (parseFloat(trade.size) * parseFloat(trade.price)) - position.total_invested
        
        return {
          type: 'EXIT',
          severity: Math.abs(pnl) > 500 ? 'HIGH' : 'NORMAL',
          data: {
            size: position.size,
            exit_price: trade.price,
            entry_price: position.avg_entry_price,
            pnl,
            market: trade.market_name
          }
        }
      }
    }
    
    return null
  }

  /**
   * Detect large trade (by value)
   */
  async detectLargeTrade(walletAddress, trade) {
    const value = parseFloat(trade.value || trade.size * trade.price)
    
    if (value > 5000) { // $5000 threshold
      return {
        type: 'LARGE_TRADE',
        severity: value > 20000 ? 'CRITICAL' : value > 10000 ? 'HIGH' : 'NORMAL',
        data: {
          side: trade.side,
          size: trade.size,
          price: trade.price,
          value,
          market: trade.market_name
        }
      }
    }
    
    return null
  }

  /**
   * Save event to database
   */
  async saveEvent(walletAddress, event) {
    await this.env.DB.prepare(`
      INSERT INTO whale_events (
        wallet_address, condition_id, event_type, event_data, severity, detected_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      walletAddress,
      event.data.condition_id || null,
      event.type,
      JSON.stringify(event.data),
      event.severity,
      Math.floor(Date.now() / 1000)
    ).run()
  }
}
