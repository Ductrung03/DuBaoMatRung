// server/routes/layerData.routes.js - SỬA LỖI
const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
const convertTcvn3ToUnicode = require("../utils/convertTcvn3ToUnicode");

const pool = new Pool();

/**
 * @swagger
 * /layer-data/info:
 *   get:
 *     summary: Lấy thông tin tổng quan về các lớp dữ liệu
 *     tags:
 *       - Layer Data
 *     responses:
 *       200:
 *         description: Thông tin metadata của các bảng
 */
router.get("/info", async (req, res) => {
  try {
    const info = {};
    
    // Kiểm tra và đếm records của từng bảng
    const tables = [
      { name: 'laocai_ranhgioihc', key: 'administrative' },
      { name: 'laocai_chuquanly', key: 'forest_management' },
      { name: 'laocai_nendiahinh', key: 'terrain' },
      { name: 'laocai_rg3lr', key: 'forest_types' },
      { name: 'tlaocai_tkk_3lr_cru', key: 'forest_status' }
    ];

    for (const table of tables) {
      try {
        const result = await pool.query(`
          SELECT COUNT(*) as count,
                 ST_Extent(ST_Transform(geom, 4326)) as bbox
          FROM ${table.name} 
          WHERE ST_IsValid(geom)
        `);
        
        info[table.key] = {
          table_name: table.name,
          total_records: parseInt(result.rows[0].count),
          bbox: result.rows[0].bbox,
          available: true
        };
      } catch (err) {
        info[table.key] = {
          table_name: table.name,
          total_records: 0,
          bbox: null,
          available: false,
          error: err.message
        };
      }
    }

    console.log("📊 Layer data info:", info);
    res.json(info);
  } catch (err) {
    console.error("❌ Lỗi lấy thông tin layers:", err);
    res.status(500).json({ error: "Lỗi server khi lấy thông tin layers" });
  }
});

// server/routes/layerData.routes.js - SỬA LỖI RANH GIỚI HÀNH CHÍNH

/**
 * @swagger
 * /layer-data/administrative:
 *   get:
 *     summary: Lấy dữ liệu lớp ranh giới hành chính đầy đủ với phân cấp rõ ràng
 *     tags:
 *       - Layer Data
 *     responses:
 *       200:
 *         description: Dữ liệu GeoJSON ranh giới hành chính với phân cấp
 */
