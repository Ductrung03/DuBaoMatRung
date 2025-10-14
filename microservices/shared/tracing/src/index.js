// Distributed Tracing with OpenTelemetry and Jaeger
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

/**
 * Initialize OpenTelemetry tracing for a microservice
 * @param {string} serviceName - Name of the microservice
 * @param {object} config - Configuration options
 */
function initTracing(serviceName, config = {}) {
  const {
    jaegerHost = process.env.JAEGER_AGENT_HOST || 'localhost',
    jaegerPort = process.env.JAEGER_AGENT_PORT || 6831,
    environment = process.env.NODE_ENV || 'development'
  } = config;

  // Create Jaeger exporter
  const jaegerExporter = new JaegerExporter({
    agentHost: jaegerHost,
    agentPort: parseInt(jaegerPort),
  });

  // Configure SDK
  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
      'service.version': process.env.npm_package_version || '1.0.0',
    }),
    traceExporter: jaegerExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Auto-instrument HTTP, Express, PostgreSQL, Redis, etc.
        '@opentelemetry/instrumentation-http': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-express': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-pg': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-redis': {
          enabled: true,
        },
      }),
    ],
  });

  // Start SDK
  sdk.start();

  console.log(`🔍 Tracing initialized for service: ${serviceName}`);
  console.log(`   Jaeger endpoint: ${jaegerHost}:${jaegerPort}`);

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('Tracing terminated'))
      .catch((error) => console.log('Error terminating tracing', error))
      .finally(() => process.exit(0));
  });

  return sdk;
}

module.exports = {
  initTracing,
};
