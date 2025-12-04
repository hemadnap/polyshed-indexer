/**
 * Unit Tests for TradeProcessorService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TradeProcessorService } from '../src/services/TradeProcessorService.js'
import {
  createMockEnv,
  generateTestTrade,
  generateTestPosition,
  expectValidTrade,
  expectValidPosition
} from './setup.js'

describe('TradeProcessorService', () => {
  let service
  let mockEnv

  beforeEach(() => {
    mockEnv = createMockEnv()
    service = new TradeProcessorService(mockEnv)
  })

  describe('constructor', () => {
    it('should initialize dependencies', () => {
      expect(service.env).toBe(mockEnv)
      expect(service.tradeRepo).toBeDefined()
      expect(service.positionRepo).toBeDefined()
      expect(service.whaleRepo).toBeDefined()
      expect(service.eventDetector).toBeDefined()
    })
  })

  describe('processTrade', () => {
    it('should return false if trade already exists', async () => {
      const tradeData = generateTestTrade()
      const walletAddress = tradeData.wallet_address

      vi.spyOn(service.tradeRepo, 'findById').mockResolvedValue(tradeData)

      const result = await service.processTrade(walletAddress, tradeData)

      expect(result).toBe(false)
    })

    it('should create new trade and return true', async () => {
      const tradeData = generateTestTrade()
      const walletAddress = tradeData.wallet_address

      vi.spyOn(service.tradeRepo, 'findById').mockResolvedValue(null)
      vi.spyOn(service.tradeRepo, 'create').mockResolvedValue(tradeData)
      vi.spyOn(service, 'updatePosition').mockResolvedValue(undefined)
      vi.spyOn(service.eventDetector, 'detectEvents').mockResolvedValue([])
      vi.spyOn(service, 'broadcastTrade').mockResolvedValue(undefined)

      const result = await service.processTrade(walletAddress, tradeData)

      expect(result).toBe(true)
      expect(service.tradeRepo.create).toHaveBeenCalled()
    })

    it('should detect events after creating trade', async () => {
      const tradeData = generateTestTrade()
      const walletAddress = tradeData.wallet_address
      const mockDetectEvents = vi.spyOn(service.eventDetector, 'detectEvents')
      mockDetectEvents.mockResolvedValue([])

      vi.spyOn(service.tradeRepo, 'findById').mockResolvedValue(null)
      vi.spyOn(service.tradeRepo, 'create').mockResolvedValue(tradeData)
      vi.spyOn(service, 'updatePosition').mockResolvedValue(undefined)
      vi.spyOn(service, 'broadcastTrade').mockResolvedValue(undefined)

      await service.processTrade(walletAddress, tradeData)

      expect(mockDetectEvents).toHaveBeenCalledWith(walletAddress, tradeData)
    })

    it('should broadcast trade after processing', async () => {
      const tradeData = generateTestTrade()
      const walletAddress = tradeData.wallet_address
      const mockBroadcast = vi.spyOn(service, 'broadcastTrade')
      mockBroadcast.mockResolvedValue(undefined)

      vi.spyOn(service.tradeRepo, 'findById').mockResolvedValue(null)
      vi.spyOn(service.tradeRepo, 'create').mockResolvedValue(tradeData)
      vi.spyOn(service, 'updatePosition').mockResolvedValue(undefined)
      vi.spyOn(service.eventDetector, 'detectEvents').mockResolvedValue([])

      await service.processTrade(walletAddress, tradeData)

      expect(mockBroadcast).toHaveBeenCalledWith(walletAddress, tradeData)
    })

    it('should parse trade data correctly', async () => {
      const tradeData = generateTestTrade({
        size: '100.5',
        price: '0.75',
        fee: '1.5'
      })
      const walletAddress = tradeData.wallet_address
      const mockCreate = vi.spyOn(service.tradeRepo, 'create')
      mockCreate.mockResolvedValue(tradeData)

      vi.spyOn(service.tradeRepo, 'findById').mockResolvedValue(null)
      vi.spyOn(service, 'updatePosition').mockResolvedValue(undefined)
      vi.spyOn(service.eventDetector, 'detectEvents').mockResolvedValue([])
      vi.spyOn(service, 'broadcastTrade').mockResolvedValue(undefined)

      await service.processTrade(walletAddress, tradeData)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          size: parseFloat('100.5'),
          price: parseFloat('0.75'),
          fee: parseFloat('1.5')
        })
      )
    })
  })

  describe('updatePosition', () => {
    it('should create new position on BUY with no existing position', async () => {
      const trade = generateTestTrade({ side: 'BUY' })
      const walletAddress = trade.wallet_address
      const mockCreate = vi.spyOn(service.positionRepo, 'create')
      mockCreate.mockResolvedValue(
        generateTestPosition({ wallet_address: walletAddress })
      )

      vi.spyOn(service.positionRepo, 'findByMarketAndOutcome').mockResolvedValue(null)

      await service.updatePosition(walletAddress, trade)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          wallet_address: walletAddress,
          condition_id: trade.condition_id,
          outcome_index: trade.outcome_index,
          size: parseFloat(trade.size)
        })
      )
    })

    it('should add to existing position on BUY', async () => {
      const existingPosition = generateTestPosition({
        size: 100,
        avg_entry_price: 0.70,
        total_invested: 70
      })
      const trade = generateTestTrade({
        side: 'BUY',
        size: 50,
        price: 0.80
      })
      const walletAddress = trade.wallet_address
      const mockUpdate = vi.spyOn(service.positionRepo, 'update')
      mockUpdate.mockResolvedValue(undefined)

      vi.spyOn(service.positionRepo, 'findByMarketAndOutcome')
        .mockResolvedValue(existingPosition)

      await service.updatePosition(walletAddress, trade)

      expect(mockUpdate).toHaveBeenCalledWith(
        existingPosition.id,
        expect.objectContaining({
          size: 150 // 100 + 50
        })
      )
    })

    it('should calculate correct average entry price', async () => {
      const existingPosition = generateTestPosition({
        size: 100,
        avg_entry_price: 0.70,
        total_invested: 70
      })
      const trade = generateTestTrade({
        side: 'BUY',
        size: 100,
        price: 0.90
      })
      const walletAddress = trade.wallet_address
      const mockUpdate = vi.spyOn(service.positionRepo, 'update')
      mockUpdate.mockResolvedValue(undefined)

      vi.spyOn(service.positionRepo, 'findByMarketAndOutcome')
        .mockResolvedValue(existingPosition)

      await service.updatePosition(walletAddress, trade)

      expect(mockUpdate).toHaveBeenCalledWith(
        existingPosition.id,
        expect.objectContaining({
          avg_entry_price: 0.80 // (70 + 90) / 200
        })
      )
    })

    it('should handle SELL orders', async () => {
      const existingPosition = generateTestPosition({
        size: 100,
        avg_entry_price: 0.70
      })
      const trade = generateTestTrade({
        side: 'SELL',
        size: 50,
        price: 0.80
      })
      const walletAddress = trade.wallet_address
      const mockUpdate = vi.spyOn(service.positionRepo, 'update')
      mockUpdate.mockResolvedValue(undefined)

      vi.spyOn(service.positionRepo, 'findByMarketAndOutcome')
        .mockResolvedValue(existingPosition)

      await service.updatePosition(walletAddress, trade)

      expect(mockUpdate).toHaveBeenCalledWith(
        existingPosition.id,
        expect.objectContaining({
          size: 50 // 100 - 50
        })
      )
    })
  })

  describe('trade validation', () => {
    it('should process valid trade', async () => {
      const tradeData = generateTestTrade()
      expectValidTrade(tradeData)

      expect(tradeData.side).toMatch(/^(BUY|SELL)$/)
      expect(tradeData.size).toBeGreaterThan(0)
      expect(tradeData.price).toBeGreaterThan(0)
    })
  })
})
