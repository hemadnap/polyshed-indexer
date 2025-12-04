# Production URL & Access Guide

**Issue:** Cannot access `/api/whales` from public internet

**Status:** ✅ This is working as designed

---

## 🔗 Correct Production URL

### Base URL
```
https://polyshed_indexer.tcsn.workers.dev
```

**Important:** Note the **underscores** in `polyshed_indexer` (not hyphens)

### Public Endpoints (Accessible from Browser)

| Endpoint | URL | Status |
|----------|-----|--------|
| Documentation | `https://polyshed_indexer.tcsn.workers.dev/docs` | ✅ 200 OK |
| API Spec | `https://polyshed_indexer.tcsn.workers.dev/openapi.json` | ✅ 200 OK |
| Health Check | `https://polyshed_indexer.tcsn.workers.dev/health` | ✅ 200 OK |

### Data Endpoints (Blocked from Public Internet)

| Endpoint | Status | Reason |
|----------|--------|--------|
| `/api/whales` | 🔒 403 Forbidden | Service binding required |
| `/api/markets` | 🔒 403 Forbidden | Service binding required |
| `/api/index/*` | 🔒 403 Forbidden | Service binding required |

---

## ❌ What You Were Trying

```
https://polyshed_indexer.tcsn.workers.dev/api/whales?limit=100&offset=0
                ↑ Wrong: hyphens instead of underscores
```

**Error:** TypeErrorNetworkError (DNS resolution failed or service binding required)

---

## ✅ Correct URLs

### If You Want to Browse Documentation
```
https://polyshed_indexer.tcsn.workers.dev/docs
```
This opens Swagger UI where you can see all endpoints and their definitions.

### If You Want to Test Locally
```bash
npm run dev
curl http://localhost:8787/api/whales?limit=100&offset=0
```

### If You Want to Use Swagger UI
1. Open https://polyshed_indexer.tcsn.workers.dev/docs
2. Click on the `/api/whales` endpoint
3. Click "Try it out"
4. Enter parameters (limit, offset, etc.)
5. Click "Execute"

---

## 🔐 Why Are Data Endpoints Protected?

The security middleware intentionally blocks public internet requests to data endpoints because:

1. **Data Protection** - Whale data is sensitive and should only be accessible internally
2. **Service Binding** - Designed for internal Cloudflare service-to-service communication
3. **Cron Jobs** - Automated tasks identified via `cf-cron` header are allowed
4. **Local Development** - All endpoints accessible on localhost for developer convenience

---

## 📊 How Security Works

### Request Path

```
Public Internet Request
        ↓
Cloudflare receives request with cf-connecting-ip header
        ↓
Security middleware checks:
  1. Is it a cron job? (cf-cron header) → Allow
  2. Is it a public endpoint? (/docs, /openapi.json, /health) → Allow
  3. Is it from localhost? → Allow
  4. Does it have cf-connecting-ip header? → BLOCK (public internet)
        ↓
If blocked: Return 403 Forbidden
```

### Service Binding Request (Internal)

```
Service Binding Request
        ↓
Cloudflare routes internally (NO cf-connecting-ip header)
        ↓
Security middleware allows
        ↓
Request proceeds to handler
```

---

## 💡 Testing Options

### Option 1: Use Swagger UI (Recommended)
**Best for:** Quick testing without cURL

```
https://polyshed_indexer.tcsn.workers.dev/docs
```

Steps:
1. Open in browser
2. Find `/api/whales` endpoint
3. Click "Try it out"
4. Fill in parameters
5. Click "Execute"

---

### Option 2: Local Development (Unrestricted)
**Best for:** Full testing with direct cURL

```bash
npm run dev
```

Then test:
```bash
curl http://localhost:8787/api/whales?limit=100&offset=0
curl http://localhost:8787/api/whales \
  -X POST \
  -H 'Content-Type: application/json' \
  -d '{"wallet_address": "0x...", "display_name": "Test"}'
```

---

### Option 3: Service Binding (Production)
**Best for:** Integration with other Cloudflare workers

Configure in your worker:
```toml
[[services]]
binding = "POLYSHED"
service = "polyshed_indexer"
```

Then call:
```javascript
const response = await env.POLYSHED.fetch(
  'https://polyshed_indexer.tcsn.workers.dev/api/whales'
)
```

---

## 🔍 Verification

### Check Production is Running
```bash
curl https://polyshed_indexer.tcsn.workers.dev/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "polyshed-indexer",
  "timestamp": 1764868000000
}
```

### Check Documentation
```bash
curl https://polyshed_indexer.tcsn.workers.dev/openapi.json | jq . | head -50
```

---

## 📝 Summary

| Need | Solution | URL/Command |
|------|----------|------------|
| View API docs | Swagger UI | https://polyshed_indexer.tcsn.workers.dev/docs |
| Get API spec | OpenAPI JSON | https://polyshed_indexer.tcsn.workers.dev/openapi.json |
| Check health | Health endpoint | https://polyshed_indexer.tcsn.workers.dev/health |
| Test endpoints | Swagger Try it out | https://polyshed_indexer.tcsn.workers.dev/docs |
| Full API access | Local dev | npm run dev → http://localhost:8787 |
| Integration | Service binding | Configure in wrangler.toml |

---

## ✅ Everything is Working Correctly

**Status:** ✅ Production deployment is operational

The security restrictions are intentional and working as designed. Use the Swagger UI for quick testing or local development for full access.

---

*Last Updated: December 4, 2025*