router.get("/administrative", async (req, res) => {
  try {
    console.log(`📥 Received request for administrative data`);
    
    const limit = Math.min(parseInt(req.query.limit) || 1000, 2000);
    console.log(`📊 Limit set to: ${limit}`);
    
    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(feature), '[]'::json)
      ) AS geojson
      FROM (
        SELECT json_build_object(
          'type', 'Feature',
          'geometry', ST_AsGeoJSON(
            ST_Transform(
              ST_SetSRID(geom, 3405), 
              4326
            )
          )::json,
          'properties', json_build_object(
            'gid', gid,
            'huyen', huyen,
            'xa', xa,
            'tieukhu', tieukhu,
            'khoanh', khoanh,
            'layer_type', 'administrative_boundary',
            'boundary_level', CASE
              WHEN khoanh IS NOT NULL AND trim(khoanh) != '' THEN 'khoanh'
              WHEN tieukhu IS NOT NULL AND trim(tieukhu) != '' THEN 'tieukhu'
              WHEN xa IS NOT NULL AND trim(xa) != '' THEN 'xa'
              WHEN huyen IS NOT NULL AND trim(huyen) != '' THEN 'huyen'
              ELSE 'unknown'
            END
          )
        ) as feature
        FROM laocai_ranhgioihc
        WHERE ST_IsValid(geom) AND geom IS NOT NULL
        ORDER BY gid
        LIMIT $1
      ) AS features;
    `;

    console.log(`🔍 Executing query with coordinate transformation VN-2000 -> WGS84`);
    const result = await pool.query(query, [limit]);
    let geojson = result.rows[0].geojson;

    console.log(`📊 Raw result count: ${geojson.features?.length || 0}`);
    
    // Log sample transformed coordinates
    if (geojson.features && geojson.features.length > 0) {
      const sampleCoords = geojson.features[0].geometry?.coordinates?.[0]?.[0]?.[0];
      console.log(`🔍 Sample transformed coordinates (should be WGS84):`, sampleCoords);
      
      if (sampleCoords && (sampleCoords[0] > 180 || sampleCoords[0] < -180)) {
        console.error(`❌ Tọa độ vẫn chưa đúng WGS84: ${sampleCoords}`);
      } else {
        console.log(`✅ Tọa độ đã được transform thành WGS84`);
      }
    }

    // Chuyển đổi TCVN3 sang Unicode
    if (geojson.features) {
      geojson.features = geojson.features.map(feature => ({
        ...feature,
        properties: {
          ...feature.properties,
          huyen: convertTcvn3ToUnicode(feature.properties.huyen || ""),
          xa: convertTcvn3ToUnicode(feature.properties.xa || ""),
          tieukhu: convertTcvn3ToUnicode(feature.properties.tieukhu || ""),
          khoanh: convertTcvn3ToUnicode(feature.properties.khoanh || "")
        }
      }));
    }

    console.log(`✅ Loaded ${geojson.features.length} administrative boundary features`);
    
    // Log thống kê theo cấp
    const levelStats = {};
    geojson.features.forEach(feature => {
      const level = feature.properties.boundary_level;
      levelStats[level] = (levelStats[level] || 0) + 1;
    });
    console.log("📊 Thống kê ranh giới theo cấp:", levelStats);
    
    res.json(geojson);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu ranh giới hành chính:", err);
    res.status(500).json({ error: "Lỗi server khi lấy dữ liệu ranh giới hành chính" });
  }
});
// Trong file server/routes/layerData.routes.js 
// Cập nhật endpoint /forest-management

/**
 * @swagger
 * /layer-data/forest-management:
 *   get:
 *     summary: Lấy dữ liệu lớp chủ quản lý rừng (ĐÃ SỬA LỖI)
 *     tags:
 *       - Layer Data
 *     responses:
 *       200:
 *         description: Dữ liệu GeoJSON chủ quản lý rừng
 */
router.get("/forest-management", async (req, res) => {
  try {
    console.log(`📥 Received request for forest management data`);
    
    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(feature), '[]'::json)
      ) AS geojson
      FROM (
        SELECT json_build_object(
          'type', 'Feature',
          'geometry', ST_AsGeoJSON(
            ST_Transform(
              ST_SetSRID(geom, 3405), 
              4326
            )
          )::json,
          'properties', json_build_object(
            'gid', gid,
            'tt', tt,
            'chuquanly', chuquanly,
            'layer_type', 'forest_management'
          )
        ) as feature
        FROM laocai_chuquanly
        WHERE ST_IsValid(geom) AND geom IS NOT NULL
        ORDER BY gid
      ) AS features;
    `;

    console.log(`🔍 Executing forest management query with coordinate transformation`);
    const result = await pool.query(query);
    let geojson = result.rows[0].geojson;

    console.log(`📊 Forest management result count: ${geojson.features?.length || 0}`);
    
    // Log sample coordinates để kiểm tra transform
    if (geojson.features && geojson.features.length > 0) {
      const sampleFeature = geojson.features[0];
      const sampleCoords = sampleFeature.geometry?.coordinates?.[0]?.[0]?.[0];
      console.log(`🔍 Sample forest management coordinates:`, sampleCoords);
      console.log(`🏢 Sample forest management properties:`, sampleFeature.properties);
      
      if (sampleCoords && Array.isArray(sampleCoords)) {
        const [lng, lat] = sampleCoords;
        if (lng >= 103 && lng <= 105 && lat >= 21 && lat <= 24) {
          console.log(`✅ Transform thành công! WGS84 hợp lệ: lng=${lng}, lat=${lat}`);
        } else {
          console.error(`❌ Transform thất bại! Tọa độ không hợp lệ: lng=${lng}, lat=${lat}`);
        }
      }
    }

    // Chuyển đổi TCVN3 sang Unicode
    if (geojson.features) {
      geojson.features = geojson.features.map(feature => ({
        ...feature,
        properties: {
          ...feature.properties,
          chuquanly: convertTcvn3ToUnicode(feature.properties.chuquanly || "")
        }
      }));
    }

    console.log(`✅ Loaded ${geojson.features.length} forest management features`);
    
    // Log thống kê theo loại chủ quản lý
    const managementStats = {};
    geojson.features.forEach(feature => {
      const chuQuanLy = feature.properties.chuquanly || "Không xác định";
      managementStats[chuQuanLy] = (managementStats[chuQuanLy] || 0) + 1;
    });
    console.log("📊 Thống kê theo chủ quản lý:", managementStats);
    
    res.json(geojson);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu chủ quản lý rừng:", err);
    res.status(500).json({ 
      error: "Lỗi server khi lấy dữ liệu chủ quản lý rừng",
      details: err.message 
    });
  }
});
/**
 * @swagger
 * /layer-data/terrain:
 *   get:
 *     summary: Lấy dữ liệu lớp địa hình, thủy văn, giao thông đầy đủ
 *     tags:
 *       - Layer Data
 *     responses:
 *       200:
 *         description: Dữ liệu GeoJSON địa hình, thủy văn, giao thông
 */
