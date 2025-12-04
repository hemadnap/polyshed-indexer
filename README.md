# Polyshed Indexer

Real-time whale tracking and market indexing service for Polymarket. Built on Cloudflare Workers with D1 database.

## Features

### 🐋 Whale Tracking
- Real-time trade monitoring for configured whale wallets
- Historical position indexing with full trade history
- Performance metrics calculation (ROI, Sharpe ratio, win rate)
- Event detection (reversals, exits, large trades, double-downs)

### 📊 Market Data
- Market registry and metadata
- Price snapshots every 15 minutes
- Volume and liquidity tracking
- Historical market data storage

### 🔔 Real-time Updates
- WebSocket support via Durable Objects
- Live whale trade broadcasts
- Position update notifications
- Event alerts

### 📈 Performance Analytics
- Daily, weekly, and monthly metrics rollups
- Win rate and ROI calculations
- Sharpe ratio and max drawdown
- Hold time analytics

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Cloudflare Workers                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │              │  │              │  │                 │  │
│  │  REST API    │  │  WebSocket   │  │  Cron Jobs      │  │
│  │  Controllers │  │  Handler     │  │  (Scheduled)    │  │
│  │              │  │  (DO)        │  │                 │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘  │
│         │                 │                   │            │
│         └─────────────────┴───────────────────┘            │
│                           ▼                                │
│              ┌─────────────────────────┐                   │
│              │    Service Layer        │                   │
│              ├─────────────────────────┤                   │
│              │ • WhaleTrackerService   │                   │
│              │ • TradeProcessorService │                   │
│              │ • MetricsService        │                   │
│              │ • EventDetector         │                   │
│              │ • ClobService           │                   │
│              └────────────┬────────────┘                   │
│                           ▼                                │
│              ┌─────────────────────────┐                   │
│              │  Repository Layer       │                   │
│              ├─────────────────────────┤                   │
│              │ • WhaleRepository       │                   │
│              │ • TradeRepository       │                   │
│              │ • PositionRepository    │                   │
│              │ • MarketRepository      │                   │
│              └────────────┬────────────┘                   │
│                           ▼                                │
│              ┌─────────────────────────┐                   │
│              │     D1 Database         │                   │
│              │  (12 tables, indexed)   │                   │
│              └─────────────────────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Core Tables
- **whales** - Whale registry and aggregate metrics
- **whale_metadata** - Bio, tags, social links
- **markets** - Market registry
- **market_snapshots** - Historical price data

### Trading Tables
- **trades** - All whale trades (raw data)
- **positions** - Open positions (current)
- **closed_positions** - Historical closed positions

### Metrics Tables
- **whale_metrics_daily** - Daily performance
- **whale_metrics_weekly** - Weekly rollup
- **whale_metrics_monthly** - Monthly rollup

### System Tables
- **whale_events** - Detected events
- **indexing_queue** - Background job queue
- **indexing_status** - Per-whale indexing state
- **indexing_log** - System-wide indexing history

## Quick Start

### 1. Install Dependencies
```bash
cd polyshed_indexer
npm install
```

### 2. Setup D1 Database
```bash
# Create database
wrangler d1 create polyshed_indexer_db

# Update wrangler.toml with your database_id

# Run migrations
npm run db:migrate
```

### 3. Configure Environment
Update `wrangler.toml` with your settings:
- Database ID
- KV namespace ID
- API endpoints
- Rate limits

### 4. Add Whales to Track
```bash
# Using the API after deployment
curl -X POST https://your-worker.workers.dev/api/whales \
  -H "Content-Type: application/json" \
  -d '{
    "wallet_address": "0x1234...",
    "display_name": "Whale #1",
    "tracking_enabled": true
  }'
```

### 5. Run Locally
```bash
npm run dev
```

### 6. Deploy
```bash
npm run deploy
```

## API Documentation

### 📚 Swagger UI Interface

The service includes an interactive Swagger UI for exploring and testing all endpoints:

**Local Development:**
```bash
npm run dev
# Then visit: http://localhost:8787/docs
```

