# 🔧 Troubleshooting Guide - Local Development

Encountering issues with local development? Find solutions below.

---

## Port 8787 Already in Use

### Problem
```
Error: EADDRINUSE: address already in use :::8787
```

### Solution

#### Option 1: Kill the Process Using Port 8787
```bash
# macOS/Linux
lsof -i :8787
kill -9 <PID>

# Or use this one-liner:
kill -9 $(lsof -t -i :8787)
```

#### Option 2: Use a Different Port
```bash
WRANGLER_PORT=8888 npm run dev:cron
```

---

## No Data in Local Database

### Problem
The API returns empty results, but cron says it's running successfully.

### Solutions

#### 1. Check if Data is Being Fetched
```bash
# View cron logs (check for errors)
curl http://localhost:8787/api/index/log

# Check indexing status
curl http://localhost:8787/api/index/status
```

#### 2. Wait for Data to Arrive
The cron job runs every 30 seconds. Wait a few minutes for data to accumulate.

#### 3. Manually Trigger Cron
```bash
curl -X POST http://localhost:8787/api/index/trigger-cron \
  -H "cf-cron: true"
```

#### 4. Check the Database Directly
```bash
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3

sqlite> .tables              # List all tables
sqlite> SELECT COUNT(*) FROM whales;
sqlite> SELECT COUNT(*) FROM whale_trades;
```

---

## Cron Job Not Running

### Problem
Console shows cron is active but no output appears.

### Solutions

#### 1. Increase Debug Logging
Edit `local-dev.js` and uncomment/modify console logs:
```javascript
// Around line 50:
console.log(`[DEBUG] Cron attempt #${attempt} at ${new Date().toISOString()}`)
```

#### 2. Check if Server is Actually Running
```bash
curl http://localhost:8787/health
```

If this fails, the server isn't running.

#### 3. Check Event Logs
```bash
# Get last 20 indexing log entries
curl "http://localhost:8787/api/index/log?limit=20"
```

#### 4. Manually Trigger to Test
```bash
# In another terminal:
curl -X POST http://localhost:8787/api/index/trigger-cron \
  -H "cf-cron: true" \
  -H "Content-Type: application/json"
```

---

## "Cannot find module" Errors

### Problem
```
Error: Cannot find module '@hono/swagger-ui'
Error: Cannot find module 'wrangler'
```

### Solution
```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# Then restart:
npm run dev:cron
```

---

## Database Gets Corrupted or Won't Start

### Problem
```
Error: database is locked
Error: SQLITE_IOERR
```

### Solution

#### Option 1: Reset Local Database
```bash
# Delete the local database directory
rm -rf .wrangler/state/v3/d1/

# Restart dev server (will recreate it)
npm run dev:cron
```

#### Option 2: Check File Permissions
```bash
# Ensure .wrangler directory is readable/writable
chmod -R 755 .wrangler/
```

---

## API Returns 403 Forbidden

### Problem
```json
{
  "error": "Forbidden",
  "message": "This service is only accessible via service binding"
}
```

### Cause
The security middleware is blocking your request. This typically happens when:
- Request has `cf-connecting-ip` header (from public internet)
- Request doesn't have `cf-cron` header

### Solution

For local testing, add the cron header:
```bash
# ✅ Correct - includes cf-cron header
curl -X POST http://localhost:8787/api/index/trigger-cron \
  -H "cf-cron: true"

