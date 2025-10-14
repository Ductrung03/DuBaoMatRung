// Swagger/OpenAPI Documentation Configuration
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DuBaoMatRung API Gateway',
      version: '1.0.0',
      description: 'API Gateway for DuBaoMatRung Forest Monitoring Microservices',
      contact: {
        name: 'LuckyBoiz Team',
        email: 'support@dubaomatrung.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      },
      {
        url: 'https://staging-api.dubaomatrung.com',
        description: 'Staging server'
      },
      {
        url: 'https://api.dubaomatrung.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization header using the Bearer scheme'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Error message'
            },
            error: {
              type: 'string'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1
            },
            username: {
              type: 'string',
              example: 'admin'
            },
            email: {
              type: 'string',
              example: 'admin@dubaomatrung.com'
            },
            role: {
              type: 'string',
              enum: ['admin', 'user', 'viewer'],
              example: 'admin'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['username', 'password'],
          properties: {
            username: {
              type: 'string',
              example: 'admin'
            },
            password: {
              type: 'string',
              example: 'admin123'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            token: {
              type: 'string',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            },
            user: {
              $ref: '#/components/schemas/User'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Health',
        description: 'Health check endpoints'
      },
      {
        name: 'Authentication',
        description: 'Authentication & Authorization operations'
      },
      {
        name: 'Users',
        description: 'User management operations'
      },
      {
        name: 'GIS',
        description: 'Geographic Information System operations'
      },
      {
        name: 'Reports',
        description: 'Report generation and management'
      },
      {
        name: 'Admin',
        description: 'Administrative operations'
      },
      {
        name: 'Search',
        description: 'Search operations'
      }
    ],
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Health check',
          description: 'Check if API Gateway is running',
          responses: {
            '200': {
              description: 'Gateway is healthy',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        example: 'OK'
                      },
                      service: {
                        type: 'string',
                        example: 'API Gateway'
                      },
                      timestamp: {
                        type: 'string',
                        format: 'date-time'
                      },
                      uptime: {
                        type: 'number',
                        example: 12345.67
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/ready': {
        get: {
          tags: ['Health'],
          summary: 'Readiness check',
          description: 'Check if all downstream services are configured',
          responses: {
            '200': {
              description: 'Services are ready',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: {
                        type: 'string',
                        example: 'READY'
                      },
                      services: {
                        type: 'object'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/auth/login': {
        post: {
          tags: ['Authentication'],
          summary: 'User login',
          description: 'Authenticate user and receive JWT token',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/LoginRequest'
                }
              }
            }
          },
          responses: {
            '200': {
              description: 'Login successful',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/LoginResponse'
                  }
                }
              }
            },
            '401': {
              description: 'Invalid credentials',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/auth/me': {
        get: {
          tags: ['Authentication'],
          summary: 'Get current user',
          description: 'Get authenticated user information',
          security: [
            {
              bearerAuth: []
            }
          ],
          responses: {
            '200': {
              description: 'User information retrieved',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/User'
                  }
                }
              }
            },
            '401': {
              description: 'Unauthorized',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/Error'
                  }
                }
              }
            }
          }
        }
      },
      '/api/users': {
        get: {
          tags: ['Users'],
          summary: 'List users',
          description: 'Get list of all users (requires authentication)',
          security: [
            {
              bearerAuth: []
            }
          ],
          responses: {
            '200': {
              description: 'Users list retrieved',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      $ref: '#/components/schemas/User'
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/mat-rung': {
        get: {
          tags: ['GIS'],
          summary: 'Get forest loss data',
          description: 'Retrieve forest deforestation data',
          parameters: [
            {
              name: 'region',
              in: 'query',
              schema: {
                type: 'string'
              },
              description: 'Region filter'
            }
          ],
          responses: {
            '200': {
              description: 'Forest data retrieved'
            }
          }
        }
      },
      '/api/bao-cao': {
        post: {
          tags: ['Reports'],
          summary: 'Generate report',
          description: 'Generate PDF report (requires authentication)',
          security: [
            {
              bearerAuth: []
            }
          ],
          responses: {
            '200': {
              description: 'Report generated successfully'
            }
          }
        }
      },
      '/api/layer-data/{layerName}': {
        get: {
          tags: ['GIS'],
          summary: 'Get layer data',
          description: 'Retrieve GIS layer data by layer name',
          parameters: [
            {
              name: 'layerName',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                enum: ['administrative', 'forest-management', 'terrain', 'deforestation-alerts']
              },
              description: 'Layer name to retrieve'
            }
          ],
          responses: {
            '200': {
              description: 'Layer data retrieved successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        example: true
                      },
                      data: {
                        type: 'object',
                        description: 'GeoJSON data'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      '/api/dropdown/{type}': {
        get: {
          tags: ['Admin'],
          summary: 'Get dropdown data',
          description: 'Retrieve dropdown data for forms',
          parameters: [
            {
              name: 'type',
              in: 'path',
              required: true,
              schema: {
                type: 'string',
                enum: ['provinces', 'districts', 'communes']
              }
            }
          ],
          responses: {
            '200': {
              description: 'Dropdown data retrieved',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        example: true
                      },
                      data: {
                        type: 'array',
                        items: {
                          type: 'object'
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
      '/api/search': {
        get: {
          tags: ['Search'],
          summary: 'Search forest data',
          description: 'Search across forest loss detection data',
          parameters: [
            {
              name: 'q',
              in: 'query',
              required: true,
              schema: {
                type: 'string'
              },
              description: 'Search query string'
            },
            {
              name: 'type',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['location', 'date', 'all'],
                default: 'all'
              },
              description: 'Type of search to perform'
            }
          ],
          responses: {
            '200': {
              description: 'Search results',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: {
                        type: 'boolean',
                        example: true
                      },
                      results: {
                        type: 'array',
                        items: {
                          type: 'object'
                        }
                      },
                      count: {
                        type: 'integer'
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
  apis: ['./src/routes/*.js', './src/index.js']
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
