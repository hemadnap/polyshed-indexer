# Polyshed Indexer Integration Guide

This guide explains how the Polyshed Indexer is integrated with the frontend through the cloudflare-worker proxy.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Frontend (Vue.js)                         │
│  ┌────────────────┐  ┌─────────────────┐  ┌────────────────────┐  │
│  │  indexerApi.js │  │ whaleWebSocket  │  │  Vue Components    │  │
│  │  (REST API)    │  │  (WebSocket)    │  │                    │  │
│  └────────┬───────┘  └────────┬────────┘  └────────────────────┘  │
│           │                   │                                     │
└───────────┼───────────────────┼─────────────────────────────────────┘
            │                   │
            ▼                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│              Cloudflare Worker (polyshed-api-v2)                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  indexerProxy.js - Proxies requests to indexer worker        │  │
│  │  • HTTP: /api/whales, /api/markets, /api/index               │  │
│  │  • WebSocket: /ws                                            │  │
│  └────────────────────┬──────────────────────────────────────────┘  │
└─────────────────────────┼───────────────────────────────────────────┘
                          │
                          ▼ (Service Binding or HTTP)
┌─────────────────────────────────────────────────────────────────────┐
│                  Polyshed Indexer Worker                            │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────┐  │
│  │  Controllers   │  │    Services    │  │  Repositories       │  │
│  │  • whaleCtrl   │  │  • WhaleTracker│  │  • WhaleRepo        │  │
│  │  • marketCtrl  │  │  • TradeProc   │  │  • TradeRepo        │  │
│  │  • indexingCtrl│  │  • Metrics     │  │  • PositionRepo     │  │
│  │  • wsCtrl      │  │  • EventDetect │  │  • MarketRepo       │  │
│  └────────────────┘  └────────────────┘  └─────────────────────┘  │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  WhaleTrackerDO (Durable Object for WebSocket)            │   │
│  │  • Manages WebSocket connections                          │   │
│  │  • Broadcasts real-time whale trades                      │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │  D1 Database (12 tables)                                   │   │
│  │  • whales, trades, positions, markets, metrics, events     │   │
│  └────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## API Endpoints

All endpoints are proxied through the main cloudflare-worker at `/api/`.

### Whale Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/whales` | List all tracked whales |
| GET | `/api/whales/:address` | Get whale details |
| POST | `/api/whales` | Add whale to tracking |
| PUT | `/api/whales/:address` | Update whale metadata |
| DELETE | `/api/whales/:address` | Remove whale |

### Whale Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/whales/:address/positions` | Current positions |
| GET | `/api/whales/:address/trades` | Trade history |
| GET | `/api/whales/:address/metrics` | Performance metrics |
| GET | `/api/whales/:address/events` | Detected events |

### Market Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/markets` | List all markets |
| GET | `/api/markets/:id` | Market details |
| GET | `/api/markets/:id/snapshots` | Price history |

### Indexing Control

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/index/whale/:address` | Trigger whale indexing |
| POST | `/api/index/all` | Trigger full reindex |
| GET | `/api/index/status` | Indexing status |
| GET | `/api/index/queue` | Queue status |

### WebSocket

| Endpoint | Description |
|----------|-------------|
| `/ws` | WebSocket connection for real-time updates |

## Frontend Usage

### REST API

```javascript
import { whaleApi, marketApi, indexingApi } from '@/services/api';

// Get all tracked whales
const response = await whaleApi.getWhales({
  active: true,
  tracking_enabled: true,
  limit: 50
});
const whales = response.data.whales;

// Get whale positions
const positions = await whaleApi.getPositions('0x123...', { limit: 100 });

// Get whale metrics
const metrics = await whaleApi.getMetrics('0x123...', 'daily');

// Get whale events
const events = await whaleApi.getEvents('0x123...', {
  type: 'LARGE_TRADE',
  severity: 'HIGH'
});

// Trigger indexing
await indexingApi.indexWhale('0x123...', true);

// Get markets
const markets = await marketApi.getMarkets({ active: true });
```

### WebSocket

```javascript
import whaleWebSocket from '@/services/whaleWebSocket';

// Connect (usually in App.vue or main component)
whaleWebSocket.connect();

// Subscribe to whale trades
const unsubscribe = whaleWebSocket.subscribe('0x123...', (data) => {
  console.log('New trade:', data);
  
  // data structure:
  // {
  //   type: 'trade' | 'NEW_POSITION' | 'REVERSAL' | etc,
  //   walletAddress: '0x123...',
  //   trade: { id, market, side, size, price, value, timestamp },
  //   event: { ... },
  //   timestamp: 1234567890
  // }
  
  // Update UI with new trade
  updatePositions(data.trade);
});

// Later, unsubscribe
unsubscribe();

// Disconnect (in cleanup)
whaleWebSocket.disconnect();
```

### Vue Component Example

```vue
<template>
  <div>
    <div v-for="whale in whales" :key="whale.wallet_address">
      <h3>{{ whale.display_name }}</h3>
      <p>ROI: {{ whale.total_roi }}%</p>
      <p>Win Rate: {{ whale.win_rate }}%</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { whaleApi } from '@/services/api';