router.get("/terrain", async (req, res) => {
  try {
    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(feature), '[]'::json)
      ) AS geojson
      FROM (
        SELECT json_build_object(
          'type', 'Feature',
          'geometry', ST_AsGeoJSON(
            ST_Transform(ST_SetSRID(geom, 3405), 4326)
          )::json,
          'properties', json_build_object(
            'gid', gid,
            'id', id,
            'ma', ma,
            'ten', ten,
            'layer_type', 'terrain_hydro_transport',
            'feature_type', CASE
              WHEN LOWER(ten) LIKE '%sông%' OR LOWER(ten) LIKE '%suối%' OR LOWER(ten) LIKE '%kênh%' THEN 'waterway'
              WHEN LOWER(ten) LIKE '%thủy%' OR LOWER(ten) LIKE '%cảng%' THEN 'water_transport'
              WHEN LOWER(ten) LIKE '%đường%' OR LOWER(ten) LIKE '%quốc lộ%' OR LOWER(ten) LIKE '%tỉnh lộ%' THEN 'road'
              ELSE 'terrain'
            END
          )
        ) as feature
        FROM laocai_nendiahinh
        WHERE ST_IsValid(geom) AND geom IS NOT NULL
      ) AS features;
    `;

    const result = await pool.query(query);
    let geojson = result.rows[0].geojson;

    // Chuyển đổi TCVN3 sang Unicode
    if (geojson.features) {
      geojson.features = geojson.features.map(feature => ({
        ...feature,
        properties: {
          ...feature.properties,
          ten: convertTcvn3ToUnicode(feature.properties.ten || "")
        }
      }));
    }

    console.log(`✅ Loaded ${geojson.features.length} terrain/hydro/transport features`);
    res.json(geojson);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu địa hình:", err);
    res.status(500).json({ error: "Lỗi server khi lấy dữ liệu địa hình" });
  }
});
/**
 * @swagger
 * /layer-data/forest-types:
 *   get:
 *     summary: Lấy dữ liệu lớp 3 loại rừng (ĐÃ SỬA LỖI 100 ARGUMENTS)
 *     tags:
 *       - Layer Data
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 1000
 *         description: Số lượng records tối đa
 *     responses:
 *       200:
 *         description: Dữ liệu GeoJSON 3 loại rừng
 */
// Sửa endpoint forest-types trong layerData.routes.js
router.get("/forest-types", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 1000, 5000);

    // SỬA LẠI MAPPING CHO 3 LOẠI RỪNG
    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(feature), '[]'::json)
      ) AS geojson
      FROM (
        SELECT json_build_object(
          'type', 'Feature',
          'geometry', ST_AsGeoJSON(
            ST_Transform(
              ST_SetSRID(geom, 3405), 
              4326
            )
          )::json,
          'properties', json_build_object(
            'gid', gid,
            'xa', xa,
            'tk', tk,
            'khoanh', khoanh,
            'lo', lo,
            'dtich', dtich,
            'ldlr', ldlr,
            'malr3', malr3,
            'churung', churung,
            'tinh', tinh,
            'huyen', huyen,
            'layer_type', '3_forest_types',
            'forest_function', CASE
              WHEN malr3 = 1 THEN 'Rừng đặc dụng'
              WHEN malr3 = 3 THEN 'Rừng sản xuất'
              WHEN malr3 = 4 THEN 'Không xác định'
              WHEN malr3 IS NULL OR malr3 = 0 THEN 'Không xác định'
              ELSE 'Không xác định'
            END
          )
        ) as feature
        FROM laocai_rg3lr
        WHERE ST_IsValid(geom) AND geom IS NOT NULL
        ORDER BY gid
        LIMIT $1
      ) AS features;
    `;

    console.log(`🔍 Executing forest types query with coordinate transformation`);
    const result = await pool.query(query, [limit]);
    let geojson = result.rows[0].geojson;

    console.log(`📊 Forest types result count: ${geojson.features?.length || 0}`);
    
    // Log sample coordinates để kiểm tra TRANSFORM
    if (geojson.features && geojson.features.length > 0) {
      const sampleCoords = geojson.features[0].geometry?.coordinates?.[0]?.[0]?.[0];
      console.log(`🔍 Sample forest types coordinates AFTER transform:`, sampleCoords);
      
      if (sampleCoords && Array.isArray(sampleCoords)) {
        const [lng, lat] = sampleCoords;
        if (lng >= 103 && lng <= 105 && lat >= 21 && lat <= 24) {
          console.log(`✅ Transform thành công! WGS84 hợp lệ: lng=${lng}, lat=${lat}`);
        } else {
          console.error(`❌ Transform thất bại! Tọa độ không hợp lệ: lng=${lng}, lat=${lat}`);
        }
      }
    }

    // Chuyển đổi TCVN3 sang Unicode cho các trường text
    if (geojson.features) {
      geojson.features = geojson.features.map(feature => ({
        ...feature,
        properties: {
          ...feature.properties,
          xa: convertTcvn3ToUnicode(feature.properties.xa || ""),
          churung: convertTcvn3ToUnicode(feature.properties.churung || ""),
          tinh: convertTcvn3ToUnicode(feature.properties.tinh || ""),
          huyen: convertTcvn3ToUnicode(feature.properties.huyen || ""),
          ldlr: convertTcvn3ToUnicode(feature.properties.ldlr || "")
        }
      }));
    }

    console.log(`✅ Loaded ${geojson.features.length} forest types features`);
    
    // Log thống kê theo loại rừng để debug
    const typeStats = {};
    const malr3Stats = {};
    geojson.features.forEach(feature => {
      const type = feature.properties.forest_function;
      const malr3 = feature.properties.malr3;
      typeStats[type] = (typeStats[type] || 0) + 1;
      malr3Stats[malr3] = (malr3Stats[malr3] || 0) + 1;
    });
    console.log("📊 Thống kê theo loại rừng:", typeStats);
    console.log("📊 Thống kê theo mã malr3:", malr3Stats);
    
    res.json(geojson);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu 3 loại rừng:", err);
    res.status(500).json({ error: "Lỗi server khi lấy dữ liệu 3 loại rừng" });
  }
});

