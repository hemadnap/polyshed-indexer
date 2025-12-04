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
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log()
  console.log('✅ Development environment ready!')
  console.log()
  console.log('📚 Available endpoints:')
  console.log('   • http://localhost:8787/docs              (Swagger UI)')
  console.log('   • http://localhost:8787/api/whales        (List whales)')
  console.log('   • http://localhost:8787/api/markets       (List markets)')
  console.log()
  console.log('🔧 Commands (in another terminal):')
  console.log('   • npm test                                (Run tests)')
  console.log('   • npm run deploy                          (Deploy to production)')
  console.log()
  console.log('📊 Local database:')
  console.log('   .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3')
  console.log()
  console.log('Press Ctrl+C to stop')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log()
}, 3000)

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log()
  console.log('🛑 Shutting down...')
  wranglerProcess.kill()
  process.exit(0)
})
