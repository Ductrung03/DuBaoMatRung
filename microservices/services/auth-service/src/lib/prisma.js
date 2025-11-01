// auth-service/src/lib/prisma.js
const { PrismaClient } = require('@prisma/client');
const createLogger = require('../../../../shared/logger');

const logger = createLogger('prisma-client');

// Tạo Prisma Client instance
const prisma = new PrismaClient({
  log: [
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' },
  ],
});

// Log các sự kiện
prisma.$on('warn', (e) => {
  logger.warn('Prisma warning', { message: e.message });
});

prisma.$on('error', (e) => {
  logger.error('Prisma error', { message: e.message });
});

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = prisma;
