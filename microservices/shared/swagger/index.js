// shared/swagger/index.js - Swagger Configuration
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

/**
 * Create Swagger configuration for a service
 * @param {string} serviceName - Name of the service
 * @param {string} serviceDescription - Description of the service
 * @param {number} port - Port number the service runs on
 * @param {Array<string>} routePaths - Array of paths to route files to scan for JSDoc
 * @returns {Object} - Swagger configuration object
 */
const createSwaggerConfig = (serviceName, serviceDescription, port, routePaths = []) => {
  const options = {
    definition: {
      openapi: '3.0.0',
      info: {
        title: `${serviceName} API`,
        version: '1.0.0',
        description: serviceDescription,
        contact: {
          name: 'DuBaoMatRung Team',
          email: 'support@dubaomatrung.vn'
        }
      },
      servers: [
        {
          url: `http://localhost:${port}`,
          description: 'Development server (direct)'
        },
        {
          url: 'http://localhost:3000',
          description: 'Development server (via Gateway)'
        }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Enter JWT token obtained from /api/auth/login'
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
                type: 'string',
                example: 'Detailed error information'
              }
            }
          },
          SuccessResponse: {
            type: 'object',
            properties: {
              success: {
                type: 'boolean',
                example: true
              },
              message: {
                type: 'string',
                example: 'Operation successful'
              }
            }
          }
        }
      },
      security: []
    },
    apis: routePaths
  };

  return swaggerJsdoc(options);
};

/**
 * Setup Swagger UI for a service
 * @param {Object} app - Express app instance
 * @param {Object} swaggerSpec - Swagger specification object
 * @param {string} path - Path to serve swagger UI (default: /api-docs)
 */
const setupSwagger = (app, swaggerSpec, path = '/api-docs') => {
  // Serve swagger UI
  app.use(path, swaggerUi.serve);
  app.get(path, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'DuBaoMatRung API Documentation',
    customfavIcon: '/favicon.ico'
  }));

  // Serve swagger spec as JSON
  app.get(`${path}.json`, (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};

module.exports = {
  createSwaggerConfig,
  setupSwagger
};
