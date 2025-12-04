# 🚀 Quick Start: Local Development with Cron Job

Get the Polyshed Indexer running locally with a local SQLite database and automatic cron job in **1 command**!

---

## ✨ What You Get

- ✅ **Local Web Server** - http://localhost:8787
- ✅ **Local SQLite Database** - `.wrangler/state/v3/d1/`
- ✅ **Real Polymarket Data** - Live market updates
- ✅ **Automatic Cron Job** - Every 30 seconds (simulates production's every 30 minutes)
- ✅ **Hot Reload** - Auto-restart on code changes
- ✅ **Swagger UI** - http://localhost:8787/docs

---

## 🎯 Step 1: Install Dependencies (One Time)

```bash
npm install
```

---

## 🎯 Step 2: Run Locally with Cron

```bash
npm run dev:cron
```

**That's it!** Everything starts automatically:
- Local development server
- Local SQLite database (auto-initialized)
- Cron job that runs every 30 seconds

---

## 📊 What Happens When Running

The console will show something like:

```
╔═══════════════════════════════════════════════════════════╗
║   Polyshed Indexer - Local Development with Cron Job     ║
╚═══════════════════════════════════════════════════════════╝

🚀 Starting local development server...
📍 Server: http://localhost:8787
📊 Database: .wrangler/state/v3/d1/

⏰ Starting local cron scheduler...
   • Runs every 30 seconds (for testing)
   • Triggers: /api/index/trigger-cron

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Development environment ready!

📚 Available endpoints:
   • http://localhost:8787/docs              (Swagger UI)
   • http://localhost:8787/api/whales        (List whales)
   • http://localhost:8787/api/markets       (List markets)

⏱️  [14:30:45] Running cron job...
✅ [14:30:45] Cron job completed successfully

⏱️  [14:31:15] Running cron job...
✅ [14:31:15] Cron job completed successfully
```

---

## 💻 Testing the Local Setup

### In Another Terminal:

#### 🔍 **Check API Health**
```bash
curl http://localhost:8787/health
```

#### 🐋 **List All Whales**
```bash
curl http://localhost:8787/api/whales
```

#### 📈 **List Markets**
```bash
curl http://localhost:8787/api/markets
```

#### 🧪 **Run Tests**
```bash
npm test
```

#### 📊 **Query Local Database**
```bash
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3

# In sqlite prompt:
sqlite> SELECT COUNT(*) FROM whales;
sqlite> SELECT * FROM whales LIMIT 5;
sqlite> SELECT COUNT(*) FROM whale_trades;
sqlite> .exit
```

---

## 🔄 Cron Job Details

### What the Cron Job Does (Every 30 Seconds)

1. **Fetches Real Data**
   - Gets active whales from Polymarket CLOB API
   - Retrieves current positions and trades
   - Captures market snapshots

2. **Processes Data**
   - Detects trading events (new positions, reversals, exits)
   - Calculates metrics (ROI, win rate, Sharpe ratio)
   - Updates local SQLite database

3. **Logs Results**
   - Shows success/failure status
   - Displays timestamp
   - Reports on data processed

### Cron Log Endpoints

Check cron logs via API:

```bash
# Get latest cron runs
curl http://localhost:8787/api/index/status

# Get indexing queue
curl http://localhost:8787/api/index/queue

# Get indexing logs
curl http://localhost:8787/api/index/log
```

---

## 🛑 Stopping

Press **Ctrl+C** in the terminal running `npm run dev:cron`

Data persists in `.wrangler/` directory between restarts.

---

## 📚 Available Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/docs` | GET | Swagger UI documentation |
| `/api/whales` | GET | List all tracked whales |
| `/api/markets` | GET | List all markets |
| `/api/index/status` | GET | Indexing status & stats |
| `/api/index/queue` | GET | Current indexing queue |
| `/api/index/log` | GET | Indexing job logs |
| `/api/index/trigger-cron` | POST | Manually trigger cron job |

---

## 🔧 Advanced: Customize Cron Interval

Edit `local-dev.js` line ~50:

```javascript
const cronInterval = 30000 // Change this (milliseconds)
```

Examples:
- `10000` = every 10 seconds
- `30000` = every 30 seconds (default)
- `60000` = every 60 seconds

---

## 📖 Full Documentation

- **[LOCAL_DEVELOPMENT_GUIDE.md](./LOCAL_DEVELOPMENT_GUIDE.md)** - Detailed dev options
- **[LOCAL_CRON_GUIDE.md](./LOCAL_CRON_GUIDE.md)** - Complete cron setup
- **[DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)** - Production deployment
- **[TESTING.md](./TESTING.md)** - Running tests

---

## ✅ What's Ready

- ✅ Local SQLite database (auto-initialized)
- ✅ Schema with all tables
- ✅ Real Polymarket API integration
- ✅ Automatic cron job execution
- ✅ Event detection
- ✅ Metrics calculation
- ✅ Comprehensive documentation
- ✅ Full test suite

---

## 🚀 Next Steps

1. Run: `npm run dev:cron`
2. Open: http://localhost:8787/docs
3. Explore the Swagger UI
4. Try API calls in another terminal
5. Check the local database

**Questions?** See [LOCAL_CRON_GUIDE.md](./LOCAL_CRON_GUIDE.md) for detailed setup info.
