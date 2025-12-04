/**
 * CLOB Service
 * 
 * Client for Polymarket CLOB API
 */

export class ClobService {
  constructor(env) {
    this.baseUrl = env.POLYMARKET_API_BASE || 'https://clob.polymarket.com'
    this.env = env
  }

  /**
   * Get trade history for a wallet
   */
  async getTradeHistory(walletAddress, options = {}) {
    const { since, limit = 100, offset = 0 } = options
    
    const params = new URLSearchParams({
      maker: walletAddress,
      limit: limit.toString(),
      offset: offset.toString()
    })
    
    if (since) {
      params.append('after', since.toString())
    }
    
    try {
      const response = await this.fetch(`/trades?${params.toString()}`)
      const data = await response.json()
      
      return data.data || []
    } catch (error) {
      console.error('Failed to fetch trade history:', error)
      throw new Error(`CLOB API error: ${error.message}`)
    }
  }

  /**
   * Get current positions for a wallet
   */
  async getPositions(walletAddress) {
    try {
      const response = await this.fetch(`/positions/${walletAddress}`)
      const data = await response.json()
      
      return data.data || []
    } catch (error) {
      console.error('Failed to fetch positions:', error)
      throw new Error(`CLOB API error: ${error.message}`)
    }
  }

  /**
   * Get all markets from Polymarket
   */
  async getAllMarkets(options = {}) {
    const { limit = 1000, offset = 0 } = options
    
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    })
    
    try {
      const response = await this.fetch(`/markets?${params.toString()}`)
      const data = await response.json()
      
      return data.data || data || []
    } catch (error) {
      console.error('Failed to fetch all markets:', error)
      throw new Error(`CLOB API error: ${error.message}`)
    }
  }

  /**
   * Get active markets only
   */
  async getActiveMarkets(options = {}) {
    const { limit = 1000, offset = 0 } = options
    
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
      active: 'true'
    })
    
    try {
      const response = await this.fetch(`/markets?${params.toString()}`)
      const data = await response.json()
      
      const markets = (data.data || data || []).filter(m => m.active === true)
      return markets
    } catch (error) {
      console.error('Failed to fetch active markets:', error)
      throw new Error(`CLOB API error: ${error.message}`)
    }
  }

  /**
   * Get market information
   */
  async getMarket(conditionId) {
    try {
      const response = await this.fetch(`/markets/${conditionId}`)
      const data = await response.json()
      
      return data
    } catch (error) {
      console.error('Failed to fetch market:', error)
      throw new Error(`CLOB API error: ${error.message}`)
    }
  }

  /**
   * Get current price for a market outcome
   */
  async getPrice(conditionId, outcomeIndex) {
    try {
      const response = await this.fetch(`/prices/${conditionId}`)
      const data = await response.json()
      
      if (data.prices && data.prices[outcomeIndex]) {
        return parseFloat(data.prices[outcomeIndex])
      }
      
      return null
    } catch (error) {
      console.error('Failed to fetch price:', error)
      return null
    }
  }

  /**
   * Fetch with retry logic
   */
  async fetch(path, options = {}, retries = 3) {
    const url = `${this.baseUrl}${path}`
    
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          }
        })
        
        if (!response.ok) {
          if (response.status === 429 && i < retries - 1) {
            // Rate limited, wait and retry
            await this.sleep(1000 * (i + 1))
            continue
          }
          
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        return response
      } catch (error) {
        if (i === retries - 1) {
          throw error
        }
        
        // Wait before retry
        await this.sleep(500 * (i + 1))
      }
    }
  }

  /**
   * Helper: Sleep for ms
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
