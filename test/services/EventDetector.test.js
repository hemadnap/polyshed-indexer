/**
 * Unit Tests for EventDetector
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EventDetector } from '../../src/services/EventDetector.js'
import {
  createMockEnv,
  generateTestTrade,
  generateTestPosition,
  generateTestWhale
} from '../setup.js'

describe('EventDetector', () => {
  let detector
  let mockEnv

  beforeEach(() => {
    mockEnv = createMockEnv()
    detector = new EventDetector(mockEnv)
  })

  describe('constructor', () => {
    it('should initialize with repositories', () => {
      expect(detector.env).toBe(mockEnv)
      expect(detector.whaleRepo).toBeDefined()
      expect(detector.positionRepo).toBeDefined()
      expect(detector.tradeRepo).toBeDefined()
    })
  })

  describe('detectEvents', () => {
    it('should detect all event types from a single trade', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const trade = generateTestTrade({ wallet_address: walletAddress })

      vi.spyOn(detector, 'detectNewPosition').mockResolvedValue({
        type: 'NEW_POSITION',
        severity: 'NORMAL'
      })
      vi.spyOn(detector, 'detectReversal').mockResolvedValue(null)
      vi.spyOn(detector, 'detectDoubleDown').mockResolvedValue(null)
      vi.spyOn(detector, 'detectExit').mockResolvedValue(null)
      vi.spyOn(detector, 'detectLargeTrade').mockResolvedValue(null)
      vi.spyOn(detector, 'saveEvent').mockResolvedValue(true)

      const events = await detector.detectEvents(walletAddress, trade)

      expect(events).toHaveLength(1)
      expect(events[0].type).toBe('NEW_POSITION')
      expect(detector.saveEvent).toHaveBeenCalled()
    })

    it('should handle multiple event detections', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const trade = generateTestTrade({ wallet_address: walletAddress, value: 5000 })

      vi.spyOn(detector, 'detectNewPosition').mockResolvedValue({
        type: 'NEW_POSITION',
        severity: 'HIGH'
      })
      vi.spyOn(detector, 'detectLargeTrade').mockResolvedValue({
        type: 'LARGE_TRADE',
        severity: 'HIGH'
      })
      vi.spyOn(detector, 'detectReversal').mockResolvedValue(null)
      vi.spyOn(detector, 'detectDoubleDown').mockResolvedValue(null)
      vi.spyOn(detector, 'detectExit').mockResolvedValue(null)
      vi.spyOn(detector, 'saveEvent').mockResolvedValue(true)

      const events = await detector.detectEvents(walletAddress, trade)

      expect(events).toHaveLength(2)
      expect(detector.saveEvent).toHaveBeenCalledTimes(2)
    })

    it('should not save events when none are detected', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const trade = generateTestTrade()

      vi.spyOn(detector, 'detectNewPosition').mockResolvedValue(null)
      vi.spyOn(detector, 'detectReversal').mockResolvedValue(null)
      vi.spyOn(detector, 'detectDoubleDown').mockResolvedValue(null)
      vi.spyOn(detector, 'detectExit').mockResolvedValue(null)
      vi.spyOn(detector, 'detectLargeTrade').mockResolvedValue(null)
      vi.spyOn(detector, 'saveEvent').mockResolvedValue(true)

      const events = await detector.detectEvents(walletAddress, trade)

      expect(events).toHaveLength(0)
      expect(detector.saveEvent).not.toHaveBeenCalled()
    })
  })

  describe('detectNewPosition', () => {
    it('should detect new position on BUY trade', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const trade = generateTestTrade({
        wallet_address: walletAddress,
        side: 'BUY',
        value: 500
      })

      vi.spyOn(detector.tradeRepo, 'findByMarketAndOutcome')
        .mockResolvedValue([])

      const event = await detector.detectNewPosition(walletAddress, trade)

      expect(event).not.toBeNull()
      expect(event.type).toBe('NEW_POSITION')
      expect(event.severity).toBe('NORMAL')
    })

    it('should mark high-value new positions as HIGH severity', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const trade = generateTestTrade({
        wallet_address: walletAddress,
        side: 'BUY',
        value: 2000
      })

      vi.spyOn(detector.tradeRepo, 'findByMarketAndOutcome')
        .mockResolvedValue([])

      const event = await detector.detectNewPosition(walletAddress, trade)

      expect(event.severity).toBe('HIGH')
    })

    it('should not detect new position on SELL trade', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const trade = generateTestTrade({
        side: 'SELL'
      })

      const event = await detector.detectNewPosition(walletAddress, trade)

      expect(event).toBeNull()
    })

    it('should not detect new position for existing trades', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const trade = generateTestTrade({
        side: 'BUY'
      })
      const previousTrade = generateTestTrade()

      vi.spyOn(detector.tradeRepo, 'findByMarketAndOutcome')
        .mockResolvedValue([previousTrade])

      const event = await detector.detectNewPosition(walletAddress, trade)

      expect(event).toBeNull()
    })
  })

  describe('detectReversal', () => {
    it('should detect position reversal', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const trade = generateTestTrade({
        wallet_address: walletAddress,
        side: 'BUY',
        outcome_index: 1
      })
      const oppositePosition = generateTestPosition({
        outcome_index: 0,
        size: 100
      })

      vi.spyOn(detector.positionRepo, 'findByMarketAndOutcome')
        .mockResolvedValue(oppositePosition)

      const event = await detector.detectReversal(walletAddress, trade)

      expect(event).not.toBeNull()
      expect(event.type).toBe('REVERSAL')
      expect(event.severity).toBe('HIGH')
      expect(event.data.from_outcome).toBe(0)
      expect(event.data.to_outcome).toBe(1)
    })

    it('should not detect reversal without opposite position', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const trade = generateTestTrade({
        side: 'BUY',
        outcome_index: 1
      })

      vi.spyOn(detector.positionRepo, 'findByMarketAndOutcome')
        .mockResolvedValue(null)

      const event = await detector.detectReversal(walletAddress, trade)

      expect(event).toBeNull()
    })

    it('should not detect reversal for zero-sized opposite position', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const trade = generateTestTrade({
        side: 'BUY',
        outcome_index: 1
      })
      const oppositePosition = generateTestPosition({
        outcome_index: 0,
        size: 0
      })

      vi.spyOn(detector.positionRepo, 'findByMarketAndOutcome')
        .mockResolvedValue(oppositePosition)

      const event = await detector.detectReversal(walletAddress, trade)

      expect(event).toBeNull()
    })
  })

  describe('detectDoubleDown', () => {
    it('should detect when whale increases existing position', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const trade = generateTestTrade({
        wallet_address: walletAddress,
        side: 'BUY',
        size: 150
      })
      const existingPosition = generateTestPosition({
        size: 100,
        entry_price: 0.70
      })

      vi.spyOn(detector.positionRepo, 'findByMarketAndOutcome')
        .mockResolvedValue(existingPosition)

      const event = await detector.detectDoubleDown(walletAddress, trade)

      expect(event).not.toBeNull()
      expect(event.type).toBe('DOUBLE_DOWN')
    })

    it('should not detect double down when position decreases', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const trade = generateTestTrade({
        wallet_address: walletAddress,
        side: 'BUY',
        size: 30
      })
      const existingPosition = generateTestPosition({
        size: 100
      })

      vi.spyOn(detector.positionRepo, 'findByMarketAndOutcome')
        .mockResolvedValue(existingPosition)

      const event = await detector.detectDoubleDown(walletAddress, trade)

      expect(event).toBeNull()
    })
  })

  describe('detectExit', () => {
    it('should detect position exit', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const trade = generateTestTrade({
        wallet_address: walletAddress,
        side: 'SELL',
        size: 100
      })
      const position = generateTestPosition({
        size: 100
      })

      vi.spyOn(detector.positionRepo, 'findByMarketAndOutcome')
        .mockResolvedValue(position)

      const event = await detector.detectExit(walletAddress, trade)

      expect(event).not.toBeNull()
      expect(event.type).toBe('POSITION_EXIT')
    })

    it('should not detect exit for non-existent position', async () => {
      const trade = generateTestTrade({
        side: 'SELL'
      })

      vi.spyOn(detector.positionRepo, 'findByMarketAndOutcome')
        .mockResolvedValue(null)

      const event = await detector.detectExit('0x1234', trade)

      expect(event).toBeNull()
    })
  })

  describe('detectLargeTrade', () => {
    it('should detect large trades', async () => {
      const trade = generateTestTrade({
        value: 5000
      })

      const event = await detector.detectLargeTrade('0x1234', trade)

      expect(event).not.toBeNull()
      expect(event.type).toBe('LARGE_TRADE')
      expect(event.severity).toBe('HIGH')
    })

    it('should not detect small trades as large', async () => {
      const trade = generateTestTrade({
        value: 100
      })

      const event = await detector.detectLargeTrade('0x1234', trade)

      expect(event).toBeNull()
    })

    it('should use configurable threshold', async () => {
      detector.largeTradeThreshold = 1000
      const trade = generateTestTrade({
        value: 1500
      })

      const event = await detector.detectLargeTrade('0x1234', trade)

      expect(event).not.toBeNull()
    })
  })

  describe('saveEvent', () => {
    it('should save event to database', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const event = {
        type: 'NEW_POSITION',
        severity: 'HIGH',
        data: { size: 100 }
      }

      vi.spyOn(detector, 'getEventRepository')
        .mockReturnValue({
          create: vi.fn().mockResolvedValue(true)
        })

      await detector.saveEvent(walletAddress, event)

      expect(detector.getEventRepository().create).toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('should handle detection errors gracefully', async () => {
      const walletAddress = '0x' + '1'.repeat(40)
      const trade = generateTestTrade()

      vi.spyOn(detector.tradeRepo, 'findByMarketAndOutcome')
        .mockRejectedValue(new Error('DB Error'))

      vi.spyOn(detector, 'detectNewPosition')
        .mockImplementationOnce(() => {
          throw new Error('Detection failed')
        })

      // Should handle error, not throw
      const events = await detector.detectEvents(walletAddress, trade)
      expect(events).toBeDefined()
    })
  })
})
