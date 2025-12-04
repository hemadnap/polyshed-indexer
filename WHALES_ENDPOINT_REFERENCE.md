# /api/whales Endpoint Quick Reference

## Overview

The `/api/whales` endpoint is the primary interface for managing whale wallet tracking. It supports full CRUD operations (Create, Read, Update, Delete) with pagination, filtering, and sorting capabilities.

---

## Base URL

**Local Development:**
```
http://localhost:8787
```

**Production:**
```
https://polyshed_indexer.tcsn.workers.dev
```

---

## Endpoints

### 1. List All Whales

**Request:**
```bash
GET /api/whales?limit=100&offset=0&sort_by=total_volume&active=true&tracking_enabled=true
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 100 | Max results to return (1-1000) |
| `offset` | integer | 0 | Pagination offset |
| `sort_by` | string | `total_volume` | Sort field: `total_volume`, `total_roi`, `win_rate`, `sharpe_ratio` |
| `active` | boolean | - | Filter by active status |
| `tracking_enabled` | boolean | - | Filter by tracking status |

**Example:**
```bash
curl 'http://localhost:8787/api/whales?limit=10&offset=0&sort_by=total_roi'
```

**Response:**
```json
{
  "whales": [
    {
      "wallet_address": "0x...",
      "display_name": "Whale Name",
      "total_volume": 1000000,
      "total_pnl": 50000,
      "total_roi": 5.5,
      "win_rate": 0.65,
      "sharpe_ratio": 1.2,
      "active_positions_count": 5,
      "total_trades": 100,
      "first_seen_at": 1704067200,
      "last_activity_at": 1704153600,
      "is_active": 1,
      "tracking_enabled": 1,
      "created_at": 1704067200,
      "updated_at": 1704153600
    }
  ],
  "count": 1,
  "limit": 10,
  "offset": 0
}
```

**Status Codes:**
- `200 OK` - Success
- `400 Bad Request` - Invalid parameters
- `500 Internal Server Error` - Database error

---

### 2. Get Single Whale

**Request:**
```bash
GET /api/whales/{wallet_address}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `wallet_address` | string | Ethereum wallet address (0x...) |

**Example:**
```bash
curl 'http://localhost:8787/api/whales/0x1234567890123456789012345678901234567890'
```

**Response:**
```json
{
  "wallet_address": "0x1234567890123456789012345678901234567890",
  "display_name": "Whale Name",
  "total_volume": 1000000,
  ...
}
```

**Status Codes:**
- `200 OK` - Success
- `404 Not Found` - Whale not found
- `500 Internal Server Error` - Database error

---

### 3. Create New Whale

**Request:**
```bash
POST /api/whales
Content-Type: application/json

{
  "wallet_address": "0x...",
  "display_name": "Optional Display Name",
  "tracking_enabled": true
}
```

**Request Body:**
| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `wallet_address` | string | ✅ | - | Ethereum wallet address |
| `display_name` | string | ❌ | wallet_address | Display name for whale |
| `tracking_enabled` | boolean | ❌ | true | Enable tracking for this whale |

**Example:**
```bash
curl -X POST 'http://localhost:8787/api/whales' \
  -H 'Content-Type: application/json' \
  -d '{
    "wallet_address": "0x1234567890123456789012345678901234567890",
    "display_name": "My Whale",
    "tracking_enabled": true
  }'
```

**Response:**
```json
{
  "wallet_address": "0x1234567890123456789012345678901234567890",
  "display_name": "My Whale",
  "total_volume": 0,
  "total_pnl": 0,
  "total_roi": 0,
  "win_rate": 0,
  "sharpe_ratio": 0,
  "active_positions_count": 0,
  "total_trades": 0,
  "first_seen_at": 1704240000,
  "last_activity_at": 1704240000,
  "is_active": 1,
  "tracking_enabled": 1,
  "created_at": 1704240000,
  "updated_at": 1704240000
}
```

**Status Codes:**
- `201 Created` - Whale created successfully
- `400 Bad Request` - Invalid wallet address
- `409 Conflict` - Whale already exists
- `500 Internal Server Error` - Database error

---

### 4. Update Whale

**Request:**
```bash
PUT /api/whales/{wallet_address}
Content-Type: application/json

{
  "display_name": "Updated Name",
  "tracking_enabled": false
}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `wallet_address` | string | Ethereum wallet address |

**Request Body:**
| Field | Type | Description |
|-------|------|-------------|
| `display_name` | string | Update display name |
| `tracking_enabled` | boolean | Enable/disable tracking |

**Example:**
```bash
curl -X PUT 'http://localhost:8787/api/whales/0x1234567890123456789012345678901234567890' \
  -H 'Content-Type: application/json' \
  -d '{
    "display_name": "Updated Name",
    "tracking_enabled": false
  }'