import whaleWebSocket from '@/services/whaleWebSocket';

const whales = ref([]);

onMounted(async () => {
  // Fetch tracked whales
  const response = await whaleApi.getWhales({ tracking_enabled: true });
  whales.value = response.data.whales;
  
  // Connect WebSocket
  whaleWebSocket.connect();
  
  // Subscribe to each whale
  whales.value.forEach(whale => {
    whaleWebSocket.subscribe(whale.wallet_address, handleTrade);
  });
});

onUnmounted(() => {
  // Cleanup: unsubscribe from all whales
  whales.value.forEach(whale => {
    whaleWebSocket.unsubscribe(whale.wallet_address, handleTrade);
  });
});

function handleTrade(data) {
  console.log(`New trade from ${data.walletAddress}:`, data.trade);
  
  // Show notification
  showNotification(`${data.trade.market}: ${data.trade.side} ${data.trade.size}`);
  
  // Refresh whale data
  refreshWhale(data.walletAddress);
}
</script>
```

## Deployment

### 1. Deploy Polyshed Indexer

```bash
cd polyshed_indexer
npm install
wrangler d1 create polyshed_indexer_db
# Update wrangler.toml with database_id
npm run db:migrate
npm run deploy
```

### 2. Update Main Worker

Edit `cloudflare-worker/wrangler.toml`:

```toml
# Update INDEXER_API_URL with your deployed indexer URL
[vars]
INDEXER_API_URL = "https://polyshed-indexer.your-subdomain.workers.dev"
```

Deploy:

```bash
cd cloudflare-worker
npm run deploy
```

### 3. Update Frontend Environment

Edit `frontend/.env.production`:

```
VITE_API_URL=https://your-main-worker.workers.dev
```

Build and deploy:

```bash
cd frontend
npm run build
npm run deploy
```

## Configuration

### Worker Service Binding

For best performance, use Worker service binding (already configured in `wrangler.toml`):

```toml
[[services]]
binding = "INDEXER"
service = "polyshed-indexer"
```

This enables direct Worker-to-Worker communication without HTTP overhead.

### Fallback HTTP Proxy

If service binding is not available, the proxy will fall back to HTTP:

```javascript
// In indexerProxy.js
if (env.INDEXER) {
  // Use service binding
  return await env.INDEXER.fetch(request);
} else {
  // Fall back to HTTP
  const indexerUrl = env.INDEXER_API_URL;
  return await fetch(new Request(indexerUrl + path));
}
```

## Testing

### Test REST API

```bash
# Get whales
curl https://your-worker.workers.dev/api/whales

# Add whale
curl -X POST https://your-worker.workers.dev/api/whales \
  -H "Content-Type: application/json" \
  -d '{"wallet_address":"0x123...","display_name":"Test Whale"}'

# Get positions
curl https://your-worker.workers.dev/api/whales/0x123.../positions
```

### Test WebSocket

```javascript
// In browser console
const ws = new WebSocket('wss://your-worker.workers.dev/ws');

ws.onopen = () => {
  console.log('Connected');
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'whale_trades',
    wallet_address: '0x123...'
  }));
};

ws.onmessage = (e) => {
  console.log('Message:', JSON.parse(e.data));
};
```

## Monitoring

### Worker Logs

```bash
# Main worker
wrangler tail --name polyshed-api-v2

# Indexer worker
cd polyshed_indexer
wrangler tail
```

### Database Queries

```bash
# Check whale count
wrangler d1 execute polyshed_indexer_db --command "SELECT COUNT(*) FROM whales"

# Check recent trades
wrangler d1 execute polyshed_indexer_db --command "SELECT * FROM trades ORDER BY traded_at DESC LIMIT 10"

# Check indexing status
wrangler d1 execute polyshed_indexer_db --command "SELECT * FROM indexing_status"
```

## Troubleshooting

### WebSocket not connecting

1. Check that the worker is deployed
2. Verify the WebSocket URL in browser DevTools
3. Check for CORS issues
4. Ensure the Durable Object is properly configured

### API returning 503

1. Check that the indexer worker is deployed
2. Verify service binding in `wrangler.toml`
3. Check `INDEXER_API_URL` environment variable
4. View worker logs: `wrangler tail`

### Missing data

1. Verify whales are added: `GET /api/whales`
2. Check indexing status: `GET /api/index/status`
3. Trigger manual indexing: `POST /api/index/whale/:address`
4. Check indexing logs: `GET /api/index/log`

## Next Steps

1. **Add Whales**: Add whale addresses via the API or UI
2. **Monitor Performance**: Use the indexing endpoints to track progress
3. **Set up Alerts**: Use the events API to detect interesting whale activity
4. **Integrate UI**: Build whale tracking components in your frontend
5. **Optimize**: Tune cron frequencies and batch sizes based on usage

## Support

- Main README: `/polyshed_indexer/README.md`
- Quick Start: `/polyshed_indexer/QUICKSTART.md`
- Database Schema: `/polyshed_indexer/schema.sql`
