/**
 * Unit Tests for WhaleTrackerService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WhaleTrackerService } from '../src/services/WhaleTrackerService.js'
import {
  createMockEnv,
  createMockRepository,
  generateTestWhale,
  generateTestTrade,
  expectValidWhole
} from './setup.js'

describe('WhaleTrackerService', () => {
  let service
  let mockEnv

  beforeEach(() => {
    mockEnv = createMockEnv()
    service = new WhaleTrackerService(mockEnv)
  })

  describe('constructor', () => {
    it('should initialize with environment variables', () => {
      expect(service.env).toBe(mockEnv)
      expect(service.whaleRepo).toBeDefined()
      expect(service.tradeRepo).toBeDefined()
      expect(service.positionRepo).toBeDefined()
      expect(service.indexingRepo).toBeDefined()
      expect(service.clobService).toBeDefined()
      expect(service.tradeProcessor).toBeDefined()
      expect(service.eventDetector).toBeDefined()
    })
  })

  describe('updateActiveWhales', () => {
    it('should process active whales and return statistics', async () => {
      const testWhales = [
        generateTestWhale({ wallet_address: '0x' + '1'.repeat(40) }),
        generateTestWhale({ wallet_address: '0x' + '2'.repeat(40) })
      ]

      // Mock the repository methods
      vi.spyOn(service.whaleRepo, 'findAll').mockResolvedValue(testWhales)
      vi.spyOn(service, 'updateWhalePositions').mockResolvedValue({
        newTrades: 5,
        processed: 10
      })
      vi.spyOn(service.indexingRepo, 'logJobStart').mockResolvedValue('job-1')
      vi.spyOn(service.indexingRepo, 'logJobComplete').mockResolvedValue(undefined)

      const result = await service.updateActiveWhales()

      expect(result).toHaveProperty('processed')
      expect(result).toHaveProperty('newTrades')
      expect(result).toHaveProperty('duration')
      expect(result.processed).toBeGreaterThanOrEqual(0)
      expect(result.newTrades).toBeGreaterThanOrEqual(0)
    })

    it('should handle errors gracefully', async () => {
      vi.spyOn(service.whaleRepo, 'findAll').mockRejectedValue(new Error('DB Error'))
      vi.spyOn(service.indexingRepo, 'logJobStart').mockResolvedValue('job-1')
      vi.spyOn(service.indexingRepo, 'logJobFailed').mockResolvedValue(undefined)

      await expect(service.updateActiveWhales()).rejects.toThrow()
    })

    it('should respect MAX_WHALES_PER_UPDATE limit', async () => {
      const mockFindAll = vi.spyOn(service.whaleRepo, 'findAll')
      mockFindAll.mockResolvedValue([])
      vi.spyOn(service.indexingRepo, 'logJobStart').mockResolvedValue('job-1')
      vi.spyOn(service.indexingRepo, 'logJobComplete').mockResolvedValue(undefined)

      await service.updateActiveWhales()

      expect(mockFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          tracking_enabled: true,
          limit: 50 // Default value
        })
      )
    })
  })

  describe('updateWhalePositions', () => {
    it('should return zero trades if no new trades', async () => {
      const walletAddress = '0x' + '1'.repeat(40)

      vi.spyOn(service.indexingRepo, 'getStatus').mockResolvedValue({
        last_indexed_at: Math.floor(Date.now() / 1000) - 3600
      })
      vi.spyOn(service.clobService, 'getTradeHistory').mockResolvedValue([])

      const result = await service.updateWhalePositions(walletAddress)

      expect(result.newTrades).toBe(0)
      expect(result.processed).toBe(0)
    })

    it('should process multiple trades', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const trades = [
        generateTestTrade(),
        generateTestTrade(),
        generateTestTrade()
      ]

      vi.spyOn(service.indexingRepo, 'getStatus').mockResolvedValue({
        last_indexed_at: 0,
        total_trades_indexed: 0
      })
      vi.spyOn(service.clobService, 'getTradeHistory').mockResolvedValue(trades)
      vi.spyOn(service.tradeProcessor, 'processTrade')
        .mockResolvedValue(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
      vi.spyOn(service.indexingRepo, 'updateStatus').mockResolvedValue(undefined)
      vi.spyOn(service.whaleRepo, 'update').mockResolvedValue(undefined)

      const result = await service.updateWhalePositions(walletAddress)

      expect(result.processed).toBe(3)
      expect(result.newTrades).toBe(3)
    })

    it('should update indexing status after processing', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const mockUpdateStatus = vi.spyOn(service.indexingRepo, 'updateStatus')
      mockUpdateStatus.mockResolvedValue(undefined)

      vi.spyOn(service.indexingRepo, 'getStatus').mockResolvedValue({
        last_indexed_at: 0
      })
      vi.spyOn(service.clobService, 'getTradeHistory').mockResolvedValue([])
      vi.spyOn(service.whaleRepo, 'update').mockResolvedValue(undefined)

      await service.updateWhalePositions(walletAddress)

      expect(mockUpdateStatus).toHaveBeenCalled()
    })
  })

  describe('indexWhale', () => {
    it('should create whale if it does not exist', async () => {
      const walletAddress = '0x' + '1'.repeat(40)

      vi.spyOn(service.whaleRepo, 'findByAddress').mockResolvedValue(null)
      vi.spyOn(service.whaleRepo, 'create').mockResolvedValue(
        generateTestWhale({ wallet_address: walletAddress })
      )
      vi.spyOn(service.indexingRepo, 'updateStatus').mockResolvedValue(undefined)
      vi.spyOn(service.clobService, 'getTradeHistory').mockResolvedValue([])

      const result = await service.indexWhale(walletAddress)

      expect(service.whaleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          wallet_address: walletAddress,
          tracking_enabled: true
        })
      )
    })

    it('should handle full reindex flag', async () => {
      const walletAddress = '0x' + '1'.repeat(40)

      vi.spyOn(service.whaleRepo, 'findByAddress').mockResolvedValue(
        generateTestWhale({ wallet_address: walletAddress })
      )
      vi.spyOn(service.indexingRepo, 'updateStatus').mockResolvedValue(undefined)
      vi.spyOn(service.clobService, 'getTradeHistory').mockResolvedValue([])
      vi.spyOn(service.tradeProcessor, 'processTrade').mockResolvedValue(true)

      await service.indexWhale(walletAddress, { fullReindex: true })

      expect(service.indexingRepo.updateStatus).toHaveBeenCalledWith(
        walletAddress,
        expect.objectContaining({
          is_indexing: true
        })
      )
    })
  })
})
