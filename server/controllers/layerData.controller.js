// server/controllers/layerData.controller.js
const pool = require("../db");
const convertTcvn3ToUnicode = require("../utils/convertTcvn3ToUnicode");

/**
 * Lấy thông tin tổng quan về các lớp dữ liệu
 */
exports.getLayerInfo = async (req, res) => {
  try {
    const info = {};
    
    // Kiểm tra và đếm records của từng bảng thực tế
    const tables = [
      { name: 'laocai_ranhgioihc', key: 'administrative' },
      { name: 'laocai_chuquanly', key: 'forest_management' },
      { name: 'laocai_nendiahinh', key: 'terrain' },
      { name: 'laocai_rg3lr', key: 'forest_types' },
      { name: 'mat_rung', key: 'deforestation_alerts' }
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
};

/**
 * Lấy dữ liệu lớp ranh giới hành chính từ laocai_ranhgioihc
 */
exports.getAdministrativeBoundaries = async (req, res) => {
  try {
    console.log(`📥 Loading administrative boundaries from laocai_ranhgioihc`);
    
    const limit = Math.min(parseInt(req.query.limit) || 1000, 2000);
    
    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(feature), '[]'::json)
      ) AS geojson
      FROM (
        SELECT json_build_object(
          'type', 'Feature',
          'geometry', ST_AsGeoJSON(geom)::json,
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
};

/**
 * Lấy dữ liệu lớp chủ quản lý rừng từ laocai_chuquanly
 */
exports.getForestManagement = async (req, res) => {
  try {
    console.log(`📥 Loading forest management data from laocai_chuquanly`);
    
    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(feature), '[]'::json)
      ) AS geojson
      FROM (
        SELECT json_build_object(
          'type', 'Feature',
          'geometry', ST_AsGeoJSON(geom)::json,
          'properties', json_build_object(
            'gid', gid,
            'tt', tt,
            'chuquanly', COALESCE(chuquanly, 'Không xác định'),
            'layer_type', 'forest_management'
          )
        ) as feature
        FROM laocai_chuquanly
        WHERE ST_IsValid(geom) 
          AND geom IS NOT NULL
        ORDER BY gid
        LIMIT 1000
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
          chuquanly: convertTcvn3ToUnicode(feature.properties.chuquanly || "")
        }
      }));
    }

    console.log(`✅ Loaded ${geojson.features.length} forest management features`);
    res.json(geojson);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu chủ quản lý rừng:", err);
    res.status(500).json({ 
      error: "Lỗi server khi lấy dữ liệu chủ quản lý rừng",
      details: err.message
    });
  }
};

/**
 * Lấy dữ liệu lớp nền địa hình từ laocai_nendiahinh và laocai_nendiahinh_line
 */
