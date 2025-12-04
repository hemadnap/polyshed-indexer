# 🎯 Polyshed Indexer - Complete Local Development Setup

> **Status:** ✅ **READY** - Run locally with SQLite database and automatic cron job

---

## 🚀 **TL;DR - Start Here**

```bash
# 1. Install dependencies (first time only)
npm install

# 2. Run with local DB and automatic cron job
npm run dev:cron

# 3. In another terminal, test:
curl http://localhost:8787/health
open http://localhost:8787/docs
```

**That's it!** Your development environment is running:
- Web server: http://localhost:8787
- Local database: `.wrangler/state/v3/d1/`
- Cron job: Automatic (every 30 seconds)

---

## 📊 System Architecture

```
Your Machine
│
├─ npm run dev:cron (local-dev.js)
│  └─ Starts wrangler dev + cron scheduler
│
├─ Wrangler Dev Server (Port 8787)
│  ├─ HTTP endpoints
│  ├─ Hono web framework
│  └─ D1 database binding
│
├─ Local SQLite Database
│  ├─ Location: .wrangler/state/v3/d1/
│  ├─ Auto-initialized with schema
│  └─ Persists between restarts
│
├─ Cron Scheduler (Every 30 seconds)
│  ├─ Fetches whale data from Polymarket
│  ├─ Processes events and metrics
│  ├─ Updates local SQLite database
│  └─ Logs all activity
│
└─ Real Polymarket APIs
   ├─ CLOB API: Market data, trades, positions
   ├─ Gamma API: Additional market info
   └─ Live market data (no mocking)
```

---

## 🎯 Quick Reference

### Start Development
```bash
npm run dev:cron
```
Starts local server with automatic cron job every 30 seconds.

### Run Tests
```bash
npm test
```
Runs full test suite with Vitest.

### Verify Setup
```bash
node verify-setup.js
```
Checks all components are properly configured.

### Test API Endpoints
```bash
# Health check
curl http://localhost:8787/health

# List whales
curl http://localhost:8787/api/whales

# List markets
curl http://localhost:8787/api/markets

# Get status
curl http://localhost:8787/api/index/status

# Manually trigger cron
curl -X POST http://localhost:8787/api/index/trigger-cron \
  -H "cf-cron: true"
```

### Query Local Database
```bash
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3
sqlite> SELECT * FROM whales LIMIT 5;
sqlite> SELECT COUNT(*) FROM whale_trades;
```

### Deploy to Production
```bash
npm run deploy
```

---

## 📚 Documentation Guide

| Document | Purpose | Read When |
|----------|---------|-----------|
| **START_LOCAL_DEV.md** | Quick start with examples | First thing! |
| **SETUP_COMPLETE.md** | Feature overview & reference | Overview & learning |
| **LOCAL_CRON_GUIDE.md** | Detailed cron configuration | Understanding cron job |
| **LOCAL_DEVELOPMENT_GUIDE.md** | All dev options (D1, Docker, etc.) | Exploring alternatives |
| **TESTING.md** | How to run and write tests | Running/fixing tests |
| **TROUBLESHOOTING.md** | Common issues & solutions | When things break |
| **DEPLOYMENT_SUMMARY.md** | Production deployment info | Deploying to production |
| **GETTING_STARTED.sh** | Command reference guide | Quick command lookup |

---

## ✨ Features Ready to Use

### 🌐 Web Server
- ✅ Local development server on http://localhost:8787
- ✅ Hot reload on code changes
- ✅ Hono web framework
- ✅ CORS support

### 🗄️ Local Database
- ✅ SQLite database (local, no remote dependency)
- ✅ Auto-initialized with schema
- ✅ Persists between restarts
- ✅ Full schema with all tables

### ⏰ Cron Job
- ✅ Runs every 30 seconds (local testing speed)
- ✅ Simulates production's 30-minute schedule
- ✅ Fetches real Polymarket data
- ✅ Auto-logs all executions

### 🧪 Testing
- ✅ Full test suite with Vitest
- ✅ Repository tests
- ✅ Service tests
- ✅ Integration tests

### 📊 API Endpoints
- ✅ GET `/health` - Health check
- ✅ GET `/docs` - Swagger UI
- ✅ GET `/api/whales` - List whales
- ✅ GET `/api/markets` - List markets
- ✅ GET `/api/index/status` - Indexing status
- ✅ GET `/api/index/log` - Cron logs
- ✅ POST `/api/index/trigger-cron` - Manual trigger

