// Sửa file: server/routes/importGeeUrl.route.js

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

// SỬA LẠI HÀM DOWNLOAD ZIP VỚI XỬ LÝ LỖI TỐT HƠN
async function downloadZip(zipUrl, savePath) {
  try {
    console.log(`🔍 Đang kiểm tra URL: ${zipUrl}`);
    
    // Kiểm tra format URL
    if (!zipUrl.includes('earthengine.googleapis.com')) {
      throw new Error('URL không phải từ Google Earth Engine. Vui lòng kiểm tra lại URL.');
    }
    
    if (!zipUrl.includes(':getFeatures')) {
      throw new Error('URL không đúng định dạng. URL phải chứa ":getFeatures" ở cuối.');
    }
    
    console.log(`📡 Đang gửi request đến Google Earth Engine...`);
    
    // Cấu hình request với timeout và headers
    const response = await axios.get(zipUrl, {
      responseType: "arraybuffer",
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, */*',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      maxRedirects: 5,
      validateStatus: function (status) {
        // Chấp nhận status code từ 200-299
        return status >= 200 && status < 300;
      }
    });
    
    // Kiểm tra response
    if (!response.data || response.data.byteLength === 0) {
      throw new Error('Dữ liệu trả về từ Google Earth Engine rỗng.');
    }
    
    console.log(`✅ Nhận được dữ liệu từ GEE: ${response.data.byteLength} bytes`);
    
    // Kiểm tra xem dữ liệu có phải là ZIP không
    const isZip = response.data.slice(0, 4).toString('hex') === '504b0304';
    if (!isZip) {
      // Có thể là GeoJSON hoặc dữ liệu khác
      console.log('📄 Dữ liệu nhận được không phải ZIP, có thể là GeoJSON');
      
      // Thử parse JSON
      try {
        const jsonData = new TextDecoder().decode(response.data);
        const parsed = JSON.parse(jsonData);
        
        if (parsed.error) {
          throw new Error(`Lỗi từ Google Earth Engine: ${parsed.error.message || 'Không xác định'}`);
        }
        
        // Nếu là GeoJSON hợp lệ, lưu thành file JSON
        fs.writeFileSync(savePath.replace('.zip', '.geojson'), jsonData);
        console.log("✅ Tải GeoJSON thành công từ GEE.");
        return { isGeoJSON: true, data: parsed };
      } catch (parseError) {
        console.error('❌ Không thể parse dữ liệu:', parseError.message);
        throw new Error('Dữ liệu từ Google Earth Engine không đúng định dạng.');
      }
    }
    
    // Lưu file ZIP
    fs.writeFileSync(savePath, response.data);
    console.log("✅ Tải ZIP thành công từ GEE.");
    return { isGeoJSON: false };
    
  } catch (error) {
    console.error("❌ Lỗi khi tải dữ liệu từ Google Earth Engine:", error.message);
    
    // Xử lý các loại lỗi cụ thể
    if (error.response) {
      const status = error.response.status;
      const statusText = error.response.statusText;
      
      switch (status) {
        case 400:
          throw new Error(`Lỗi 400: URL không hợp lệ hoặc thiếu tham số. Vui lòng kiểm tra lại URL từ Google Earth Engine.`);
        case 401:
          throw new Error(`Lỗi 401: Không có quyền truy cập. URL có thể đã hết hạn hoặc cần đăng nhập Google Earth Engine.`);
        case 403:
          throw new Error(`Lỗi 403: Bị từ chối truy cập. Kiểm tra quyền chia sẻ của dữ liệu trên Google Earth Engine.`);
        case 404:
          throw new Error(`Lỗi 404: Không tìm thấy dữ liệu. URL có thể đã bị xóa hoặc không tồn tại.`);
        case 429:
          throw new Error(`Lỗi 429: Quá nhiều request. Vui lòng thử lại sau vài phút.`);
        case 500:
          throw new Error(`Lỗi 500: Lỗi server Google Earth Engine. Vui lòng thử lại sau.`);
        default:
          throw new Error(`Lỗi ${status}: ${statusText}. Không thể tải dữ liệu từ Google Earth Engine.`);
      }
    } else if (error.code === 'ECONNABORTED') {
      throw new Error('Hết thời gian chờ kết nối. URL có thể không hoạt động hoặc mạng chậm.');
    } else if (error.code === 'ENOTFOUND') {
      throw new Error('Không thể kết nối đến Google Earth Engine. Kiểm tra kết nối mạng.');
    } else {
      throw new Error(`Lỗi không xác định: ${error.message}`);
    }
  }
}

// Hàm kiểm tra dữ liệu đã tồn tại (giữ nguyên)
async function checkDataExists(geoJsonData) {
  try {
    if (!geoJsonData || !geoJsonData.features || geoJsonData.features.length === 0) {
      return false;
    }

    const samplesToCheck = Math.min(5, geoJsonData.features.length);
    let existingCount = 0;

    for (let i = 0; i < samplesToCheck; i++) {
      const feature = geoJsonData.features[i];
      const props = feature.properties;
      
      const query = `
        SELECT COUNT(*) 
        FROM mat_rung 
        WHERE start_dau = $1 
          AND end_sau = $2 
          AND mahuyen = $3
      `;
      
      const params = [
        props.start_dau,
        props.end_sau,
        props.mahuyen
      ];
      
      const result = await pool.query(query, params);
      if (result.rows[0].count > 0) {
        existingCount++;
      }
    }

    return (existingCount / samplesToCheck) > 0.7;
  } catch (err) {
    console.error("❌ Lỗi khi kiểm tra dữ liệu tồn tại:", err);
    return false;
  }
}

// SỬA LẠI ROUTE CHÍNH
router.post("/", async (req, res) => {
  const { zipUrl } = req.body;
  const tmpDir = path.join(__dirname, "../tmp");
  const zipPath = path.join(tmpDir, "shapefile.zip");
  const extractPath = path.join(tmpDir, "unzip");
  const sqlPath = path.join(tmpDir, "import.sql");
  const modifiedSqlPath = path.join(tmpDir, "import_modified.sql");
  const geoJsonPath = path.join(tmpDir, "data.geojson");

  try {
    // Kiểm tra URL đầu vào
    if (!zipUrl) {
      return res.status(400).json({
        message: "❌ Vui lòng cung cấp URL từ Google Earth Engine.",
        success: false
      });
    }

    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    console.log("⬇️ Tải và xử lý dữ liệu từ Google Earth Engine...");
    
    // Tải dữ liệu với xử lý lỗi cải thiện
    const downloadResult = await downloadZip(zipUrl, zipPath);
    
    let geoJsonData;
    
    if (downloadResult.isGeoJSON) {
      // Nếu là GeoJSON trực tiếp
      geoJsonData = downloadResult.data;
      console.log(`📊 Nhận được GeoJSON với ${geoJsonData.features?.length || 0} features`);
    } else {
      // Nếu là ZIP, giải nén và xử lý
      console.log("📦 Giải nén file ZIP...");
      const zip = new AdmZip(zipPath);
      zip.extractAllTo(extractPath, true);

      const shpFile = fs.readdirSync(extractPath).find((f) => f.endsWith(".shp"));
      if (!shpFile) {
        throw new Error("Không tìm thấy file SHP trong ZIP. Vui lòng kiểm tra lại dữ liệu từ Google Earth Engine.");
      }
      
      const fullShpPath = path.join(extractPath, shpFile);
      console.log(`📊 File shapefile được tìm thấy: ${shpFile}`);

      // Chuyển shapefile sang GeoJSON
      console.log("🔍 Chuyển đổi shapefile sang GeoJSON...");
      const ogrCmd = `ogr2ogr -f "GeoJSON" "${geoJsonPath}" "${fullShpPath}"`;
      await exec(ogrCmd);
      
      geoJsonData = JSON.parse(fs.readFileSync(geoJsonPath, 'utf8'));
      console.log(`📊 Số features trong GeoJSON: ${geoJsonData.features?.length || 0}`);
    }

    // Kiểm tra dữ liệu hợp lệ
    if (!geoJsonData || !geoJsonData.features || geoJsonData.features.length === 0) {
      throw new Error("Dữ liệu từ Google Earth Engine rỗng hoặc không hợp lệ.");
    }

    // Kiểm tra xem dữ liệu đã tồn tại chưa
    const dataExists = await checkDataExists(geoJsonData);
    if (dataExists) {
      console.log("⚠️ Dữ liệu đã tồn tại trong cơ sở dữ liệu!");
      
      // Dọn dẹp file tạm
      try {
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        if (fs.existsSync(geoJsonPath)) fs.unlinkSync(geoJsonPath);
        if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true });
      } catch (cleanupErr) {
        console.error("⚠️ Lỗi khi dọn dẹp file tạm:", cleanupErr);
      }
      
      return res.json({
        message: "⚠️ Dữ liệu đã tồn tại trong cơ sở dữ liệu!",
        alreadyExists: true,
        table: "mat_rung",
        recordsAdded: 0,
        success: true
      });
    }

    // Đếm số lượng bản ghi hiện tại
    const countBefore = await pool.query("SELECT COUNT(*) FROM mat_rung");
    console.log(`📊 Số bản ghi hiện tại trong bảng mat_rung: ${countBefore.rows[0].count}`);

    // Tạm thời vô hiệu hóa trigger
    console.log("🔧 Tạm thời vô hiệu hóa trigger...");
    await pool.query(`ALTER TABLE mat_rung DISABLE TRIGGER set_area_in_hectares`);
    
    // Import dữ liệu trực tiếp qua node-postgres
    console.log("🔍 Import dữ liệu vào cơ sở dữ liệu...");
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      let importedCount = 0;
      for (const feature of geoJsonData.features) {
        const props = feature.properties;
        const geom = feature.geometry;
        
        // Kiểm tra dữ liệu bắt buộc
        if (!props.start_dau || !props.end_sau) {
          console.log(`⚠️ Bỏ qua feature thiếu dữ liệu bắt buộc:`, props);
          continue;
        }
        
        const sql = `
          INSERT INTO mat_rung (start_sau, area, start_dau, end_sau, mahuyen, end_dau, geom) 
          VALUES ($1, $2, $3, $4, $5, $6, ST_GeomFromGeoJSON($7))
        `;
        
        const params = [
          props.start_sau,
          props.area,
          props.start_dau,
          props.end_sau,
          props.mahuyen,
          props.end_dau,
          JSON.stringify(geom)
        ];
        
        await client.query(sql, params);
        importedCount++;
      }
      
      await client.query('COMMIT');
      console.log(`✅ Import thành công ${importedCount} features.`);
      
    } catch (err) {
      await client.query('ROLLBACK');
      console.error("❌ Lỗi khi import:", err);
      throw err;
    } finally {
      client.release();
    }
    
    // Bật lại trigger
    console.log("🔧 Bật lại trigger...");
    await pool.query(`ALTER TABLE mat_rung ENABLE TRIGGER set_area_in_hectares`);
    
    // Đếm số lượng bản ghi sau khi import
    const countAfter = await pool.query("SELECT COUNT(*) FROM mat_rung");
    const recordsAdded = countAfter.rows[0].count - countBefore.rows[0].count;
    console.log(`📊 Số bản ghi đã thêm mới: ${recordsAdded}`);
    
    // Lấy dữ liệu GeoJSON để hiển thị
    const geojsonQuery = `
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

    // Dọn dẹp file tạm
    try {
      if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      if (fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath);
      if (fs.existsSync(modifiedSqlPath)) fs.unlinkSync(modifiedSqlPath);
      if (fs.existsSync(geoJsonPath)) fs.unlinkSync(geoJsonPath);
      if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true });
    } catch (cleanupErr) {
      console.error("⚠️ Lỗi khi dọn dẹp file tạm:", cleanupErr);
    }

    res.json({
      message: "✅ Tải và import dữ liệu từ Google Earth Engine thành công!",
      table: "mat_rung",
      recordsAdded: recordsAdded,
      geojson,
      success: true
    });
    
  } catch (err) {
    console.error("❌ Lỗi tổng quát:", err);
    
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
      if (fs.existsSync(geoJsonPath)) fs.unlinkSync(geoJsonPath);
      if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true });
    } catch (cleanupErr) {
      console.error("⚠️ Lỗi khi dọn dẹp file tạm:", cleanupErr);
    }
    
    // Trả về lỗi với thông báo rõ ràng
    res.status(500).json({ 
      message: err.message || "Có lỗi xảy ra khi import dữ liệu",
      success: false,
      error: err.message
    });
  }
});

module.exports = router;