exports.getTerrainData = async (req, res) => {
  try {
    console.log(`📥 Loading terrain data from laocai_nendiahinh and laocai_nendiahinh_line`);
    
    // Query 1: Lấy dữ liệu polygon từ laocai_nendiahinh - RAW DATA
    const polygonQuery = `
      SELECT 
        gid,
        id,
        ma,
        ten,
        ST_AsGeoJSON(geom) as geometry
      FROM laocai_nendiahinh
      WHERE ST_IsValid(geom) AND geom IS NOT NULL
      ORDER BY gid
      LIMIT 500;
    `;

    // Query 2: Lấy dữ liệu line từ laocai_nendiahinh_line - RAW DATA
    const lineQuery = `
      SELECT 
        gid,
        id,
        ma,
        ten,
        ST_AsGeoJSON(geom) as geometry
      FROM laocai_nendiahinh_line
      WHERE ST_IsValid(geom) AND geom IS NOT NULL
      ORDER BY gid
      LIMIT 500;
    `;

    console.log(`🔍 Executing polygon query...`);
    const polygonResult = await pool.query(polygonQuery);
    
    console.log(`🔍 Executing line query...`);
    const lineResult = await pool.query(lineQuery);

    console.log(`📊 Raw polygon records: ${polygonResult.rows.length}`);
    console.log(`📊 Raw line records: ${lineResult.rows.length}`);

    // Build GeoJSON features trong JavaScript
    const allFeatures = [];

    // Xử lý polygon features
    polygonResult.rows.forEach(row => {
      try {
        const feature = {
          type: "Feature",
          geometry: JSON.parse(row.geometry),
          properties: {
            gid: row.gid,
            id: row.id,
            ma: row.ma,
            ten: convertTcvn3ToUnicode(row.ten || ""),
            layer_type: 'terrain_polygon',
            feature_type: getFeatureType(row.ten)
          }
        };
        allFeatures.push(feature);
      } catch (err) {
        console.warn(`⚠️ Skipping invalid polygon geometry for gid: ${row.gid}`);
      }
    });

    // Xử lý line features
    lineResult.rows.forEach(row => {
      try {
        const feature = {
          type: "Feature",
          geometry: JSON.parse(row.geometry),
          properties: {
            gid: row.gid,
            id: row.id,
            ma: row.ma,
            ten: convertTcvn3ToUnicode(row.ten || ""),
            layer_type: 'terrain_line',
            feature_type: getFeatureType(row.ten)
          }
        };
        allFeatures.push(feature);
      } catch (err) {
        console.warn(`⚠️ Skipping invalid line geometry for gid: ${row.gid}`);
      }
    });

    // Tạo GeoJSON cuối cùng
    const geojson = {
      type: "FeatureCollection",
      features: allFeatures
    };

    // Log thống kê cuối cùng
    const polygonCount = geojson.features.filter(f => f.properties.layer_type === 'terrain_polygon').length;
    const lineCount = geojson.features.filter(f => f.properties.layer_type === 'terrain_line').length;
    
    console.log(`✅ Built ${geojson.features.length} terrain features:`);
    console.log(`🔳 Polygons: ${polygonCount}`);
    console.log(`📏 Lines: ${lineCount}`);
    
    res.json(geojson);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu nền địa hình:", err);
    res.status(500).json({ 
      error: "Lỗi server khi lấy dữ liệu nền địa hình",
      details: err.message
    });
  }
};

// Helper function để xác định loại feature
function getFeatureType(ten) {
  if (!ten) return 'terrain';
  
  const tenLower = ten.toLowerCase();
  
  if (tenLower.includes('sông') || tenLower.includes('suối') || tenLower.includes('kênh')) {
    return 'waterway';
  }
  if (tenLower.includes('thủy') || tenLower.includes('cảng')) {
    return 'water_transport';
  }
  if (tenLower.includes('đường') || tenLower.includes('quốc lộ') || tenLower.includes('tỉnh lộ')) {
    return 'road';
  }
  
  return 'terrain';
}

/**
 * Lấy dữ liệu lớp 3 loại rừng từ laocai_rg3lr - HIỂN THỊ ĐẦY ĐỦ TẤT CẢ LOẠI RỪNG
 */
