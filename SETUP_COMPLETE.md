# ✅ Local Development Setup - Complete

Your Polyshed Indexer is **fully configured** to run locally with a local SQLite database and automatic cron job!

---

## 🚀 Quick Start (2 Commands)

```bash
# Install dependencies (first time only)
npm install

# Run with local DB and automatic cron job
npm run dev:cron
```

That's it! Your development environment is ready:
- ✅ Web server: http://localhost:8787
- ✅ Local database: `.wrangler/state/v3/d1/`
- ✅ Automatic cron: Every 30 seconds
- ✅ Real Polymarket APIs: Live market data

---

## 📋 What's Included

### ✅ Local Development
- Local SQLite database (auto-initialized)
- Development web server with hot reload
- Real Polymarket API integration
- Swagger UI documentation

### ✅ Automatic Cron Job
- Runs every 30 seconds (simulates production's 30 minutes)
- Fetches whale trading data
- Updates positions and metrics
- Detects trading events
- Logs all activity

### ✅ Database Management
- Auto-initialized schema
- Persistent between restarts
- Can be reset by deleting `.wrangler/`
- Direct SQLite access

### ✅ Testing & Debugging
- Full test suite with Vitest
- Swagger UI for API exploration
- Database query tools
- Comprehensive logging

### ✅ Documentation
- `START_LOCAL_DEV.md` - Quick start guide
- `LOCAL_CRON_GUIDE.md` - Detailed cron setup
- `LOCAL_DEVELOPMENT_GUIDE.md` - All dev options
- `TROUBLESHOOTING.md` - Common issues & fixes
- `TESTING.md` - Testing guide

---

## 🎯 Common Tasks

### Start Development
```bash
npm run dev:cron
```

### Run Tests
```bash
npm test
```

### Check API
```bash
curl http://localhost:8787/health
curl http://localhost:8787/api/whales
```

### Query Database
```bash
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3
sqlite> SELECT * FROM whales LIMIT 5;
```

### Trigger Cron Manually
```bash
curl -X POST http://localhost:8787/api/index/trigger-cron \
  -H "cf-cron: true"
```

### Deploy to Production
```bash
npm run deploy
```

---

## 📍 Key Locations

| Item | Location |
|------|----------|
| **Local Database** | `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3` |
| **Dev Server** | `http://localhost:8787` |
| **Swagger UI** | `http://localhost:8787/docs` |
| **Source Code** | `src/` |
| **Tests** | `test/` |
| **Config** | `wrangler.toml` |
| **Local Dev Runner** | `local-dev.js` |

---

## 🔄 Cron Job Details

Every 30 seconds, the local cron job:

1. **Fetches Data**
   - Active whales from Polymarket
   - Their positions and trades
   - Market snapshots

2. **Processes Events**
   - New position entries
   - Position exits
   - Trading reversals
   - Large trades

3. **Calculates Metrics**
   - Return on Investment (ROI)
   - Win Rate
   - Sharpe Ratio

4. **Updates Database**
   - Stores data in local SQLite
   - Logs all transactions
   - Tracks metrics

---

## 📚 Documentation Map

**Getting Started:**
- Read: [START_LOCAL_DEV.md](./START_LOCAL_DEV.md)
- Quick setup and testing guide

**Local Cron Setup:**
- Read: [LOCAL_CRON_GUIDE.md](./LOCAL_CRON_GUIDE.md)
- Complete cron configuration details

**Development Options:**
- Read: [LOCAL_DEVELOPMENT_GUIDE.md](./LOCAL_DEVELOPMENT_GUIDE.md)
- All local dev options (local D1, remote D1, Docker, etc.)

**Testing:**
- Read: [TESTING.md](./TESTING.md)
- Running and writing tests

**Troubleshooting:**
- Read: [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- Common issues and solutions

**Production Deployment:**
- Read: [DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)
- Deploying to Cloudflare Workers

---

## ✨ Features

### 🌐 API Endpoints
- `GET /health` - Health check
- `GET /docs` - Swagger UI
- `GET /api/whales` - List whales
- `GET /api/markets` - List markets
- `GET /api/index/status` - Indexing status
- `POST /api/index/trigger-cron` - Manual cron trigger

### 🗄️ Database Tables
- `whales` - Tracked whale accounts
- `whale_trades` - Trade history
- `whale_positions` - Current positions
- `market_snapshots` - Price snapshots
- `whale_metrics` - Performance metrics
- `whale_events` - Detected events

### 🧪 Testing
- Full test coverage with Vitest
- Mock environment & repositories
- Integration tests
- Repository tests
- Service tests

### 📊 Monitoring
- Real-time cron job logging
- Indexing status endpoints
- Performance metrics
- Event tracking

---

## 🛠️ Setup Verification

Run this to verify everything is set up:
```bash
node verify-setup.js
```

Expected output:
```
✅ All checks passed! Your local dev environment is ready.

🚀 To get started:

   1. npm install              (install dependencies)
   2. npm run dev:cron         (start local dev with cron)

📍 Server will be available at: http://localhost:8787
📊 Database location: .wrangler/state/v3/d1/
```

---

## ⚠️ Troubleshooting

### Port Already in Use
```bash
kill -9 $(lsof -t -i :8787)
npm run dev:cron
```

### Database Issues
```bash
rm -rf .wrangler/
npm run dev:cron
```

### Dependencies Missing
```bash
npm install
npm run dev:cron
```

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) for more solutions.

---

## 🎓 Learning Resources

The project includes extensive documentation:

- **Architecture**: Database schema in `schema.sql`
- **Services**: Whale tracking, market data, metrics
- **Repositories**: Data access layer
- **Controllers**: HTTP endpoints
- **Tests**: Example test patterns

Explore the `src/` directory to learn how it works!

---

## 🚀 Next Steps

1. ✅ Run: `npm run dev:cron`
2. ✅ Visit: http://localhost:8787/docs
3. ✅ Try API calls
4. ✅ Query the database
5. ✅ Run tests: `npm test`

---

## 📞 Quick Reference

| Task | Command |
|------|---------|
| Start Dev | `npm run dev:cron` |
| Run Tests | `npm test` |
| Health Check | `curl http://localhost:8787/health` |
| API Docs | `open http://localhost:8787/docs` |
| Query DB | `sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3` |
| Deploy | `npm run deploy` |
| Verify Setup | `node verify-setup.js` |
| Reset DB | `rm -rf .wrangler/` |

---

**Ready to go?** 🚀

```bash
npm install && npm run dev:cron
```

Your local Polyshed Indexer is now running with:
- ✅ Local SQLite database
- ✅ Automatic cron job (every 30 seconds)
- ✅ Real Polymarket data
- ✅ Full API
- ✅ Swagger UI

Enjoy! 🎉
