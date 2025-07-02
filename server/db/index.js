const { Pool } = require("pg");
const { db } = require("../config/env");

console.log("📌 Cấu hình kết nối DB:", {
  host: db.host,
  port: db.port,
  database: db.database,
  user: db.user,
  // Không log password
});

const pool = new Pool({
  host: db.host,
  port: db.port,
  user: db.user,
  password: db.password,
  database: db.database,
  ssl: false,
  
  // FIXED: Tối ưu để xử lý queries lớn và tránh lỗi config
  max: 15, // Giảm số connection để tránh overwhelm database
  idleTimeoutMillis: 30000, // 30 giây
  connectionTimeoutMillis: 15000, // 15 giây để establish connection  
  
  // IMPORTANT: Remove query timeout để tránh conflict với large datasets
  // query_timeout: 60000, // Commented out
  // statement_timeout: 60000, // Commented out
  
  // Pool management tối ưu
  acquireTimeoutMillis: 15000,
  createTimeoutMillis: 15000,
  destroyTimeoutMillis: 5000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 100,
  
  // Application name để debug
  application_name: 'dubaomatrung_backend'
});

// Enhanced error handling
pool.on('error', (err, client) => {
  console.error('🔴 Unexpected error on idle client:', {
    message: err.message,
    code: err.code,
    severity: err.severity
  });
  
  // Log specific database errors
  if (err.code === '55P02') {
    console.error('💀 Configuration parameter error - server restart may be required');
  } else if (err.code === '25P02') {
    console.error('💀 Transaction aborted - will be handled in application');
  } else if (err.code === '57P01') {
    console.error('💀 Database connection lost - pool will reconnect');
  }
});

// Enhanced connection event logging
pool.on('connect', async (client) => {
  console.log('🟢 New client connected to PostgreSQL!');
  
  try {
    // Set reasonable defaults without conflicting configurations
    await client.query(`SET application_name = 'dubaomatrung_backend'`);
    await client.query(`SET statement_timeout = '120s'`); // 2 minutes for large queries
    await client.query(`SET lock_timeout = '30s'`);
    await client.query(`SET idle_in_transaction_session_timeout = '60s'`);
    
    // REMOVED: work_mem and shared_buffers settings to avoid conflicts
    // These will be set per-session in the controller if needed
    
    console.log('✅ Client session configured successfully');
  } catch (configError) {
    console.warn('⚠️ Could not set some session parameters:', configError.message);
    // Don't throw - let the connection be used anyway
  }
});

pool.on('acquire', () => {
  console.log('📥 Client acquired from pool (Active: ' + pool.totalCount + '/' + pool.options.max + ')');
});

pool.on('remove', () => {
  console.log('📤 Client removed from pool (Active: ' + pool.totalCount + '/' + pool.options.max + ')');
});

// Test initial connection
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW(), current_database(), version()');
    console.log('✅ Database connection test successful:', {
      timestamp: result.rows[0].now,
      database: result.rows[0].current_database,
      version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]
    });
    client.release();
  } catch (error) {
    console.error('❌ Database connection test failed:', {
      message: error.message,
      code: error.code,
      hint: error.hint || 'Check database server and credentials'
    });
  }
};

// Test connection when module loads
testConnection();

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log('📴 Received SIGINT, closing database pool...');
  await pool.end();
  console.log('🔌 Database pool closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('📴 Received SIGTERM, closing database pool...');
  await pool.end();
  console.log('🔌 Database pool closed');
  process.exit(0);
});

// Export enhanced pool with utilities
module.exports = pool;