#!/bin/bash

# 🚀 POLYSHED INDEXER - LOCAL DEVELOPMENT QUICK START
#
# This file documents the exact commands to run locally with a local DB and cron job.

echo "════════════════════════════════════════════════════════════"
echo "   Polyshed Indexer - Local Development Setup"
echo "════════════════════════════════════════════════════════════"
echo ""

# ═══════════════════════════════════════════════════════════════════════
# 1️⃣ INITIAL SETUP (Run Once)
# ═══════════════════════════════════════════════════════════════════════

echo "📦 STEP 1: Install Dependencies (Run Once)"
echo "───────────────────────────────────────────"
echo ""
echo "Command:"
echo "  npm install"
echo ""
echo "This installs:"
echo "  ✓ Hono (web framework)"
echo "  ✓ Wrangler (Cloudflare CLI)"
echo "  ✓ Vitest (testing framework)"
echo ""

# ═══════════════════════════════════════════════════════════════════════
# 2️⃣ VERIFICATION
# ═══════════════════════════════════════════════════════════════════════

echo "✅ STEP 2: Verify Setup"
echo "──────────────────────"
echo ""
echo "Command:"
echo "  node verify-setup.js"
echo ""
echo "This checks:"
echo "  ✓ Node.js version (needs 18+)"
echo "  ✓ All project files"
echo "  ✓ npm scripts"
echo "  ✓ Dependencies installed"
echo "  ✓ Configuration files"
echo ""

# ═══════════════════════════════════════════════════════════════════════
# 3️⃣ START LOCAL DEVELOPMENT WITH CRON
# ═══════════════════════════════════════════════════════════════════════

echo "🚀 STEP 3: Run Locally with Cron Job"
echo "─────────────────────────────────────"
echo ""
echo "Command:"
echo "  npm run dev:cron"
echo ""
echo "This starts:"
echo "  ✓ Local web server on http://localhost:8787"
echo "  ✓ Local SQLite database (.wrangler/state/v3/d1/)"
echo "  ✓ Automatic cron job (every 30 seconds)"
echo "  ✓ Real Polymarket API integration"
echo ""
echo "Expected Output:"
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║ Polyshed Indexer - Local Dev with Cron   ║"
echo "  ╚═══════════════════════════════════════════╝"
echo "  "
echo "  🚀 Starting local development server..."
echo "  📍 Server: http://localhost:8787"
echo "  📊 Database: .wrangler/state/v3/d1/"
echo "  "
echo "  ⏰ Starting local cron scheduler..."
echo "     • Runs every 30 seconds (for testing)"
echo "     • Triggers: /api/index/trigger-cron"
echo "  "
echo "  ✅ Development environment ready!"
echo "  "
echo "  Then every 30 seconds:"
echo "  ⏱️  [14:30:45] Running cron job..."
echo "  ✅ [14:30:45] Cron job completed successfully"
echo ""

# ═══════════════════════════════════════════════════════════════════════
# 4️⃣ TESTING IN ANOTHER TERMINAL
# ═══════════════════════════════════════════════════════════════════════

echo "💻 STEP 4: Test the API (In Another Terminal)"
echo "──────────────────────────────────────────────"
echo ""

echo "🔍 Health Check:"
echo "  curl http://localhost:8787/health"
echo ""

echo "🐋 List Whales:"
echo "  curl http://localhost:8787/api/whales"
echo ""

echo "📈 List Markets:"
echo "  curl http://localhost:8787/api/markets"
echo ""

echo "📊 Swagger UI Documentation:"
echo "  open http://localhost:8787/docs"
echo "  (or open in browser: http://localhost:8787/docs)"
echo ""

echo "🔍 Get Indexing Status:"
echo "  curl http://localhost:8787/api/index/status"
echo ""

echo "📋 Get Cron Logs:"
echo "  curl http://localhost:8787/api/index/log"
echo ""

echo "🗄️  Query Database Directly:"
echo "  sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3"
echo "  sqlite> SELECT COUNT(*) FROM whales;"
echo "  sqlite> SELECT COUNT(*) FROM whale_trades;"
echo "  sqlite> .exit"
echo ""

