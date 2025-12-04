/**
 * Metrics Service
 * 
 * Calculate and aggregate performance metrics
 */

import { WhaleRepository } from '../repositories/WhaleRepository.js'
import { MetricsRepository } from '../repositories/MetricsRepository.js'
import { PositionRepository } from '../repositories/PositionRepository.js'

export class MetricsService {
  constructor(env) {
    this.env = env
    this.whaleRepo = new WhaleRepository(env.DB)
    this.metricsRepo = new MetricsRepository(env.DB)
    this.positionRepo = new PositionRepository(env.DB)
  }

  /**
   * Calculate hourly metrics for all whales
   */
  async calculateHourlyMetrics() {
    const whales = await this.whaleRepo.findAll({ limit: 1000 })
    
    for (const whale of whales) {
      try {
        await this.calculateWhaleMetrics(whale.wallet_address)
      } catch (error) {
        console.error(`Failed to calculate metrics for ${whale.wallet_address}:`, error)
      }
    }
    
    return { whales: whales.length }
  }

  /**
   * Calculate metrics for a specific whale
   */
  async calculateWhaleMetrics(walletAddress) {
    // Get all closed positions
    const closedPositions = await this.positionRepo.findClosedByWallet(walletAddress, {
      limit: 10000
    })
    
    if (closedPositions.length === 0) return
    
    // Calculate aggregate metrics
    const totalPnl = closedPositions.reduce((sum, p) => sum + p.realized_pnl, 0)
    const totalInvested = closedPositions.reduce((sum, p) => sum + p.total_invested, 0)
    const roi = totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0
    
    const winningTrades = closedPositions.filter(p => p.realized_pnl > 0)
    const winRate = (winningTrades.length / closedPositions.length) * 100
    
    // Calculate Sharpe ratio
    const returns = closedPositions.map(p => (p.realized_pnl / p.total_invested) * 100)
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
    )
    const sharpeRatio = stdDev > 0 ? avgReturn / stdDev : 0
    
    // Update whale record
    await this.whaleRepo.update(walletAddress, {
      total_pnl: totalPnl,
      total_roi: roi,
      win_rate: winRate,
      sharpe_ratio: sharpeRatio,
      total_trades: closedPositions.length
    })
  }

  /**
   * Generate daily rollups
   */
  async generateDailyRollups() {
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const whales = await this.whaleRepo.findAll({ limit: 1000 })
    
    for (const whale of whales) {
      await this.metricsRepo.generateDailyMetrics(whale.wallet_address, today)
    }
  }

  /**
   * Generate weekly rollups
   */
  async generateWeeklyRollups() {
    // Only run on Mondays
    const today = new Date()
    if (today.getDay() !== 1) return
    
    const whales = await this.whaleRepo.findAll({ limit: 1000 })
    
    for (const whale of whales) {
      await this.metricsRepo.generateWeeklyMetrics(whale.wallet_address)
    }
  }

  /**
   * Generate monthly rollups
   */
  async generateMonthlyRollups() {
    // Only run on 1st of month
    const today = new Date()
    if (today.getDate() !== 1) return
    
    const whales = await this.whaleRepo.findAll({ limit: 1000 })
    
    for (const whale of whales) {
      await this.metricsRepo.generateMonthlyMetrics(whale.wallet_address)
    }
  }

  /**
   * Cleanup old data
   */
  async cleanupOldData() {
    const cutoffDays = 90 // Keep 90 days
    const cutoffTimestamp = Math.floor(Date.now() / 1000) - (cutoffDays * 24 * 60 * 60)
    
    // Delete old market snapshots
    await this.env.DB.prepare(`
      DELETE FROM market_snapshots 
      WHERE snapshot_at < ?
    `).bind(cutoffTimestamp).run()
    
    // Delete old indexing logs
    await this.env.DB.prepare(`
      DELETE FROM indexing_log 
      WHERE started_at < ?
    `).bind(cutoffTimestamp).run()
    
    console.log(`Cleaned up data older than ${cutoffDays} days`)
  }

  /**
   * Get metrics for a specific whale
   */
  async getMetricsForWhale(walletAddress) {
    const metrics = await this.metricsRepo.findByWallet(walletAddress)
    if (!metrics) {
      return null
    }
    return metrics
  }

  /**
   * Get top performing whales by ROI
   */
  async getTopPerformers(limit = 10) {
    const performers = await this.metricsRepo.findTopByRoi(limit)
    return performers || []
  }
}
