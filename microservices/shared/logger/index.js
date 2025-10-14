// shared/logger/index.js - Centralized Winston Logger
const winston = require('winston');
const path = require('path');

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    let msg = `${timestamp} [${service || 'APP'}] ${level}: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger instance
const createLogger = (serviceName) => {
  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    defaultMeta: { service: serviceName },
    transports: [
      // Console transport
      new winston.transports.Console({
        format: process.env.NODE_ENV === 'production' ? logFormat : consoleFormat
      }),

      // File transport for errors
      new winston.transports.File({
        filename: path.join(process.env.LOG_DIR || './logs', `${serviceName}-error.log`),
        level: 'error',
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5
      }),

      // File transport for all logs
      new winston.transports.File({
        filename: path.join(process.env.LOG_DIR || './logs', `${serviceName}-combined.log`),
        format: logFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5
      })
    ],

    // Handle exceptions and rejections
    exceptionHandlers: [
      new winston.transports.File({
        filename: path.join(process.env.LOG_DIR || './logs', `${serviceName}-exceptions.log`)
      })
    ],
    rejectionHandlers: [
      new winston.transports.File({
        filename: path.join(process.env.LOG_DIR || './logs', `${serviceName}-rejections.log`)
      })
    ]
  });

  // Add stream for Morgan HTTP logging
  logger.stream = {
    write: (message) => {
      logger.info(message.trim());
    }
  };

  return logger;
};

module.exports = createLogger;
