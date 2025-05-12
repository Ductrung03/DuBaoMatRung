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
 *               tableName:
 *                 type: string
 *               districtId:
 *                 type: string
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
  const { zipUrl, tableName, districtId } = req.body;
  const tmpDir = path.join(__dirname, "../tmp");
  const zipPath = path.join(tmpDir, "shapefile.zip");
  const extractPath = path.join(tmpDir, "unzip");

  try {
    // Kiểm tra quyền truy cập huyện
    if (!req.user.role === 'admin' && req.user.district_id && districtId && req.user.district_id !== districtId) {
      return res.status(403).json({ 
        message: "Bạn không có quyền import dữ liệu cho huyện này" 
      });
    }

    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    console.log("⬇️ Tải và giải nén shapefile...");
    await downloadZip(zipUrl, zipPath);
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);

    const shpFile = fs.readdirSync(extractPath).find((f) => f.endsWith(".shp"));
    if (!shpFile) throw new Error("Không tìm thấy file SHP.");
    const fullShpPath = path.join(extractPath, shpFile);

    // Thêm điều kiện lọc huyện vào tableName nếu có
    const safeTableName = tableName.replace(/[^a-zA-Z0-9_]/g, "_");
    
    const checkExist = await pool.query(
      `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `,
      [safeTableName]
    );

    const tableExists = checkExist.rows[0].exists;
    const shp2pgsqlFlag = tableExists ? "-a -s 4326" : "-c -I -s 4326";

    const importCmd = `
PGSSLMODE=require PGPASSWORD=${process.env.PGPASSWORD} shp2pgsql ${shp2pgsqlFlag} "${fullShpPath}" ${safeTableName} | 
psql "host=${process.env.PGHOST} port=${process.env.PGPORT} dbname=${process.env.PGDATABASE} user=${process.env.PGUSER} sslmode=require"
`;
    console.log("📥 Import vào PostgreSQL...");
    await exec(importCmd);
    
    // Nếu có mã huyện, thêm vào bảng để lọc
    if (districtId) {
      await pool.query(`
        ALTER TABLE ${safeTableName} 
        ADD COLUMN IF NOT EXISTS district_id VARCHAR(10)
      `);
      
      await pool.query(`
        UPDATE ${safeTableName}
        SET district_id = $1
      `, [districtId]);
    }
    
    console.log("✅ Import thành công!");

    let geojsonQuery = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(ST_Transform(geom, 4326))::json,
            'properties', to_jsonb(t) - 'geom'
          )
        )
      )
      FROM ${safeTableName} AS t
    `;
    
    // Thêm điều kiện WHERE nếu có mã huyện
    if (districtId) {
      geojsonQuery += ` WHERE district_id = '${districtId}'`;
    }
    
    geojsonQuery += `;`;
    
    const result = await pool.query(geojsonQuery);
    const geojson = result.rows[0].json_build_object;

    fs.unlinkSync(zipPath);
    fs.rmSync(extractPath, { recursive: true });

    res.json({
      message: "✅ Tải và import vào PostgreSQL thành công!",
      table: safeTableName,
      geojson,
    });
  } catch (err) {
    console.error("❌ Lỗi tổng quát:", err);
    res.status(500).json({ message: err.message });
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true });
  }
});

module.exports = router;