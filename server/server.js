// server/server.js - CẬP NHẬT VỚI CSP MIDDLEWARE
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

// Middleware - IMPORTANT: CSP phải được áp dụng trước CORS
// Set CSP headers để cho phép Google Earth Engine iframe
app.use(setCspHeaders);

// CORS with enhanced options for Google Earth Engine
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000', 
    'https://dubaomatrung-frontend.onrender.com',
    // Thêm domains cho Google Earth Engine
    'https://earthengine.googleapis.com',
    'https://ee-phathiensommatrung.projects.earthengine.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '50mb' })); // Tăng limit cho large data
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Enhanced logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const userAgent = req.get('User-Agent');
  const referer = req.get('Referer');
  
  console.log(`📝 [${timestamp}] ${req.method} ${req.url}`);
  
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

// Test routes
app.get("/api/test", (req, res) => {
  res.json({ 
    message: "API đang hoạt động!",
    csp_enabled: true,
    earth_engine_support: true
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
  app.listen(port, async () => {
    console.log(`🚀 Backend chạy tại http://localhost:${port}`);
    console.log(`📚 API Docs tại http://localhost:${port}/api-docs`);
    console.log(`🧪 Test Iframe tại http://localhost:${port}/api/test-iframe`);
    console.log(`🌍 Google Earth Engine iframe support: ENABLED`);
    console.log(`🔒 Content Security Policy: CONFIGURED`);
    
    // Không chạy open() trên môi trường production
    if (process.env.NODE_ENV !== 'production') {
      try {
        // Sử dụng dynamic import thay vì require
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