exports.getForestTypes = async (req, res) => {
  try {
    console.log(`📥 Loading all forest types data from laocai_rg3lr`);
    
    const limit = Math.min(parseInt(req.query.limit) || 2000, 5000);

    const query = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(feature), '[]'::json)
      ) AS geojson
      FROM (
        SELECT json_build_object(
          'type', 'Feature',
          'geometry', ST_AsGeoJSON(geom)::json,
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
            'layer_type', 'forest_types_full',
            'forest_function', CASE
              WHEN malr3 = 1 THEN 'Rừng đặc dụng'
              WHEN malr3 = 2 THEN 'Rừng phòng hộ'
              WHEN malr3 = 3 THEN 'Rừng sản xuất'
              ELSE CASE
                WHEN UPPER(TRIM(COALESCE(ldlr, ''))) LIKE '%RDD%' OR UPPER(TRIM(COALESCE(ldlr, ''))) LIKE '%ĐẶC DỤNG%' THEN 'Rừng đặc dụng (LDLR)'
                WHEN UPPER(TRIM(COALESCE(ldlr, ''))) LIKE '%RPH%' OR UPPER(TRIM(COALESCE(ldlr, ''))) LIKE '%PHÒNG HỘ%' THEN 'Rừng phòng hộ (LDLR)'
                WHEN UPPER(TRIM(COALESCE(ldlr, ''))) LIKE '%RSX%' OR UPPER(TRIM(COALESCE(ldlr, ''))) LIKE '%SẢN XUẤT%' THEN 'Rừng sản xuất (LDLR)'
                WHEN UPPER(TRIM(COALESCE(ldlr, ''))) LIKE '%KLN%' OR UPPER(TRIM(COALESCE(ldlr, ''))) LIKE '%KHÁC%' THEN 'Đất lâm nghiệp khác'
                WHEN UPPER(TRIM(COALESCE(ldlr, ''))) LIKE '%NKR%' OR UPPER(TRIM(COALESCE(ldlr, ''))) LIKE '%KHÔNG RỪNG%' THEN 'Đất không rừng'
                WHEN UPPER(TRIM(COALESCE(ldlr, ''))) LIKE '%RNT%' OR UPPER(TRIM(COALESCE(ldlr, ''))) LIKE '%TỰ NHIÊN%' THEN 'Rừng tự nhiên'
                WHEN UPPER(TRIM(COALESCE(ldlr, ''))) LIKE '%RTT%' OR UPPER(TRIM(COALESCE(ldlr, ''))) LIKE '%TRỒNG%' THEN 'Rừng trồng'
                WHEN TRIM(COALESCE(ldlr, '')) != '' THEN ldlr
                ELSE 'Không xác định'
              END
            END,
            'malr3_code', malr3,
            'ldlr_code', ldlr
          )
        ) as feature
        FROM laocai_rg3lr
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
          xa: convertTcvn3ToUnicode(feature.properties.xa || ""),
          churung: convertTcvn3ToUnicode(feature.properties.churung || ""),
          tinh: convertTcvn3ToUnicode(feature.properties.tinh || ""),
          huyen: convertTcvn3ToUnicode(feature.properties.huyen || ""),
          ldlr: convertTcvn3ToUnicode(feature.properties.ldlr || ""),
          forest_function: convertTcvn3ToUnicode(feature.properties.forest_function || "")
        }
      }));
    }

    // Log thống kê tất cả các loại rừng có trong dữ liệu
    const typeStats = {};
    const malr3Stats = {};
    const ldlrStats = {};
    
    geojson.features.forEach(feature => {
      const forestFunction = feature.properties.forest_function;
      const malr3 = feature.properties.malr3_code;
      const ldlr = feature.properties.ldlr_code || "";
      
      typeStats[forestFunction] = (typeStats[forestFunction] || 0) + 1;
      malr3Stats[malr3] = (malr3Stats[malr3] || 0) + 1;
      if (ldlr.trim()) {
        ldlrStats[ldlr] = (ldlrStats[ldlr] || 0) + 1;
      }
    });
    
    console.log("📊 Thống kê đầy đủ các loại rừng:", typeStats);
    console.log("📊 Thống kê MALR3:", malr3Stats);
    console.log("📊 Thống kê LDLR:", ldlrStats);

    // Thêm metadata về các loại rừng có trong dữ liệu
    geojson.forestTypes = Object.keys(typeStats).map(type => ({
      name: type,
      count: typeStats[type]
    })).sort((a, b) => b.count - a.count);

    console.log(`✅ Loaded ${geojson.features.length} forest features with ${Object.keys(typeStats).length} different types`);
    res.json(geojson);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu đầy đủ các loại rừng:", err);
    res.status(500).json({ error: "Lỗi server khi lấy dữ liệu đầy đủ các loại rừng" });
  }
};
/**
 * Lấy dữ liệu lớp dự báo mất rừng mới nhất từ bảng mat_rung - 30 NGÀY GẦN NHẤT
 */
exports.getDeforestationAlerts = async (req, res) => {
  try {
    console.log(`📥 Loading latest deforestation alerts from mat_rung`);
    
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
                WHEN CURRENT_DATE - end_sau::date <= 15 THEN 'high'
                WHEN CURRENT_DATE - end_sau::date <= 30 THEN 'medium'
                ELSE 'low'
              END,
              'days_since', CURRENT_DATE - end_sau::date,
              'detection_status', COALESCE(detection_status, 'Chưa xác minh')
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

    // Log thống kê mức cảnh báo
    if (geojson.features) {
      const alertStats = {};
      geojson.features.forEach(feature => {
        const level = feature.properties.alert_level;
        alertStats[level] = (alertStats[level] || 0) + 1;
      });
      console.log("⚠️ Thống kê mức cảnh báo:", alertStats);
    }

    console.log(`✅ Loaded ${geojson.features.length} deforestation alert features from last ${days} days`);
    res.json(geojson);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu dự báo mất rừng:", err);
    res.status(500).json({ error: "Lỗi server khi lấy dữ liệu dự báo mất rừng" });
  }
};

/**
 * Lấy dữ liệu lớp hiện trạng rừng (giữ nguyên endpoint cũ)
 */
exports.getForestStatus = async (req, res) => {
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
          'geometry', ST_AsGeoJSON(geom)::json,
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
};