# Polymarket CLOB API Authentication Setup Guide

## Overview

To access Polymarket's CLOB API for trade history and position data, you need to create API credentials using your Polygon private key. This is a two-level authentication system.

## Authentication Levels

### L1 - Private Key (Initial Setup)
- **Purpose**: Create/derive L2 API credentials
- **Method**: Sign requests with your Polygon private key
- **Endpoint**: `POST /auth/api-key`
- **Input**: Polygon private key signature
- **Output**: L2 credentials (key, secret, passphrase)

### L2 - API Credentials (Runtime)
- **Purpose**: Authenticate all subsequent API requests
- **Components**:
  - `key`: UUID identifier for the API key
  - `secret`: For HMAC signatures
  - `passphrase`: For request authentication

## Step-by-Step Implementation

### Step 1: Generate Polygon Private Key

If you don't already have one:

```bash
# Using ethers.js
npm install ethers

# Generate new wallet
node -e "
const ethers = require('ethers');
const wallet = ethers.Wallet.createRandom();
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
"

# Or use MetaMask/Coinbase wallet export
# Copy private key from wallet settings
```

### Step 2: Create API Credentials via CLOB Endpoint

**Using Python (Recommended by Polymarket):**

```python
from polymarket_clob_client.client import ClobClient
from eth_account import Account

# Your Polygon private key
PRIVATE_KEY = "0x..."

# Create account from private key
account = Account.from_key(PRIVATE_KEY)

# Initialize CLOB client
client = ClobClient(
    host="https://clob.polymarket.com",
    key=None,  # Will use private key to create credentials
    secret=None,
    passphrase=None,
)

# Create/derive API credentials
credentials = client.create_or_derive_api_creds(account)

# Save these credentials
print("API Key:", credentials["key"])
print("Secret:", credentials["secret"])
print("Passphrase:", credentials["passphrase"])
```

**Using TypeScript/JavaScript:**

```typescript
import { ClobClient } from '@polymarket-sdk/clob-client';
import { ethers } from 'ethers';

const PRIVATE_KEY = "0x...";

// Create wallet from private key
const wallet = new ethers.Wallet(PRIVATE_KEY);

// Initialize CLOB client
const client = new ClobClient({
  host: "https://clob.polymarket.com"
});

// Derive API key from wallet
const credentials = await client.deriveApiKey(wallet);

// Save these credentials
console.log("API Key:", credentials.key);
console.log("Secret:", credentials.secret);
console.log("Passphrase:", credentials.passphrase);
```

### Step 3: Store Credentials Securely

Store the generated credentials in your Cloudflare Worker:

**Option A: Environment Variables (wrangler.toml)**

```toml
[env.production]
vars = {
  POLYMARKET_API_KEY = "your-uuid-key",
  POLYMARKET_API_SECRET = "your-secret-key",
  POLYMARKET_API_PASSPHRASE = "your-passphrase"
}
```

**Option B: Cloudflare Secrets (More Secure)**

```bash
# Deploy secrets
npx wrangler secret put POLYMARKET_API_KEY --env production
npx wrangler secret put POLYMARKET_API_SECRET --env production
npx wrangler secret put POLYMARKET_API_PASSPHRASE --env production

# You'll be prompted to enter each value
```

**Option C: GitHub Secrets (for CI/CD)**

```yaml
# In GitHub Actions
POLYMARKET_API_KEY=${{ secrets.POLYMARKET_API_KEY }}
POLYMARKET_API_SECRET=${{ secrets.POLYMARKET_API_SECRET }}
POLYMARKET_API_PASSPHRASE=${{ secrets.POLYMARKET_API_PASSPHRASE }}
```

### Step 4: Update ClobService to Use Credentials

Update `src/services/ClobService.js`:

