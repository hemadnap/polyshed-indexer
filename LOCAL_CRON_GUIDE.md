# Local Development with Cron Job - Complete Guide

## Overview

Run Polyshed Indexer locally with automatic cron job execution every 30 seconds (for testing).

---

## ✨ What You Get

```
Your Machine
├─ Local Dev Server (http://localhost:8787)
├─ Local SQLite Database (.wrangler/state/v3/d1/)
├─ Real Polymarket APIs (https://clob.polymarket.com)
└─ Automatic Cron Job (Every 30 seconds)
    ├─ Fetches whale data
    ├─ Updates positions
    ├─ Calculates metrics
    └─ Stores in local DB
```

---

## 🚀 Quick Start (1 Command!)

```bash
npm run dev:cron
```

That's it! Everything starts automatically:
- ✅ Local server on http://localhost:8787
- ✅ Local SQLite database
- ✅ Automatic cron job every 30 seconds
- ✅ Real market data from Polymarket APIs

---

## 📊 What the Cron Job Does

Every 30 seconds, the local cron job:

1. **Fetches Real Data**
   - Gets active whales from Polymarket
   - Retrieves current positions
   - Fetches recent trades

2. **Updates Local Database**
   - Inserts/updates whales table
   - Records all trades
   - Tracks positions
   - Detects events (exits, reversals, etc.)

3. **Calculates Metrics**
   - ROI (Return on Investment)
   - Win Rate
   - Sharpe Ratio

4. **Logs Results**
   - Timestamps each run
   - Shows success/failure

---

## 🎯 Usage Examples

### Example 1: Basic Development (Auto Cron)

```bash
npm run dev:cron
```

Output:
```
╔═══════════════════════════════════════════════════════╗
║   Polyshed Indexer - Local Development with Cron     ║
╚═══════════════════════════════════════════════════════╝

🚀 Starting local development server...
📍 Server: http://localhost:8787
📊 Database: .wrangler/state/v3/d1/

⏰ Starting local cron scheduler...
   • Runs every 30 seconds (for testing)
   • Triggers: /api/index/trigger-cron

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Development environment ready!

📚 Available endpoints:
   • http://localhost:8787/docs              (Swagger UI)
   • http://localhost:8787/api/whales        (List whales)
   • http://localhost:8787/api/markets       (List markets)

🔧 Commands (in another terminal):
   • npm test                                (Run tests)
   • npm run deploy                          (Deploy to production)

Press Ctrl+C to stop
```

Then every 30 seconds:
```
⏱️  [14:30:45] Running cron job...
✅ [14:30:45] Cron job completed successfully

⏱️  [14:31:15] Running cron job...
✅ [14:31:15] Cron job completed successfully
```

### Example 2: Run Tests While Cron is Running

Terminal 1:
```bash
npm run dev:cron
```

Terminal 2:
```bash
npm test
```

The tests will run against the local database that's being populated by the cron job.

### Example 3: Manual Testing

Terminal 1:
```bash
npm run dev:cron
```

Terminal 2:
```bash
# Check whales in local DB
curl http://localhost:8787/api/whales

# Check markets
curl http://localhost:8787/api/markets

# Access Swagger UI
open http://localhost:8787/docs
```

Terminal 3:
```bash
# Query local database
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3

sqlite> SELECT COUNT(*) FROM whales;
sqlite> SELECT COUNT(*) FROM whale_trades;
sqlite> SELECT * FROM whales LIMIT 5;
sqlite> .exit
```

---

## ⚙️ How the Local Cron Works

### What Happens:

1. **Server Starts**
   ```bash
   npm run dev:cron
   ```
   - Wrangler dev server starts on port 8787
   - Local SQLite database initialized
   - 3-second delay for server startup

2. **Cron Scheduler Activates**
   - Every 30 seconds, sends POST request to:
     ```
     POST http://localhost:8787/api/index/trigger-cron
     Header: cf-cron: true
     ```

3. **Worker Processes Request**
   - Recognizes `cf-cron` header
   - Bypasses service binding auth
   - Triggers WhaleTrackerService
   - Updates local database

4. **Database Updated**
   - New data written to SQLite
   - Metrics calculated
   - Events detected

---

## 🗄️ Local Database Details

### Location:
```
.wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3
```

### Access Database:
```bash
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3
```

### Check Cron Results:
```bash
# Count all whales
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3 << EOF
SELECT 'Total Whales: ' || COUNT(*) FROM whales;
EOF

# Count recent trades
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3 << EOF
SELECT 'Recent Trades: ' || COUNT(*) FROM whale_trades 
WHERE created_at > datetime('now', '-30 minutes');
EOF

# See last cron run
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3 << EOF
SELECT * FROM indexing_log ORDER BY started_at DESC LIMIT 1;
EOF
```

