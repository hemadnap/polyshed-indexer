## Swagger UI - Quick Testing Guide

### Accessing the Swagger Interface

#### Local Development
```bash
npm run dev
# Visit: http://localhost:8787/docs
```

#### Production
```
https://polyshed-indexer.workers.dev/docs
```

### How to Use Swagger UI for Testing

#### 1. **Health Check** (Verify service is running)
- Navigate to: `System > Health check`
- Click "Try it out"
- Click "Execute"
- Expected response: `{ status: "ok", service: "polyshed-indexer", timestamp: ... }`

#### 2. **Adding a Whale** (Test whale management)
- Navigate to: `Whales > Add new whale`
- Click "Try it out"
- Fill in the Request body:
  ```json
  {
    "wallet_address": "0x1234567890abcdef1234567890abcdef12345678",
    "display_name": "Test Whale",
    "tracking_enabled": true
  }
  ```
- Click "Execute"
- Expected response: 201 Created with whale details

#### 3. **List Whales** (View all tracked whales)
- Navigate to: `Whales > List all whales`
- Click "Try it out"
- Optional: Add filters:
  - `active`: true/false
  - `tracking_enabled`: true/false
  - `sort_by`: total_volume, total_roi, win_rate, sharpe_ratio
  - `limit`: 100 (default)
  - `offset`: 0 (default)
- Click "Execute"
- View the results

#### 4. **Get Whale Details** (Specific whale information)
- Navigate to: `Whales > Get whale details`
- Click "Try it out"
- Enter wallet address in the `address` field
- Click "Execute"
- View whale metrics and details

#### 5. **Get Whale Trades** (View all trades for a whale)
- Navigate to: `Whales > Get whale trades`
- Click "Try it out"
- Enter wallet address
- Optional: Adjust `limit` and `offset`
- Click "Execute"
- View trade history

#### 6. **Get Whale Positions** (Current open positions)
- Navigate to: `Whales > Get whale positions`
- Click "Try it out"
- Enter wallet address
- Click "Execute"
- View currently open positions

#### 7. **Get Performance Metrics** (Trading analytics)
- Navigate to: `Whales > Get whale performance metrics`
- Click "Try it out"
- Enter wallet address
- Optional: Select `timeframe`: daily, weekly, or monthly
- Click "Execute"
- View ROI, win rate, Sharpe ratio, etc.

#### 8. **Get Events** (Detected trading events)
- Navigate to: `Whales > Get whale events`
- Click "Try it out"
- Enter wallet address
- Optional: Filter by event type:
  - NEW_POSITION
  - REVERSAL
  - DOUBLE_DOWN
  - EXIT
  - LARGE_TRADE
- Click "Execute"
- View detected events

#### 9. **List Markets** (Browse available markets)
- Navigate to: `Markets > List markets`
- Click "Try it out"
- Optional: Filter by `active` or `category`
- Click "Execute"
- View all markets

#### 10. **Get Market Details** (Specific market info)
- Navigate to: `Markets > Get market details`
- Click "Try it out"
- Enter market `id` (condition_id)
- Click "Execute"

#### 11. **Get Market Price History** (Historical snapshots)
- Navigate to: `Markets > Get market price history`
- Click "Try it out"
- Enter market `id`
- Optional: Add time range:
  - `from`: Unix timestamp
  - `to`: Unix timestamp
  - `limit`: 500 (default)
- Click "Execute"
- View historical price and liquidity data

#### 12. **Sync Markets** (Update market data from Polymarket)
- Navigate to: `Markets > Sync markets from Polymarket`
- Click "Try it out"
- Optional: Request body:
  ```json
  {
    "pagination": false,
    "pageSize": 500
  }
  ```
- Click "Execute"
- Syncs latest markets from Polymarket API

#### 13. **Trigger Indexing** (Manual update for specific whale)
- Navigate to: `Indexing > Trigger whale indexing`
- Click "Try it out"
- Enter whale `address`
- Optional: Request body:
  ```json
  {
    "full_reindex": false
  }
  ```
- Click "Execute"
- Triggers indexing job

#### 14. **Get Indexing Status** (System status)
- Navigate to: `Indexing > Get indexing status`
- Click "Try it out"
- Click "Execute"
- View job statistics

#### 15. **Manually Trigger Cron** (Run periodic tasks)
- Navigate to: `Indexing > Manually trigger cron job`
- Click "Try it out"
- Click "Execute"
- Runs whale updates and market snapshots immediately

### Tips for Testing

1. **Start with Health Check**: Always verify the service is running first
2. **Add Test Data**: Create a whale before querying trades/positions
3. **Use Real Wallet Addresses**: For actual trading data, use real Polymarket whale addresses
4. **Check Response Schemas**: Click on schema definitions to understand data structure
5. **Test Error Cases**: Try invalid parameters to see error responses

### Example Workflow

```
1. GET /health                           → Verify service
2. POST /api/whales                      → Add a test whale
3. GET /api/whales                       → List and find your whale
4. POST /api/index/whale/{address}       → Trigger indexing
5. GET /api/whales/{address}/trades      → View trades
6. GET /api/whales/{address}/positions   → View positions
7. GET /api/whales/{address}/metrics     → View performance
8. GET /api/whales/{address}/events      → View detected events
9. POST /api/index/trigger-cron          → Run periodic updates
10. GET /api/index/status                → Check system health
```

### Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 404 | Not Found |
| 409 | Conflict (e.g., whale already exists) |
| 500 | Server Error |
| 503 | Service Unavailable |

### Common Issues

#### "This service is only accessible via service binding"
- This is expected for direct browser requests to the worker
- Swagger UI still works via the service binding mechanism
- Use `/docs` endpoint specifically designed for this

#### Empty Results
- Check that whales are actually being indexed
- Use POST `/api/index/trigger-cron` to manually trigger updates
- Wait a few moments for indexing to complete

#### Rate Limiting
- API has built-in rate limiting
- Default: 100ms delay between external API calls
- Batch size: 100 trades per batch

### Advanced Testing

#### cURL Examples

```bash
# Health check
curl https://polyshed-indexer.workers.dev/health

# List whales
curl https://polyshed-indexer.workers.dev/api/whales

# Add whale
curl -X POST https://polyshed-indexer.workers.dev/api/whales \
  -H "Content-Type: application/json" \
  -d '{"wallet_address":"0x...","display_name":"Test"}'

# Get specific whale
curl https://polyshed-indexer.workers.dev/api/whales/0x...

# Get trades for whale
curl https://polyshed-indexer.workers.dev/api/whales/0x.../trades

# Trigger cron
curl -X POST https://polyshed-indexer.workers.dev/api/index/trigger-cron
```

### Support

For issues or questions:
1. Check the OpenAPI schema at `/openapi.json`
2. Review endpoint documentation in Swagger UI
3. Check worker logs: `npm run tail`
4. Verify database connectivity and migrations

---

**Swagger UI Status**: ✅ Fully configured and ready to test
