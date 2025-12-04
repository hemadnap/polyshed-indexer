# API Reference

## Base URL
```
Production: https://polyshed_indexer.tcsn.workers.dev
Local Dev:  http://localhost:8787
```

## Authentication
Currently no authentication required (public API).

## Endpoints

### Whales

#### List All Whales
```http
GET /api/whales
```

Query Parameters:
- `limit` (number) - Max results (default: 50, max: 100)
- `offset` (number) - Pagination offset
- `sort` (string) - Sort field (total_roi, win_rate, total_volume)
- `order` (string) - Sort order (asc, desc)

Response:
```json
{
  "whales": [
    {
      "wallet_address": "0x...",
      "label": "Whale #1",
      "total_pnl": 15000.50,
      "total_roi": 23.5,
      "win_rate": 68.3,
      "total_trades": 127,
      "is_active": true
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

#### Get Whale Details
```http
GET /api/whales/:address
```

Response includes full metrics and current positions.

#### Get Whale Positions
```http
GET /api/whales/:address/positions
```

Query Parameters:
- `status` (string) - Filter by status (open, closed)
- `limit` (number) - Max results

#### Get Whale Trades
```http
GET /api/whales/:address/trades
```

Query Parameters:
- `limit` (number) - Max results
- `offset` (number) - Pagination
- `market` (string) - Filter by market condition_id
- `since` (timestamp) - Only trades after timestamp

### Markets

#### List Markets
```http
GET /api/markets
```

Query Parameters:
- `active` (boolean) - Only active markets
- `category` (string) - Filter by category
- `limit` (number) - Max results

#### Get Market Details
```http
GET /api/markets/:conditionId
```

Includes market info, whale positions, and recent trades.

#### Get Market Statistics
```http
GET /api/markets/:conditionId/statistics
```

Returns volume, liquidity, position counts, and averages.

### Events

#### Get Whale Events
```http
GET /api/whales/:address/events
```

Query Parameters:
- `type` (string) - Event type filter
- `severity` (string) - HIGH, NORMAL, CRITICAL
- `limit` (number) - Max results

Event Types:
- `NEW_POSITION` - Opened new position
- `POSITION_EXIT` - Closed position
- `REVERSAL` - Switched to opposite outcome
- `DOUBLE_DOWN` - Increased position significantly
- `LARGE_TRADE` - Trade above threshold

### Health & Documentation

#### Health Check
```http
GET /health
```

#### API Documentation
```http
GET /docs
```

Interactive Swagger UI documentation.

## WebSocket

### Connection
```javascript
const ws = new WebSocket('wss://polyshed-indexer.tcsntcsn6.workers.dev/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};
```

### Message Types

Subscribe to whale:
```json
{
  "type": "subscribe",
  "whale": "0x..."
}
```

Trade update:
```json
{
  "type": "trade",
  "whale": "0x...",
  "trade": { ... }
}
```

Position update:
```json
{
  "type": "position",
  "whale": "0x...",
  "position": { ... }
}
```

Event alert:
```json
{
  "type": "event",
  "whale": "0x...",
  "event": { ... }
}
```

## Rate Limits

Currently no rate limits enforced.

## Error Responses

Standard HTTP status codes:
- `200` - Success
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

Error format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Data Freshness

- Trade data: Updated every 15 minutes (cron job)
- Market snapshots: Every 15 minutes
- Whale metrics: Recalculated every 15 minutes
- WebSocket: Real-time updates
