/**
 * OpenAPI/Swagger Specification for Polyshed Indexer
 */

export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Polyshed Indexer API',
    description: 'Real-time whale tracking and market indexing service for Polymarket',
    version: '1.0.0',
    contact: {
      name: 'Polyshed Team'
    }
  },
  servers: [
    {
      url: 'https://polyshed_indexer.tcsn.workers.dev',
      description: 'Production'
    },
    {
      url: 'http://localhost:8787',
      description: 'Local development'
    }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        description: 'Check if the service is running',
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    service: { type: 'string', example: 'polyshed-indexer' },
                    timestamp: { type: 'number', example: 1701648000000 }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/whales': {
      get: {
        tags: ['Whales'],
        summary: 'List all whales',
        description: 'Retrieve all whales with optional filtering and sorting',
        parameters: [
          {
            name: 'active',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'Filter by active status'
          },
          {
            name: 'tracking_enabled',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'Filter by tracking status'
          },
          {
            name: 'sort_by',
            in: 'query',
            schema: { type: 'string', enum: ['total_volume', 'total_roi', 'win_rate', 'sharpe_ratio'] },
            description: 'Sort by field'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 100 },
            description: 'Number of results'
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', default: 0 },
            description: 'Pagination offset'
          }
        ],
        responses: {
          200: {
            description: 'List of whales',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    whales: {
                      type: 'array',
                      items: {
                        $ref: '#/components/schemas/Whale'
                      }
                    },
                    count: { type: 'integer' },
                    limit: { type: 'integer' },
                    offset: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Whales'],
        summary: 'Add new whale',
        description: 'Register a new whale wallet to track',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['wallet_address'],
                properties: {
                  wallet_address: { type: 'string', description: 'Ethereum/Polygon wallet address' },
                  display_name: { type: 'string', description: 'Display name for the whale' },
                  tracking_enabled: { type: 'boolean', default: true }
                }
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Whale created successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Whale' }
              }
            }
          },
          409: {
            description: 'Whale already exists'
          }
        }
      }
    },
    '/api/whales/{address}': {
      get: {
        tags: ['Whales'],
        summary: 'Get whale details',
        parameters: [
          {
            name: 'address',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: 'Whale details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Whale' }
              }
            }
          },
          404: {
            description: 'Whale not found'
          }
        }
      },
      put: {
        tags: ['Whales'],
        summary: 'Update whale',
        parameters: [
          {
            name: 'address',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  display_name: { type: 'string' },
                  tracking_enabled: { type: 'boolean' }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Whale updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Whale' }
              }
            }
          }
        }
      },
      delete: {
        tags: ['Whales'],
        summary: 'Delete whale',
        parameters: [
          {
            name: 'address',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          204: {
            description: 'Whale deleted'
          }
        }
      }
    },
    '/api/whales/{address}/trades': {
      get: {
        tags: ['Whales'],
        summary: 'Get whale trades',
        parameters: [
          {
            name: 'address',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 50 }
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', default: 0 }
          }
        ],
        responses: {
          200: {
            description: 'Whale trades',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    trades: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Trade' }
                    },
                    count: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/whales/{address}/positions': {
      get: {
        tags: ['Whales'],
        summary: 'Get whale positions',
        parameters: [
          {
            name: 'address',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: 'Current positions',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    positions: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Position' }
                    },
                    count: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/whales/{address}/metrics': {
      get: {
        tags: ['Whales'],
        summary: 'Get whale performance metrics',
        parameters: [
          {
            name: 'address',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          },
          {
            name: 'timeframe',
            in: 'query',
            schema: { type: 'string', enum: ['daily', 'weekly', 'monthly'], default: 'daily' }
          }
        ],
        responses: {
          200: {
            description: 'Performance metrics',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Metrics' }
              }
            }
          }
        }
      }
    },
    '/api/whales/{address}/events': {
      get: {
        tags: ['Whales'],
        summary: 'Get whale events',
        parameters: [
          {
            name: 'address',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          },
          {
            name: 'type',
            in: 'query',
            schema: { type: 'string', enum: ['NEW_POSITION', 'REVERSAL', 'DOUBLE_DOWN', 'EXIT', 'LARGE_TRADE'] }
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 50 }
          }
        ],
        responses: {
          200: {
            description: 'Events',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    events: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Event' }
                    },
                    count: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/markets': {
      get: {
        tags: ['Markets'],
        summary: 'List markets',
        parameters: [
          {
            name: 'active',
            in: 'query',
            schema: { type: 'boolean' },
            description: 'Filter active markets'
          },
          {
            name: 'category',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by category'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 100 }
          },
          {
            name: 'offset',
            in: 'query',
            schema: { type: 'integer', default: 0 }
          }
        ],
        responses: {
          200: {
            description: 'Markets list',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    markets: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Market' }
                    },
                    count: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/markets/{id}': {
      get: {
        tags: ['Markets'],
        summary: 'Get market details',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          200: {
            description: 'Market details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Market' }
              }
            }
          }
        }
      }
    },
    '/api/markets/{id}/snapshots': {
      get: {
        tags: ['Markets'],
        summary: 'Get market price history',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          },
          {
            name: 'from',
            in: 'query',
            schema: { type: 'integer' },
            description: 'Unix timestamp (from)'
          },
          {
            name: 'to',
            in: 'query',
            schema: { type: 'integer' },
            description: 'Unix timestamp (to)'
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 500 }
          }
        ],
        responses: {
          200: {
            description: 'Price snapshots',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    snapshots: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Snapshot' }
                    },
                    count: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/markets/sync': {
      post: {
        tags: ['Markets'],
        summary: 'Sync markets from Polymarket',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  pagination: { type: 'boolean', default: false },
                  pageSize: { type: 'integer', default: 500 }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Markets synced successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    result: {
                      type: 'object',
                      properties: {
                        count: { type: 'integer' },
                        errors: { type: 'integer' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/index/whale/{address}': {
      post: {
        tags: ['Indexing'],
        summary: 'Trigger whale indexing',
        parameters: [
          {
            name: 'address',
            in: 'path',
            required: true,
            schema: { type: 'string' }
          }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  full_reindex: { type: 'boolean', default: false }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Indexing triggered'
          }
        }
      }
    },
    '/api/index/all': {
      post: {
        tags: ['Indexing'],
        summary: 'Trigger full reindex',
        description: 'Queue all whales for reindexing',
        responses: {
          200: {
            description: 'All whales queued'
          }
        }
      }
    },
    '/api/index/status': {
      get: {
        tags: ['Indexing'],
        summary: 'Get indexing status',
        responses: {
          200: {
            description: 'Indexing status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    total_jobs: { type: 'integer' },
                    completed: { type: 'integer' },
                    pending: { type: 'integer' },
                    failed: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/index/health': {
      get: {
        tags: ['Indexing'],
        summary: 'Get system health',
        responses: {
          200: {
            description: 'System health status',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
                    last_job_at: { type: 'integer' },
                    job_duration_avg: { type: 'number' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/index/queue': {
      get: {
        tags: ['Indexing'],
        summary: 'Get indexing queue',
        parameters: [
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['pending', 'processing', 'completed', 'failed'] }
          },
          {
            name: 'limit',
            in: 'query',
            schema: { type: 'integer', default: 100 }
          }
        ],
        responses: {
          200: {
            description: 'Indexing queue'
          }
        }
      }
    },
    '/api/index/log': {
      get: {
        tags: ['Indexing'],
        summary: 'Get indexing log',
        parameters: [
          {
            name: 'job_type',
            in: 'query',
            schema: { type: 'string' }
          },
          {
            name: 'status',
            in: 'query',
            schema: { type: 'string', enum: ['completed', 'failed'] }
          }
        ],
        responses: {
          200: {
            description: 'Indexing log'
          }
        }
      }
    },
    '/api/index/trigger-cron': {
      post: {
        tags: ['Indexing'],
        summary: 'Manually trigger cron job',
        description: 'Run whale updates and market snapshots',
        responses: {
          200: {
            description: 'Cron job completed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    message: { type: 'string' },
                    durationMs: { type: 'number' },
                    results: {
                      type: 'object',
                      properties: {
                        whaleUpdate: { type: 'object' },
                        marketSnapshots: { type: 'object' },
                        errors: {
                          type: 'array',
                          items: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/ws': {
      get: {
        tags: ['WebSocket'],
        summary: 'WebSocket connection',
        description: 'Real-time updates for whale trades and positions',
        responses: {
          101: {
            description: 'Switching to WebSocket protocol'
          },
          426: {
            description: 'Upgrade header missing'
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Whale: {
        type: 'object',
        properties: {
          wallet_address: { type: 'string' },
          display_name: { type: 'string' },
          total_volume: { type: 'number' },
          total_pnl: { type: 'number' },
          total_roi: { type: 'number' },
          win_rate: { type: 'number' },
          sharpe_ratio: { type: 'number' },
          active_positions_count: { type: 'integer' },
          total_trades: { type: 'integer' },
          first_seen_at: { type: 'integer' },
          last_activity_at: { type: 'integer' },
          is_active: { type: 'boolean' },
          tracking_enabled: { type: 'boolean' },
          created_at: { type: 'integer' },
          updated_at: { type: 'integer' }
        }
      },
      Trade: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          wallet_address: { type: 'string' },
          condition_id: { type: 'string' },
          outcome_index: { type: 'integer' },
          side: { type: 'string', enum: ['BUY', 'SELL'] },
          size: { type: 'number' },
          price: { type: 'number' },
          value: { type: 'number' },
          fee: { type: 'number' },
          executed_at: { type: 'integer' }
        }
      },
      Position: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          wallet_address: { type: 'string' },
          condition_id: { type: 'string' },
          outcome_index: { type: 'integer' },
          size: { type: 'number' },
          entry_price: { type: 'number' },
          current_value: { type: 'number' },
          pnl: { type: 'number' },
          roi: { type: 'number' },
          opened_at: { type: 'integer' },
          last_updated_at: { type: 'integer' }
        }
      },
      Metrics: {
        type: 'object',
        properties: {
          wallet_address: { type: 'string' },
          timeframe: { type: 'string' },
          roi: { type: 'number' },
          pnl: { type: 'number' },
          win_rate: { type: 'number' },
          sharpe_ratio: { type: 'number' },
          max_drawdown: { type: 'number' },
          trades_count: { type: 'integer' },
          winning_trades: { type: 'integer' },
          losing_trades: { type: 'integer' }
        }
      },
      Event: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          wallet_address: { type: 'string' },
          event_type: { type: 'string' },
          severity: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'] },
          data: { type: 'object' },
          created_at: { type: 'integer' }
        }
      },
      Market: {
        type: 'object',
        properties: {
          condition_id: { type: 'string' },
          market_slug: { type: 'string' },
          question: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          end_date: { type: 'integer' },
          is_active: { type: 'boolean' },
          total_volume: { type: 'number' },
          total_liquidity: { type: 'number' },
          outcomes: { type: 'array', items: { type: 'string' } }
        }
      },
      Snapshot: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          condition_id: { type: 'string' },
          outcome_index: { type: 'integer' },
          price: { type: 'number' },
          volume_24h: { type: 'number' },
          liquidity: { type: 'number' },
          snapshot_at: { type: 'integer' }
        }
      }
    }
  }
}
