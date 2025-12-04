## Deployment Guide - Polyshed Indexer

### Prerequisites

- Node.js 18+
- Cloudflare account (free tier works)
- Wrangler CLI installed: `npm install -g wrangler`
- Authenticated with Cloudflare: `wrangler login`

### Step 1: Install Dependencies

```bash
cd polyshed-indexer
npm install
```

### Step 2: Configure Cloudflare

Ensure `wrangler.toml` is configured with:

```toml
name = "polyshed_indexer"
main = "src/index.js"

[[d1_databases]]
binding = "DB"
database_name = "polyshed_indexer_db"
database_id = "2adb63b0-d2dd-4cef-b088-dc73821bfcc7"

[[durable_objects.bindings]]
name = "WHALE_TRACKER_DO"
class_name = "WhaleTrackerDO"
script_name = "polyshed_indexer"

[[kv_namespaces]]
binding = "CACHE"
id = "dbe447dddc6d4e5abac2975ca0b5c253"

[triggers]
crons = ["*/30 * * * *"]

[vars]
POLYMARKET_API_BASE = "https://clob.polymarket.com"
GAMMA_API_BASE = "https://gamma-api.polymarket.com"
MAX_WHALES_PER_UPDATE = "50"
BATCH_SIZE = "100"
RATE_LIMIT_MS = "100"
```

### Step 3: Setup D1 Database

```bash
# Create the database (if not already created)
wrangler d1 create polyshed_indexer_db

# Apply schema to local environment
npm run db:local

# Apply schema to production
npm run db:migrate
```

### Step 4: Create KV Namespace

```bash
# Create KV namespace for caching
wrangler kv:namespace create CACHE
```

Update the `id` in `wrangler.toml` with the returned namespace ID.

### Step 5: Deploy to Production

```bash
# Deploy the worker
npm run deploy

# Or deploy and keep tailing logs
npm run deploy && npm run tail
```

### Step 6: Verify Deployment

Once deployed, visit:

- **Health Check**: `https://polyshed_indexer.tcsn.workers.dev/health`
- **API Documentation**: `https://polyshed_indexer.tcsn.workers.dev/docs`
- **OpenAPI Spec**: `https://polyshed_indexer.tcsn.workers.dev/openapi.json`

### Local Development

```bash
# Start local development server
npm run dev

# This will start on http://localhost:8787

# In another terminal, you can test:
curl http://localhost:8787/health
curl http://localhost:8787/docs
```

### Accessing API Documentation

Once deployed or running locally, access the Swagger UI:

1. **Local**: `http://localhost:8787/docs`
2. **Production**: `https://polyshed_indexer.tcsn.workers.dev/docs`

### Testing Endpoints via Swagger UI

The Swagger UI provides a "Try it out" button for each endpoint:

1. Navigate to `/docs`
2. Browse through available endpoints
3. Click "Try it out" on any endpoint
4. Fill in required parameters
5. Click "Execute"
6. View response and status codes

### Monitoring

```bash
# Tail logs in real-time
npm run tail

# Tail specific worker
wrangler tail polyshed_indexer
```

### Common Issues

#### Database Connection Errors
- Verify `database_id` in `wrangler.toml`
- Ensure D1 migrations have been applied

#### Durable Objects Not Working
- Ensure `[[durable_objects.bindings]]` section in `wrangler.toml`
- Run `wrangler deploy` to update Durable Objects

#### KV Namespace Issues
- Verify `CACHE` binding ID in `wrangler.toml`
- Recreate namespace if needed: `wrangler kv:namespace create CACHE`

### Environment Variables

Configure these in `wrangler.toml` under `[vars]`:

| Variable | Default | Description |
|----------|---------|-------------|
| `POLYMARKET_API_BASE` | https://clob.polymarket.com | Polymarket CLOB API endpoint |
| `GAMMA_API_BASE` | https://gamma-api.polymarket.com | Gamma API endpoint |
| `MAX_WHALES_PER_UPDATE` | 50 | Whales to process per cron run |
| `BATCH_SIZE` | 100 | Trades per batch |
| `RATE_LIMIT_MS` | 100 | Delay between API calls (ms) |

### Cron Schedule

Default cron job runs every 30 minutes:

```toml
[triggers]
crons = ["*/30 * * * *"]
```

This performs:
- Update active whale positions
- Capture market snapshots
- Process trades and detect events

### Security Notes

- The service rejects direct public internet requests
- Only accepts requests via Cloudflare service bindings or cron triggers
- CORS is enabled for service binding requests
- All environment variables are securely stored

### Rollback

If deployment issues occur:

```bash
# Rollback to previous deployment
wrangler rollback

# View deployment history
wrangler deployments list
```

### Support & Troubleshooting

For issues:

1. Check logs: `npm run tail`
2. Verify Swagger UI documentation: `/docs`
3. Test health endpoint: `/health`
4. Review OpenAPI spec: `/openapi.json`

---

**Deployment Status**: Ready for production ✅
