/**
 * Swagger UI Router
 * Provides a web interface for API documentation and testing
 */

import { Hono } from 'hono'
import { swaggerUI } from '@hono/swagger-ui'
import { openApiSpec } from './openapi.js'

const app = new Hono()

/**
 * Serve Swagger UI
 */
app.get('/', swaggerUI({ url: '/docs/spec' }))

/**
 * Serve OpenAPI spec as JSON
 */
app.get('/spec', (c) => {
  return c.json(openApiSpec)
})

export default app
