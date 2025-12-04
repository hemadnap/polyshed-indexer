# Local Development Guide - Database Options

## Question: Can I run locally connected to Cloudflare D1?

**Short Answer:** ❌ **NO**, not directly. D1 is Cloudflare's remote serverless database.

However, you have several options for local development:

---

## Option 1: ✅ RECOMMENDED - Local SQLite with Wrangler (Easiest)

**What it is:** Wrangler creates a local SQLite database that mimics your production D1 database.

### Setup
```bash
# Install dependencies
npm install

# Start local development server
npm run dev
```

This automatically:
- ✅ Creates `.wrangler/` directory with local SQLite database
- ✅ Simulates D1 bindings locally
- ✅ Uses exact same schema as production
- ✅ Runs on `http://localhost:8787`

### Pros
- ✅ Closest to production environment
- ✅ Uses exact same Wrangler configuration
- ✅ No setup needed
- ✅ Automatic schema initialization
- ✅ Supports all D1 features

### Cons
- ⚠️ Local-only database (resets when you restart)
- ⚠️ Separate from production D1

### How to persist data
The data is stored in `.wrangler/state/d1/` and survives restarts:
```bash
# Local data location
.wrangler/state/d1/your_db_file.sqlite3

# This persists between dev restarts
```

### Usage
```bash
# Start dev server (local D1 created automatically)
npm run dev

# The app will use local D1 on http://localhost:8787

# Stop with Ctrl+C
# Restart with npm run dev (data persists)
```

---

## Option 2: ✅ GOOD - Remote D1 from Local Dev

**What it is:** Connect your local dev environment to the actual Cloudflare D1.

### Setup
```bash
# 1. Configure wrangler.toml for remote access (already done)
# 2. Authenticate with Cloudflare
npx wrangler login

# 3. Start dev with remote D1
npx wrangler dev --remote
```

### Pros
- ✅ Uses real production database
- ✅ Test against actual data
- ✅ See real Polymarket data flow
- ✅ Perfect for testing integrations

### Cons
- ❌ **DANGEROUS** - modifies production data locally
- ❌ Risk of data corruption
- ❌ Not recommended for development
- ❌ Requires careful branching strategy

### ⚠️ WARNING
```
DO NOT use --remote flag casually!
This connects to REAL PRODUCTION data.
```

---

## Option 3: ✅ BEST FOR TESTING - Local D1 + Remote API

**What it is:** Use local SQLite database + connect to real Polymarket APIs.

### Setup
```bash
# 1. Start local dev server
npm run dev

# 2. Configure to use real external APIs in wrangler.toml
# Already configured - uses:
#   POLYMARKET_API_BASE = "https://clob.polymarket.com"
#   GAMMA_API_BASE = "https://gamma-api.polymarket.com"

# 3. Access at http://localhost:8787
```

### Configuration
Your `wrangler.toml` already has this:
```toml
[vars]
POLYMARKET_API_BASE = "https://clob.polymarket.com"
GAMMA_API_BASE = "https://gamma-api.polymarket.com"
```

### Pros
- ✅ Local safe database
- ✅ Real market data from APIs
- ✅ Perfect for development
- ✅ No production data risk
- ✅ Fast feedback loop

### Cons
- ⚠️ Local data won't sync with production
- ⚠️ API rate limits apply

### Recommended Workflow
```bash
# Terminal 1: Start local dev
npm run dev

# Terminal 2: Run tests
npm test

# Terminal 3: Make API calls (local D1 + real APIs)
curl http://localhost:8787/api/whales
```

---

## Option 4: ⚙️ ADVANCED - Docker + SQLite

**What it is:** Run SQLite in a Docker container for consistency.

### Setup
```bash
# 1. Create Docker container with SQLite
docker run -d \
  --name polyshed-db \
  -v $(pwd)/.docker/db:/var/lib/sqlite \
  -p 3306:3306 \
  mysql:latest

# 2. Or use SQLite directly
docker run -d \
  --name polyshed-sqlite \
  -v $(pwd)/.docker/db:/data \
  nouchka/sqlite3:latest

# 3. Update wrangler.toml to connect to Docker (advanced)
```

