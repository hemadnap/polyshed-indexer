#!/usr/bin/env node

/**
 * Verify Swagger UI defaults to correct server based on environment
 * Tests both local and production endpoints
 */

async function verifySwagger() {
  console.log('🔍 Verifying Swagger UI Server Configuration\n')
  
  try {
    // Test local endpoint
    console.log('📍 Testing LOCAL endpoint...')
    const localResponse = await fetch('http://localhost:8787/openapi.json', {
      headers: { 'host': 'localhost:8787' }
    })
    
    if (!localResponse.ok) {
      console.log(`⚠️  Local endpoint not responding (${localResponse.status}). Make sure local dev is running.`)
      console.log('   Run: npm run dev:cron\n')
    } else {
      const localSpec = await localResponse.json()
      const localServers = localSpec.servers || []
      
      console.log(`✅ Local endpoint responding`)
      console.log(`   First server: ${localServers[0]?.url || 'N/A'} (${localServers[0]?.description || 'N/A'})`)
      
      if (localServers[0]?.url?.includes('localhost')) {
        console.log('   ✅ CORRECT: localhost is the default server for local dev\n')
      } else {
        console.log('   ⚠️  WARNING: localhost is NOT the default server\n')
      }
    }
    
    // Test production endpoint
    console.log('🌐 Testing PRODUCTION endpoint...')
    const prodResponse = await fetch('https://polyshed-indexer.workers.dev/openapi.json')
    
    if (!prodResponse.ok) {
      console.log(`⚠️  Production endpoint not responding (${prodResponse.status})\n`)
    } else {
      const prodSpec = await prodResponse.json()
      const prodServers = prodSpec.servers || []
      
      console.log(`✅ Production endpoint responding`)
      console.log(`   First server: ${prodServers[0]?.url || 'N/A'} (${prodServers[0]?.description || 'N/A'})`)
      
      if (prodServers[0]?.url?.includes('polyshed-indexer.workers.dev')) {
        console.log('   ✅ CORRECT: production URL is the default server in prod\n')
      } else {
        console.log('   ⚠️  WARNING: production URL is NOT the default server\n')
      }
    }
    
    console.log('📋 Summary:')
    console.log('   • Local dev Swagger UI at: http://localhost:8787/docs')
    console.log('   • Production Swagger UI at: https://polyshed-indexer.workers.dev/docs')
    console.log('   • Both should now default to their respective servers\n')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

verifySwagger()
