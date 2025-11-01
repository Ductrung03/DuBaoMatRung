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
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
  });

  return new Kysely({
    dialect
  });
}

module.exports = { createKyselyAdminDb };
