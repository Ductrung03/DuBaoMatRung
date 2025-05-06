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
  ssl: {
    rejectUnauthorized: false, // ✅ Bắt buộc với Render PostgreSQL
  },
});


// Bắt sự kiện lỗi
pool.on('error', (err, client) => {
  console.error('🔴 Lỗi không mong muốn trên client:', err);
});

// Bắt sự kiện kết nối
pool.on('connect', () => {
  console.log('🟢 Đã kết nối đến PostgreSQL!');
});

module.exports = pool;