**Production:**
```
https://polyshed_indexer.tcsn.workers.dev/docs
```

#### Features:
- ✅ Interactive API documentation
- ✅ Try-it-out endpoint testing
- ✅ Full schema definitions
- ✅ Request/response examples
- ✅ Parameter validation
- ✅ Error code documentation

#### OpenAPI Spec:
- `GET /openapi.json` - Raw OpenAPI 3.0 specification
- `GET /docs` - Swagger UI interface

## API Endpoints

### Whale Management
- `POST /api/whales` - Add whale to tracking
- `GET /api/whales` - List all whales
- `GET /api/whales/:address` - Get whale details
- `PUT /api/whales/:address` - Update whale
- `DELETE /api/whales/:address` - Remove whale

### Whale Data
- `GET /api/whales/:address/positions` - Current positions
- `GET /api/whales/:address/trades` - Trade history
- `GET /api/whales/:address/metrics` - Performance metrics
- `GET /api/whales/:address/events` - Detected events

### Markets
- `GET /api/markets` - List markets
- `GET /api/markets/:id` - Market details
- `GET /api/markets/:id/snapshots` - Price history

### Indexing
- `POST /api/index/whale/:address` - Trigger whale indexing
- `POST /api/index/all` - Trigger full reindex
- `GET /api/index/status` - Indexing status
- `GET /api/index/queue` - Queue status

### WebSocket
- `GET /ws` - WebSocket connection endpoint

## WebSocket Protocol

### Subscribe to whale trades
```json
{
  "type": "subscribe",
  "channel": "whale_trades",
  "wallet_address": "0x1234..."
}
```

### Receive trade updates
```json
{
  "type": "trade",
  "wallet_address": "0x1234...",
  "trade": {
    "id": "trade_123",
    "market": "Will Trump win 2024?",
    "side": "BUY",
    "size": 1000,
    "price": 0.65,
    "value": 650
  }
}
```

## Cron Jobs

### Every 5 minutes
- Update active whale positions
- Fetch latest trades
- Detect events

### Every 15 minutes
- Capture market snapshots
- Update market metadata

### Every hour
- Calculate hourly metrics
- Process indexing queue
- Clean up old data

### Daily
- Generate daily metrics rollup
- Weekly/monthly aggregations
- Full reindex if needed

## Development

### Project Structure
```
polyshed_indexer/
├── src/
│   ├── index.js                 # Main worker entry
│   ├── controllers/             # HTTP/WS handlers
│   ├── services/                # Business logic
│   ├── repositories/            # Database layer
│   ├── models/                  # Data models
│   ├── utils/                   # Helpers
│   └── durable-objects/         # WebSocket DO
├── migrations/                  # D1 migrations
├── tests/                       # Unit tests
├── wrangler.toml               # Worker config
└── schema.sql                  # Database schema
```

### Testing
```bash
npm test
```

### Monitoring
```bash
# View live logs
npm run tail

# Check database
wrangler d1 execute polyshed_indexer_db --command "SELECT COUNT(*) FROM trades"
```

## Performance

- **Trade Indexing**: ~100 trades/second
- **WebSocket Connections**: 1000+ concurrent
- **Database Queries**: <50ms p95
- **API Response Time**: <100ms p95

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `POLYMARKET_API_BASE` | CLOB API endpoint | https://clob.polymarket.com |
| `GAMMA_API_BASE` | Gamma API endpoint | https://gamma-api.polymarket.com |
| `MAX_WHALES_PER_UPDATE` | Whales per cron job | 50 |
| `BATCH_SIZE` | Trade fetch batch size | 100 |
| `RATE_LIMIT_MS` | API rate limit delay | 100 |

## Troubleshooting

### High API rate limits
- Increase `RATE_LIMIT_MS`
- Reduce `BATCH_SIZE`
- Reduce `MAX_WHALES_PER_UPDATE`

### Slow indexing
- Check `indexing_queue` table
- Review `indexing_log` for errors
- Increase worker resources

### Missing trades
- Verify whale wallet addresses
- Check `indexing_status` for errors
- Manually trigger reindex

## License

MIT
