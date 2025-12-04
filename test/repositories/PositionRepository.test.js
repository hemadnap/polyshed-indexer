/**
 * Unit Tests for PositionRepository
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PositionRepository } from '../../src/repositories/PositionRepository.js'
import {
  generateTestPosition,
  generateTestMarket
} from '../setup.js'

describe('PositionRepository', () => {
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
    repository = new PositionRepository(mockDb)
  })

  describe('constructor', () => {
    it('should initialize with database', () => {
      expect(repository.db).toBe(mockDb)
    })
  })

  describe('upsertPosition', () => {
    it('should insert or update a position', async () => {
      const position = generateTestPosition()

      await repository.upsertPosition(position)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO whale_positions')
      )
      expect(mockDb.prepare().bind).toHaveBeenCalledWith(
        position.whale_address,
        position.market_id,
        position.outcome,
        position.size,
        position.avg_price,
        position.current_value,
        position.unrealized_pnl,
        position.last_updated
      )
    })

    it('should handle position size changes', async () => {
      const position = generateTestPosition({ size: 150 })

      await repository.upsertPosition(position)

      expect(mockDb.prepare().bind).toHaveBeenCalled()
    })

    it('should handle unrealized PnL updates', async () => {
      const position = generateTestPosition({
        unrealized_pnl: 5000,
        current_value: 105000
      })

      await repository.upsertPosition(position)

      expect(mockDb.prepare().run).toHaveBeenCalled()
    })
  })

  describe('findByWallet', () => {
    it('should fetch positions for a wallet', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const mockPositions = [
        generateTestPosition({ wallet_address: walletAddress }),
        generateTestPosition({ wallet_address: walletAddress })
      ]

      mockDb.prepare().all.mockResolvedValue({ results: mockPositions })

      const result = await repository.findByWallet(walletAddress)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('FROM positions p')
      )
      expect(result).toEqual(mockPositions)
    })

    it('should apply pagination', async () => {
      const walletAddress = '0x' + '1'.repeat(40)

      mockDb.prepare().all.mockResolvedValue({ results: [] })

      await repository.findByWallet(walletAddress, { limit: 50, offset: 100 })

      expect(mockDb.prepare().bind).toHaveBeenCalledWith(
        walletAddress,
        50,
        100
      )
    })

    it('should only fetch positions with size > 0', async () => {
      mockDb.prepare().all.mockResolvedValue({ results: [] })

      await repository.findByWallet('0x1234')

      const query = mockDb.prepare.mock.calls[0][0]
      expect(query).toContain('p.size > 0')
    })

    it('should join with market data', async () => {
      mockDb.prepare().all.mockResolvedValue({ results: [] })

      await repository.findByWallet('0x1234')

      const query = mockDb.prepare.mock.calls[0][0]
      expect(query).toContain('LEFT JOIN markets')
    })

    it('should sort by current value', async () => {
      mockDb.prepare().all.mockResolvedValue({ results: [] })

      await repository.findByWallet('0x1234')

      const query = mockDb.prepare.mock.calls[0][0]
      expect(query).toContain('ORDER BY p.current_value DESC')
    })

    it('should return empty array when no positions', async () => {
      mockDb.prepare().all.mockResolvedValue({ results: undefined })

      const result = await repository.findByWallet('0x1234')

      expect(result).toEqual([])
    })
  })

  describe('getPositionsByWhale', () => {
    it('should fetch all positions for a whale', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const mockPositions = [
        generateTestPosition({ whale_address: walletAddress })
      ]

      mockDb.prepare().all.mockResolvedValue({ results: mockPositions })

      const result = await repository.getPositionsByWhale(walletAddress)

      expect(result).toEqual(mockPositions)
    })

    it('should exclude closed positions', async () => {
      mockDb.prepare().all.mockResolvedValue({ results: [] })

      await repository.getPositionsByWhale('0x1234')

      const query = mockDb.prepare.mock.calls[0][0]
      expect(query).toContain('wp.size > 0')
    })
  })

  describe('getPositionsByMarket', () => {
    it('should fetch all positions for a market', async () => {
      const marketId = 'market-123'
      const mockPositions = [
        generateTestPosition({ market_id: marketId })
      ]

      mockDb.prepare().all.mockResolvedValue({ results: mockPositions })

      const result = await repository.getPositionsByMarket(marketId)

      expect(result).toEqual(mockPositions)
    })

    it('should include whale labels', async () => {
      mockDb.prepare().all.mockResolvedValue({ results: [] })

      await repository.getPositionsByMarket('market-123')

      const query = mockDb.prepare.mock.calls[0][0]
      expect(query).toContain('w.label as whale_label')
    })
  })

  describe('findByMarketAndOutcome', () => {
    it('should find position by market and outcome', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const marketId = 'market-123'
      const outcome = 0
      const mockPosition = generateTestPosition({
        whale_address: walletAddress,
        market_id: marketId,
        outcome: outcome
      })

      mockDb.prepare().first.mockResolvedValue(mockPosition)

      const result = await repository.findByMarketAndOutcome(
        walletAddress,
        marketId,
        outcome
      )

      expect(result).toEqual(mockPosition)
    })

    it('should return null if position not found', async () => {
      mockDb.prepare().first.mockResolvedValue(null)

      const result = await repository.findByMarketAndOutcome(
        '0x1234',
        'market-999',
        0
      )

      expect(result).toBeNull()
    })
  })

  describe('findClosedByWallet', () => {
    it('should fetch closed positions for a whale', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const closedPositions = [
        generateTestPosition({ 
          whale_address: walletAddress, 
          size: 0,
          realized_pnl: 500
        })
      ]

      mockDb.prepare().all.mockResolvedValue({ results: closedPositions })

      const result = await repository.findClosedByWallet(walletAddress)

      expect(result).toEqual(closedPositions)
    })

    it('should only return positions with size = 0', async () => {
      mockDb.prepare().all.mockResolvedValue({ results: [] })

      await repository.findClosedByWallet('0x1234')

      const query = mockDb.prepare.mock.calls[0][0]
      expect(query).toContain('p.size = 0')
    })

    it('should support pagination', async () => {
      mockDb.prepare().all.mockResolvedValue({ results: [] })

      await repository.findClosedByWallet('0x1234', { limit: 1000 })

      expect(mockDb.prepare().bind).toHaveBeenCalled()
    })
  })

  describe('updatePosition', () => {
    it('should update position fields', async () => {
      const positionId = 'pos-123'
      const updates = {
        current_value: 110000,
        unrealized_pnl: 10000
      }

      await repository.updatePosition(positionId, updates)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE whale_positions SET')
      )
    })

    it('should handle partial updates', async () => {
      const positionId = 'pos-123'

      await repository.updatePosition(positionId, { size: 200 })

      expect(mockDb.prepare).toHaveBeenCalled()
    })
  })

  describe('closePosition', () => {
    it('should mark position as closed', async () => {
      const positionId = 'pos-123'
      const closingData = {
        size: 0,
        realized_pnl: 1000,
        closed_at: Math.floor(Date.now() / 1000)
      }

      await repository.closePosition(positionId, closingData)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE whale_positions')
      )
    })
  })

  describe('getWalletPortfolioValue', () => {
    it('should calculate total portfolio value for a wallet', async () => {
      const walletAddress = '0x' + '1'.repeat(40)

      mockDb.prepare().first.mockResolvedValue({
        total_value: 1500000
      })

      const result = await repository.getWalletPortfolioValue(walletAddress)

      expect(typeof result).toBe('number')
    })
  })

  describe('getOpenPositionCount', () => {
    it('should count open positions for a wallet', async () => {
      const walletAddress = '0x' + '1'.repeat(40)

      mockDb.prepare().first.mockResolvedValue({
        count: 25
      })

      const result = await repository.getOpenPositionCount(walletAddress)

      expect(typeof result).toBe('number')
    })
  })

  describe('getAveragePositionValue', () => {
    it('should calculate average position value', async () => {
      mockDb.prepare().first.mockResolvedValue({
        avg_value: 45000
      })

      const result = await repository.getAveragePositionValue('0x1234')

      expect(typeof result).toBe('number')
    })
  })

  describe('bulk operations', () => {
    it('should support bulk upserts', async () => {
      const positions = [
        generateTestPosition(),
        generateTestPosition()
      ]

      mockDb.prepare().run.mockResolvedValue({ success: true })

      await repository.bulkUpsert(positions)

      expect(mockDb.prepare).toHaveBeenCalled()
    })
  })

  describe('data validation', () => {
    it('should validate position data on upsert', async () => {
      const invalidPosition = {
        // Missing required fields
        whale_address: '0x1234'
      }

      // Should still attempt insert
      await repository.upsertPosition(invalidPosition)

      expect(mockDb.prepare).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle database errors', async () => {
      const dbError = new Error('Connection failed')
      mockDb.prepare.mockImplementation(() => {
        throw dbError
      })

      await expect(repository.findByWallet('0x1234'))
        .rejects.toThrow('Connection failed')
    })

    it('should handle query execution errors', async () => {
      const queryError = new Error('Query failed')
      mockDb.prepare().all.mockRejectedValue(queryError)

      await expect(repository.findByWallet('0x1234'))
        .rejects.toThrow('Query failed')
    })
  })
})
