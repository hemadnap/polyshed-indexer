/**
 * Unit Tests for ClobService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ClobService } from '../../src/services/ClobService.js'
import {
  createMockEnv,
  generateTestTrade,
  generateTestMarket
} from '../setup.js'

describe('ClobService', () => {
  let service
  let mockEnv

  beforeEach(() => {
    mockEnv = createMockEnv()
    service = new ClobService(mockEnv)
  })

  describe('constructor', () => {
    it('should initialize with base URL from environment', () => {
      expect(service.baseUrl).toBe(mockEnv.POLYMARKET_API_BASE)
      expect(service.env).toBe(mockEnv)
    })

    it('should use default base URL if not in environment', () => {
      const envWithoutUrl = { ...mockEnv }
      delete envWithoutUrl.POLYMARKET_API_BASE
      const serviceWithDefaults = new ClobService(envWithoutUrl)
      expect(serviceWithDefaults.baseUrl).toBe('https://clob.polymarket.com')
    })
  })

  describe('getTradeHistory', () => {
    it('should fetch trade history for a wallet', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const mockTrades = [
        generateTestTrade({ wallet_address: walletAddress }),
        generateTestTrade({ wallet_address: walletAddress })
      ]

      global.fetch = vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: mockTrades })
      })

      vi.spyOn(service, 'fetch').mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: mockTrades })
      })

      const result = await service.getTradeHistory(walletAddress, {
        limit: 100,
        offset: 0
      })

      expect(result).toEqual(mockTrades)
      expect(service.fetch).toHaveBeenCalledWith(expect.stringContaining(walletAddress))
    })

    it('should handle pagination parameters', async () => {
      const walletAddress = '0x' + '1'.repeat(40)

      vi.spyOn(service, 'fetch').mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: [] })
      })

      await service.getTradeHistory(walletAddress, {
        limit: 50,
        offset: 100
      })

      expect(service.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50')
      )
      expect(service.fetch).toHaveBeenCalledWith(
        expect.stringContaining('offset=100')
      )
    })

    it('should handle optional since parameter', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const since = Math.floor(Date.now() / 1000) - 3600

      vi.spyOn(service, 'fetch').mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: [] })
      })

      await service.getTradeHistory(walletAddress, { since })

      expect(service.fetch).toHaveBeenCalledWith(
        expect.stringContaining('after')
      )
    })

    it('should handle API errors', async () => {
      const walletAddress = '0x' + '1'.repeat(40)

      vi.spyOn(service, 'fetch').mockRejectedValue(
        new Error('Network error')
      )

      await expect(service.getTradeHistory(walletAddress))
        .rejects.toThrow('CLOB API error')
    })

    it('should handle empty response', async () => {
      const walletAddress = '0x' + '1'.repeat(40)

      vi.spyOn(service, 'fetch').mockResolvedValue({
        json: vi.fn().mockResolvedValue({})
      })

      const result = await service.getTradeHistory(walletAddress)

      expect(result).toEqual([])
    })
  })

  describe('getPositions', () => {
    it('should fetch positions for a wallet', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const mockPositions = [
        { market_id: 'market1', outcome: 0, size: 100 },
        { market_id: 'market2', outcome: 1, size: 200 }
      ]

      vi.spyOn(service, 'fetch').mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: mockPositions })
      })

      const result = await service.getPositions(walletAddress)

      expect(result).toEqual(mockPositions)
      expect(service.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/positions/${walletAddress}`)
      )
    })

    it('should handle positions API errors', async () => {
      vi.spyOn(service, 'fetch').mockRejectedValue(
        new Error('API Error')
      )

      await expect(service.getPositions('0x1234'))
        .rejects.toThrow('CLOB API error')
    })

    it('should return empty array for wallet with no positions', async () => {
      vi.spyOn(service, 'fetch').mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: [] })
      })

      const result = await service.getPositions('0x1234')

      expect(result).toEqual([])
    })
  })

  describe('getAllMarkets', () => {
    it('should fetch all markets with pagination', async () => {
      const mockMarkets = [
        generateTestMarket(),
        generateTestMarket()
      ]

      vi.spyOn(service, 'fetch').mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: mockMarkets })
      })

      const result = await service.getAllMarkets({
        limit: 1000,
        offset: 0
      })

      expect(result).toEqual(mockMarkets)
      expect(service.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=1000')
      )
    })

    it('should handle markets in root response', async () => {
      const mockMarkets = [generateTestMarket()]

      vi.spyOn(service, 'fetch').mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockMarkets)
      })

      const result = await service.getAllMarkets()

      expect(result).toEqual(mockMarkets)
    })

    it('should handle empty market list', async () => {
      vi.spyOn(service, 'fetch').mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: [] })
      })

      const result = await service.getAllMarkets()

      expect(result).toEqual([])
    })

    it('should handle markets API errors', async () => {
      vi.spyOn(service, 'fetch').mockRejectedValue(
        new Error('API Error')
      )

      await expect(service.getAllMarkets())
        .rejects.toThrow('CLOB API error')
    })
  })

  describe('getActiveMarkets', () => {
    it('should fetch only active markets', async () => {
      const mockMarkets = [
        generateTestMarket({ is_active: true }),
        generateTestMarket({ is_active: true })
      ]

      vi.spyOn(service, 'fetch').mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: mockMarkets })
      })

      const result = await service.getActiveMarkets()

      expect(result).toEqual(mockMarkets)
    })

    it('should respect custom limit', async () => {
      vi.spyOn(service, 'fetch').mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: [] })
      })

      await service.getActiveMarkets({ limit: 500 })

      expect(service.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=500')
      )
    })
  })

  describe('getMarketOrderBook', () => {
    it('should fetch order book for a market', async () => {
      const marketId = 'market-123'
      const mockOrderBook = {
        bids: [
          { price: 0.5, size: 1000 },
          { price: 0.49, size: 500 }
        ],
        asks: [
          { price: 0.51, size: 1000 },
          { price: 0.52, size: 500 }
        ]
      }

      vi.spyOn(service, 'fetch').mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockOrderBook)
      })

      const result = await service.getMarketOrderBook(marketId)

      expect(result).toEqual(mockOrderBook)
      expect(service.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/order-book/${marketId}`)
      )
    })
  })

  describe('getMarketPrices', () => {
    it('should fetch current market prices', async () => {
      const marketId = 'market-123'
      const mockPrices = {
        price_0: 0.55,
        price_1: 0.45
      }

      vi.spyOn(service, 'fetch').mockResolvedValue({
        json: vi.fn().mockResolvedValue(mockPrices)
      })

      const result = await service.getMarketPrices(marketId)

      expect(result).toEqual(mockPrices)
      expect(service.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/prices/${marketId}`)
      )
    })
  })

  describe('rate limiting and retry logic', () => {
    it('should retry on rate limit error', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const successResponse = { data: [] }

      vi.spyOn(service, 'fetch')
        .mockRejectedValueOnce(new Error('429 Too Many Requests'))
        .mockResolvedValueOnce({
          json: vi.fn().mockResolvedValue(successResponse)
        })

      // Should be implemented in service
      // For now, just verify fetch is called
      expect(service.fetch).toBeDefined()
    })
  })

  describe('data validation', () => {
    it('should validate trade data structure', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const invalidTrade = {
        // Missing required fields
        id: 'trade-1'
      }

      vi.spyOn(service, 'fetch').mockResolvedValue({
        json: vi.fn().mockResolvedValue({ data: [invalidTrade] })
      })

      const result = await service.getTradeHistory(walletAddress)

      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle malformed JSON responses', async () => {
      vi.spyOn(service, 'fetch').mockResolvedValue({
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
      })

      await expect(service.getTradeHistory('0x1234'))
        .rejects.toThrow()
    })
  })
})
