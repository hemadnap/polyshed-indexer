/**
 * Unit Tests for MetricsService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MetricsService } from '../../src/services/MetricsService.js'
import {
  createMockEnv,
  generateTestWhale,
  generateTestPosition
} from '../setup.js'

describe('MetricsService', () => {
  let service
  let mockEnv

  beforeEach(() => {
    mockEnv = createMockEnv()
    service = new MetricsService(mockEnv)
  })

  describe('constructor', () => {
    it('should initialize with repositories', () => {
      expect(service.env).toBe(mockEnv)
      expect(service.whaleRepo).toBeDefined()
      expect(service.metricsRepo).toBeDefined()
      expect(service.positionRepo).toBeDefined()
    })
  })

  describe('calculateHourlyMetrics', () => {
    it('should calculate metrics for all whales', async () => {
      const mockWhales = [
        generateTestWhale(),
        generateTestWhale()
      ]

      vi.spyOn(service.whaleRepo, 'findAll')
        .mockResolvedValue(mockWhales)

      vi.spyOn(service, 'calculateWhaleMetrics')
        .mockResolvedValue(undefined)

      const result = await service.calculateHourlyMetrics()

      expect(result.whales).toBe(2)
      expect(service.calculateWhaleMetrics).toHaveBeenCalledTimes(2)
    })

    it('should continue on individual calculation errors', async () => {
      const mockWhales = [
        generateTestWhale(),
        generateTestWhale()
      ]

      vi.spyOn(service.whaleRepo, 'findAll')
        .mockResolvedValue(mockWhales)

      let callCount = 0
      vi.spyOn(service, 'calculateWhaleMetrics')
        .mockImplementation(async () => {
          callCount++
          if (callCount === 1) throw new Error('Calculation failed')
        })

      await service.calculateHourlyMetrics()

      expect(service.calculateWhaleMetrics).toHaveBeenCalledTimes(2)
    })

    it('should handle empty whale list', async () => {
      vi.spyOn(service.whaleRepo, 'findAll')
        .mockResolvedValue([])

      const result = await service.calculateHourlyMetrics()

      expect(result.whales).toBe(0)
    })
  })

  describe('calculateWhaleMetrics', () => {
    it('should calculate PnL and ROI', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const closedPositions = [
        generateTestPosition({ 
          realized_pnl: 1000, 
          total_invested: 10000 
        }),
        generateTestPosition({ 
          realized_pnl: -500, 
          total_invested: 5000 
        })
      ]

      vi.spyOn(service.positionRepo, 'findClosedByWallet')
        .mockResolvedValue(closedPositions)

      vi.spyOn(service.whaleRepo, 'update')
        .mockResolvedValue(generateTestWhale())

      await service.calculateWhaleMetrics(walletAddress)

      expect(service.whaleRepo.update).toHaveBeenCalledWith(
        walletAddress,
        expect.objectContaining({
          total_pnl: 500,
          total_roi: expect.any(Number),
          total_trades: 2
        })
      )
    })

    it('should calculate win rate', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const closedPositions = [
        generateTestPosition({ realized_pnl: 1000 }),
        generateTestPosition({ realized_pnl: 500 }),
        generateTestPosition({ realized_pnl: -200 })
      ]

      vi.spyOn(service.positionRepo, 'findClosedByWallet')
        .mockResolvedValue(closedPositions)

      vi.spyOn(service.whaleRepo, 'update')
        .mockResolvedValue(generateTestWhale())

      await service.calculateWhaleMetrics(walletAddress)

      const updateCall = service.whaleRepo.update.mock.calls[0]
      const metrics = updateCall[1]

      expect(metrics.win_rate).toBe(66.67)
    })

    it('should calculate Sharpe ratio', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const closedPositions = [
        generateTestPosition({ 
          realized_pnl: 1000, 
          total_invested: 10000 
        }),
        generateTestPosition({ 
          realized_pnl: 500, 
          total_invested: 10000 
        }),
        generateTestPosition({ 
          realized_pnl: 2000, 
          total_invested: 10000 
        })
      ]

      vi.spyOn(service.positionRepo, 'findClosedByWallet')
        .mockResolvedValue(closedPositions)

      vi.spyOn(service.whaleRepo, 'update')
        .mockResolvedValue(generateTestWhale())

      await service.calculateWhaleMetrics(walletAddress)

      const updateCall = service.whaleRepo.update.mock.calls[0]
      const metrics = updateCall[1]

      expect(metrics.sharpe_ratio).toBeDefined()
      expect(typeof metrics.sharpe_ratio).toBe('number')
    })

    it('should handle zero total invested', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const closedPositions = [
        generateTestPosition({ total_invested: 0 })
      ]

      vi.spyOn(service.positionRepo, 'findClosedByWallet')
        .mockResolvedValue(closedPositions)

      vi.spyOn(service.whaleRepo, 'update')
        .mockResolvedValue(generateTestWhale())

      await service.calculateWhaleMetrics(walletAddress)

      const updateCall = service.whaleRepo.update.mock.calls[0]
      const metrics = updateCall[1]

      expect(metrics.total_roi).toBe(0)
    })

    it('should skip calculation for whale with no closed positions', async () => {
      const walletAddress = '0x' + '1'.repeat(40)

      vi.spyOn(service.positionRepo, 'findClosedByWallet')
        .mockResolvedValue([])

      vi.spyOn(service.whaleRepo, 'update')

      await service.calculateWhaleMetrics(walletAddress)

      expect(service.whaleRepo.update).not.toHaveBeenCalled()
    })
  })

  describe('generateDailyRollups', () => {
    it('should generate daily metrics for all whales', async () => {
      const mockWhales = [
        generateTestWhale(),
        generateTestWhale()
      ]

      vi.spyOn(service.whaleRepo, 'findAll')
        .mockResolvedValue(mockWhales)

      vi.spyOn(service.metricsRepo, 'generateDailyMetrics')
        .mockResolvedValue(true)

      await service.generateDailyRollups()

      expect(service.metricsRepo.generateDailyMetrics).toHaveBeenCalledTimes(2)
    })

    it('should use correct date format', async () => {
      const mockWhales = [generateTestWhale()]

      vi.spyOn(service.whaleRepo, 'findAll')
        .mockResolvedValue(mockWhales)

      vi.spyOn(service.metricsRepo, 'generateDailyMetrics')
        .mockResolvedValue(true)

      await service.generateDailyRollups()

      const dateCall = service.metricsRepo.generateDailyMetrics.mock.calls[0]
      expect(dateCall[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })
  })

  describe('generateWeeklyRollups', () => {
    it('should only run on Mondays', async () => {
      const today = new Date()
      const dayOfWeek = today.getDay()

      vi.spyOn(service.whaleRepo, 'findAll')
      vi.spyOn(service.metricsRepo, 'generateWeeklyMetrics')

      await service.generateWeeklyRollups()

      if (dayOfWeek === 1) { // Monday
        expect(service.whaleRepo.findAll).toHaveBeenCalled()
      } else {
        expect(service.whaleRepo.findAll).not.toHaveBeenCalled()
      }
    })

    it('should generate metrics for all whales on Monday', async () => {
      // Mock Date to return Monday
      const mondayDate = new Date(2024, 0, 1) // Jan 1, 2024 is Monday
      vi.useFakeTimers()
      vi.setSystemTime(mondayDate)

      const mockWhales = [
        generateTestWhale(),
        generateTestWhale()
      ]

      vi.spyOn(service.whaleRepo, 'findAll')
        .mockResolvedValue(mockWhales)

      vi.spyOn(service.metricsRepo, 'generateWeeklyMetrics')
        .mockResolvedValue(true)

      await service.generateWeeklyRollups()

      expect(service.metricsRepo.generateWeeklyMetrics).toHaveBeenCalledTimes(2)

      vi.useRealTimers()
    })
  })

  describe('getMetricsForWhale', () => {
    it('should retrieve whale metrics', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const mockMetrics = {
        wallet_address: walletAddress,
        total_pnl: 50000,
        total_roi: 0.15,
        win_rate: 0.65,
        sharpe_ratio: 1.5
      }

      vi.spyOn(service.metricsRepo, 'findByWallet')
        .mockResolvedValue(mockMetrics)

      const result = await service.getMetricsForWhale(walletAddress)

      expect(result).toEqual(mockMetrics)
    })
  })

  describe('getTopPerformers', () => {
    it('should retrieve top performing whales', async () => {
      const topPerformers = [
        generateTestWhale({ total_roi: 0.50 }),
        generateTestWhale({ total_roi: 0.40 }),
        generateTestWhale({ total_roi: 0.30 })
      ]

      vi.spyOn(service.metricsRepo, 'findTopByRoi')
        .mockResolvedValue(topPerformers)

      const result = await service.getTopPerformers(3)

      expect(result).toHaveLength(3)
      expect(result[0].total_roi).toBeGreaterThanOrEqual(result[1].total_roi)
    })

    it('should support custom limit', async () => {
      const topPerformers = [
        generateTestWhale(),
        generateTestWhale()
      ]

      vi.spyOn(service.metricsRepo, 'findTopByRoi')
        .mockResolvedValue(topPerformers)

      await service.getTopPerformers(10)

      expect(service.metricsRepo.findTopByRoi).toHaveBeenCalledWith(10)
    })
  })

  describe('error handling', () => {
    it('should handle database errors', async () => {
      const error = new Error('Database error')
      vi.spyOn(service.whaleRepo, 'findAll')
        .mockRejectedValue(error)

      await expect(service.calculateHourlyMetrics())
        .rejects.toThrow('Database error')
    })

    it('should handle calculation errors', async () => {
      const mockWhales = [generateTestWhale()]
      const error = new Error('Calculation failed')

      vi.spyOn(service.whaleRepo, 'findAll')
        .mockResolvedValue(mockWhales)

      vi.spyOn(service, 'calculateWhaleMetrics')
        .mockRejectedValue(error)

      // Should not throw but log error
      await expect(service.calculateHourlyMetrics()).resolves.toBeDefined()
    })
  })

  describe('performance metrics', () => {
    it('should handle large number of positions', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const manyPositions = Array.from({ length: 10000 }, () =>
        generateTestPosition({ total_invested: 10000 })
      )

      vi.spyOn(service.positionRepo, 'findClosedByWallet')
        .mockResolvedValue(manyPositions)

      vi.spyOn(service.whaleRepo, 'update')
        .mockResolvedValue(generateTestWhale())

      const start = performance.now()
      await service.calculateWhaleMetrics(walletAddress)
      const duration = performance.now() - start

      // Should complete in reasonable time
      expect(duration).toBeLessThan(5000) // 5 seconds
    })
  })
})
