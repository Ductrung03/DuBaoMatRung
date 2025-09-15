// server/server.js - FIXED CORS CONFIGURATION
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const pool = require("./db/index");
const cookieParser = require("cookie-parser");

// Import CSP middleware
const setCspHeaders = require("./middleware/csp.middleware");

const hanhchinhRoutes = require("./routes/hanhchinh.route");
const shapefileRoutes = require("./routes/shapefile.route");
const importGeeUrlRoutes = require("./routes/importGeeUrl.route");
const matRungRoutes = require("./routes/matrung.route");
const dataDropdownRoutes = require("./routes/dataDropdown.routes");
const quanlydulieu = require("./routes/quanLyDuLieu.routes");
const baocao = require("./routes/baocao.routes");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const dataRoutes = require("./routes/data.routes");
const layerDataRoutes = require("./routes/layerData.routes");
const verificationRoutes = require("./routes/verification.routes");
const searchRoutes = require("./routes/searchMatRung.routes");
require("dotenv").config();

// Log biến môi trường khi khởi động
console.log("🔄 Thông tin môi trường:");
console.log(`- PGHOST: ${process.env.PGHOST ? "***" : "không có"}`);
console.log(`- PGPORT: ${process.env.PGPORT ? "***" : "không có"}`);
console.log(`- PGUSER: ${process.env.PGUSER ? "***" : "không có"}`);
console.log(`- PGPASSWORD: ${process.env.PGPASSWORD ? "***" : "không có"}`);
console.log(`- PGDATABASE: ${process.env.PGDATABASE ? "***" : "không có"}`);
console.log(`- GEOSERVER_USER: ${process.env.GEOSERVER_USER ? "***" : "không có"}`);
console.log(`- GEOSERVER_PASS: ${process.env.GEOSERVER_PASS ? "***" : "không có"}`);
console.log(`- JWT_SECRET: ${process.env.JWT_SECRET ? "***" : "sử dụng secret mặc định"}`);

// Kiểm tra kết nối database ngay khi khởi động
pool
  .query("SELECT NOW()")
  .then((result) => {
    console.log("✅ Kết nối database thành công:", result.rows[0].now);
  })
  .catch((err) => {
    console.error("❌ Lỗi kết nối database:", err.message);
    console.error("Chi tiết lỗi:", err);
  });

const app = express();

// Swagger
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerOptions = require("./swaggerOptions");
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// MIDDLEWARE ORDER IS CRITICAL
// 1. First apply CSP headers
app.use(setCspHeaders);

// 2. Then configure CORS with ALL required headers
// Cập nhật phần CORS trong server.js
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000', 
    'http://localhost:4173',
    'https://dubaomatrung-frontend.onrender.com',
    // ✅ THÊM IP ĐÚNG CỦA SERVER
    'http://103.56.161.239',           // ← Server IP
    'http://103.56.161.239:5173',      // ← Frontend URL
    'http://103.56.161.239:3000',      // ← Backend URL
    'http://103.56.161.239:4173',
    'http://103.56.161.239:8080',
    // ✅ Thêm HTTPS
    'https://103.56.161.239',
    'https://103.56.161.239:5173',
    // Google Earth Engine
    'https://earthengine.googleapis.com',
    'https://ee-phathiensommatrung.projects.earthengine.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Origin', 
    'X-Requested-With', 
    'Content-Type', 
    'Accept', 
    'Authorization',
    'Cache-Control',
    'Pragma',
    'Expires'
  ],
  optionsSuccessStatus: 200
}));

// 3. Handle preflight requests explicitly
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin,X-Requested-With,Content-Type,Accept,Authorization,Cache-Control,Pragma,Expires,If-Modified-Since,If-None-Match,X-Cache-Control');
  res.header('Access-Control-Expose-Headers', 'Cache-Control,ETag,Last-Modified,X-Cache-Status');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

