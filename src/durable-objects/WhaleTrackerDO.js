/**
 * Whale Tracker Durable Object
 * 
 * Manages WebSocket connections for real-time whale trade updates
 */

export class WhaleTrackerDO {
  constructor(state, env) {
    this.state = state
    this.env = env
    this.sessions = new Map() // WebSocket session management
    this.subscriptions = new Map() // wallet_address -> Set of session IDs
  }

  /**
   * Handle HTTP requests (WebSocket upgrade)
   */
  async fetch(request) {
    const url = new URL(request.url)
    
    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request)
    }
    
    // Broadcast endpoint (for internal use by Workers)
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const data = await request.json()
      return this.broadcastTrade(data)
    }
    
    return new Response('Not found', { status: 404 })
  }

  /**
   * Handle WebSocket connection
   */
  async handleWebSocket(request) {
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    
    const sessionId = crypto.randomUUID()
    
    // Accept the WebSocket connection
    server.accept()
    
    // Store session
    this.sessions.set(sessionId, {
      socket: server,
      subscriptions: new Set(),
      connected: true,
      connectedAt: Date.now()
    })
    
    // Set up message handler
    server.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data)
        await this.handleMessage(sessionId, data)
      } catch (error) {
        console.error('WebSocket message error:', error)
        server.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }))
      }
    })
    
    // Set up close handler
    server.addEventListener('close', () => {
      this.handleClose(sessionId)
    })
    
    // Send welcome message
    server.send(JSON.stringify({
      type: 'connected',
      sessionId,
      timestamp: Date.now()
    }))
    
    return new Response(null, {
      status: 101,
      webSocket: client
    })
  }

  /**
   * Handle incoming WebSocket messages
   */
  async handleMessage(sessionId, data) {
    const session = this.sessions.get(sessionId)
    if (!session) return
    
    switch (data.type) {
      case 'subscribe':
        await this.handleSubscribe(sessionId, data)
        break
      
      case 'unsubscribe':
        await this.handleUnsubscribe(sessionId, data)
        break
      
      case 'ping':
        session.socket.send(JSON.stringify({
          type: 'pong',
          timestamp: Date.now()
        }))
        break
      
      default:
        session.socket.send(JSON.stringify({
          type: 'error',
          message: `Unknown message type: ${data.type}`
        }))
    }
  }

  /**
   * Handle subscription request
   */
  async handleSubscribe(sessionId, data) {
    const session = this.sessions.get(sessionId)
    if (!session) return
    
    const { channel, wallet_address } = data
    
    if (channel === 'whale_trades' && wallet_address) {
      // Add to session subscriptions
      session.subscriptions.add(wallet_address)
      
      // Add to global subscriptions map
      if (!this.subscriptions.has(wallet_address)) {
        this.subscriptions.set(wallet_address, new Set())
      }
      this.subscriptions.get(wallet_address).add(sessionId)
      
      // Confirm subscription
      session.socket.send(JSON.stringify({
        type: 'subscribed',
        channel,
        wallet_address,
        timestamp: Date.now()
      }))
      
      console.log(`Session ${sessionId} subscribed to ${wallet_address}`)
    } else {
      session.socket.send(JSON.stringify({
        type: 'error',
        message: 'Invalid subscription request'
      }))
    }
  }

  /**
   * Handle unsubscribe request
   */
  async handleUnsubscribe(sessionId, data) {
    const session = this.sessions.get(sessionId)
    if (!session) return
    
    const { channel, wallet_address } = data
    
    if (channel === 'whale_trades' && wallet_address) {
      // Remove from session subscriptions
      session.subscriptions.delete(wallet_address)
      
      // Remove from global subscriptions map
      const subscribers = this.subscriptions.get(wallet_address)
      if (subscribers) {
        subscribers.delete(sessionId)
        if (subscribers.size === 0) {
          this.subscriptions.delete(wallet_address)
        }
      }
      
      // Confirm unsubscription
      session.socket.send(JSON.stringify({
        type: 'unsubscribed',
        channel,
        wallet_address,
        timestamp: Date.now()
      }))
      
      console.log(`Session ${sessionId} unsubscribed from ${wallet_address}`)
    }
  }

  /**
   * Handle WebSocket close
   */
  handleClose(sessionId) {
    const session = this.sessions.get(sessionId)
    if (!session) return
    
    // Remove all subscriptions for this session
    for (const wallet_address of session.subscriptions) {
      const subscribers = this.subscriptions.get(wallet_address)
      if (subscribers) {
        subscribers.delete(sessionId)
        if (subscribers.size === 0) {
          this.subscriptions.delete(wallet_address)
        }
      }
    }
    
    // Remove session
    this.sessions.delete(sessionId)
    
    console.log(`Session ${sessionId} disconnected`)
  }

  /**
   * Broadcast trade to subscribers
   */
  async broadcastTrade(data) {
    const { wallet_address, trade, event } = data
    
    const subscribers = this.subscriptions.get(wallet_address)
    if (!subscribers || subscribers.size === 0) {
      return new Response(JSON.stringify({
        success: true,
        subscribers: 0
      }))
    }
    
    const message = JSON.stringify({
      type: event?.type || 'trade',
      wallet_address,
      trade,
      event,
      timestamp: Date.now()
    })
    
    let sent = 0
    for (const sessionId of subscribers) {
      const session = this.sessions.get(sessionId)
      if (session && session.connected) {
        try {
          session.socket.send(message)
          sent++
        } catch (error) {
          console.error(`Failed to send to session ${sessionId}:`, error)
          this.handleClose(sessionId)
        }
      }
    }
    
    return new Response(JSON.stringify({
      success: true,
      subscribers: sent
    }))
  }

  /**
   * Get connection stats
   */
  getStats() {
    return {
      sessions: this.sessions.size,
      subscriptions: this.subscriptions.size,
      totalSubs: Array.from(this.subscriptions.values())
        .reduce((sum, set) => sum + set.size, 0)
    }
  }
}
