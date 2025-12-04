/**
 * Unit Tests for Polyshed Indexer
 * Configuration and Test Utilities
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Mock environment object
 */
export const createMockEnv = () => ({
  DB: {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnThis(),
      all: vi.fn().mockResolvedValue({ results: [] }),
      first: vi.fn().mockResolvedValue(null),
      run: vi.fn().mockResolvedValue({ success: true })
    })
  },
  CACHE: {
    get: vi.fn().mockResolvedValue(null),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined)
  },
  POLYMARKET_API_BASE: 'https://clob.polymarket.com',
  GAMMA_API_BASE: 'https://gamma-api.polymarket.com',
  MAX_WHALES_PER_UPDATE: '50',
  BATCH_SIZE: '100',
  RATE_LIMIT_MS: '100'
})

/**
 * Mock repository methods
 */
export const createMockRepository = () => ({
  findAll: vi.fn().mockResolvedValue([]),
  findById: vi.fn().mockResolvedValue(null),
  findByAddress: vi.fn().mockResolvedValue(null),
  create: vi.fn().mockResolvedValue({ id: 'test-id' }),
  update: vi.fn().mockResolvedValue({ id: 'test-id' }),
  delete: vi.fn().mockResolvedValue(true)
})

/**
 * Mock service methods
 */
export const createMockService = () => ({
  getTradeHistory: vi.fn().mockResolvedValue([]),
  getPositions: vi.fn().mockResolvedValue([]),
  getMetrics: vi.fn().mockResolvedValue({})
})

/**
 * Test data generators
 */
export const generateTestWhale = (overrides = {}) => ({
  wallet_address: '0x' + '1'.repeat(40),
  display_name: 'Test Whale',
  total_volume: 1000000,
  total_pnl: 50000,
  total_roi: 0.05,
  win_rate: 0.65,
  sharpe_ratio: 1.5,
  active_positions_count: 5,
  total_trades: 25,
  first_seen_at: Math.floor(Date.now() / 1000) - 86400 * 30,
  last_activity_at: Math.floor(Date.now() / 1000),
  is_active: true,
  tracking_enabled: true,
  ...overrides
})

export const generateTestTrade = (overrides = {}) => ({
  id: 'trade-' + Math.random().toString(36).substr(2, 9),
  wallet_address: '0x' + '1'.repeat(40),
  condition_id: 'cond-' + Math.random().toString(36).substr(2, 9),
  outcome_index: 0,
  side: 'BUY',
  size: 100,
  price: 0.75,
  value: 75,
  fee: 0.5,
  transaction_hash: '0x' + '2'.repeat(64),
  block_number: 1000000,
  executed_at: Math.floor(Date.now() / 1000),
  ...overrides
})

export const generateTestPosition = (overrides = {}) => ({
  id: 'pos-' + Math.random().toString(36).substr(2, 9),
  wallet_address: '0x' + '1'.repeat(40),
  condition_id: 'cond-' + Math.random().toString(36).substr(2, 9),
  outcome_index: 0,
  size: 100,
  entry_price: 0.75,
  current_value: 80,
  pnl: 5,
  roi: 0.0667,
  opened_at: Math.floor(Date.now() / 1000) - 3600,
  last_updated_at: Math.floor(Date.now() / 1000),
  ...overrides
})

export const generateTestMarket = (overrides = {}) => ({
  condition_id: 'cond-' + Math.random().toString(36).substr(2, 9),
  market_slug: 'test-market',
  question: 'Will this test pass?',
  description: 'A test market for unit testing',
  category: 'Technology',
  end_date: Math.floor(Date.now() / 1000) + 86400 * 30,
  is_active: true,
  total_volume: 100000,
  total_liquidity: 50000,
  outcomes: ['Yes', 'No'],
  ...overrides
})

export const generateTestEvent = (overrides = {}) => ({
  id: 'event-' + Math.random().toString(36).substr(2, 9),
  wallet_address: '0x' + '1'.repeat(40),
  event_type: 'NEW_POSITION',
  severity: 'NORMAL',
  data: {
    size: 100,
    price: 0.75,
    value: 75
  },
  created_at: Math.floor(Date.now() / 1000),
  ...overrides
})

/**
 * Common test assertions
 */
export const expectValidWhole = (whale) => {
  expect(whale).toHaveProperty('wallet_address')
  expect(whale).toHaveProperty('display_name')
  expect(whale).toHaveProperty('total_volume')
  expect(whale.wallet_address).toMatch(/^0x[a-fA-F0-9]{40}$/)
}

export const expectValidTrade = (trade) => {
  expect(trade).toHaveProperty('id')
  expect(trade).toHaveProperty('wallet_address')
  expect(trade).toHaveProperty('condition_id')
  expect(['BUY', 'SELL']).toContain(trade.side)
  expect(trade.size).toBeGreaterThan(0)
  expect(trade.price).toBeGreaterThan(0)
}

/**
 * Mock HTTP responses
 */
export const createMockHttpResponse = (data, status = 200) => ({
  json: vi.fn().mockResolvedValue(data),
  text: vi.fn().mockResolvedValue(JSON.stringify(data)),
  status: status,
  ok: status >= 200 && status < 300,
  headers: new Map([
    ['content-type', 'application/json']
  ])
})

/**
 * Mock external API calls
 */
export const mockPolymarketAPI = (baseUrl = 'https://clob.polymarket.com') => {
  const mockFetch = vi.fn((url) => {
    if (url.includes('/trades')) {
      return Promise.resolve(createMockHttpResponse({ data: [] }))
    }
    if (url.includes('/positions')) {
      return Promise.resolve(createMockHttpResponse({ data: [] }))
    }
    if (url.includes('/markets')) {
      return Promise.resolve(createMockHttpResponse({ data: [] }))
    }
    return Promise.resolve(createMockHttpResponse({ data: [] }))
  })

  global.fetch = mockFetch
  return mockFetch
}

/**
 * Test utilities for async operations
 */
export const waitFor = async (condition, maxAttempts = 10, delayMs = 100) => {
  for (let i = 0; i < maxAttempts; i++) {
    if (condition()) {
      return true
    }
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }
  return false
}

/**
 * Create a test context with all dependencies
 */
export const createTestContext = () => ({
  env: createMockEnv(),
  repositories: {
    whale: createMockRepository(),
    trade: createMockRepository(),
    position: createMockRepository(),
    market: createMockRepository(),
    metrics: createMockRepository()
  },
  services: {
    whale: createMockService(),
    market: createMockService(),
    trade: createMockService(),
    event: createMockService()
  },
  api: {
    polymarket: mockPolymarketAPI()
  }
})

/**
 * Cleanup function for test teardown
 */
export const cleanupTestContext = (context) => {
  if (context.api?.polymarket) {
    context.api.polymarket.mockClear()
  }
  Object.values(context.repositories || {}).forEach(repo => {
    Object.values(repo).forEach(fn => {
      if (fn.mockClear) fn.mockClear()
    })
  })
}

export const expectValidPosition = (position) => {
  expect(position).toHaveProperty('id')
  expect(position).toHaveProperty('wallet_address')
  expect(position).toHaveProperty('condition_id')
  expect(position.size).toBeGreaterThan(0)
  expect(position.current_value).toBeGreaterThanOrEqual(0)
}

export const expectValidMarket = (market) => {
  expect(market).toHaveProperty('condition_id')
  expect(market).toHaveProperty('question')
  expect(market.outcomes).toBeInstanceOf(Array)
  expect(market.outcomes.length).toBeGreaterThan(0)
}