```

**Response:**
```json
{
  "wallet_address": "0x1234567890123456789012345678901234567890",
  "display_name": "Updated Name",
  "tracking_enabled": 0,
  ...
}
```

**Status Codes:**
- `200 OK` - Whale updated
- `404 Not Found` - Whale not found
- `500 Internal Server Error` - Database error

---

### 5. Delete Whale

**Request:**
```bash
DELETE /api/whales/{wallet_address}
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `wallet_address` | string | Ethereum wallet address |

**Example:**
```bash
curl -X DELETE 'http://localhost:8787/api/whales/0x1234567890123456789012345678901234567890'
```

**Response:**
```
HTTP 204 No Content
```

**Status Codes:**
- `204 No Content` - Whale deleted successfully
- `404 Not Found` - Whale not found
- `500 Internal Server Error` - Database error

---

### 6. Get Whale Trades

**Request:**
```bash
GET /api/whales/{wallet_address}/trades?limit=50&offset=0
```

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `wallet_address` | string | Ethereum wallet address |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 50 | Max trades to return |
| `offset` | integer | 0 | Pagination offset |

**Example:**
```bash
curl 'http://localhost:8787/api/whales/0x1234567890123456789012345678901234567890/trades?limit=10'
```

**Response:**
```json
{
  "trades": [
    {
      "id": 1,
      "wallet_address": "0x...",
      "market_id": "market-123",
      "outcome": "YES",
      "order_id": "order-456",
      "size_number": 100,
      "price": 0.75,
      "side": "BUY",
      "pnl": 500,
      "roi": 0.15,
      "traded_at": 1704153600,
      "order_type": "LIMIT",
      "created_at": 1704153600
    }
  ],
  "count": 1
}
```

---

### 7. Get Whale Positions

**Request:**
```bash
GET /api/whales/{wallet_address}/positions
```

**Example:**
```bash
curl 'http://localhost:8787/api/whales/0x1234567890123456789012345678901234567890/positions'
```

**Response:**
```json
{
  "positions": [
    {
      "id": 1,
      "wallet_address": "0x...",
      "market_id": "market-123",
      "outcome": "YES",
      "size": 100,
      "entry_price": 0.50,
      "current_price": 0.75,
      "pnl": 25,
      "roi": 0.50,
      "position_created_at": 1704067200,
      "last_updated_at": 1704153600,
      "created_at": 1704067200
    }
  ],
  "count": 1
}
```

---

### 8. Get Whale Metrics

**Request:**
```bash
GET /api/whales/{wallet_address}/metrics?timeframe=daily
```

**Query Parameters:**
| Parameter | Type | Default | Values |
|-----------|------|---------|--------|
| `timeframe` | string | `daily` | `daily`, `weekly`, `monthly` |

**Example:**
```bash
curl 'http://localhost:8787/api/whales/0x1234567890123456789012345678901234567890/metrics?timeframe=weekly'
```

**Response:**
```json
{
  "wallet_address": "0x...",
  "timeframe": "weekly",
  "roi": 5.5,
  "pnl": 50000,
  "win_rate": 0.65,
  "sharpe_ratio": 1.2,
  "max_drawdown": -0.10,
  "trades_count": 100,
  "winning_trades": 65,
  "losing_trades": 35
}
```

---

### 9. Get Whale Events

**Request:**
```bash
GET /api/whales/{wallet_address}/events?type=LARGE_TRADE&limit=50
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | - | Event type: `NEW_POSITION`, `REVERSAL`, `DOUBLE_DOWN`, `EXIT`, `LARGE_TRADE` |
| `limit` | integer | 50 | Max events to return |

**Example:**
```bash
curl 'http://localhost:8787/api/whales/0x1234567890123456789012345678901234567890/events?type=LARGE_TRADE'
```

**Response:**
```json
{
  "events": [
    {
      "id": 1,
      "wallet_address": "0x...",
      "event_type": "LARGE_TRADE",
      "severity": "HIGH",
      "data": {
        "market_id": "market-123",
        "size": 50000,
        "price": 0.75
      },
      "created_at": 1704153600
    }
  ],
  "count": 1
}
```

---

## Common Use Cases

### List Top 10 Whales by ROI

```bash
curl 'http://localhost:8787/api/whales?limit=10&offset=0&sort_by=total_roi'
```

### List Active Whales Being Tracked

```bash
curl 'http://localhost:8787/api/whales?limit=100&active=true&tracking_enabled=true'
```

### Paginate Through All Whales

```bash
# Page 1
curl 'http://localhost:8787/api/whales?limit=10&offset=0'

# Page 2
curl 'http://localhost:8787/api/whales?limit=10&offset=10'

