const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { default: open } = require("open");
const pool = require("./db/index");
const cookieParser = require("cookie-parser");

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

// Log biến môi trường khi khởi động (chỉ log dạng **, không log thông tin thật)
console.log("🔄 Thông tin môi trường:");
console.log(`- PGHOST: ${process.env.PGHOST ? "***" : "không có"}`);
console.log(`- PGPORT: ${process.env.PGPORT ? "***" : "không có"}`);
console.log(`- PGUSER: ${process.env.PGUSER ? "***" : "không có"}`);
console.log(`- PGPASSWORD: ${process.env.PGPASSWORD ? "***" : "không có"}`);
console.log(`- PGDATABASE: ${process.env.PGDATABASE ? "***" : "không có"}`);
console.log(
  `- GEOSERVER_USER: ${process.env.GEOSERVER_USER ? "***" : "không có"}`
);
console.log(
  `- GEOSERVER_PASS: ${process.env.GEOSERVER_PASS ? "***" : "không có"}`
);
console.log(
  `- JWT_SECRET: ${process.env.JWT_SECRET ? "***" : "sử dụng secret mặc định"}`
);

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

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.url}`);
  next();
});

// Middleware for debugging routes
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.url}`);
  next();
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

// Test route
app.get("/api/test", (req, res) => {
  res.json({ message: "API đang hoạt động!" });
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

app.get("/", (req, res) => {
  res.send("✅ Backend Geo API đang hoạt động");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("🔴 Lỗi server:", err);
  res.status(500).json({
    success: false,
    message: "Lỗi server",
    error: err.message,
  });
});

// 404 middleware
app.use((req, res) => {
  console.log(`❌ 404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: "API endpoint không tồn tại",
  });
});
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`🚀 Backend chạy tại http://localhost:${port}`);
  console.log(`📚 API Docs tại http://localhost:${port}/api-docs`);
  
  // Không chạy open() trên môi trường production
  if (process.env.NODE_ENV !== 'production') {
    try {
      open(`http://localhost:${port}/api-docs`);
    } catch (err) {
      console.log("⚠️ Không thể mở trình duyệt tự động");
    }
  }
});