---

## 🔄 Data Flow

```
Local Cron (Every 30s)
        ↓
POST /api/index/trigger-cron
        ↓
WhaleTrackerService
        ├─ Fetch Polymarket CLOB API
        ├─ Get current positions
        ├─ Get recent trades
        └─ Detect events
        ↓
Update Local SQLite
        ├─ Insert/Update whales
        ├─ Record trades
        ├─ Update positions
        ├─ Calculate metrics
        └─ Log operation
        ↓
Local Database
```

---

## 📝 Commands Reference

### Start with Cron (Recommended)
```bash
npm run dev:cron
```

### Start Without Cron (Manual Triggers)
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

### Deploy to Production
```bash
npm run deploy
```

### Query Local Database
```bash
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3
```

### Reset Local Database
```bash
rm -rf .wrangler/state/v3/d1/
npm run dev:cron  # Creates fresh database
```

---

## 🎯 Complete Workflow

### Step 1: Start Local Dev with Cron
```bash
npm run dev:cron
```

Wait for:
```
✅ Development environment ready!
```

### Step 2: Open Another Terminal and Run Tests
```bash
npm test
```

Tests run against data being populated by cron job.

### Step 3: Monitor Results (Optional)
```bash
# Watch logs
tail -f /tmp/polyshed-cron.log

# Or query database
while true; do
  clear
  echo "Whales: $(sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3 'SELECT COUNT(*) FROM whales;')"
  echo "Trades: $(sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3 'SELECT COUNT(*) FROM whale_trades;')"
  echo "Last Update: $(date)"
  sleep 5
done
```

### Step 4: Make Changes and Test
- Edit files in `src/`
- Server auto-reloads
- Cron job continues running
- Tests verify changes

### Step 5: Deploy When Ready
```bash
npm run deploy
```

---

## 🔧 Customizing Cron Interval

To change cron frequency, edit `local-dev.js`:

**Current:** Every 30 seconds (30000 ms)
```javascript
const cronInterval = 30000 // 30 seconds
```

**Options:**
```javascript
const cronInterval = 10000  // Every 10 seconds (for rapid testing)
const cronInterval = 60000  // Every 1 minute
const cronInterval = 300000 // Every 5 minutes
```

Then restart:
```bash
npm run dev:cron
```

---

## 🚨 Troubleshooting

### Cron job not running?
1. Check server is ready (wait for ✅ message)
2. Check http://localhost:8787/docs is accessible
3. Look at cron logs in console output

### Database not being populated?
1. Verify SQLite file exists:
   ```bash
   ls -la .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3
   ```
2. Check table counts:
   ```bash
   sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3 \
     "SELECT COUNT(*) FROM whales;"
   ```
3. Check indexing log:
   ```bash
   sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3 \
     "SELECT * FROM indexing_log ORDER BY started_at DESC LIMIT 5;"
   ```

### Server not starting?
1. Kill existing processes:
   ```bash
   pkill -f wrangler
   sleep 2
   npm run dev:cron
   ```
2. Check port 8787 is available:
   ```bash
   lsof -i :8787
   ```

---

## 📊 Monitoring Local Cron

### Check Last Cron Run
```bash
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3 << EOF
SELECT 
  started_at,
  completed_at,
  status,
  whales_updated,
  trades_processed
FROM indexing_log 
ORDER BY started_at DESC 
LIMIT 5;
EOF
```

### Monitor Real-time
```bash
watch -n 5 'sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3 \
  "SELECT COUNT(*) as whales, \
          (SELECT COUNT(*) FROM whale_trades) as trades, \
          (SELECT COUNT(*) FROM whale_positions) as positions \
   FROM whales;"'
```

---

## ✅ Summary

| Feature | Status |
|---------|--------|
| Local SQLite Database | ✅ |
| Real Polymarket APIs | ✅ |
| Automatic Cron Job | ✅ |
| 30-second Interval | ✅ |
| Hot Reload | ✅ |
| Data Persistence | ✅ |
| Easy to Test | ✅ |
| Zero Production Risk | ✅ |

---

## 🚀 Get Started Now

```bash
npm run dev:cron
```

Then watch the magic happen! Every 30 seconds, fresh market data flows into your local database. 🎉

---

**Last Updated:** December 4, 2025  
**Status:** ✅ Ready for Local Development