# ═══════════════════════════════════════════════════════════════════════
# 5️⃣ RUNNING TESTS
# ═══════════════════════════════════════════════════════════════════════

echo "🧪 STEP 5: Run Tests (While Server is Running)"
echo "────────────────────────────────────────────────"
echo ""
echo "In a new terminal:"
echo "  npm test"
echo ""
echo "Run specific test file:"
echo "  npm test -- test/repositories/WhaleRepository.test.js"
echo ""
echo "Watch mode (re-run on file changes):"
echo "  npm test -- --watch"
echo ""

# ═══════════════════════════════════════════════════════════════════════
# 6️⃣ STOPPING
# ═══════════════════════════════════════════════════════════════════════

echo "🛑 STEP 6: Stop Development Server"
echo "────────────────────────────────────"
echo ""
echo "In the terminal running 'npm run dev:cron':"
echo "  Press Ctrl+C"
echo ""
echo "Data persists in .wrangler/ between restarts."
echo ""

# ═══════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════

echo "⚙️  CONFIGURATION"
echo "─────────────────"
echo ""
echo "Local Dev Server:     http://localhost:8787"
echo "Local Database:       .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3"
echo "Cron Interval:        30 seconds (default, configurable in local-dev.js)"
echo "Production Cron:      30 minutes"
echo ""

# ═══════════════════════════════════════════════════════════════════════
# WHAT THE CRON JOB DOES
# ═══════════════════════════════════════════════════════════════════════

echo "📊 WHAT THE CRON JOB DOES (Every 30 Seconds)"
echo "──────────────────────────────────────────────"
echo ""
echo "1. Fetches Real Data"
echo "   • Gets active whales from Polymarket"
echo "   • Retrieves positions and trades"
echo "   • Captures market snapshots"
echo ""
echo "2. Processes Data"
echo "   • Detects events (new positions, exits, reversals)"
echo "   • Calculates metrics (ROI, win rate, Sharpe ratio)"
echo "   • Updates local SQLite database"
echo ""
echo "3. Logs Results"
echo "   • Shows success/failure"
echo "   • Displays timestamp"
echo "   • Reports data processed"
echo ""

# ═══════════════════════════════════════════════════════════════════════
# USEFUL COMMANDS
# ═══════════════════════════════════════════════════════════════════════

echo "🔧 OTHER USEFUL COMMANDS"
echo "────────────────────────"
echo ""
echo "Deploy to Production:"
echo "  npm run deploy"
echo ""
echo "View Production Logs:"
echo "  npm run tail"
echo ""
echo "Apply Database Migrations:"
echo "  npm run db:local      (local database)"
echo "  npm run db:migrate    (production database)"
echo ""
echo "Just Run Dev Server (without cron):"
echo "  npm run dev"
echo ""

# ═══════════════════════════════════════════════════════════════════════
# TROUBLESHOOTING
# ═══════════════════════════════════════════════════════════════════════

echo "⚠️  TROUBLESHOOTING"
echo "──────────────────"
echo ""
echo "Port 8787 already in use?"
echo "  kill -9 \$(lsof -t -i :8787)"
echo ""
echo "Database errors?"
echo "  rm -rf .wrangler/"
echo "  npm run dev:cron"
echo ""
echo "For more issues, see: TROUBLESHOOTING.md"
echo ""

# ═══════════════════════════════════════════════════════════════════════
# DOCUMENTATION
# ═══════════════════════════════════════════════════════════════════════

echo "📚 DOCUMENTATION"
echo "────────────────"
echo ""
echo "Quick Start:             START_LOCAL_DEV.md"
echo "Local Development:       LOCAL_DEVELOPMENT_GUIDE.md"
echo "Local Cron Setup:        LOCAL_CRON_GUIDE.md"
echo "Deployment:              DEPLOYMENT_SUMMARY.md"
echo "Testing:                 TESTING.md"
echo "Troubleshooting:         TROUBLESHOOTING.md"
echo ""

echo "════════════════════════════════════════════════════════════"
echo "Ready to start? Run:"
echo ""
echo "  npm install && npm run dev:cron"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
