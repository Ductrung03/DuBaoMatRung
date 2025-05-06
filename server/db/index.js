const { Pool } = require("pg");
const { db } = require("../config/env");

const pool = new Pool({
  host: db.host,
  port: db.port,
  user: db.user,
  password: db.password,
  database: db.database,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: {
    rejectUnauthorized: false // Quan trọng để kết nối SSL
  }
});

module.exports = pool;