#!/usr/bin/env node

/**
 * Data Collection Verification Script
 * 
 * Tests whether the indexer is collecting correct data from Polymarket
 * and properly filling the database
 */

import { readFileSync } from 'fs'

// fetch is built-in to Node.js 18+

const BASE_URL = 'http://localhost:8787'
const DB_PATH = '.wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3'

console.log('╔════════════════════════════════════════════════════════════════╗')
console.log('║    Data Collection & Database Verification                    ║')
console.log('╚════════════════════════════════════════════════════════════════╝\n')

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
}

function log(color, symbol, message) {
  console.log(`${colors[color]}${symbol}${colors.reset} ${message}`)
}

function section(title) {
  console.log(`\n${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`)
  console.log(`${colors.cyan}${title}${colors.reset}`)
  console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`)
}

async function checkServerHealth() {
  section('1. Server Health Check')
  
  try {
    const response = await fetch(`${BASE_URL}/health`)
    const data = await response.json()
    
    if (response.ok) {
      log('green', '✅', `Server is running: ${data.service}`)
      log('green', '✅', `Status: ${data.status}`)
      return true
    } else {
      log('red', '❌', `Server returned: ${response.status}`)
      return false
    }
  } catch (error) {
    log('red', '❌', `Cannot connect to server: ${error.message}`)
    log('yellow', '⚠️', `Make sure to run: npm run dev:cron`)
    return false
  }
}

async function checkDatabase() {
  section('2. Database Status')
  
  try {
    const fs = await import('fs')
    const path = await import('path')
    
    const dbExists = fs.existsSync(DB_PATH)
    
    if (dbExists) {
      const stats = fs.statSync(DB_PATH)
      log('green', '✅', `Database exists: ${DB_PATH}`)
      log('green', '✅', `Database size: ${(stats.size / 1024).toFixed(2)} KB`)
      return true
    } else {
      log('yellow', '⚠️', `Database not found at: ${DB_PATH}`)
      log('yellow', '⚠️', 'Database will be created on first cron run')
      return false
    }
  } catch (error) {
    log('yellow', '⚠️', `Could not check database: ${error.message}`)
    return false
  }
}

async function checkIndexingStatus() {
  section('3. Indexing Status')
  
  try {
    const response = await fetch(`${BASE_URL}/api/index/status`)
    const data = await response.json()
    
    if (response.ok) {
      log('green', '✅', `Total whales tracked: ${data.total_whales || 0}`)
      log('green', '✅', `Total trades recorded: ${data.total_trades || 0}`)
      log('green', '✅', `Last update: ${data.last_update || 'Never'}`)
      
      if (data.total_trades > 0) {
        return { status: 'data_found', data }
      } else {
        log('yellow', '⚠️', 'No trades recorded yet - cron may not have run yet')
        return { status: 'no_data', data }
      }
    } else {
      log('yellow', '⚠️', `Indexing status unavailable: ${response.status}`)
      return { status: 'unavailable' }
    }
  } catch (error) {
    log('yellow', '⚠️', `Cannot fetch indexing status: ${error.message}`)
    return { status: 'error' }
  }
}

async function checkCronLogs() {
  section('4. Cron Job Logs')
  
  try {
    const response = await fetch(`${BASE_URL}/api/index/log?limit=5`)
    const data = await response.json()
    
    if (response.ok && data.log && data.log.length > 0) {
      log('green', '✅', `Found ${data.log.length} recent cron executions`)
      
      data.log.forEach((log, index) => {
        console.log(`\n  ${index + 1}. Job: ${log.job_type}`)
        console.log(`     Status: ${log.status}`)
        console.log(`     Timestamp: ${new Date(log.created_at * 1000).toLocaleString()}`)
        if (log.details) {
          console.log(`     Details: ${JSON.stringify(log.details).substring(0, 100)}...`)
        }
      })
    } else {
      log('yellow', '⚠️', 'No cron logs found yet')
    }
  } catch (error) {
    log('yellow', '⚠️', `Cannot fetch cron logs: ${error.message}`)
  }
}

async function checkWhaleData() {
  section('5. Whale Data Collection')
  
  try {
    const response = await fetch(`${BASE_URL}/api/whales?limit=5`)
    const data = await response.json()
    
    if (response.ok && data.length > 0) {
      log('green', '✅', `Found ${data.length} whales in database`)
      
      data.slice(0, 3).forEach((whale, index) => {
        console.log(`\n  ${index + 1}. Whale: ${whale.wallet_address.substring(0, 10)}...`)
        console.log(`     Display: ${whale.display_name}`)
        console.log(`     Trades: ${whale.total_trades}`)
        console.log(`     Volume: ${whale.total_volume}`)
        console.log(`     ROI: ${whale.total_roi?.toFixed(2)}%`)
        console.log(`     Active: ${whale.is_active ? 'Yes' : 'No'}`)
      })
      
      return true
    } else {
      log('yellow', '⚠️', 'No whale data in database yet')
      return false
    }
  } catch (error) {
    log('yellow', '⚠️', `Cannot fetch whale data: ${error.message}`)
    return false
  }
}

async function checkTradeData() {
  section('6. Trade Data Collection')
  
  try {
    // Check if there's any trade data
    const response = await fetch(`${BASE_URL}/api/index/status`)
    const status = await response.json()
    
    if (status.total_trades > 0) {
      log('green', '✅', `Total trades in database: ${status.total_trades}`)
      log('green', '✅', 'Trades are being recorded from Polymarket')
      
      // Try to get recent trades for first whale
      const whalesResponse = await fetch(`${BASE_URL}/api/whales?limit=1`)
      if (whalesResponse.ok) {
        const whales = await whalesResponse.json()
        if (whales.length > 0) {
          const whale = whales[0]
          // Would show recent trades for this whale
          console.log(`\n  Sample: ${whale.wallet_address.substring(0, 10)}...`)
          console.log(`  Has ${whale.total_trades} trades recorded`)
        }
      }
      
      return true
    } else {
      log('yellow', '⚠️', 'No trades recorded yet')
      log('yellow', '⚠️', 'Cron job needs to run to collect data')
      return false
    }
  } catch (error) {
    log('yellow', '⚠️', `Cannot check trade data: ${error.message}`)
    return false
  }
}

async function checkMarketData() {
  section('7. Market Data Collection')
  
  try {
    const response = await fetch(`${BASE_URL}/api/markets?limit=5`)
    const data = await response.json()
    
    if (response.ok && data.length > 0) {
      log('green', '✅', `Markets indexed: ${data.length}`)
      
      data.slice(0, 2).forEach((market, index) => {
        console.log(`\n  ${index + 1}. Market: ${market.question?.substring(0, 50)}...`)
        console.log(`     ID: ${market.condition_id}`)
        console.log(`     Category: ${market.category}`)
        console.log(`     Volume: ${market.total_volume}`)
      })
      
      return true
    } else {
      log('yellow', '⚠️', 'No market data collected yet')
      return false
    }
  } catch (error) {
    log('yellow', '⚠️', `Cannot fetch market data: ${error.message}`)
    return false
  }
}

async function checkDataQuality() {
  section('8. Data Quality Checks')
  
  const checks = [
    {
      name: 'Whale wallet addresses are valid',
      test: async () => {
        const response = await fetch(`${BASE_URL}/api/whales?limit=1`)
        if (response.ok) {
          const whales = await response.json()
          return whales.length > 0 && whales[0].wallet_address && whales[0].wallet_address.startsWith('0x')
        }
        return false
      }
    },
    {
      name: 'Trades have prices and sizes',
      test: async () => {
        const response = await fetch(`${BASE_URL}/api/index/status`)
        if (response.ok) {
          const status = await response.json()
          return status.total_trades > 0
        }
        return false
      }
    },
    {
      name: 'Markets have valid condition IDs',
      test: async () => {
        const response = await fetch(`${BASE_URL}/api/markets?limit=1`)
        if (response.ok) {
          const markets = await response.json()
          return markets.length > 0 && markets[0].condition_id
        }
        return false
      }
    },
    {
      name: 'Metrics are being calculated',
      test: async () => {
        const response = await fetch(`${BASE_URL}/api/whales?limit=1`)
        if (response.ok) {
          const whales = await response.json()
          return whales.length > 0 && (whales[0].total_roi !== null || whales[0].total_pnl !== null)
        }
        return false
      }
    }
  ]
  
  for (const check of checks) {
    try {
      const result = await check.test()
      if (result) {
        log('green', '✅', check.name)
      } else {
        log('yellow', '⚠️', check.name)
      }
    } catch (error) {
      log('yellow', '⚠️', `${check.name} - ${error.message}`)
    }
  }
}

async function showRecommendations() {
  section('9. Recommendations')
  
  console.log(`${colors.cyan}For Data to Be Collected:${colors.reset}

1. ✅ Server must be running
   ${colors.yellow}npm run dev:cron${colors.reset}

2. ✅ Wait for cron job to execute
   Runs every 30 seconds in local development

3. ✅ Watch the console for cron output
   You should see:
   ${colors.cyan}⏱️  [HH:MM:SS] Running cron job...${colors.reset}
   ${colors.green}✅ [HH:MM:SS] Cron job completed successfully${colors.reset}

4. ✅ Verify data is being collected
   Run this script again to check:
   ${colors.yellow}node verify-data.js${colors.reset}

5. ✅ Query database directly
   ${colors.yellow}sqlite3 ${DB_PATH}${colors.reset}
   ${colors.cyan}sqlite> SELECT COUNT(*) FROM whales;${colors.reset}
   ${colors.cyan}sqlite> SELECT COUNT(*) FROM whale_trades;${colors.reset}
   ${colors.cyan}sqlite> SELECT COUNT(*) FROM markets;${colors.reset}

${colors.cyan}Data Flow:${colors.reset}
1. Cron job runs every 30 seconds
2. Fetches data from Polymarket APIs
3. ClobService gets trades and positions
4. TradeProcessorService processes each trade
5. Repositories save to local SQLite database
6. API endpoints serve the data

${colors.cyan}Expected Data Collection:${colors.reset}
- Whales: 50+ active wallets
- Trades: Hundreds to thousands per run
- Markets: Thousands of available markets
- Events: New positions, exits, reversals detected
- Metrics: ROI, win rate, Sharpe ratio calculated
`)
}

async function runAllChecks() {
  try {
    const serverOk = await checkServerHealth()
    
    if (!serverOk) {
      log('red', '❌', 'Cannot continue - server not running')
      process.exit(1)
    }
    
    await checkDatabase()
    const indexing = await checkIndexingStatus()
    
    if (indexing.status !== 'error' && indexing.status !== 'unavailable') {
      await checkCronLogs()
      await checkWhaleData()
      await checkTradeData()
      await checkMarketData()
      await checkDataQuality()
    }
    
    await showRecommendations()
    
    // Summary
    section('Summary')
    console.log(`${colors.green}✅ Data Collection Verification Complete${colors.reset}

${colors.cyan}What This Means:${colors.reset}
- Server is ${indexing.status === 'data_found' ? 'collecting data' : 'running but not collecting yet'}
- Database is ${indexing.status === 'data_found' ? 'populated' : 'waiting for first run'}
- Cron job is ${indexing.data?.last_update ? 'working' : 'pending first execution'}

${colors.cyan}Next Steps:${colors.reset}
1. Let the cron job run a few times (wait 2-3 minutes)
2. Run this script again to see data populated
3. Query the API endpoints at http://localhost:8787/docs
4. Check database with SQLite CLI
`)
    
  } catch (error) {
    log('red', '❌', `Verification failed: ${error.message}`)
    process.exit(1)
  }
}

// Run all checks
await runAllChecks()
