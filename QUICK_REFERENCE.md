# 🎯 Polyshed Indexer - Quick Reference

## 🚀 Getting Started (2 minutes)

```bash
# 1. Install
npm install

# 2. Develop
npm run dev

# 3. Access Swagger
# → http://localhost:8787/docs
```

## 📍 Key Endpoints

| Endpoint | Purpose | Method |
|----------|---------|--------|
| `/health` | Health check | GET |
| `/docs` | Swagger UI | GET |
| `/openapi.json` | OpenAPI spec | GET |
| `/api/whales` | Whale management | GET/POST |
| `/api/markets` | Market data | GET |
| `/api/index/trigger-cron` | Manual indexing | POST |
| `/ws` | WebSocket | GET |

## 🧪 Quick Tests (Swagger UI)

### Test 1: Health Check
```
GET /health
→ Response: { status: "ok", service: "polyshed-indexer", timestamp: ... }
```

### Test 2: Add Whale
```
POST /api/whales
Body: {
  "wallet_address": "0x...",
  "display_name": "Test Whale",
  "tracking_enabled": true
}
→ Response: Whale object
```

### Test 3: List Whales
```
GET /api/whales
→ Response: Array of whales
```

### Test 4: Get Whale Trades
```
GET /api/whales/{address}/trades
→ Response: Array of trades
```

### Test 5: Trigger Cron
```
POST /api/index/trigger-cron
→ Response: { success: true, results: {...} }
```

## 📚 Documentation

| Doc | Content |
|-----|---------|
| `README.md` | Overview + Swagger info |
| `DEPLOYMENT.md` | Production deployment |
| `SWAGGER_GUIDE.md` | Testing guide (15+ examples) |
| `SWAGGER_SETUP.md` | Setup summary |
| `QUICKSTART.md` | Quick start |
| `IMPLEMENTATION.md` | Change details |
| `.claude` | AI context |

## 🌐 Deployment

```bash
# Deploy to Cloudflare
npm run deploy

# Production Swagger
# → https://polyshed_indexer.tcsn.workers.dev/docs

# View logs
npm run tail
```

## 🔧 Configuration

**Worker**: `polyshed_indexer`
**Database**: `polyshed_indexer_db` (D1)
**KV Cache**: `dbe447dddc6d4e5abac2975ca0b5c253`

Configure in `wrangler.toml`:
```toml
[vars]
POLYMARKET_API_BASE = "https://clob.polymarket.com"
MAX_WHALES_PER_UPDATE = "50"
BATCH_SIZE = "100"
RATE_LIMIT_MS = "100"
```

## ✅ Testing Checklist

- [x] Swagger UI accessible at `/docs`
- [x] OpenAPI spec at `/openapi.json`
- [x] All endpoints documented
- [x] All syntax valid
- [x] Import fixes applied
- [x] Ready for deployment

## 📊 API Structure

```
System
├── /health
├── /docs (Swagger UI)
└── /openapi.json

Whales
├── GET /api/whales
├── POST /api/whales
├── GET /api/whales/{address}
├── PUT /api/whales/{address}
├── DELETE /api/whales/{address}
├── GET /api/whales/{address}/trades
├── GET /api/whales/{address}/positions
├── GET /api/whales/{address}/metrics
└── GET /api/whales/{address}/events

Markets
├── GET /api/markets
├── GET /api/markets/{id}
├── GET /api/markets/{id}/snapshots
├── POST /api/markets/sync
└── POST /api/markets/sync/paginated

Indexing
├── POST /api/index/whale/{address}
├── POST /api/index/all
├── GET /api/index/status
├── GET /api/index/health
├── GET /api/index/queue
├── GET /api/index/log
└── POST /api/index/trigger-cron

WebSocket
└── GET /ws
```

## 🎨 Swagger UI Features

✨ Interactive documentation
✨ Try-it-out for all endpoints
✨ Live request/response
✨ Schema validation
✨ Error code reference
✨ Parameter help
✨ Example data

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Swagger UI not loading | Check `/openapi.json` is valid |
| Endpoint 403 error | Expected for public internet (use service binding) |
| Database errors | Verify D1 migrations: `npm run db:local` |
| Import errors | All fixed ✅ |

## 📞 Support Resources

- **Swagger UI**: `/docs` - Interactive testing
- **OpenAPI Spec**: `/openapi.json` - Full API definition
- **Health Check**: `/health` - Verify service
- **Logs**: `npm run tail` - Real-time logs
- **Guides**: See `SWAGGER_GUIDE.md` and `DEPLOYMENT.md`

## 🎯 Next Steps

1. ✅ Development: `npm run dev`
2. ✅ Testing: Visit `http://localhost:8787/docs`
3. ✅ Deployment: `npm run deploy`
4. ✅ Production: Visit `https://polyshed_indexer.tcsn.workers.dev/docs`

## 📦 Stack

- **Runtime**: Cloudflare Workers (Node.js)
- **Framework**: Hono 4.10.7
- **Database**: D1 (SQLite)
- **Docs**: Swagger UI + OpenAPI 3.0
- **API Testing**: Hono + Swagger UI

---

**Status**: 🟢 Production Ready
**Swagger**: ✅ Fully Integrated
**Testing**: ✅ Ready to Test
**Deployment**: ✅ Ready to Deploy

---

## ✅ Recent Fixes (Dec 4, 2025)

**Issue**: `/api/whales` endpoint returning internal error  
**Status**: ✅ RESOLVED

### What Was Fixed
- Added SQL injection prevention in WhaleRepository
- Improved parameter validation in whale controller
- Enhanced error logging and handling
- Added database availability check

### Verification
All endpoints tested and working:
- ✅ GET `/api/whales` - Returns whale list
- ✅ POST `/api/whales` - Creates new whale
- ✅ GET `/api/whales/{address}` - Whale details
- ✅ GET `/health` - Health check
- ✅ GET `/api/index/status` - Status
- ✅ GET `/docs` - Swagger UI (localhost first)
- ✅ GET `/openapi.json` - API spec

**See also**: `ENDPOINT_FIX_SUMMARY.md` and `FIX_VERIFICATION.md`