app.use(express.json({ limit: '50mb' })); // Tăng limit cho large data
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Enhanced logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const userAgent = req.get('User-Agent');
  const referer = req.get('Referer');
  
  console.log(`📝 [${timestamp}] ${req.method} ${req.url}`);
  
  // Log headers for CORS debugging
  if (req.method === 'OPTIONS') {
    console.log(`🔧 CORS Preflight for: ${req.url}`);
    console.log(`   Origin: ${req.get('Origin')}`);
    console.log(`   Headers: ${req.get('Access-Control-Request-Headers')}`);
  }
  
  // Log thêm thông tin cho Google Earth Engine requests
  if (req.url.includes('earth') || req.url.includes('gee') || req.headers['sec-fetch-dest'] === 'iframe') {
    console.log(`🌍 Earth Engine related request detected`);
    console.log(`   User-Agent: ${userAgent ? userAgent.substring(0, 100) + '...' : 'N/A'}`);
    console.log(`   Referer: ${referer || 'N/A'}`);
  }
  
  next();
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/data", dataRoutes);
app.use("/api/import-shapefile", shapefileRoutes);
app.use("/api/import-gee-url", importGeeUrlRoutes);
app.use("/api/hanhchinh", hanhchinhRoutes);
app.use("/api/mat-rung", matRungRoutes);
app.use("/api/dropdown", dataDropdownRoutes);
app.use("/api/quan-ly-du-lieu", quanlydulieu);
app.use("/api/bao-cao", baocao);
app.use("/api/layer-data", layerDataRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/verification", verificationRoutes);

app.post("/api/emergency/fix-token", async (req, res) => {
  try {
    console.log("🚨 Emergency token fix requested");
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(400).json({
        success: false,
        message: "Cần có token cũ để fix"
      });
    }

    const oldToken = authHeader.split(" ")[1];
    
    // Decode token cũ để lấy user info (không verify)
    let oldPayload;
    try {
      oldPayload = jwt.decode(oldToken);
      console.log("📋 Old token payload:", oldPayload);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: "Token cũ không đúng định dạng"
      });
    }

    if (!oldPayload || !oldPayload.id) {
      return res.status(400).json({
        success: false,
        message: "Token cũ không có thông tin user"
      });
    }

    // Lấy thông tin user từ database
    const userResult = await pool.query(
      "SELECT * FROM users WHERE id = $1 AND is_active = TRUE",
      [oldPayload.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User không tồn tại hoặc đã bị vô hiệu hóa"
      });
    }

    const user = userResult.rows[0];
    console.log(`✅ User found for fix: ${user.username}`);

    // Tạo token mới với secret đúng
    const JWT_SECRET = process.env.JWT_SECRET || "dubaomatrung_secret_key_change_this_in_production";
    
    const newTokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role.toLowerCase(), // Fix role
      full_name: user.full_name,
      iat: Math.floor(Date.now() / 1000)
    };

    const newToken = jwt.sign(newTokenPayload, JWT_SECRET, { expiresIn: "24h" });
    
    console.log(`🎟️ New token created for emergency fix: ${user.username}`);

    // Verify token mới ngay
    try {
      const verified = jwt.verify(newToken, JWT_SECRET);
      console.log(`✅ New token verification successful`);
    } catch (verifyErr) {
      console.log(`❌ New token verification failed: ${verifyErr.message}`);
      return res.status(500).json({
        success: false,
        message: "Lỗi tạo token mới"
      });
    }

    // Cập nhật last_login
    await pool.query(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1",
      [user.id]
    );

    const { password_hash, ...userWithoutPassword } = user;
    userWithoutPassword.role = userWithoutPassword.role.toLowerCase();

    res.json({
      success: true,
      message: "✅ Đã tạo token mới thành công!",
      token: newToken,
      user: userWithoutPassword,
      fix_info: {
        old_token_preview: oldToken.substring(0, 30) + '...',
        new_token_preview: newToken.substring(0, 30) + '...',
        role_fixed: oldPayload.role + ' → ' + newTokenPayload.role,
        secret_used: JWT_SECRET.substring(0, 10) + '...'
      }
    });

  } catch (err) {
    console.error("❌ Emergency fix error:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi khi fix token",
      error: err.message
    });
  }
});