### 📈 Data Processing
- ✅ Whale tracking
- ✅ Trade recording
- ✅ Position management
- ✅ Event detection
- ✅ Metrics calculation
- ✅ Market snapshots

---

## 🔧 What's Configured

### Environment Files
- ✅ `wrangler.toml` - Cloudflare config with D1, cron, env vars
- ✅ `package.json` - Scripts and dependencies
- ✅ `.gitignore` - Proper git ignoring
- ✅ `schema.sql` - Database schema

### Source Code
- ✅ `src/index.js` - Main worker entry point
- ✅ `src/controllers/` - HTTP endpoints
- ✅ `src/services/` - Business logic
- ✅ `src/repositories/` - Data access layer
- ✅ `src/durable-objects/` - WebSocket support

### Local Development
- ✅ `local-dev.js` - Cron job runner
- ✅ `verify-setup.js` - Setup verification
- ✅ Comprehensive documentation

### Testing
- ✅ `test/` - Full test suite
- ✅ `test/setup.js` - Test utilities
- ✅ Vitest configuration (implicit)

---

## 🎓 How It Works

### 1. Start Local Development
```bash
npm run dev:cron
```
- Launches `local-dev.js`
- Starts Wrangler dev server on port 8787
- Initializes local SQLite database
- Starts cron scheduler

### 2. Cron Job Executes Every 30 Seconds
- Sends POST request to `/api/index/trigger-cron`
- Worker receives request and processes data
- Calls WhaleTrackerService
- Fetches data from real Polymarket APIs
- Updates local SQLite database

### 3. Data Flow
```
Polymarket APIs
    ↓
WhaleTrackerService
    ↓
EventDetector
    ↓
Repositories
    ↓
Local SQLite DB
```

### 4. Available for Testing
- API endpoints respond with local data
- Database can be queried
- Tests can run against local data
- Logs show all cron execution details

---

## 📍 File Locations

| Component | Location |
|-----------|----------|
| **Local Database** | `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3` |
| **Dev Server** | http://localhost:8787 |
| **Source Code** | `src/` |
| **Tests** | `test/` |
| **Configuration** | `wrangler.toml`, `package.json` |
| **Local Dev Runner** | `local-dev.js` |
| **Cron Handler** | `src/controllers/indexingController.js` |

---

## ✅ Verification Checklist

```bash
✅ npm install              # Dependencies installed
✅ node verify-setup.js     # All components present
✅ npm run dev:cron         # Server starts
✅ curl http://localhost:8787/health  # API responds
✅ npm test                 # Tests pass
✅ Database queries work    # sqlite3 access works
```

---

## 🚀 Next Steps

### Immediate
1. ✅ Run: `npm install`
2. ✅ Run: `npm run dev:cron`
3. ✅ Visit: http://localhost:8787/docs
4. ✅ Try API calls
5. ✅ Query database

### Soon
- [ ] Explore Swagger UI
- [ ] Run tests with `npm test`
- [ ] Make code changes (hot reload)
- [ ] Query local database
- [ ] Review database schema

### Production (When Ready)
- [ ] Run tests: `npm test`
- [ ] Deploy: `npm run deploy`
- [ ] Monitor: `npm run tail`

---

## ⚠️ Troubleshooting

### Quick Fixes
```bash
# Port already in use?
kill -9 $(lsof -t -i :8787)

# Database issues?
rm -rf .wrangler/

# Dependencies missing?
npm install

# Want to restart?
npm run dev:cron
```

See **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** for detailed solutions.

---

## 📖 Documentation Index

Start with one of these based on your needs:

**Just want to start coding?**
→ Read: [START_LOCAL_DEV.md](./START_LOCAL_DEV.md)

**Want to understand the cron job?**
→ Read: [LOCAL_CRON_GUIDE.md](./LOCAL_CRON_GUIDE.md)

**Need to troubleshoot?**
→ Read: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

**Ready to deploy?**
→ Read: [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)

**Want full details?**
→ Read: [LOCAL_DEVELOPMENT_GUIDE.md](./LOCAL_DEVELOPMENT_GUIDE.md)

---

## 🎉 You're All Set!

Your Polyshed Indexer is fully configured for local development:

✅ **Local SQLite Database**
✅ **Automatic Cron Job**
✅ **Real Polymarket APIs**
✅ **Full API Documentation**
✅ **Complete Test Suite**
✅ **Comprehensive Documentation**

**Ready to start?**

```bash
npm install && npm run dev:cron
```

Happy coding! 🚀
