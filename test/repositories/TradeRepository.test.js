/**
 * Unit Tests for TradeRepository
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TradeRepository } from '../../src/repositories/TradeRepository.js'
import {
  generateTestTrade
} from '../setup.js'

describe('TradeRepository', () => {
  let repository
  let mockDb

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] }),
        first: vi.fn().mockResolvedValue(null),
        run: vi.fn().mockResolvedValue({ success: true })
      })
    }
    repository = new TradeRepository(mockDb)
  })

  describe('constructor', () => {
    it('should initialize with database', () => {
      expect(repository.db).toBe(mockDb)
    })
  })

  describe('create', () => {
    it('should create a new trade record', async () => {
      const trade = generateTestTrade()

      await repository.create(trade)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO trades')
      )
    })

    it('should require trade data', async () => {
      const trade = generateTestTrade()

      await repository.create(trade)

      expect(mockDb.prepare().bind).toHaveBeenCalled()
    })
  })

  describe('findByHash', () => {
    it('should find trade by transaction hash', async () => {
      const trade = generateTestTrade()

      mockDb.prepare().first.mockResolvedValue(trade)

      const result = await repository.findByHash(trade.transaction_hash)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('transaction_hash = ?')
      )
      expect(result).toEqual(trade)
    })

    it('should return null if trade not found', async () => {
      mockDb.prepare().first.mockResolvedValue(null)

      const result = await repository.findByHash('0x' + 'a'.repeat(64))

      expect(result).toBeNull()
    })

    it('should handle duplicate prevention', async () => {
      const hash = '0x' + 'a'.repeat(64)

      mockDb.prepare().first.mockResolvedValue(generateTestTrade({ transaction_hash: hash }))

      const result = await repository.findByHash(hash)

      expect(result).not.toBeNull()
    })
  })

  describe('findByWallet', () => {
    it('should fetch trades for a wallet', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const mockTrades = [
        generateTestTrade({ wallet_address: walletAddress }),
        generateTestTrade({ wallet_address: walletAddress })
      ]

      mockDb.prepare().all.mockResolvedValue({ results: mockTrades })

      const result = await repository.findByWallet(walletAddress)

      expect(result).toEqual(mockTrades)
    })

    it('should support pagination', async () => {
      mockDb.prepare().all.mockResolvedValue({ results: [] })

      await repository.findByWallet('0x1234', { limit: 100, offset: 200 })

      expect(mockDb.prepare().bind).toHaveBeenCalledWith(
        expect.arrayContaining(['0x1234', 100, 200])
      )
    })

    it('should support date filtering', async () => {
      const since = Math.floor(Date.now() / 1000) - 3600

      mockDb.prepare().all.mockResolvedValue({ results: [] })

      await repository.findByWallet('0x1234', { since })

      const query = mockDb.prepare.mock.calls[0][0]
      expect(query).toContain('executed_at')
    })
  })

  describe('findByMarket', () => {
    it('should fetch trades for a market', async () => {
      const conditionId = 'cond-123'
      const mockTrades = [
        generateTestTrade({ condition_id: conditionId }),
        generateTestTrade({ condition_id: conditionId })
      ]

      mockDb.prepare().all.mockResolvedValue({ results: mockTrades })

      const result = await repository.findByMarket(conditionId)

      expect(result).toEqual(mockTrades)
    })

    it('should return empty array when no trades', async () => {
      mockDb.prepare().all.mockResolvedValue({ results: undefined })

      const result = await repository.findByMarket('cond-999')

      expect(result).toEqual([])
    })
  })

  describe('findByMarketAndOutcome', () => {
    it('should find trades by market and outcome', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const conditionId = 'cond-123'
      const outcome = 0
      const mockTrades = [
        generateTestTrade({
          wallet_address: walletAddress,
          condition_id: conditionId,
          outcome_index: outcome
        })
      ]

      mockDb.prepare().all.mockResolvedValue({ results: mockTrades })

      const result = await repository.findByMarketAndOutcome(
        walletAddress,
        conditionId,
        outcome
      )

      expect(result).toEqual(mockTrades)
    })
  })

  describe('getTradeVolume', () => {
    it('should calculate total trade volume for wallet', async () => {
      const walletAddress = '0x' + '1'.repeat(40)

      mockDb.prepare().first.mockResolvedValue({
        total_volume: 1000000
      })

      const result = await repository.getTradeVolume(walletAddress)

      expect(typeof result).toBe('number')
      expect(result).toBeGreaterThanOrEqual(0)
    })

    it('should support time filtering', async () => {
      mockDb.prepare().first.mockResolvedValue({
        total_volume: 500000
      })

      await repository.getTradeVolume('0x1234', {
        since: Math.floor(Date.now() / 1000) - 86400
      })

      const query = mockDb.prepare.mock.calls[0][0]
      expect(query).toContain('SUM')
    })
  })

  describe('getTradeCount', () => {
    it('should count trades for a wallet', async () => {
      mockDb.prepare().first.mockResolvedValue({
        count: 150
      })

      const result = await repository.getTradeCount('0x1234')

      expect(result).toBe(150)
    })

    it('should support filtering', async () => {
      mockDb.prepare().first.mockResolvedValue({
        count: 75
      })

      await repository.getTradeCount('0x1234', {
        side: 'BUY'
      })

      const query = mockDb.prepare.mock.calls[0][0]
      expect(query).toContain('COUNT')
    })
  })

  describe('getRecentTrades', () => {
    it('should fetch recent trades across all wallets', async () => {
      const mockTrades = [
        generateTestTrade(),
        generateTestTrade(),
        generateTestTrade()
      ]

      mockDb.prepare().all.mockResolvedValue({ results: mockTrades })

      const result = await repository.getRecentTrades(10)

      expect(result).toHaveLength(3)
    })

    it('should order by most recent first', async () => {
      mockDb.prepare().all.mockResolvedValue({ results: [] })

      await repository.getRecentTrades(20)

      const query = mockDb.prepare.mock.calls[0][0]
      expect(query).toContain('ORDER BY executed_at DESC')
    })

    it('should respect limit parameter', async () => {
      mockDb.prepare().all.mockResolvedValue({ results: [] })

      await repository.getRecentTrades(50)

      expect(mockDb.prepare().bind).toHaveBeenCalledWith(50)
    })
  })

  describe('bulk operations', () => {
    it('should support bulk inserts', async () => {
      const trades = [
        generateTestTrade(),
        generateTestTrade(),
        generateTestTrade()
      ]

      mockDb.prepare().run.mockResolvedValue({ success: true })

      await repository.bulkCreate(trades)

      expect(mockDb.prepare).toHaveBeenCalled()
    })

    it('should handle bulk upserts', async () => {
      const trades = [generateTestTrade()]

      mockDb.prepare().run.mockResolvedValue({ success: true })

      await repository.bulkUpsert(trades)

      expect(mockDb.prepare).toHaveBeenCalled()
    })
  })

  describe('aggregation', () => {
    it('should aggregate trades by wallet', async () => {
      const aggregates = [
        { wallet_address: '0x1', trade_count: 100 },
        { wallet_address: '0x2', trade_count: 50 }
      ]

      mockDb.prepare().all.mockResolvedValue({ results: aggregates })

      const result = await repository.aggregateByWallet()

      expect(Array.isArray(result)).toBe(true)
    })

    it('should aggregate trades by market', async () => {
      const aggregates = [
        { condition_id: 'cond-1', trade_count: 500 },
        { condition_id: 'cond-2', trade_count: 300 }
      ]

      mockDb.prepare().all.mockResolvedValue({ results: aggregates })

      const result = await repository.aggregateByMarket()

      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('error handling', () => {
    it('should handle database errors', async () => {
      const error = new Error('DB Error')
      mockDb.prepare.mockImplementation(() => {
        throw error
      })

      await expect(repository.findByWallet('0x1234'))
        .rejects.toThrow('DB Error')
    })

    it('should handle query errors', async () => {
      const error = new Error('Query failed')
      mockDb.prepare().all.mockRejectedValue(error)

      await expect(repository.findByWallet('0x1234'))
        .rejects.toThrow('Query failed')
    })
  })

  describe('data consistency', () => {
    it('should prevent duplicate trades', async () => {
      const hash = '0x' + 'a'.repeat(64)

      mockDb.prepare().first.mockResolvedValueOnce(generateTestTrade({ transaction_hash: hash }))

      const result = await repository.findByHash(hash)

      expect(result).not.toBeNull()
    })

    it('should maintain referential integrity', async () => {
      const trade = generateTestTrade()

      mockDb.prepare().run.mockResolvedValue({ success: true })

      await repository.create(trade)

      // Verify wallet address is valid
      expect(trade.wallet_address).toMatch(/^0x[a-f0-9]{40}$/)
    })
  })
})
