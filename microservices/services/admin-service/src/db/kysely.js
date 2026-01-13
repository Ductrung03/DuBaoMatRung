// admin-service/src/db/kysely.js
// Kysely Query Builder initialization for Admin database

const { Kysely, PostgresDialect } = require('kysely');
const { Pool } = require('pg');

/**
 * Create Kysely instance for Admin database
 * @param {string} connectionString - PostgreSQL connection string
 * @returns {Kysely} Kysely instance
 */
function createKyselyAdminDb(connectionString) {
  const dialect = new PostgresDialect({
    pool: new Pool({
      connectionString: connectionString || process.env.ADMIN_DATABASE_URL,
      max: 30,                         // Tăng từ 10 → 30 để handle nhiều concurrent requests
      idleTimeoutMillis: 60000,        // Tăng từ 30s → 60s
      connectionTimeoutMillis: 15000,  // Tăng từ 5s → 15s để tránh timeout
    })
  });

  return new Kysely({
    dialect
  });
}

module.exports = { createKyselyAdminDb };
