/**
 * Unit Tests for MarketService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MarketService } from '../../src/services/MarketService.js'
import {
  createMockEnv,
  generateTestMarket
} from '../setup.js'

describe('MarketService', () => {
  let service
  let mockEnv

  beforeEach(() => {
    mockEnv = createMockEnv()
    service = new MarketService(mockEnv)
  })

  describe('constructor', () => {
    it('should initialize with environment variables', () => {
      expect(service.env).toBe(mockEnv)
      expect(service.marketRepo).toBeDefined()
      expect(service.clobService).toBeDefined()
    })
  })

  describe('syncMarketsFromPolymarket', () => {
    it('should fetch and sync markets from Polymarket', async () => {
      const mockMarkets = [
        generateTestMarket(),
        generateTestMarket()
      ]

      vi.spyOn(service.clobService, 'getActiveMarkets')
        .mockResolvedValue(mockMarkets)
      
      vi.spyOn(service.marketRepo, 'bulkUpsertFromPolymarket')
        .mockResolvedValue({ count: 2, errors: 0 })

      const result = await service.syncMarketsFromPolymarket()

      expect(service.clobService.getActiveMarkets).toHaveBeenCalledWith({
        limit: 1000
      })
      expect(service.marketRepo.bulkUpsertFromPolymarket).toHaveBeenCalledWith(mockMarkets)
      expect(result.count).toBe(2)
      expect(result.errors).toBe(0)
    })

    it('should handle sync errors gracefully', async () => {
      const error = new Error('API Error')
      vi.spyOn(service.clobService, 'getActiveMarkets')
        .mockRejectedValue(error)

      await expect(service.syncMarketsFromPolymarket()).rejects.toThrow('API Error')
    })

    it('should handle empty market list', async () => {
      vi.spyOn(service.clobService, 'getActiveMarkets')
        .mockResolvedValue([])
      
      vi.spyOn(service.marketRepo, 'bulkUpsertFromPolymarket')
        .mockResolvedValue({ count: 0, errors: 0 })

      const result = await service.syncMarketsFromPolymarket()

      expect(result.count).toBe(0)
      expect(result.errors).toBe(0)
    })
  })

  describe('syncMarketsWithPagination', () => {
    it('should paginate through markets and sync all pages', async () => {
      const page1 = [generateTestMarket(), generateTestMarket()]
      const page2 = [generateTestMarket()]

      let callCount = 0
      vi.spyOn(service.clobService, 'getAllMarkets')
        .mockImplementation(async (options) => {
          callCount++
          if (options.offset === 0) return page1
          if (options.offset === 500) return page2
          return []
        })

      vi.spyOn(service.marketRepo, 'bulkUpsertFromPolymarket')
        .mockResolvedValue({ count: 3, errors: 0 })

      const result = await service.syncMarketsWithPagination(500)

      expect(result.totalSynced).toBe(6) // 3 per page * 2 calls
      expect(result.pages).toBe(2)
      expect(result.totalErrors).toBe(0)
    })

    it('should continue on individual page errors', async () => {
      const page1 = [generateTestMarket()]
      const page2 = [generateTestMarket()]

      let callCount = 0
      vi.spyOn(service.clobService, 'getAllMarkets')
        .mockImplementation(async (options) => {
          callCount++
          if (options.offset === 0) return page1
          if (options.offset === 500) throw new Error('Page error')
          if (options.offset === 1000) return page2
          return []
        })

      vi.spyOn(service.marketRepo, 'bulkUpsertFromPolymarket')
        .mockResolvedValue({ count: 1, errors: 0 })

      const result = await service.syncMarketsWithPagination(500)

      expect(result.totalSynced).toBe(2)
      expect(result.pages).toBe(2)
      expect(result.totalErrors).toBe(1)
    })

    it('should respect custom page size', async () => {
      vi.spyOn(service.clobService, 'getAllMarkets')
        .mockResolvedValue([])

      vi.spyOn(service.marketRepo, 'bulkUpsertFromPolymarket')
        .mockResolvedValue({ count: 0, errors: 0 })

      await service.syncMarketsWithPagination(250)

      // Verify getAllMarkets was called with custom page size
      expect(service.clobService.getAllMarkets).toHaveBeenCalledWith({
        limit: 250,
        offset: 0
      })
    })

    it('should handle API rate limiting with sleep', async () => {
      const page1 = [generateTestMarket()]
      const page2 = [generateTestMarket()]

      vi.spyOn(service.clobService, 'getAllMarkets')
        .mockImplementationOnce(async () => page1)
        .mockImplementationOnce(async () => page2)
        .mockImplementationOnce(async () => [])

      vi.spyOn(service.marketRepo, 'bulkUpsertFromPolymarket')
        .mockResolvedValue({ count: 1, errors: 0 })

      const sleepSpy = vi.spyOn(global, 'setTimeout')

      await service.syncMarketsWithPagination(500)

      // Verify sleep was called for rate limiting
      expect(sleepSpy).toHaveBeenCalled()
    })
  })

  describe('captureSnapshots', () => {
    it('should capture price snapshots for all active markets', async () => {
      const mockMarkets = [
        generateTestMarket({ is_active: true }),
        generateTestMarket({ is_active: true })
      ]

      vi.spyOn(service.marketRepo, 'findAll')
        .mockResolvedValue(mockMarkets)

      vi.spyOn(service.marketRepo, 'saveSnapshot')
        .mockResolvedValue(true)

      vi.spyOn(service.clobService, 'getMarketPrices')
        .mockResolvedValue({ price_0: 0.5, price_1: 0.5 })

      const result = await service.captureSnapshots()

      expect(service.marketRepo.findAll).toHaveBeenCalledWith({
        active: true,
        limit: 10000
      })
      expect(service.marketRepo.saveSnapshot).toHaveBeenCalled()
    })

    it('should handle snapshot capture errors', async () => {
      const mockMarkets = [generateTestMarket()]

      vi.spyOn(service.marketRepo, 'findAll')
        .mockResolvedValue(mockMarkets)

      vi.spyOn(service.clobService, 'getMarketPrices')
        .mockRejectedValue(new Error('Price fetch failed'))

      // Should not throw, but log error
      const result = await service.captureSnapshots()
      expect(result).toBeDefined()
    })

    it('should skip inactive markets', async () => {
      const mockMarkets = [
        generateTestMarket({ is_active: false })
      ]

      vi.spyOn(service.marketRepo, 'findAll')
        .mockResolvedValue(mockMarkets)

      vi.spyOn(service.marketRepo, 'saveSnapshot')
        .mockResolvedValue(true)

      await service.captureSnapshots()

      expect(service.marketRepo.saveSnapshot).not.toHaveBeenCalled()
    })
  })

  describe('getMarketDetails', () => {
    it('should retrieve market details with full context', async () => {
      const conditionId = 'test-condition-id'
      const mockMarket = generateTestMarket({ condition_id: conditionId })
      const mockPositions = [
        { whale_address: '0x1234', size: 100, outcome: 0 }
      ]
      const mockTrades = [
        { transaction_hash: '0xtx1', side: 'BUY', size: 50 }
      ]

      vi.spyOn(service.marketRepo, 'findByConditionId')
        .mockResolvedValue(mockMarket)

      vi.spyOn(service.marketRepo, 'getPositionsByMarket')
        .mockResolvedValue(mockPositions)

      vi.spyOn(service.marketRepo, 'getTradesByMarket')
        .mockResolvedValue(mockTrades)

      const result = await service.getMarketDetails(conditionId)

      expect(result).toHaveProperty('market')
      expect(result).toHaveProperty('positions')
      expect(result).toHaveProperty('trades')
      expect(result.market.condition_id).toBe(conditionId)
    })

    it('should return null for non-existent market', async () => {
      vi.spyOn(service.marketRepo, 'findByConditionId')
        .mockResolvedValue(null)

      const result = await service.getMarketDetails('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getMarketStatistics', () => {
    it('should calculate market statistics', async () => {
      const conditionId = 'test-condition'
      const mockMarket = generateTestMarket({
        condition_id: conditionId,
        total_volume: 1000000,
        total_liquidity: 500000
      })
      const mockPositions = [
        { size: 1000, current_value: 1100 },
        { size: 500, current_value: 450 }
      ]

      vi.spyOn(service.marketRepo, 'findByConditionId')
        .mockResolvedValue(mockMarket)

      vi.spyOn(service.marketRepo, 'getPositionsByMarket')
        .mockResolvedValue(mockPositions)

      const result = await service.getMarketStatistics(conditionId)

      expect(result).toHaveProperty('total_volume')
      expect(result).toHaveProperty('total_liquidity')
      expect(result).toHaveProperty('position_count')
      expect(result).toHaveProperty('average_position_value')
    })
  })
})
