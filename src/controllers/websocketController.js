/**
 * WebSocket Controller
 * 
 * WebSocket connection handling via Durable Objects
 */

/**
 * Connect to WebSocket
 */
export default {
  async connect(c) {
    const upgradeHeader = c.req.header('Upgrade')
    
    if (upgradeHeader !== 'websocket') {
      return c.json({ error: 'Expected WebSocket upgrade' }, 426)
    }
    
    // Get or create Durable Object
    const doId = c.env.WHALE_TRACKER_DO.idFromName('whale-tracker')
    const stub = c.env.WHALE_TRACKER_DO.get(doId)
    
    // Forward the request to the Durable Object
    return stub.fetch(c.req.raw)
  }
}