# Page 3
curl 'http://localhost:8787/api/whales?limit=10&offset=20'
```

### Register New Whale for Tracking

```bash
curl -X POST 'http://localhost:8787/api/whales' \
  -H 'Content-Type: application/json' \
  -d '{
    "wallet_address": "0x1234567890123456789012345678901234567890",
    "display_name": "My Tracked Whale",
    "tracking_enabled": true
  }'
```

### Disable Tracking for Whale

```bash
curl -X PUT 'http://localhost:8787/api/whales/0x1234567890123456789012345678901234567890' \
  -H 'Content-Type: application/json' \
  -d '{"tracking_enabled": false}'
```

### Get Recent Trades for Whale

```bash
curl 'http://localhost:8787/api/whales/0x1234567890123456789012345678901234567890/trades?limit=20&offset=0'
```

### Check Whale Performance (Weekly)

```bash
curl 'http://localhost:8787/api/whales/0x1234567890123456789012345678901234567890/metrics?timeframe=weekly'
```

---

## Response Field Reference

### Whale Object

| Field | Type | Description |
|-------|------|-------------|
| `wallet_address` | string | Ethereum wallet address (primary key) |
| `display_name` | string | User-friendly display name |
| `total_volume` | number | Total trading volume |
| `total_pnl` | number | Total profit/loss |
| `total_roi` | number | Return on investment (percentage) |
| `win_rate` | number | Percentage of winning trades (0-1) |
| `sharpe_ratio` | number | Risk-adjusted return metric |
| `active_positions_count` | integer | Number of open positions |
| `total_trades` | integer | Lifetime trade count |
| `first_seen_at` | integer | Unix timestamp of first activity |
| `last_activity_at` | integer | Unix timestamp of last activity |
| `is_active` | boolean | Whether whale is actively trading (0/1) |
| `tracking_enabled` | boolean | Whether tracking is enabled (0/1) |
| `created_at` | integer | Unix timestamp of record creation |
| `updated_at` | integer | Unix timestamp of last update |

---

## Error Handling

### Common Errors

**400 Bad Request**
```json
{
  "error": "Bad request",
  "message": "Invalid wallet address format"
}
```

**404 Not Found**
```json
{
  "error": "Not found",
  "message": "Whale not found"
}
```

**409 Conflict**
```json
{
  "error": "Conflict",
  "message": "Whale already exists"
}
```

**500 Internal Server Error**
```json
{
  "error": "Internal server error",
  "message": "Database connection failed"
}
```

---

## Rate Limiting

Currently no rate limiting is enforced. However, best practices suggest:
- Batch requests when possible
- Use reasonable pagination limits (50-1000)
- Implement exponential backoff for retries

---

## Authentication

The `/api/whales` endpoint is currently:
- ✅ Public in development (localhost)
- ✅ Public for `/docs` and `/openapi.json` in production
- 🔒 Restricted for data operations in production (service binding only)

For production access to create/update/delete whales, configure service binding authentication.

---

## Examples with cURL

### Install jq (for pretty-printing)
```bash
brew install jq
```

### Pretty-print response
```bash
curl -s 'http://localhost:8787/api/whales' | jq .
```

### Extract specific field
```bash
curl -s 'http://localhost:8787/api/whales' | jq '.whales[].wallet_address'
```

### Count whales
```bash
curl -s 'http://localhost:8787/api/whales' | jq '.count'
```

### Filter active whales
```bash
curl -s 'http://localhost:8787/api/whales' | jq '.whales[] | select(.is_active == 1)'
```

---

## Examples with JavaScript/Fetch

### List Whales
```javascript
const response = await fetch('http://localhost:8787/api/whales?limit=100');
const data = await response.json();
console.log(data.whales);
```

### Create Whale
```javascript
const response = await fetch('http://localhost:8787/api/whales', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    wallet_address: '0x...',
    display_name: 'My Whale',
    tracking_enabled: true
  })
});
const whale = await response.json();
console.log(whale);
```

### Get Single Whale
```javascript
const address = '0x1234567890123456789012345678901234567890';
const response = await fetch(`http://localhost:8787/api/whales/${address}`);
const whale = await response.json();
console.log(whale);
```

---

## Testing the Endpoint

### Using Swagger UI
```
Open http://localhost:8787/docs in your browser
```

### Using Postman
1. Import the OpenAPI spec from `http://localhost:8787/openapi.json`
2. Select whales endpoints
3. Fill in parameters and execute

### Using Thunder Client (VS Code)
1. Install Thunder Client extension
2. Create new request
3. Import from URL: `http://localhost:8787/openapi.json`

---

## Support

For issues or questions:
1. Check `/docs` for interactive testing
2. View OpenAPI spec at `/openapi.json`
3. Check server logs: `npm run dev`
4. See API_VERIFICATION_REPORT.md for test results

---

*Last Updated: December 4, 2025*
