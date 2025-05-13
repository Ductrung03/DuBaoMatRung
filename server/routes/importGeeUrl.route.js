/**
 * @swagger
 * /api/import-gee-url:
 *   post:
 *     tags:
 *       - Shapefile
 *     summary: Nhập dữ liệu từ Google Earth Engine URL và xử lý
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               zipUrl:
 *                 type: string
 *               districtCode:
 *                 type: string
 *                 description: "Mã huyện chính xác (ví dụ: 85)"
 *     responses:
 *       200:
 *         description: Nhập dữ liệu thành công
 */

require("dotenv").config();
const express = require("express");
const router = express.Router();
const axios = require("axios");
const fs = require("fs");
const AdmZip = require("adm-zip");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const path = require("path");
const { Pool } = require("pg");
const pool = new Pool();
const authMiddleware = require("../middleware/auth.middleware");

// Áp dụng middleware xác thực
router.use(authMiddleware.authenticate);

async function downloadZip(zipUrl, savePath) {
  const response = await axios.get(zipUrl, {
    responseType: "arraybuffer",
  });
  fs.writeFileSync(savePath, response.data);
  console.log("✅ Tải ZIP thành công từ GEE.");
}

router.post("/", async (req, res) => {
  const { zipUrl, districtCode } = req.body;
  const correctDistrictCode = districtCode || "85"; // Mặc định là "85" nếu không được chỉ định
  const tmpDir = path.join(__dirname, "../tmp");
  const zipPath = path.join(tmpDir, "shapefile.zip");
  const extractPath = path.join(tmpDir, "unzip");
  const sqlPath = path.join(tmpDir, "import.sql");

  try {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    console.log(`🔍 Sử dụng mã huyện: ${correctDistrictCode}`);
    console.log("⬇️ Tải và giải nén shapefile...");
    await downloadZip(zipUrl, zipPath);
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);

    const shpFile = fs.readdirSync(extractPath).find((f) => f.endsWith(".shp"));
    if (!shpFile) throw new Error("Không tìm thấy file SHP.");
    const fullShpPath = path.join(extractPath, shpFile);

    // Kiểm tra xem bảng mat_rung có tồn tại không
    const checkExist = await pool.query(
      `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'mat_rung'
      );
    `
    );

    const tableExists = checkExist.rows[0].exists;
    
    if (!tableExists) {
      throw new Error("Bảng mat_rung không tồn tại trong cơ sở dữ liệu.");
    }

    // Tạo file SQL từ shapefile
    const createSqlCmd = `shp2pgsql -a -s 4326 "${fullShpPath}" mat_rung > "${sqlPath}"`;
    console.log("📝 Tạo file SQL từ shapefile...");
    await exec(createSqlCmd);
    
    // Đọc và sửa đổi file SQL
    console.log("✏️ Sửa đổi file SQL để cập nhật mã huyện...");
    let sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    // Thay thế tất cả các mã huyện '80' thành mã huyện chính xác
    const originalSqlLength = sqlContent.length;
    sqlContent = sqlContent.replace(/'80'(?=\s*,|\s*\))/g, `'${correctDistrictCode}'`);
    const newSqlLength = sqlContent.length;
    
    const replacementCount = (originalSqlLength - newSqlLength) / 2; // 2 ký tự thay đổi mỗi lần thay thế
    console.log(`🔄 Đã thay thế ${Math.abs(replacementCount) > 0 ? Math.abs(replacementCount) : 'không có'} mã huyện '80' thành '${correctDistrictCode}'`);
    
    // Lưu SQL đã sửa
    fs.writeFileSync(sqlPath, sqlContent);
    
    // Import dữ liệu vào PostgreSQL
    const importCmd = `
PGPASSWORD=${process.env.PGPASSWORD} psql "host=${process.env.PGHOST} port=${process.env.PGPORT} dbname=${process.env.PGDATABASE} user=${process.env.PGUSER}" -f "${sqlPath}"
`;
    console.log("📥 Import dữ liệu vào bảng mat_rung...");
    await exec(importCmd);
    
    // Đảm bảo tất cả các bản ghi mới đều có mã huyện chính xác
    // Sửa lại cú pháp SQL - không thể dùng ORDER BY và LIMIT trực tiếp trong UPDATE
    console.log("🔄 Cập nhật mã huyện cho các bản ghi mới nhất...");
    await pool.query(`
      UPDATE mat_rung 
      SET mahuyen = '${correctDistrictCode}' 
      WHERE mahuyen = '80' OR mahuyen IS NULL
    `);

    console.log("✅ Import thành công!");

    // Lấy dữ liệu GeoJSON để hiển thị
    let geojsonQuery = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(geom)::json,
            'properties', to_jsonb(t) - 'geom'
          )
        )
      )
      FROM (
        SELECT * FROM mat_rung 
        ORDER BY gid DESC 
        LIMIT 1000
      ) AS t;
    `;
    
    const result = await pool.query(geojsonQuery);
    const geojson = result.rows[0].json_build_object;

    // Dọn dẹp file tạm
    fs.unlinkSync(zipPath);
    fs.unlinkSync(sqlPath);
    fs.rmSync(extractPath, { recursive: true });

    res.json({
      message: "✅ Tải và import vào PostgreSQL thành công!",
      table: "mat_rung",
      districtCode: correctDistrictCode,
      geojson,
    });
  } catch (err) {
    console.error("❌ Lỗi tổng quát:", err);
    res.status(500).json({ message: err.message });
    
    // Dọn dẹp files nếu có lỗi
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    if (fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath);
    if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true });
  }
});

module.exports = router;