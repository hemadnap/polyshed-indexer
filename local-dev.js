#!/usr/bin/env node

/**
 * Local Development Runner with Cron Job
 * 
 * This script runs Polyshed Indexer locally with:
 * - Local SQLite database
 * - Real Polymarket APIs
 * - Local cron job that runs every 30 minutes
 * - Hot reload support
 */

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

console.log('╔═══════════════════════════════════════════════════════════╗')
console.log('║   Polyshed Indexer - Local Development with Cron Job     ║')
console.log('╚═══════════════════════════════════════════════════════════╝')
console.log()

// Start wrangler dev server
console.log('🚀 Starting local development server...')
console.log('📍 Server: http://localhost:8787')
console.log('📊 Database: .wrangler/state/v3/d1/')
console.log()

const wranglerProcess = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  stdio: 'inherit',
  shell: true
})

// Wait for server to start
setTimeout(() => {
  console.log()
  console.log('⏰ Starting local cron scheduler...')
  console.log('   • Runs every 30 seconds (for testing)')
  console.log('   • Triggers: /api/index/trigger-cron')
  console.log()
  
  // Run cron job every 30 seconds (30000 ms) for local testing
  // In production, Cloudflare runs it every 30 minutes
  const cronInterval = 30000 // 30 seconds for local testing
  
  setInterval(async () => {
    const timestamp = new Date().toLocaleTimeString()
    console.log(`⏱️  [${timestamp}] Running cron job...`)
    
    try {
      const response = await fetch('http://localhost:8787/api/index/trigger-cron', {
        method: 'POST',
        headers: {
          'cf-cron': 'true' // Simulate cron trigger header
        }
      })
      
      if (response.ok) {
        console.log(`✅ [${timestamp}] Cron job completed successfully`)
      } else {
        console.log(`⚠️  [${timestamp}] Cron job returned status: ${response.status}`)
      }
    } catch (error) {
      console.log(`❌ [${timestamp}] Cron job failed: ${error.message}`)
    }
    
    console.log()
  }, cronInterval)
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log()
  console.log('✅ Development environment ready!')
  console.log()
  console.log('� SWAGGER/API DOCUMENTATION:')
  console.log('   🔗 http://localhost:8787/docs')
  console.log()
  console.log('📚 KEY ENDPOINTS:')
  console.log('   Whales:')
  console.log('   • GET  http://localhost:8787/api/whales              (List all whales)')
  console.log('   • POST http://localhost:8787/api/whales              (Add new whale)')
  console.log('   • GET  http://localhost:8787/api/whales/{address}    (Get whale details)')
  console.log()
  console.log('   Markets:')
  console.log('   • GET  http://localhost:8787/api/markets             (List markets)')
  console.log('   • GET  http://localhost:8787/api/markets/{id}        (Market details)')
  console.log()
  console.log('   Indexing:')
  console.log('   • GET  http://localhost:8787/api/index/status        (Indexing status)')
  console.log('   • POST http://localhost:8787/api/index/trigger-cron  (Run cron manually)')
  console.log('   • GET  http://localhost:8787/api/index/health        (System health)')
  console.log()
  console.log('   System:')
  console.log('   • GET  http://localhost:8787/health                  (Health check)')
  console.log('   • GET  http://localhost:8787/openapi.json            (OpenAPI spec)')
  console.log()
  console.log('🔧 COMMANDS (in another terminal):')
  console.log('   • npm test                                           (Run tests)')
  console.log('   • npm run deploy                                     (Deploy to production)')
  console.log('   • node verify-data.js                                (Verify data collection)')
  console.log()
  console.log('📊 LOCAL DATABASE:')
  console.log('   .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3')
  console.log()
  console.log('⏰ CRON JOB:')
  console.log('   • Runs every 30 seconds in local development')
  console.log('   • Runs every 30 minutes in production')
  console.log('   • Triggers: Whale updates + Market snapshots')
  console.log()
  console.log('💡 QUICK START:')
  console.log('   1. Open: http://localhost:8787/docs')
  console.log('   2. Add a whale: POST /api/whales')
  console.log('      Body: { "wallet_address": "0x...", "display_name": "My Whale" }')
  console.log('   3. Wait for cron to run (30 seconds)')
  console.log('   4. Check data: GET /api/index/status')
  console.log('   5. View whale trades: GET /api/whales/{address}/trades')
  console.log()
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log()
  console.log('Press Ctrl+C to stop')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log()
}, 3000)

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log()
  console.log('🛑 Shutting down...')
  wranglerProcess.kill()
  process.exit(0)
})
