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
  const { zipUrl } = req.body;
  const tmpDir = path.join(__dirname, "../tmp");
  const zipPath = path.join(tmpDir, "shapefile.zip");
  const extractPath = path.join(tmpDir, "unzip");
  const sqlPath = path.join(tmpDir, "import.sql");
  const modifiedSqlPath = path.join(tmpDir, "import_modified.sql");

  try {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    console.log("⬇️ Tải và giải nén shapefile...");
    await downloadZip(zipUrl, zipPath);
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);

    const shpFile = fs.readdirSync(extractPath).find((f) => f.endsWith(".shp"));
    if (!shpFile) throw new Error("Không tìm thấy file SHP.");
    const fullShpPath = path.join(extractPath, shpFile);
    
    // Kiểm tra thông tin file shapefile
    console.log(`📊 File shapefile được tìm thấy: ${shpFile}`);
    try {
      const inspectCmd = `ogrinfo -so -al "${fullShpPath}"`;
      console.log("📋 Kiểm tra cấu trúc shapefile...");
      const { stdout } = await exec(inspectCmd);
      console.log(stdout);
    } catch (err) {
      console.log("⚠️ Không thể kiểm tra cấu trúc shapefile:", err.message);
    }

    // Đếm số lượng bản ghi hiện tại trong bảng mat_rung trước khi import
    const countBefore = await pool.query("SELECT COUNT(*) FROM mat_rung");
    console.log(`📊 Số bản ghi hiện tại trong bảng mat_rung: ${countBefore.rows[0].count}`);

    // Kiểm tra trigger xem có gây vấn đề không
    console.log("📋 Kiểm tra trigger hiện tại...");
    const triggerResult = await pool.query(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE event_object_table = 'mat_rung'
    `);
    console.log("📋 Triggers trên bảng mat_rung:", triggerResult.rows);
    
    // Tạm thời vô hiệu hóa trigger 
    console.log("🔧 Tạm thời vô hiệu hóa trigger để test...");
    await pool.query(`ALTER TABLE mat_rung DISABLE TRIGGER set_area_in_hectares`);
    
    // Thử phương pháp trực tiếp qua node-postgres trước
    console.log("🔍 Thử phương pháp import trực tiếp qua node-postgres...");
    try {
      // Đọc dữ liệu từ shapefile sử dụng ogr2ogr để chuyển thành GeoJSON
      const geoJsonPath = path.join(tmpDir, "data.geojson");
      const ogrCmd = `ogr2ogr -f "GeoJSON" "${geoJsonPath}" "${fullShpPath}"`;
      await exec(ogrCmd);
      
      // Đọc GeoJSON
      const geoJsonData = JSON.parse(fs.readFileSync(geoJsonPath, 'utf8'));
      console.log(`📊 Số features trong GeoJSON: ${geoJsonData.features.length}`);
      
      // Thực hiện INSERT trực tiếp qua node-postgres
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        for (const feature of geoJsonData.features) {
          const props = feature.properties;
          const geom = feature.geometry;
          
          // Chuẩn bị câu lệnh SQL
          const sql = `
            INSERT INTO mat_rung (start_sau, area, start_dau, end_sau, mahuyen, end_dau, geom) 
            VALUES ($1, $2, $3, $4, $5, $6, ST_GeomFromGeoJSON($7))
          `;
          
          // Chuẩn bị tham số
          const params = [
            props.start_sau,
            props.area,
            props.start_dau,
            props.end_sau,
            props.mahuyen,
            props.end_dau,
            JSON.stringify(geom)
          ];
          
          // Log thông tin INSERT
          console.log(`🔄 INSERT: start_dau=${props.start_dau}, end_sau=${props.end_sau}, mahuyen=${props.mahuyen}`);
          
          // Thực hiện query
          await client.query(sql, params);
        }
        
        await client.query('COMMIT');
        console.log(`✅ Import thành công ${geoJsonData.features.length} features qua node-postgres.`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Lỗi khi import qua node-postgres:", err);
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error("❌ Lỗi khi thử phương pháp node-postgres:", err);
      console.log("⚠️ Chuyển sang phương pháp import file SQL...");
      
      // Tạo file SQL từ shapefile - KHÔNG sửa đổi bất kỳ giá trị nào
      const createSqlCmd = `shp2pgsql -a -s 4326 "${fullShpPath}" mat_rung > "${sqlPath}"`;
      console.log("📝 Tạo file SQL từ shapefile...");
      await exec(createSqlCmd);
      
      // Đọc và sửa đổi file SQL để đảm bảo có COMMIT
      let sqlContent = fs.readFileSync(sqlPath, 'utf8');
      console.log(`📝 Nội dung SQL (500 ký tự đầu): ${sqlContent.substring(0, 500)}...`);
      
      // Đảm bảo có COMMIT ở cuối file
      if (!sqlContent.includes('COMMIT;')) {
        sqlContent += '\nCOMMIT;';
      }
      
      // Ghi file SQL đã sửa
      fs.writeFileSync(modifiedSqlPath, sqlContent);
      
      // Đếm số lệnh INSERT trong file SQL
      const insertCount = (sqlContent.match(/INSERT INTO/gi) || []).length;
      console.log(`📝 Số lệnh INSERT trong file SQL: ${insertCount}`);
      
      if (insertCount === 0) {
        throw new Error("Không có dữ liệu để import: File SQL không chứa lệnh INSERT");
      }
      
      console.log("ℹ️ Giữ nguyên mã huyện gốc từ file shapefile");
      
      // Import dữ liệu vào PostgreSQL với file SQL đã sửa
      const importCmd = `
  PGPASSWORD=${process.env.PGPASSWORD} psql -v ON_ERROR_STOP=1 "host=${process.env.PGHOST} port=${process.env.PGPORT} dbname=${process.env.PGDATABASE} user=${process.env.PGUSER}" -f "${modifiedSqlPath}"
  `;
      console.log("📥 Import dữ liệu vào bảng mat_rung...");
      const { stdout, stderr } = await exec(importCmd);
      console.log("📄 Kết quả import:");
      console.log(stdout);
      if (stderr) console.error("⚠️ Lỗi hoặc cảnh báo:", stderr);
    }
    
    // Bật lại trigger
    console.log("🔧 Bật lại trigger...");
    await pool.query(`ALTER TABLE mat_rung ENABLE TRIGGER set_area_in_hectares`);
    
    // Đếm số lượng bản ghi sau khi import
    const countAfter = await pool.query("SELECT COUNT(*) FROM mat_rung");
    console.log(`📊 Số bản ghi sau khi import: ${countAfter.rows[0].count}`);
    
    const recordsAdded = countAfter.rows[0].count - countBefore.rows[0].count;
    console.log(`📊 Số bản ghi đã thêm mới: ${recordsAdded}`);
    
    if (recordsAdded <= 0) {
      // Thử một phương pháp cuối cùng - sử dụng ogr2ogr trực tiếp để import
      console.log("⚠️ Không có bản ghi nào được thêm. Thử phương pháp ogr2ogr trực tiếp...");
      
      const pgConnString = `PG:"host=${process.env.PGHOST} port=${process.env.PGPORT} dbname=${process.env.PGDATABASE} user=${process.env.PGUSER} password=${process.env.PGPASSWORD}"`;
      const ogr2ogrCmd = `ogr2ogr -f "PostgreSQL" ${pgConnString} "${fullShpPath}" -nln mat_rung -append`;
      
      try {
        const { stdout, stderr } = await exec(ogr2ogrCmd);
        console.log("📄 Kết quả ogr2ogr:");
        console.log(stdout);
        if (stderr) console.log(stderr);
        
        // Kiểm tra lại số bản ghi
        const countAfterOgr = await pool.query("SELECT COUNT(*) FROM mat_rung");
        const recordsAddedOgr = countAfterOgr.rows[0].count - countBefore.rows[0].count;
        console.log(`📊 Số bản ghi sau ogr2ogr: ${countAfterOgr.rows[0].count}`);
        console.log(`📊 Số bản ghi đã thêm qua ogr2ogr: ${recordsAddedOgr}`);
        
        if (recordsAddedOgr <= 0) {
          throw new Error("Không thể thêm bản ghi nào sau khi thử tất cả các phương pháp");
        }
      } catch (ogrErr) {
        console.error("❌ Lỗi khi sử dụng ogr2ogr:", ogrErr);
        throw new Error("Không có bản ghi nào được thêm vào sau khi thử tất cả các phương pháp");
      }
    }
    
    // Kiểm tra xem dữ liệu mới đã được import đúng không
    const newRecords = await pool.query(`
      SELECT gid, start_dau, end_sau, area, mahuyen 
      FROM mat_rung 
      ORDER BY gid DESC 
      LIMIT 5
    `);
    console.log("📄 Các bản ghi mới nhất:");
    console.log(newRecords.rows);

    // Lấy dữ liệu GeoJSON để hiển thị - tất cả các bản ghi
    let geojsonQuery = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(geom)::json,
            'properties', to_jsonb(t) - 'geom'
          )
        ), '[]'::json)
      ) AS geojson
      FROM (
        SELECT * FROM mat_rung 
        ORDER BY gid DESC 
        LIMIT 1000
      ) AS t;
    `;
    
    const result = await pool.query(geojsonQuery);
    const geojson = result.rows[0].geojson;
    
    // Kiểm tra số lượng features trong GeoJSON
    const featuresCount = geojson.features ? geojson.features.length : 0;
    console.log(`📊 Số features trong GeoJSON: ${featuresCount}`);

    // Dọn dẹp file tạm
    try {
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      if (fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath);
      if (fs.existsSync(modifiedSqlPath)) fs.unlinkSync(modifiedSqlPath);
      if (fs.existsSync(path.join(tmpDir, "data.geojson"))) fs.unlinkSync(path.join(tmpDir, "data.geojson"));
      if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true });
    } catch (cleanupErr) {
      console.error("⚠️ Lỗi khi dọn dẹp file tạm:", cleanupErr);
    }

    res.json({
      message: "✅ Tải và import vào PostgreSQL thành công với mã huyện gốc từ shapefile!",
      table: "mat_rung",
      recordsAdded: featuresCount, // Sử dụng số features trong GeoJSON thay vì recordsAdded
      geojson,
    });
  } catch (err) {
    console.error("❌ Lỗi tổng quát:", err);
    res.status(500).json({ 
      message: err.message,
      stack: err.stack 
    });
    
    // Bật lại trigger nếu đã vô hiệu hóa
    try {
      await pool.query(`ALTER TABLE mat_rung ENABLE TRIGGER set_area_in_hectares`);
    } catch (triggerErr) {
      console.error("⚠️ Lỗi khi bật lại trigger:", triggerErr);
    }
    
    // Dọn dẹp files nếu có lỗi
    try {
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      if (fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath);
      if (fs.existsSync(modifiedSqlPath)) fs.unlinkSync(modifiedSqlPath);
      if (fs.existsSync(path.join(tmpDir, "data.geojson"))) fs.unlinkSync(path.join(tmpDir, "data.geojson"));
      if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true });
    } catch (cleanupErr) {
      console.error("⚠️ Lỗi khi dọn dẹp file tạm:", cleanupErr);
    }
  }
});

module.exports = router;