# ❌ Wrong - blocked by middleware
curl http://localhost:8787/api/index/status
```

### For Public Endpoints
The following endpoints are always accessible:
- GET `/health` - Health check
- GET `/docs` - Swagger UI
- GET `/openapi.json` - OpenAPI spec

### To Allow All Local Requests
Edit `src/index.js` and comment out the middleware:
```javascript
// Temporarily disable auth for local development
// app.use('/*', async (c, next) => {
//   // ... middleware code ...
// })
```

**⚠️ WARNING:** Only do this for local testing. Re-enable for production.

---

## Wrangler Dev Server Won't Start

### Problem
Wrangler hangs or crashes on startup.

### Solutions

#### 1. Update Wrangler
```bash
npm install --save-dev wrangler@latest
npm run dev:cron
```

#### 2. Clear Wrangler Cache
```bash
rm -rf .wrangler/
npm run dev:cron
```

#### 3. Check for Port Conflicts
```bash
# Make sure nothing else is using required ports
lsof -i :8787
lsof -i :8788  # Wrangler may use this for inspector
```

---

## Tests Failing

### Problem
```
FAIL test/repositories/WhaleRepository.test.js
```

### Solutions

#### 1. Update Test Database Mocks
```bash
# Ensure test utilities match current implementation
npm test
```

#### 2. Run Tests with Verbose Output
```bash
npm test -- --reporter=verbose
```

#### 3. Run Specific Test File
```bash
npm test -- test/repositories/WhaleRepository.test.js
```

#### 4. Update Snapshots if Implementation Changed
```bash
npm test -- -u  # Update snapshots
```

---

## API Endpoints Return Errors

### Problem
```
curl http://localhost:8787/api/whales
# Returns: {"error": "Internal server error", "message": "..."}
```

### Solutions

#### 1. Check Server Logs
Look at the console output from `npm run dev:cron` terminal for error messages.

#### 2. Check Endpoint Availability
```bash
curl http://localhost:8787/health      # Should work
curl http://localhost:8787/docs        # Should work
curl http://localhost:8787/openapi.json # Should work
```

#### 3. Manually Trigger Data Fetch
```bash
curl -X POST http://localhost:8787/api/index/trigger-cron \
  -H "cf-cron: true"

# Then try again:
curl http://localhost:8787/api/whales
```

#### 4. Check Database has Data
```bash
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3
sqlite> SELECT COUNT(*) FROM whales;
```

---

## Performance Issues / Slow Requests

### Problem
Requests take 10+ seconds to respond.

### Solutions

#### 1. Check Polymarket API Rate Limits
The service makes requests to external APIs which may be rate-limited. Wait a minute and try again.

#### 2. Reduce Batch Size
Edit `wrangler.toml`:
```toml
[vars]
BATCH_SIZE = "50"  # Reduce from 100
RATE_LIMIT_MS = "200"  # Increase delay between requests
```

#### 3. Restart Dev Server
```bash
npm run dev:cron
```

#### 4. Check CPU/Memory
```bash
# On macOS:
top -p $(lsof -t -i :8787)
```

---

## "Wrangler not found" Error

### Problem
```
Command 'wrangler' not found
```

### Solution
```bash
# Install wrangler locally (already in package.json)
npm install

# Or use npx:
npx wrangler --version
```

---

## Cloudflare Login Issues

### Problem
```
Error: Unauthorized. Please run 'wrangler login' first
```

### Solution

#### Option 1: Authenticate Wrangler
```bash
npx wrangler login
# Opens browser for authentication
```

#### Option 2: Use API Token
```bash
# Set environment variable:
export CLOUDFLARE_API_TOKEN="your-token-here"

# Then:
npm run dev:cron
```

Get your API token: https://dash.cloudflare.com/profile/api-tokens

---

## Still Having Issues?

### Debug Checklist
- [ ] Node.js 18+ installed? `node --version`
- [ ] Dependencies installed? `npm install`
- [ ] Run verification: `node verify-setup.js`
- [ ] Port 8787 available? `lsof -i :8787`
- [ ] Check logs in terminal running `npm run dev:cron`
- [ ] Try resetting database: `rm -rf .wrangler/`
- [ ] Restart everything: `npm run dev:cron`

### Get More Help
1. Check logs in both terminals
2. Run: `node verify-setup.js`
3. Review: [LOCAL_CRON_GUIDE.md](./LOCAL_CRON_GUIDE.md)
4. Check: [LOCAL_DEVELOPMENT_GUIDE.md](./LOCAL_DEVELOPMENT_GUIDE.md)

---

## Quick Recovery

### Nuclear Option: Complete Reset
```bash
# 1. Kill all processes
pkill -f wrangler
pkill -f local-dev.js

# 2. Clean up
rm -rf .wrangler/
rm -rf node_modules/
rm package-lock.json

# 3. Reinstall
npm install

# 4. Start fresh
npm run dev:cron
```

---

## Performance Monitoring

### Monitor Cron Job Execution
```bash
# Check how long cron jobs take:
curl http://localhost:8787/api/index/log?limit=10 | jq '.log[] | {timestamp, status, duration}'
```

### Monitor Database Size
```bash
# Check database file size:
ls -lh .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3

# Check table sizes:
sqlite3 .wrangler/state/v3/d1/miniflare-D1DatabaseObject/db.sqlite3 "
  SELECT name, COUNT(*) as count 
  FROM sqlite_master 
  WHERE type='table' 
  GROUP BY name;
"
```

---

Got more questions? See [START_LOCAL_DEV.md](./START_LOCAL_DEV.md) for the complete local dev guide.
