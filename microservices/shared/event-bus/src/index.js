// Event Bus using RabbitMQ for Microservices Communication
const amqp = require('amqplib');

class EventBus {
  constructor(config = {}) {
    this.connection = null;
    this.channel = null;
    this.config = {
      host: config.host || process.env.RABBITMQ_HOST || 'localhost',
      port: config.port || process.env.RABBITMQ_PORT || 5672,
      user: config.user || process.env.RABBITMQ_USER || 'admin',
      password: config.password || process.env.RABBITMQ_PASSWORD || 'rabbitmq123',
      vhost: config.vhost || '/',
      exchange: config.exchange || 'dubaomatrung_events',
      exchangeType: config.exchangeType || 'topic'
    };
    this.subscribers = new Map();
  }

  /**
   * Connect to RabbitMQ
   */
  async connect() {
    try {
      const { host, port, user, password, vhost } = this.config;
      const url = `amqp://${user}:${password}@${host}:${port}${vhost}`;

      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();

      // Assert exchange
      await this.channel.assertExchange(
        this.config.exchange,
        this.config.exchangeType,
        { durable: true }
      );

      console.log(`✅ Connected to RabbitMQ at ${host}:${port}`);

      // Handle connection events
      this.connection.on('error', (err) => {
        console.error('RabbitMQ connection error:', err);
      });

      this.connection.on('close', () => {
        console.warn('RabbitMQ connection closed');
        setTimeout(() => this.connect(), 5000); // Reconnect after 5s
      });

      return this;
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  /**
   * Publish an event
   * @param {string} routingKey - Event routing key (e.g., 'user.created', 'report.generated')
   * @param {object} data - Event payload
   * @param {object} options - Additional options
   */
  async publish(routingKey, data, options = {}) {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ. Call connect() first.');
    }

    try {
      const message = JSON.stringify({
        eventId: this.generateEventId(),
        timestamp: new Date().toISOString(),
        routingKey,
        data
      });

      const published = this.channel.publish(
        this.config.exchange,
        routingKey,
        Buffer.from(message),
        {
          persistent: true,
          contentType: 'application/json',
          ...options
        }
      );

      if (!published) {
        console.warn(`Failed to publish event: ${routingKey}`);
      }

      console.log(`📤 Published event: ${routingKey}`);
      return published;
    } catch (error) {
      console.error(`Error publishing event ${routingKey}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to events
   * @param {string} queueName - Queue name for this subscriber
   * @param {string|string[]} patterns - Routing key pattern(s) to subscribe to
   * @param {function} handler - Message handler function
   * @param {object} options - Queue options
   */
  async subscribe(queueName, patterns, handler, options = {}) {
    if (!this.channel) {
      throw new Error('Not connected to RabbitMQ. Call connect() first.');
    }

    try {
      // Assert queue
      await this.channel.assertQueue(queueName, {
        durable: true,
        ...options
      });

      // Bind queue to exchange with patterns
      const patternArray = Array.isArray(patterns) ? patterns : [patterns];
      for (const pattern of patternArray) {
        await this.channel.bindQueue(queueName, this.config.exchange, pattern);
        console.log(`🔗 Bound queue "${queueName}" to pattern "${pattern}"`);
      }

      // Consume messages
      await this.channel.consume(
        queueName,
        async (msg) => {
          if (msg) {
            try {
              const content = JSON.parse(msg.content.toString());
              console.log(`📥 Received event: ${content.routingKey}`);

              await handler(content, msg);

              // Acknowledge message
              this.channel.ack(msg);
            } catch (error) {
              console.error('Error processing message:', error);
              // Reject and requeue message on error
              this.channel.nack(msg, false, true);
            }
          }
        },
        { noAck: false }
      );

      this.subscribers.set(queueName, { patterns: patternArray, handler });
      console.log(`✅ Subscribed to queue: ${queueName}`);

      return this;
    } catch (error) {
      console.error(`Error subscribing to queue ${queueName}:`, error);
      throw error;
    }
  }

  /**
   * Close connection
   */
  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      console.log('🔌 Disconnected from RabbitMQ');
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
    }
  }

  /**
   * Generate unique event ID
   */
  generateEventId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Event names constants
const Events = {
  // User events
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',

  // Auth events
  USER_LOGGED_IN: 'auth.logged_in',
  USER_LOGGED_OUT: 'auth.logged_out',

  // Report events
  REPORT_CREATED: 'report.created',
  REPORT_GENERATED: 'report.generated',
  REPORT_FAILED: 'report.failed',

  // GIS events
  SHAPEFILE_IMPORTED: 'gis.shapefile.imported',
  LAYER_CREATED: 'gis.layer.created',
  DATA_VERIFIED: 'gis.data.verified',

  // Admin events
  ADMIN_ACTION: 'admin.action',
  CACHE_INVALIDATED: 'cache.invalidated'
};

module.exports = {
  EventBus,
  Events
};
