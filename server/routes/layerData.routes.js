// server/routes/layerData.routes.js
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
                 ST_Extent(geom) as bbox
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

/**
 * @swagger
 * /layer-data/administrative:
 *   get:
 *     summary: Lấy dữ liệu lớp ranh giới hành chính
 *     tags:
 *       - Layer Data
 *     responses:
 *       200:
 *         description: Dữ liệu GeoJSON ranh giới hành chính
 */
router.get("/administrative", async (req, res) => {
  try {
    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(geom)::json,
            'properties', json_build_object(
              'gid', gid,
              'huyen', huyen,
              'xa', xa,
              'tieukhu', tieukhu,
              'khoanh', khoanh
            )
          )
        ), '[]'::json)
      ) AS geojson
      FROM laocai_ranhgioihc
      WHERE ST_IsValid(geom);
    `;

    const result = await pool.query(query);
    let geojson = result.rows[0].geojson;

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
    res.json(geojson);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu ranh giới hành chính:", err);
    res.status(500).json({ error: "Lỗi server khi lấy dữ liệu ranh giới hành chính" });
  }
});

/**
 * @swagger
 * /layer-data/forest-management:
 *   get:
 *     summary: Lấy dữ liệu lớp chủ quản lý rừng
 *     tags:
 *       - Layer Data
 *     responses:
 *       200:
 *         description: Dữ liệu GeoJSON chủ quản lý rừng
 */
router.get("/forest-management", async (req, res) => {
  try {
    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(geom)::json,
            'properties', json_build_object(
              'gid', gid,
              'tt', tt,
              'chuquanly', chuquanly
            )
          )
        ), '[]'::json)
      ) AS geojson
      FROM laocai_chuquanly
      WHERE ST_IsValid(geom);
    `;

    const result = await pool.query(query);
    let geojson = result.rows[0].geojson;

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
    res.json(geojson);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu chủ quản lý rừng:", err);
    res.status(500).json({ error: "Lỗi server khi lấy dữ liệu chủ quản lý rừng" });
  }
});

/**
 * @swagger
 * /layer-data/terrain:
 *   get:
 *     summary: Lấy dữ liệu lớp địa hình
 *     tags:
 *       - Layer Data
 *     responses:
 *       200:
 *         description: Dữ liệu GeoJSON địa hình
 */
router.get("/terrain", async (req, res) => {
  try {
    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(geom)::json,
            'properties', json_build_object(
              'gid', gid,
              'id', id,
              'ma', ma,
              'ten', ten
            )
          )
        ), '[]'::json)
      ) AS geojson
      FROM laocai_nendiahinh
      WHERE ST_IsValid(geom);
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

    console.log(`✅ Loaded ${geojson.features.length} terrain features`);
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
 *     summary: Lấy dữ liệu lớp 3 loại rừng
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
router.get("/forest-types", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 1000, 5000);

    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(geom)::json,
            'properties', json_build_object(
              'gid', gid,
              'tt', tt,
              'id', id,
              'xa', xa,
              'tk', tk,
              'khoanh', khoanh,
              'lo', lo,
              'diadanh', diadanh,
              'dtich', dtich,
              'ldlr', ldlr,
              'sldlr', sldlr,
              'namtr', namtr,
              'captuoi', captuoi,
              'malr3', malr3,
              'mdsd', mdsd,
              'churung', churung,
              'tinh', tinh,
              'huyen', huyen
            )
          )
        ), '[]'::json)
      ) AS geojson
      FROM laocai_rg3lr
      WHERE ST_IsValid(geom)
      ORDER BY gid
      LIMIT $1;
    `;

    const result = await pool.query(query, [limit]);
    let geojson = result.rows[0].geojson;

    // Chuyển đổi TCVN3 sang Unicode cho các trường text
    if (geojson.features) {
      geojson.features = geojson.features.map(feature => {
        const convertedProperties = {};
        for (const [key, value] of Object.entries(feature.properties)) {
          if (typeof value === 'string') {
            convertedProperties[key] = convertTcvn3ToUnicode(value);
          } else {
            convertedProperties[key] = value;
          }
        }
        return {
          ...feature,
          properties: convertedProperties
        };
      });
    }

    console.log(`✅ Loaded ${geojson.features.length} forest types features`);
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
 *     summary: Lấy dữ liệu lớp hiện trạng rừng
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
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(ST_Transform(ST_SetSRID(geom, 3405), 4326))::json,
            'properties', to_jsonb(t) - 'geom'
          )
        ), '[]'::json)
      ) AS geojson
      FROM tlaocai_tkk_3lr_cru t
      WHERE ST_IsValid(geom)
      ORDER BY gid
      LIMIT $1;
    `;

    const result = await pool.query(query, [limit]);
    let geojson = result.rows[0].geojson;

    // Chuyển đổi TCVN3 sang Unicode
    if (geojson.features) {
      geojson.features = geojson.features.map(feature => {
        const convertedProperties = {};
        for (const [key, value] of Object.entries(feature.properties)) {
          if (typeof value === 'string') {
            convertedProperties[key] = convertTcvn3ToUnicode(value);
          } else {
            convertedProperties[key] = value;
          }
        }
        return {
          ...feature,
          properties: convertedProperties
        };
      });
    }

    console.log(`✅ Loaded ${geojson.features.length} forest status features`);
    res.json(geojson);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu hiện trạng rừng:", err);
    res.status(500).json({ error: "Lỗi server khi lấy dữ liệu hiện trạng rừng" });
  }
});

module.exports = router;