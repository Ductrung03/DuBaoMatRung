const express = require("express");
const { Pool } = require("pg");
const router = express.Router();

const pool = new Pool();

router.get("/", async (req, res) => {
  const {
    fromDate,
    toDate,
    huyen,
    xa,
    tk,
    khoanh,
    churung,
    limit = 1000,  // ✅ Thêm limit mặc định để tránh tải quá nhiều data
  } = req.query;

  try {
    // ✅ TRƯỜNG HỢP 1: Không có filter gì - lấy dữ liệu mặc định
    if (!fromDate && !toDate && !huyen && !xa && !tk && !khoanh && !churung) {
      console.log("🔴 Loading toàn bộ dữ liệu mat_rung mặc định...");
      
      const defaultQuery = `
        SELECT json_build_object(
          'type', 'FeatureCollection',
          'features', COALESCE(json_agg(
            json_build_object(
              'type', 'Feature',
              'geometry', ST_AsGeoJSON(ST_Transform(geom, 4326))::json,
              'properties', to_jsonb(t) - 'geom'
            )
          ), '[]'::json)
        ) AS geojson
        FROM (
          SELECT * FROM mat_rung 
          WHERE geom IS NOT NULL 
          ORDER BY gid DESC 
          LIMIT $1
        ) AS t;
      `;

      const defaultResult = await pool.query(defaultQuery, [limit]);
      const matRungGeoJSON = defaultResult.rows[0].geojson;

      console.log(`✅ Loaded ${matRungGeoJSON.features?.length || 0} mat_rung features mặc định`);

      return res.json({
        message: `✅ Đã tải ${matRungGeoJSON.features?.length || 0} khu vực mất rừng mặc định`,
        mat_rung: matRungGeoJSON,
        tkk_3lr_cru: { type: "FeatureCollection", features: [] }, // Empty để tương thích
        isDefault: true,
        totalLoaded: matRungGeoJSON.features?.length || 0
      });
    }

    // ✅ TRƯỜNG HỢP 2: Có filter - logic cũ
    if (!fromDate || !toDate) {
      return res.status(400).json({ 
        message: "Cần có tham số từ ngày và đến ngày khi tìm kiếm có điều kiện." 
      });
    }

    console.log("🔍 Loading dữ liệu mat_rung với filter...");

    // ========= Truy vấn bảng mat_rung với filter =========
    const matRungQuery = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(ST_Transform(geom, 4326))::json,
            'properties', to_jsonb(t) - 'geom'
          )
        ), '[]'::json)
      ) AS geojson
      FROM (
        SELECT * FROM mat_rung 
        WHERE start_dau >= $1 AND end_sau <= $2
        ORDER BY gid DESC
        LIMIT $3
      ) AS t;
    `;

    const matRungResult = await pool.query(matRungQuery, [fromDate, toDate, limit]);
    const matRungGeoJSON = matRungResult.rows[0].geojson;

    // ========= Truy vấn bảng tlaocai_tkk_3lr_cru =========
    const conditions = [];
    const params = [];
    let index = 1;

    if (huyen) {
      conditions.push(`huyen = $${index++}`);
      params.push(huyen);
    }
    if (xa) {
      conditions.push(`xa = $${index++}`);
      params.push(xa);
    }
    if (tk) {
      conditions.push(`tk = $${index++}`);
      params.push(tk);
    }
    if (khoanh) {
      conditions.push(`khoanh = $${index++}`);
      params.push(khoanh);
    }
    if (churung) {
      conditions.push(`churung ILIKE $${index++}`);
      params.push(`%${churung}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const cruQuery = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(ST_Transform(geom, 4326))::json,
            'properties', to_jsonb(t) - 'geom'
          )
        ), '[]'::json)
      ) AS geojson
      FROM (
        SELECT * FROM tlaocai_tkk_3lr_cru t
        ${whereClause}
        LIMIT 1000
      ) AS t;
    `;

    const cruResult = await pool.query(cruQuery, params);
    const cruGeoJSON = cruResult.rows[0].geojson;

    console.log(`✅ Loaded ${matRungGeoJSON.features?.length || 0} mat_rung features với filter`);

    res.json({
      message: "✅ Dữ liệu đã được truy xuất thành công với filter.",
      mat_rung: matRungGeoJSON,
      tkk_3lr_cru: cruGeoJSON,
      isDefault: false,
      filters: {
        fromDate,
        toDate,
        huyen,
        xa,
        tk,
        khoanh,
        churung
      }
    });
  } catch (err) {
    console.error("❌ Lỗi truy vấn dữ liệu mat_rung:", err);
    res.status(500).json({ 
      message: "Lỗi server khi truy vấn dữ liệu.", 
      error: err.message 
    });
  }
});

// ✅ ENDPOINT MỚI: Lấy toàn bộ dữ liệu mat_rung (phục vụ cho load mặc định)
router.get("/all", async (req, res) => {
  const { limit = 1000 } = req.query;
  
  try {
    console.log(`🔴 Loading ALL mat_rung data with limit: ${limit}`);
    
    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(ST_Transform(geom, 4326))::json,
            'properties', to_jsonb(t) - 'geom'
          )
        ), '[]'::json)
      ) AS geojson
      FROM (
        SELECT 
          gid,
          start_sau,
          area,
          start_dau,
          end_sau,
          mahuyen,
          end_dau,
          detection_status
        FROM mat_rung 
        WHERE geom IS NOT NULL 
          AND ST_IsValid(geom)
        ORDER BY gid DESC 
        LIMIT $1
      ) AS t;
    `;

    const result = await pool.query(query, [parseInt(limit)]);
    const geoJSON = result.rows[0].geojson;

    console.log(`✅ Successfully loaded ${geoJSON.features?.length || 0} mat_rung features`);

    res.json({
      success: true,
      message: `Đã tải ${geoJSON.features?.length || 0} khu vực mất rừng`,
      data: geoJSON,
      total: geoJSON.features?.length || 0,
      limit: parseInt(limit)
    });

  } catch (err) {
    console.error("❌ Lỗi khi lấy toàn bộ dữ liệu mat_rung:", err);
    res.status(500).json({ 
      success: false,
      message: "Lỗi server khi lấy dữ liệu mất rừng",
      error: err.message 
    });
  }
});

// ✅ ENDPOINT MỚI: Lấy thống kê dữ liệu mat_rung
router.get("/stats", async (req, res) => {
  try {
    console.log("📊 Getting mat_rung statistics...");
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN geom IS NOT NULL THEN 1 END) as records_with_geometry,
        MIN(start_dau) as earliest_date,
        MAX(end_sau) as latest_date,
        SUM(area) as total_area,
        COUNT(DISTINCT mahuyen) as unique_districts
      FROM mat_rung;
    `;

    const result = await pool.query(statsQuery);
    const stats = result.rows[0];

    // Format area thành hectares
    stats.total_area_ha = stats.total_area ? parseFloat((stats.total_area / 10000).toFixed(2)) : 0;

    console.log("📊 Mat rung statistics:", stats);

    res.json({
      success: true,
      data: stats
    });

  } catch (err) {
    console.error("❌ Lỗi khi lấy thống kê mat_rung:", err);
    res.status(500).json({ 
      success: false,
      message: "Lỗi server khi lấy thống kê",
      error: err.message 
    });
  }
});

module.exports = router;