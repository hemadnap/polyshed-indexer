# Polyshed Indexer - Project Information

## Overview
Real-time whale tracking and market indexing service for Polymarket, built on Cloudflare Workers with D1 database.

## Technology Stack
- **Runtime**: Cloudflare Workers (ES Modules)
- **Framework**: Hono 4.0.0
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare KV
- **Infrastructure**: Durable Objects (WebSocket)
- **Testing**: Vitest 1.0.0
- **Language**: JavaScript (ES Modules)

## Project Structure
```
src/
├── index.js                     # Main worker entry
├── openapi.js                   # API documentation
├── controllers/                 # HTTP handlers
├── services/                    # Business logic
├── repositories/                # Data layer
└── durable-objects/             # WebSocket state
```

## Key Components
1. **Whale Tracking** - Monitor high-volume traders
2. **Market Indexing** - Sync Polymarket data
3. **Event Detection** - Trading pattern recognition
4. **Performance Analytics** - ROI, Sharpe ratio, win rates
5. **Real-time Updates** - WebSocket broadcasts

## Database Schema (12 Tables)
- whales, whale_metadata, whale_events
- markets, market_snapshots
- trades, positions, closed_positions
- whale_metrics_daily/weekly/monthly
- indexing_queue, indexing_status, indexing_log

## API Endpoints
- `/api/whales/*` - Whale CRUD and data
- `/api/markets/*` - Market sync and history
- `/api/index/*` - Indexing operations
- `/ws` - WebSocket connections
- `/docs` - Swagger UI

## Development
```bash
npm run dev          # Local development
npm test             # Run tests
npm run deploy       # Deploy to Cloudflare
npm run db:migrate   # Apply migrations
```

## Environment Variables
- POLYMARKET_API_BASE
- GAMMA_API_BASE
- MAX_WHALES_PER_UPDATE
- BATCH_SIZE
- RATE_LIMIT_MS