### Pros
- ✅ Consistent across team
- ✅ Matches production closer
- ✅ Can share with team

### Cons
- ❌ Complex setup
- ❌ Requires Docker
- ❌ Extra overhead

### Recommendation: Skip this unless needed

---

## 📋 Comparison Table

| Option | Setup | Performance | Production Parity | Data Persistence | Risk |
|--------|-------|-------------|-------------------|------------------|------|
| **Local SQLite (Dev Mode)** | 1 command | Fast ⚡ | Very High ✅ | Yes ✅ | None ✅ |
| **Remote D1** | `--remote` | Depends | Perfect ✅ | Yes | HIGH ⚠️ |
| **Local + Real APIs** | 1 command | Fast ⚡ | Very High ✅ | Yes ✅ | None ✅ |
| **Docker SQLite** | Moderate | Medium | High | Yes | None ✅ |

---

## 🚀 Recommended Setup for You

### For Development & Testing
```bash
# Start local dev (uses local SQLite + real APIs)
npm run dev

# Access at:
# http://localhost:8787

# Run tests against local D1:
npm test

# This setup:
# ✅ Uses local database (safe)
# ✅ Connects to real Polymarket APIs
# ✅ Closest to production
# ✅ Fast iteration
# ✅ No risk to production
```

### Workflow
```bash
# Terminal 1: Local dev server
npm run dev

# Terminal 2: Run tests
npm test

# Terminal 3: Test API manually
curl http://localhost:8787/api/whales

# Make code changes, auto-reloads
# Test locally before pushing
# Deploy to production
npm run deploy
```

---

## 🔄 Data Sync Strategy

### Option A: Reset Local DB Between Sessions
```bash
# Delete local database and start fresh
rm -rf .wrangler/state/d1/

# Start dev (creates new database)
npm run dev

# Schema auto-initializes from schema.sql
```

### Option B: Keep Local Data
```bash
# Local data persists in:
.wrangler/state/d1/your_db.sqlite3

# Data survives npm run dev restarts
# Good for testing workflows
```

### Option C: Sync from Production (Advanced)
```bash
# Download production D1 data locally
wrangler d1 export polyshed_indexer_db > backup.sql

# Import into local D1
wrangler d1 execute polyshed_indexer_db --file backup.sql --local
```

---

## 📊 Local Database Structure

### Where Local DB is Stored
```
polyshed-indexer/
├── .wrangler/
│   └── state/
│       └── d1/
│           └── polyshed_indexer_db.sqlite3  ← Your local database
├── node_modules/
├── src/
├── test/
└── schema.sql                                ← Schema source
```

### Initialize Schema Locally
```bash
# Wrangler auto-initializes with schema.sql
# Or manually run:
wrangler d1 execute polyshed_indexer_db --file schema.sql --local
```

---

## 🧪 Testing with Local Database

### Run Tests Against Local D1
```bash
# Tests automatically use local D1
npm test

# This runs 143+ tests against local database
# Fast and safe
```

### Test File Example
```javascript
// test/repositories/WhaleRepository.test.js
// Automatically connects to .wrangler/state/d1/

import { WhaleRepository } from '../../src/repositories/WhaleRepository.js'

describe('WhaleRepository', () => {
  it('should create whale', async () => {
    const repo = new WhaleRepository(env.DB) // Uses local D1
    // ...
  })
})
```

---

## 🚨 Common Scenarios

### Scenario 1: Fresh Start
```bash
# 1. Delete old data (optional)
rm -rf .wrangler/

# 2. Start fresh
npm run dev

# ✅ New local D1 created with schema
```

### Scenario 2: Persist Data Between Restarts
```bash
# 1. Start dev
npm run dev

# 2. Data in .wrangler/state/d1/ persists
# 3. Stop dev (Ctrl+C)
# 4. Restart dev
npm run dev

# ✅ Data still there!
```

