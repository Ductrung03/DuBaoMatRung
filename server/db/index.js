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
  
  // Tối ưu để xử lý queries lớn
  max: 20, // Tăng số connection tối đa
  idleTimeoutMillis: 30000, // 30 giây
  connectionTimeoutMillis: 10000, // 10 giây để establish connection
  query_timeout: 60000, // 60 giây timeout cho queries lớn
  statement_timeout: 60000, // 60 giây timeout cho statements
  
  // Tối ưu pool behavior
  acquireTimeoutMillis: 10000,
  createTimeoutMillis: 10000,
  destroyTimeoutMillis: 5000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 100,
});

// Bắt sự kiện lỗi
pool.on('error', (err, client) => {
  console.error('🔴 Lỗi không mong muốn trên client:', err);
});

// Bắt sự kiện kết nối
pool.on('connect', (client) => {
  console.log('🟢 Đã kết nối đến PostgreSQL!');
  
  // Set timeout cho session này
  client.query(`SET statement_timeout = '60s'`);
  client.query(`SET lock_timeout = '30s'`);
});

pool.on('acquire', () => {
  console.log('📥 Client được lấy từ pool');
});

pool.on('remove', () => {
  console.log('📤 Client được remove khỏi pool');
});

module.exports = pool;