// ✅ TEST ROUTE để check token hiện tại
app.get("/api/test-current-token", async (req, res) => {
  const JWT_SECRETS = [
    process.env.JWT_SECRET || "dubaomatrung_secret_key_change_this_in_production",
    "dubaomatrung_jwt_secret",
    "your_jwt_secret_key"
  ];

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.json({
      success: false,
      message: "Không có token"
    });
  }

  const token = authHeader.split(" ")[1];
  const payload = jwt.decode(token);

  let verificationResults = [];
  
  for (let i = 0; i < JWT_SECRETS.length; i++) {
    try {
      const verified = jwt.verify(token, JWT_SECRETS[i]);
      verificationResults.push({
        secret_index: i,
        secret_preview: JWT_SECRETS[i].substring(0, 10) + '...',
        status: 'SUCCESS',
        verified_payload: verified
      });
      break;
    } catch (err) {
      verificationResults.push({
        secret_index: i,
        secret_preview: JWT_SECRETS[i].substring(0, 10) + '...',
        status: 'FAILED',
        error: err.message
      });
    }
  }

  res.json({
    token_info: {
      decoded_payload: payload,
      verification_results: verificationResults,
      overall_status: verificationResults.some(r => r.status === 'SUCCESS') ? 'VALID' : 'INVALID'
    },
    fix_suggestion: verificationResults.every(r => r.status === 'FAILED') 
      ? "POST /api/emergency/fix-token với Authorization header"
      : "Token hợp lệ"
  });
});
app.get("/api/debug/jwt", (req, res) => {
  const JWT_SECRET = process.env.JWT_SECRET || "dubaomatrung_secret_key_change_this_in_production";
  
  // Lấy token từ header nếu có
  const authHeader = req.headers.authorization;
  let tokenInfo = null;
  
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    
    try {
      // Decode without verification để xem payload
      const decoded = require('jsonwebtoken').decode(token);
      tokenInfo = {
        valid: false,
        payload: decoded,
        token_preview: token.substring(0, 50) + '...',
        error: null
      };
      
      // Thử verify
      const verified = require('jsonwebtoken').verify(token, JWT_SECRET);
      tokenInfo.valid = true;
      tokenInfo.verified_payload = verified;
      
    } catch (err) {
      tokenInfo.error = err.message;
    }
  }
  
  res.json({
    server_info: {
      jwt_secret_configured: !!process.env.JWT_SECRET,
      jwt_secret_length: JWT_SECRET.length,
      jwt_secret_preview: JWT_SECRET.substring(0, 10) + '...',
      node_env: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    },
    token_info: tokenInfo,
    instructions: {
      if_invalid_signature: [
        "1. Clear browser localStorage",
        "2. Login again to get new token", 
        "3. New token will be created with current JWT_SECRET"
      ],
      test_login: "POST /api/auth/login with admin/Admin@123#./",
      test_protected: "GET /api/auth/me with Authorization header"
    }
  });
});

// ✅ TEST ENDPOINT để verify token cụ thể
app.post("/api/debug/verify-token", (req, res) => {
  const { token } = req.body;
  const JWT_SECRET = process.env.JWT_SECRET || "dubaomatrung_secret_key_change_this_in_production";
  
  if (!token) {
    return res.status(400).json({
      success: false,
      message: "Please provide token in request body"
    });
  }
  
  try {
    // Decode first
    const decoded = require('jsonwebtoken').decode(token);
    console.log("📋 Token payload:", decoded);
    
    // Then verify
    const verified = require('jsonwebtoken').verify(token, JWT_SECRET);
    console.log("✅ Token verification successful");
    
    res.json({
      success: true,
      message: "Token is valid",
      payload: verified,
      decoded: decoded,
      server_secret_length: JWT_SECRET.length
    });
    
  } catch (err) {
    console.log("❌ Token verification failed:", err.message);
    
    res.status(401).json({
      success: false,
      message: "Token verification failed",
      error: err.message,
      error_type: err.name,
      server_secret_length: JWT_SECRET.length,
      suggestions: [
        "Check if token was created with same JWT_SECRET",
        "Try logging in again to get new token",
        "Clear browser localStorage and login again"
      ]
    });
  }
});
// Test routes
app.get("/api/test", (req, res) => {
  res.json({ 
    message: "API đang hoạt động!",
    csp_enabled: true,
    earth_engine_support: true,
    cors_fixed: true
  });
});