### Scenario 3: Test with Real Market Data
```bash
# 1. Start dev
npm run dev

# 2. Trigger indexing manually
curl -X POST http://localhost:8787/api/index/trigger-cron

# 3. Fetches real Polymarket data
# 4. Stores in local D1
# 5. Test your logic against real data

# ✅ No risk to production
```

### Scenario 4: Compare Local vs Production
```bash
# Terminal 1: Local dev
npm run dev

# Terminal 2: Query local DB
curl http://localhost:8787/api/whales

# Terminal 3: Query production
curl https://polyshed_indexer.tcsn.workers.dev/api/whales

# Compare results
```

---

## 💡 Pro Tips

### Tip 1: Clear Local Data Quickly
```bash
# Remove local database
rm -rf .wrangler/state/d1/

# Fresh start with next npm run dev
```

### Tip 2: Backup Local Database
```bash
# Copy local database for safekeeping
cp .wrangler/state/d1/polyshed_indexer_db.sqlite3 ~/backup_db.sqlite3
```

### Tip 3: Inspect Local Database
```bash
# Install sqlite3
brew install sqlite3

# Access local database
sqlite3 .wrangler/state/d1/polyshed_indexer_db.sqlite3

# Then in sqlite3 shell:
# .tables              # List tables
# SELECT * FROM whales;  # Query data
# .exit               # Exit
```

### Tip 4: Hot Reload
```bash
# npm run dev auto-reloads on code changes
# Make edits and refresh browser
# Changes apply immediately
```

---

## 🎯 Recommended Development Environment

```
┌─────────────────────────────────────────┐
│         Your Local Machine              │
├─────────────────────────────────────────┤
│                                         │
│  npm run dev                            │
│    ↓                                    │
│  Local Node.js Server (port 8787)       │
│    ↓                                    │
│  .wrangler/state/d1/               ← Local SQLite Database
│    ↓                                    │
│  Real Polymarket APIs                   │
│  https://clob.polymarket.com            │
│                                         │
└─────────────────────────────────────────┘

Perfect for:
✅ Development
✅ Testing
✅ Integration testing (with real APIs)
✅ Learning
❌ NOT suitable for: Production backup
```

---

## 📝 Step-by-Step: Get Started Locally

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Local Dev
```bash
npm run dev
```

You should see:
```
⛅ wrangler 3.114.15
 ⚔️  Wrangler is not compatible with the latest version...

Your worker has access to the following bindings:
- D1 Database:
  - DB: polyshed_indexer_db (local)
- KV Namespaces:
  - CACHE: (local)

⎌ Ready on http://localhost:8787
```

### Step 3: Test Locally
```bash
# In another terminal
npm test
```

### Step 4: Make API Call
```bash
# Try an endpoint
curl http://localhost:8787/api/whales
```

### Step 5: Inspect Local Database
```bash
# Query the local database
sqlite3 .wrangler/state/d1/polyshed_indexer_db.sqlite3

# Inside sqlite3:
sqlite> SELECT * FROM whales LIMIT 5;
sqlite> .exit
```

---

## ✅ Conclusion

**Best Option for You: Option 3 (Local SQLite + Real APIs)**

```bash
# One command to start everything
npm run dev

# Local database: .wrangler/state/d1/polyshed_indexer_db.sqlite3
# Real APIs: Connects to Polymarket
# Perfect for: Development, testing, integration testing
# Risk: None - local data only
```

### Why This is Best
- ✅ Exactly one command to start
- ✅ Local database (safe)
- ✅ Real market data (accurate testing)
- ✅ Closest to production environment
- ✅ No additional setup needed
- ✅ Data persists between restarts
- ✅ Great for team collaboration

**Start developing locally right now:**
```bash
npm run dev
```

That's it! 🚀

---

**Last Updated:** December 4, 2025  
**Status:** ✅ Ready for local development
