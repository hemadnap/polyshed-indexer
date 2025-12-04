#!/usr/bin/env node

/**
 * Polyshed Indexer - Setup Verification Script
 * 
 * Verifies that all components for local development with cron are set up correctly
 */

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

console.log('\n╔════════════════════════════════════════════════════════════════╗')
console.log('║      Polyshed Indexer - Local Dev Setup Verification          ║')
console.log('╚════════════════════════════════════════════════════════════════╝\n')

let allGood = true
const checks = []

// Helper function
function check(name, condition, details = '') {
  const status = condition ? '✅' : '❌'
  checks.push({ name, status: condition, details })
  console.log(`${status} ${name}${details ? ` - ${details}` : ''}`)
}

// 1. Check Node.js version
console.log('\n📋 Node.js Environment:')
const nodeVersion = process.version
const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1))
check('Node.js version', majorVersion >= 18, `${nodeVersion}`)

// 2. Check essential files
console.log('\n📦 Project Structure:')
check('package.json', existsSync(resolve(__dirname, 'package.json')))
check('wrangler.toml', existsSync(resolve(__dirname, 'wrangler.toml')))
check('src/index.js', existsSync(resolve(__dirname, 'src/index.js')))
check('local-dev.js', existsSync(resolve(__dirname, 'local-dev.js')))
check('schema.sql', existsSync(resolve(__dirname, 'schema.sql')))

// 3. Check npm scripts
console.log('\n🔧 NPM Scripts:')
try {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'))
  check('dev script', !!pkg.scripts.dev)
  check('dev:cron script', !!pkg.scripts['dev:cron'])
  check('test script', !!pkg.scripts.test)
  check('deploy script', !!pkg.scripts.deploy)
} catch (e) {
  console.log('❌ Could not read package.json')
  allGood = false
}

// 4. Check dependencies
console.log('\n📚 Dependencies:')
try {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'))
  check('hono installed', !!pkg.dependencies.hono)
  check('wrangler installed', !!pkg.devDependencies.wrangler)
  check('vitest installed', !!pkg.devDependencies.vitest)
} catch (e) {
  console.log('❌ Could not verify dependencies')
  allGood = false
}

// 5. Check configurations
console.log('\n⚙️  Configuration:')
try {
  const wrangler = readFileSync(resolve(__dirname, 'wrangler.toml'), 'utf8')
  check('D1 database binding', wrangler.includes('binding = "DB"'))
  check('Cron triggers configured', wrangler.includes('crons'))
  check('Environment variables set', wrangler.includes('POLYMARKET_API_BASE'))
} catch (e) {
  console.log('❌ Could not read wrangler.toml')
  allGood = false
}

// 6. Check source files
console.log('\n📂 Source Files:')
check('WhaleTrackerService.js', existsSync(resolve(__dirname, 'src/services/WhaleTrackerService.js')))
check('MarketService.js', existsSync(resolve(__dirname, 'src/services/MarketService.js')))
check('MetricsService.js', existsSync(resolve(__dirname, 'src/services/MetricsService.js')))
check('EventDetector.js', existsSync(resolve(__dirname, 'src/services/EventDetector.js')))

// 7. Check repositories
console.log('\n🗄️  Repository Files:')
check('WhaleRepository.js', existsSync(resolve(__dirname, 'src/repositories/WhaleRepository.js')))
check('TradeRepository.js', existsSync(resolve(__dirname, 'src/repositories/TradeRepository.js')))
check('PositionRepository.js', existsSync(resolve(__dirname, 'src/repositories/PositionRepository.js')))
check('MetricsRepository.js', existsSync(resolve(__dirname, 'src/repositories/MetricsRepository.js')))

// 8. Check documentation
console.log('\n📖 Documentation:')
check('START_LOCAL_DEV.md', existsSync(resolve(__dirname, 'START_LOCAL_DEV.md')))
check('LOCAL_DEVELOPMENT_GUIDE.md', existsSync(resolve(__dirname, 'LOCAL_DEVELOPMENT_GUIDE.md')))
check('LOCAL_CRON_GUIDE.md', existsSync(resolve(__dirname, 'LOCAL_CRON_GUIDE.md')))
check('TESTING.md', existsSync(resolve(__dirname, 'TESTING.md')))

// 9. Check test files
console.log('\n🧪 Test Files:')
check('test/ directory', existsSync(resolve(__dirname, 'test')))
check('test/setup.js', existsSync(resolve(__dirname, 'test/setup.js')))
check('test/repositories/', existsSync(resolve(__dirname, 'test/repositories')))
check('test/services/', existsSync(resolve(__dirname, 'test/services')))

// Summary
console.log('\n' + '═'.repeat(64))

const failedChecks = checks.filter(c => !c.status)
if (failedChecks.length === 0) {
  console.log('\n✅ All checks passed! Your local dev environment is ready.\n')
  console.log('🚀 To get started:\n')
  console.log('   1. npm install              (install dependencies)')
  console.log('   2. npm run dev:cron         (start local dev with cron)\n')
  console.log('📍 Server will be available at: http://localhost:8787')
  console.log('📊 Database location: .wrangler/state/v3/d1/\n')
  console.log('📚 For detailed info, see: START_LOCAL_DEV.md\n')
} else {
  console.log(`\n⚠️  ${failedChecks.length} check(s) failed:\n`)
  failedChecks.forEach(check => {
    console.log(`   ❌ ${check.name}${check.details ? ` - ${check.details}` : ''}`)
  })
  console.log('\n💡 Run: npm install\n')
  allGood = false
}

console.log('═'.repeat(64) + '\n')

process.exit(allGood ? 0 : 1)
