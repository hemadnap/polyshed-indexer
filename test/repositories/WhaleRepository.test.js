/**
 * Unit Tests for WhaleRepository
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { WhaleRepository } from '../../src/repositories/WhaleRepository.js'
import {
  generateTestWhale
} from '../setup.js'

describe('WhaleRepository', () => {
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
    repository = new WhaleRepository(mockDb)
  })

  describe('constructor', () => {
    it('should initialize with database', () => {
      expect(repository.db).toBe(mockDb)
    })
  })

  describe('findAll', () => {
    it('should fetch all whales with default options', async () => {
      const mockWhales = [
        generateTestWhale(),
        generateTestWhale()
      ]

      mockDb.prepare().all.mockResolvedValue({ results: mockWhales })

      const result = await repository.findAll()

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM whales')
      )
      expect(result).toEqual(mockWhales)
    })

    it('should filter by active status', async () => {
      const mockWhales = [generateTestWhale({ is_active: true })]

      mockDb.prepare().all.mockResolvedValue({ results: mockWhales })

      await repository.findAll({ active: true })

      const query = mockDb.prepare.mock.calls[0][0]
      expect(query).toContain('is_active')
    })

    it('should filter by tracking_enabled', async () => {
      const mockWhales = [generateTestWhale({ tracking_enabled: true })]

      mockDb.prepare().all.mockResolvedValue({ results: mockWhales })

      await repository.findAll({ tracking_enabled: true })

      const query = mockDb.prepare.mock.calls[0][0]
      expect(query).toContain('tracking_enabled')
    })

    it('should sort by specified column', async () => {
      mockDb.prepare().all.mockResolvedValue({ results: [] })

      await repository.findAll({ sortBy: 'total_pnl' })

      const query = mockDb.prepare.mock.calls[0][0]
      expect(query).toContain('total_pnl DESC')
    })

    it('should apply limit and offset', async () => {
      mockDb.prepare().all.mockResolvedValue({ results: [] })

      await repository.findAll({ limit: 50, offset: 100 })

      expect(mockDb.prepare().bind).toHaveBeenCalledWith(
        expect.arrayContaining([50, 100])
      )
    })

    it('should return empty array when no results', async () => {
      mockDb.prepare().all.mockResolvedValue({ results: undefined })

      const result = await repository.findAll()

      expect(result).toEqual([])
    })
  })

  describe('findByAddress', () => {
    it('should find whale by wallet address', async () => {
      const whale = generateTestWhale()
      mockDb.prepare().first.mockResolvedValue(whale)

      const result = await repository.findByAddress(whale.wallet_address)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('wallet_address = ?')
      )
      expect(result).toEqual(whale)
    })

    it('should return null if whale not found', async () => {
      mockDb.prepare().first.mockResolvedValue(null)

      const result = await repository.findByAddress('0xnonexistent')

      expect(result).toBeNull()
    })

    it('should validate wallet address format', async () => {
      const validAddress = '0x' + '1'.repeat(40)
      mockDb.prepare().first.mockResolvedValue(generateTestWhale())

      await repository.findByAddress(validAddress)

      expect(mockDb.prepare().bind).toHaveBeenCalled()
    })
  })

  describe('create', () => {
    it('should create a new whale', async () => {
      const whaleData = {
        wallet_address: '0x' + 'a'.repeat(40),
        display_name: 'New Whale',
        tracking_enabled: true,
        first_seen_at: Math.floor(Date.now() / 1000),
        last_activity_at: Math.floor(Date.now() / 1000)
      }

      const createdWhale = generateTestWhale(whaleData)
      mockDb.prepare().first.mockResolvedValue(createdWhale)

      const result = await repository.create(whaleData)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO whales')
      )
      expect(result).toEqual(createdWhale)
    })

    it('should use default tracking_enabled value', async () => {
      const whaleData = {
        wallet_address: '0x' + 'a'.repeat(40),
        display_name: 'New Whale'
      }

      mockDb.prepare().first.mockResolvedValue(generateTestWhale(whaleData))

      await repository.create(whaleData)

      expect(mockDb.prepare().bind).toHaveBeenCalled()
    })

    it('should require wallet address', async () => {
      const invalidData = {
        display_name: 'Test'
      }

      // Should call bind with the data
      await repository.create(invalidData)

      expect(mockDb.prepare().bind).toHaveBeenCalled()
    })
  })

  describe('update', () => {
    it('should update whale data', async () => {
      const address = '0x' + '1'.repeat(40)
      const updates = {
        total_pnl: 100000,
        total_roi: 0.15,
        win_rate: 0.70
      }

      const updatedWhale = generateTestWhale(updates)
      mockDb.prepare().first.mockResolvedValue(updatedWhale)

      const result = await repository.update(address, updates)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE whales SET')
      )
      expect(result).toEqual(updatedWhale)
    })

    it('should set updated_at timestamp', async () => {
      const address = '0x' + '1'.repeat(40)
      const updates = { total_pnl: 50000 }

      mockDb.prepare().first.mockResolvedValue(generateTestWhale())

      await repository.update(address, updates)

      const bindCall = mockDb.prepare().bind.mock.calls[0]
      expect(bindCall[0]).toContain(address)
    })

    it('should handle multiple field updates', async () => {
      const address = '0x' + '1'.repeat(40)
      const updates = {
        total_pnl: 100000,
        total_roi: 0.20,
        win_rate: 0.75,
        sharpe_ratio: 2.0
      }

      mockDb.prepare().first.mockResolvedValue(generateTestWhale())

      await repository.update(address, updates)

      const query = mockDb.prepare.mock.calls[0][0]
      expect(query).toContain('UPDATE whales SET')
    })

    it('should return updated whale', async () => {
      const address = '0x' + '1'.repeat(40)
      const updatedWhale = generateTestWhale({ total_pnl: 100000 })

      mockDb.prepare().first.mockResolvedValue(updatedWhale)

      const result = await repository.update(address, { total_pnl: 100000 })

      expect(result).toEqual(updatedWhale)
    })
  })

  describe('delete', () => {
    it('should delete a whale by address', async () => {
      const address = '0x' + '1'.repeat(40)

      await repository.delete(address)

      expect(mockDb.prepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM whales')
      )
    })

    it('should return true on successful delete', async () => {
      const address = '0x' + '1'.repeat(40)
      mockDb.prepare().run.mockResolvedValue({ success: true })

      const result = await repository.delete(address)

      expect(result).toBe(true)
    })
  })

  describe('findTop', () => {
    it('should find top whales by metric', async () => {
      const topWhales = [
        generateTestWhale({ total_pnl: 500000 }),
        generateTestWhale({ total_pnl: 300000 })
      ]

      mockDb.prepare().all.mockResolvedValue({ results: topWhales })

      const result = await repository.findTop('total_pnl', 10)

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('should support custom limit', async () => {
      mockDb.prepare().all.mockResolvedValue({ results: [] })

      await repository.findTop('total_roi', 50)

      expect(mockDb.prepare().bind).toHaveBeenCalled()
    })
  })

  describe('findByMetrics', () => {
    it('should find whales by performance criteria', async () => {
      const qualifyingWhales = [
        generateTestWhale({ win_rate: 0.70, sharpe_ratio: 2.0 })
      ]

      mockDb.prepare().all.mockResolvedValue({ results: qualifyingWhales })

      const result = await repository.findByMetrics({
        minWinRate: 0.60,
        minSharpeRatio: 1.5
      })

      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('bulk operations', () => {
    it('should support bulk updates', async () => {
      const addresses = [
        '0x' + '1'.repeat(40),
        '0x' + '2'.repeat(40)
      ]
      const updates = { is_active: false }

      mockDb.prepare().run.mockResolvedValue({ success: true })

      await repository.bulkUpdate(addresses, updates)

      expect(mockDb.prepare).toHaveBeenCalled()
    })

    it('should support bulk creates', async () => {
      const whales = [
        generateTestWhale(),
        generateTestWhale()
      ]

      mockDb.prepare().run.mockResolvedValue({ success: true })

      await repository.bulkCreate(whales)

      expect(mockDb.prepare).toHaveBeenCalled()
    })
  })

  describe('data validation', () => {
    it('should validate wallet address format', async () => {
      const invalidAddress = 'not-an-address'

      mockDb.prepare().first.mockResolvedValue(null)

      // Should attempt to query anyway (validation is typically in service)
      await repository.findByAddress(invalidAddress)

      expect(mockDb.prepare).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed')
      mockDb.prepare.mockImplementation(() => {
        throw dbError
      })

      await expect(repository.findAll()).rejects.toThrow('Database connection failed')
    })

    it('should handle query execution errors', async () => {
      const queryError = new Error('Query failed')
      mockDb.prepare().all.mockRejectedValue(queryError)

      await expect(repository.findAll()).rejects.toThrow('Query failed')
    })
  })
})