/**
 * @swagger
 * /layer-data/forest-status:
 *   get:
 *     summary: Lấy dữ liệu lớp hiện trạng rừng đầy đủ
 *     tags:
 *       - Layer Data
 *     responses:
 *       200:
 *         description: Dữ liệu GeoJSON hiện trạng rừng
 */
router.get("/forest-status", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 1000, 5000);

    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(feature), '[]'::json)
      ) AS geojson
      FROM (
        SELECT json_build_object(
          'type', 'Feature',
          'geometry', ST_AsGeoJSON(
            ST_Transform(ST_SetSRID(geom, 3405), 4326)
          )::json,
          'properties', json_build_object(
            'gid', gid,
            'huyen', huyen,
            'xa', xa,
            'tk', tk,
            'khoanh', khoanh,
            'lo', lo,
            'thuad', thuad,
            'dtich', dtich,
            'ldlr', ldlr,
            'churung', churung,
            'layer_type', 'current_forest_status',
            'area_ha', ROUND((dtich)::numeric, 2)
          )
        ) as feature
        FROM tlaocai_tkk_3lr_cru
        WHERE ST_IsValid(geom) AND geom IS NOT NULL
        ORDER BY gid
        LIMIT $1
      ) AS features;
    `;

    const result = await pool.query(query, [limit]);
    let geojson = result.rows[0].geojson;

    // Chuyển đổi TCVN3 sang Unicode
    if (geojson.features) {
      geojson.features = geojson.features.map(feature => ({
        ...feature,
        properties: {
          ...feature.properties,
          huyen: convertTcvn3ToUnicode(feature.properties.huyen || ""),
          xa: convertTcvn3ToUnicode(feature.properties.xa || ""),
          churung: convertTcvn3ToUnicode(feature.properties.churung || ""),
          ldlr: convertTcvn3ToUnicode(feature.properties.ldlr || "")
        }
      }));
    }

    console.log(`✅ Loaded ${geojson.features.length} forest status features`);
    res.json(geojson);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu hiện trạng rừng:", err);
    res.status(500).json({ error: "Lỗi server khi lấy dữ liệu hiện trạng rừng" });
  }
});

/**
 * @swagger
 * /layer-data/deforestation-alerts:
 *   get:
 *     summary: Lấy dữ liệu lớp dự báo mất rừng mới nhất
 *     tags:
 *       - Layer Data
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Số ngày gần đây
 *     responses:
 *       200:
 *         description: Dữ liệu GeoJSON dự báo mất rừng mới nhất
 */
router.get("/deforestation-alerts", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(geom)::json,
            'properties', json_build_object(
              'gid', gid,
              'start_dau', start_dau,
              'end_sau', end_sau,
              'area', area,
              'area_ha', ROUND((area / 10000)::numeric, 2),
              'mahuyen', mahuyen,
              'layer_type', 'deforestation_alert',
              'alert_level', CASE
                WHEN CURRENT_DATE - end_sau::date <= 7 THEN 'critical'
                WHEN CURRENT_DATE - end_sau::date <= 30 THEN 'high'
                ELSE 'medium'
              END,
              'days_since', CURRENT_DATE - end_sau::date
            )
          )
        ), '[]'::json)
      ) AS geojson
      FROM mat_rung
      WHERE ST_IsValid(geom)
        AND end_sau::date >= CURRENT_DATE - INTERVAL '$1 days'
      ORDER BY end_sau DESC
      LIMIT 1000;
    `;

    const result = await pool.query(query, [days]);
    let geojson = result.rows[0].geojson;

    console.log(`✅ Loaded ${geojson.features.length} deforestation alert features`);
    res.json(geojson);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu dự báo mất rừng:", err);
    res.status(500).json({ error: "Lỗi server khi lấy dữ liệu dự báo mất rừng" });
  }
});

module.exports = router;