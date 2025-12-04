# Polyshed Indexer - Quick Start Guide

Get up and running with the Polyshed Indexer in minutes!

## Prerequisites

- Node.js 18+ installed
- Cloudflare account (free tier works)
- Wrangler CLI installed globally: `npm install -g wrangler`
- Authenticated with Cloudflare: `wrangler login`

## Step 1: Install Dependencies

```bash
cd polyshed_indexer
npm install
```

## Step 2: Create D1 Database

```bash
# Create the database
wrangler d1 create polyshed_indexer_db
```

Copy the `database_id` from the output and update `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "polyshed_indexer_db"
database_id = "paste-your-database-id-here"  # ← Update this
```

## Step 3: Run Database Migrations

```bash
# Apply schema to production
npm run db:migrate

# Or for local development
npm run db:local
```

## Step 4: Create KV Namespace (for caching)

```bash
wrangler kv:namespace create CACHE
```

Update `wrangler.toml` with the KV namespace ID:

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "paste-your-kv-id-here"  # ← Update this
```

## Step 5: Test Locally

```bash
npm run dev
```

The worker will be available at `http://localhost:8787`

### Test the API

```bash
# Health check
curl http://localhost:8787/health

# Add a whale to track
curl -X POST http://localhost:8787/api/whales \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0x0000000000000000000000000000000000000000",
    "display_name": "Test Whale",
    "tracking_enabled": true
  }'

# List whales
curl http://localhost:8787/api/whales

# Trigger indexing for a whale
curl -X POST http://localhost:8787/api/index/whale/0x0000000000000000000000000000000000000000 \
  -H "Content-Type: application/json" \
  -d '{"full_reindex": true}'
```

## Step 6: Deploy to Cloudflare

```bash
npm run deploy
```

Your worker will be deployed to: `https://polyshed-indexer.<your-subdomain>.workers.dev`

## Step 7: Configure Cron Triggers

Cron triggers are already configured in `wrangler.toml`:

- Every 5 minutes: Quick whale updates
- Every 15 minutes: Market snapshots
- Every hour: Metrics calculation
- Daily: Rollups and cleanup

They will run automatically once deployed!

## Step 8: Test WebSocket Connection

```javascript
// In browser or Node.js
const ws = new WebSocket('wss://your-worker.workers.dev/ws')

ws.onopen = () => {
  console.log('Connected!')
  
  // Subscribe to whale trades
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'whale_trades',
    wallet_address: '0x0000000000000000000000000000000000000000'
  }))
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  console.log('Received:', data)
}
```

## Common Tasks

### Add Multiple Whales

```bash
# Create a script
cat > add_whales.sh << 'EOF'
#!/bin/bash
API_URL="https://your-worker.workers.dev"

whales=(
  "0xWallet1:Whale 1"
  "0xWallet2:Whale 2"
  "0xWallet3:Whale 3"
)

for whale in "${whales[@]}"; do
  IFS=':' read -r address name <<< "$whale"
  curl -X POST "$API_URL/api/whales" \
    -H "Content-Type: application/json" \
    -d "{\"wallet_address\":\"$address\",\"display_name\":\"$name\",\"tracking_enabled\":true}"
  echo ""
done
EOF

chmod +x add_whales.sh
./add_whales.sh
```

### Check Indexing Status

```bash
# All whales
curl https://your-worker.workers.dev/api/index/status

# Specific whale
curl https://your-worker.workers.dev/api/index/status/0xWalletAddress

# Indexing queue
curl https://your-worker.workers.dev/api/index/queue

# Indexing logs
curl https://your-worker.workers.dev/api/index/log
```

### View Whale Data

```bash
# Get whale details
curl https://your-worker.workers.dev/api/whales/0xWalletAddress

# Get positions
curl https://your-worker.workers.dev/api/whales/0xWalletAddress/positions

# Get trade history
curl https://your-worker.workers.dev/api/whales/0xWalletAddress/trades

# Get metrics
curl https://your-worker.workers.dev/api/whales/0xWalletAddress/metrics

# Get daily metrics
curl https://your-worker.workers.dev/api/whales/0xWalletAddress/metrics?period=daily

# Get events
curl https://your-worker.workers.dev/api/whales/0xWalletAddress/events
```