```javascript
export class ClobService {
  constructor(env) {
    this.baseUrl = env.POLYMARKET_API_BASE || 'https://clob.polymarket.com'
    this.env = env
    
    // Add API credentials
    this.apiKey = env.POLYMARKET_API_KEY
    this.apiSecret = env.POLYMARKET_API_SECRET
    this.apiPassphrase = env.POLYMARKET_API_PASSPHRASE
    
    // Validate credentials
    if (!this.apiKey || !this.apiSecret || !this.apiPassphrase) {
      console.warn('CLOB API credentials not configured - public endpoints only')
    }
  }

  /**
   * Generate HMAC signature for request
   */
  async generateSignature(method, path, body = '', timestamp) {
    const message = timestamp + method + path + body
    
    // Use Web Crypto API (available in Cloudflare Workers)
    const encoder = new TextEncoder()
    const keyData = encoder.encode(this.apiSecret)
    const messageData = encoder.encode(message)
    
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    const signature = await crypto.subtle.sign('HMAC', key, messageData)
    
    // Convert to hex
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  /**
   * Fetch with authentication headers
   */
  async fetch(path, options = {}, retries = 3) {
    const url = `${this.baseUrl}${path}`
    const method = options.method || 'GET'
    const body = options.body || ''
    
    // Add authentication if credentials are configured
    if (this.apiKey && this.apiSecret && this.apiPassphrase) {
      const timestamp = Date.now().toString()
      const signature = await this.generateSignature(method, path, body, timestamp)
      
      options.headers = {
        ...options.headers,
        'CLOB-KEY': this.apiKey,
        'CLOB-SIGN': signature,
        'CLOB-TIMESTAMP': timestamp,
        'CLOB-PASSPHRASE': this.apiPassphrase
      }
    }
    
    // ... rest of fetch implementation
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          }
        })
        
        if (!response.ok) {
          if (response.status === 429 && i < retries - 1) {
            await this.sleep(1000 * (i + 1))
            continue
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        return response
      } catch (error) {
        if (i === retries - 1) throw error
        await this.sleep(500 * (i + 1))
      }
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
```

### Step 5: Deploy and Test

```bash
# Deploy to Cloudflare Workers
npm run deploy

# Verify credentials work
curl -X GET https://polyshed_indexer.tcsn.workers.dev/api/whales

# Trigger cron to test data retrieval
curl -X POST https://polyshed_indexer.tcsn.workers.dev/api/index/trigger-cron | jq .

# Check indexing logs
curl https://polyshed_indexer.tcsn.workers.dev/api/index/log | jq '.[0]'
```

## CLOB API Request Format

### Headers Required

```
CLOB-KEY: <your-api-key>
CLOB-SIGN: <hmac-sha256-signature>
CLOB-TIMESTAMP: <unix-timestamp-ms>
CLOB-PASSPHRASE: <your-passphrase>
Content-Type: application/json
```

### Signature Generation

```
Message = TIMESTAMP + METHOD + PATH + [optional BODY]
Signature = HMAC-SHA256(Message, SECRET)
```

### Example Request

```bash
curl -X GET "https://clob.polymarket.com/trades?maker=0x...&limit=100" \
  -H "CLOB-KEY: your-api-key" \
  -H "CLOB-SIGN: generated-hmac-signature" \
  -H "CLOB-TIMESTAMP: 1764869987312" \
  -H "CLOB-PASSPHRASE: your-passphrase" \
  -H "Content-Type: application/json"
```

## Endpoints Now Available

With proper authentication, you can access:

```
GET /trades?maker=<address>&limit=100&offset=0
GET /orders?address=<address>&limit=100
GET /orders/<id>
GET /positions/<address>
GET /account?address=<address>
GET /balance?address=<address>
```

## Security Best Practices

### ⚠️ DO NOT
- ❌ Commit API keys to Git
- ❌ Put credentials in code comments
- ❌ Share credentials via email/chat
- ❌ Use same key for development and production
- ❌ Store plaintext private keys in files

### ✅ DO
- ✅ Use Cloudflare Secrets for production
- ✅ Use environment variables for development
- ✅ Rotate credentials periodically
- ✅ Create separate keys for different environments
- ✅ Use Cloudflare's built-in secret management
- ✅ Review permissions on keys regularly

## Development Setup