app.get("/api/test-db", async (req, res) => {
  try {
    console.log("👉 Đang thực hiện test kết nối database...");
    const result = await pool.query("SELECT NOW()");
    console.log("✅ Test kết nối thành công:", result.rows[0].now);
    res.json({
      success: true,
      message: "Kết nối database thành công",
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    console.error("❌ Test kết nối thất bại:", error.message);
    console.error("Chi tiết lỗi:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi kết nối database",
      error: error.message,
    });
  }
});

// Test Google Earth Engine iframe embedding
app.get("/api/test-iframe", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Test Google Earth Engine Iframe</title>
      <meta charset="utf-8">
    </head>
    <body>
      <h1>Test Google Earth Engine Iframe</h1>
      <iframe 
        src="https://ee-phathiensommatrung.projects.earthengine.app/view/phantichmatrung"
        width="100%"
        height="600"
        frameborder="0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
      ></iframe>
    </body>
    </html>
  `);
});

app.get("/", (req, res) => {
  res.send(`
    <h1>✅ Backend Geo API đang hoạt động</h1>
    <p>🌍 Google Earth Engine iframe support enabled</p>
    <p>🔒 Content Security Policy configured</p>
    <p>🔧 CORS headers fixed for Cache-Control</p>
    <p>📚 <a href="/api-docs">API Documentation</a></p>
    <p>🧪 <a href="/api/test-iframe">Test Iframe Embedding</a></p>
  `);
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error("🔴 Lỗi server:", err);
  
  // Log thêm thông tin cho iframe/CSP related errors
  if (err.message.includes('CSP') || err.message.includes('iframe') || err.message.includes('frame')) {
    console.error("🖼️ Iframe/CSP related error detected");
    console.error("Headers:", req.headers);
  }
  
  // Log CORS related errors
  if (err.message.includes('CORS') || err.message.includes('origin')) {
    console.error("🔧 CORS related error detected");
    console.error("Origin:", req.headers.origin);
    console.error("Headers:", req.headers);
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? "Lỗi server" : err.message,
    error: process.env.NODE_ENV === 'production' ? {} : err,
    timestamp: new Date().toISOString()
  });
});

// Enhanced 404 middleware
app.use((req, res) => {
  const timestamp = new Date().toISOString();
  console.log(`❌ [${timestamp}] 404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: "API endpoint không tồn tại",
    path: req.url,
    method: req.method,
    timestamp
  });
});

const port = process.env.PORT || 3000;

// Hàm async để xử lý dynamic import
const startServer = async () => {
  app.listen(port, '0.0.0.0', async () => {  // Thêm '0.0.0.0' ở đây
    console.log(`🚀 Backend chạy tại http://0.0.0.0:${port}`);
    console.log(`🌐 Truy cập công khai tại http://103.57.223.237:${port}`);
    console.log(`📚 API Docs tại http://103.57.223.237:${port}/api-docs`);
    console.log(`🧪 Test Iframe tại http://103.57.223.237:${port}/api/test-iframe`);
    console.log(`🌍 Google Earth Engine iframe support: ENABLED`);
    console.log(`🔒 Content Security Policy: CONFIGURED`);
    console.log(`🔧 CORS Cache-Control headers: FIXED`);
    
    // Không chạy open() trên môi trường production
    if (process.env.NODE_ENV !== 'production' && process.env.DISPLAY) {
      try {
        const { default: open } = await import('open');
        await open(`http://localhost:${port}/api-docs`);
      } catch (err) {
        console.log("⚠️ Không thể mở trình duyệt tự động:", err.message);
      }
    }
  });
};

// Khởi chạy server
startServer();