### Trigger Manual Indexing

```bash
# Index specific whale
curl -X POST https://your-worker.workers.dev/api/index/whale/0xWalletAddress \
  -H "Content-Type: application/json" \
  -d '{"full_reindex": true}'

# Queue all whales for reindex
curl -X POST https://your-worker.workers.dev/api/index/all
```

## Monitoring

### View Live Logs

```bash
npm run tail
```

### Query Database Directly

```bash
# Production
wrangler d1 execute polyshed_indexer_db --command "SELECT COUNT(*) as count FROM whales"
wrangler d1 execute polyshed_indexer_db --command "SELECT COUNT(*) as count FROM trades"
wrangler d1 execute polyshed_indexer_db --command "SELECT COUNT(*) as count FROM positions"

# Local
wrangler d1 execute polyshed_indexer_db --local --command "SELECT * FROM whales"
```

### Check Cron Status

```bash
wrangler tail --format pretty
```

## Environment Configuration

Edit `wrangler.toml` to customize:

```toml
[vars]
POLYMARKET_API_BASE = "https://clob.polymarket.com"
GAMMA_API_BASE = "https://gamma-api.polymarket.com"
MAX_WHALES_PER_UPDATE = "50"     # Whales updated per cron run
BATCH_SIZE = "100"                # Trades fetched per API call
RATE_LIMIT_MS = "100"             # Delay between API calls
```

## Integration with Frontend

### REST API

```javascript
// In your frontend
const API_BASE = 'https://your-worker.workers.dev/api'

// Get all tracked whales
const whales = await fetch(`${API_BASE}/whales`).then(r => r.json())

// Get whale positions
const positions = await fetch(`${API_BASE}/whales/${address}/positions`)
  .then(r => r.json())

// Get trade history
const trades = await fetch(`${API_BASE}/whales/${address}/trades?limit=50`)
  .then(r => r.json())
```

### WebSocket

```javascript
// Real-time trade updates
const ws = new WebSocket('wss://your-worker.workers.dev/ws')

ws.onopen = () => {
  // Subscribe to multiple whales
  whaleAddresses.forEach(address => {
    ws.send(JSON.stringify({
      type: 'subscribe',
      channel: 'whale_trades',
      wallet_address: address
    }))
  })
}

ws.onmessage = (event) => {
  const data = JSON.parse(event.data)
  
  if (data.type === 'trade') {
    console.log(`New trade from ${data.wallet_address}:`, data.trade)
    // Update UI with new trade
  }
}
```

## Troubleshooting

### "Database not found"
Make sure you ran `npm run db:migrate` and updated the `database_id` in `wrangler.toml`.

### "KV namespace not found"
Create the KV namespace with `wrangler kv:namespace create CACHE` and update the `id` in `wrangler.toml`.

### API rate limiting
Increase `RATE_LIMIT_MS` in `wrangler.toml` to slow down API requests.

### Slow indexing
- Check `indexing_log` table for errors
- Reduce `BATCH_SIZE` if API is timing out
- Increase `MAX_WHALES_PER_UPDATE` if you want faster processing

### WebSocket not connecting
- Make sure you're using `wss://` (not `ws://`) for production
- Check CORS settings if connecting from a different domain

## Next Steps

1. **Add real whale addresses** - Replace test addresses with actual high-volume traders
2. **Set up alerting** - Use Cloudflare Workers analytics or external monitoring
3. **Optimize queries** - Add indexes for your specific query patterns
4. **Integrate with frontend** - Connect to your Polyshed UI
5. **Scale up** - Adjust cron frequencies and batch sizes based on your needs

## Need Help?

Check the main README.md for:
- Full API documentation
- Database schema details
- Architecture overview
- Advanced configuration

Happy tracking! 🐋