### Local Development (with wrangler)

```bash
# Create .env file (DO NOT commit)
echo "POLYMARKET_API_KEY=your-key" > .env.local
echo "POLYMARKET_API_SECRET=your-secret" >> .env.local
echo "POLYMARKET_API_PASSPHRASE=your-passphrase" >> .env.local

# Run locally
npm run dev

# Test locally
curl http://localhost:8787/api/whales
```

### Testing the Setup

```bash
# Step 1: Check credentials are loaded
curl http://localhost:8787/health

# Step 2: Add a whale to track
curl -X POST http://localhost:8787/api/whales \
  -H "Content-Type: application/json" \
  -d '{"wallet_address":"0x...", "display_name":"Test Whale"}'

# Step 3: Trigger indexing
curl -X POST http://localhost:8787/api/index/trigger-cron

# Step 4: Check whale data
curl http://localhost:8787/api/whales | jq .
```

## Troubleshooting

### Error: "Unauthorized/Invalid api key"
- ❌ API key not set
- ❌ Wrong format for signature
- ❌ Timestamp is too old (> 30 seconds)
- ✅ **Solution**: Verify all headers are correct and timestamp is recent

### Error: "Invalid signature"
- ❌ Secret key is wrong
- ❌ Signature algorithm is wrong (must be HMAC-SHA256)
- ❌ Message format is wrong
- ✅ **Solution**: Double-check message format: `TIMESTAMP + METHOD + PATH + BODY`

### Error: "Request timeout"
- ❌ Rate limited (> 100 requests/second)
- ❌ Network issue
- ✅ **Solution**: Add exponential backoff and retry logic

### No data returned
- ❌ Whale address has no trades on Polymarket
- ❌ Whale address format is wrong
- ✅ **Solution**: Test with known active whale address

## Getting API Credentials (Complete Workflow)

### Quick Start Script

```bash
#!/bin/bash

# 1. Check if you have a private key
read -p "Enter your Polygon private key (0x...): " PRIVATE_KEY

# 2. Create credentials using Polymarket SDK
node -e "
const { ClobClient } = require('@polymarket-sdk/clob-client');
const { ethers } = require('ethers');

async function setup() {
  const wallet = new ethers.Wallet('$PRIVATE_KEY');
  const client = new ClobClient({ host: 'https://clob.polymarket.com' });
  
  try {
    const creds = await client.deriveApiKey(wallet);
    console.log('✅ API Credentials Generated:');
    console.log('Key:', creds.key);
    console.log('Secret:', creds.secret);
    console.log('Passphrase:', creds.passphrase);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

setup();
"

# 3. Save credentials
echo "Save these credentials securely!"
```

## Next Steps

1. **Get Your Polygon Private Key**
   - Use existing MetaMask/Ledger wallet
   - Or create new test account

2. **Generate API Credentials**
   - Run the credential generation script
   - Save credentials securely

3. **Update Polyshed Indexer**
   - Add credentials to wrangler.toml (dev) or Cloudflare Secrets (prod)
   - Update ClobService.js with HMAC signature logic
   - Deploy changes

4. **Test Data Retrieval**
   - Manually trigger cron
   - Verify whale data is populated
   - Monitor logs for success

5. **Monitor Production**
   - Check that cron jobs are retrieving data
   - Verify whale metrics are non-zero
   - Set up alerts for API failures

## Resources

- **Polymarket CLOB API Docs**: https://docs.polymarket.com
- **Authentication Guide**: https://docs.polymarket.com/authentication
- **Python Client**: https://github.com/polymarket/clob-client
- **TypeScript SDK**: https://github.com/polymarket/sdk
- **Cloudflare Secrets**: https://developers.cloudflare.com/workers/platform/security/

## Support

For issues:
1. Check Cloudflare Workers logs: `npm run tail`
2. Verify credentials format
3. Test API directly with curl (using same headers)
4. Review Polymarket documentation

---

**Status**: Ready for Implementation
**Effort**: 2-3 hours for complete setup
**Priority**: High - Unblocks whale data population
