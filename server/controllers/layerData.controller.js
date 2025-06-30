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
 * Lấy dữ liệu lớp các loại rừng từ laocai_rg3lr - DỰA TRÊN CỘT LDLR
 */
exports.getForestTypes = async (req, res) => {
  try {
    console.log(`📥 Loading forest types data from laocai_rg3lr based on LDLR column`);
    
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
            'layer_type', 'forest_types_ldlr',
            'forest_function', CASE
              WHEN TRIM(UPPER(COALESCE(ldlr, ''))) = 'RTG' THEN 'Rừng tự nhiên giàu'
              WHEN TRIM(UPPER(COALESCE(ldlr, ''))) = 'RTN' THEN 'Rừng tự nhiên nghèo'
              WHEN TRIM(UPPER(COALESCE(ldlr, ''))) = 'RTTN' THEN 'Rừng trồng tự nhiên'
              WHEN TRIM(UPPER(COALESCE(ldlr, ''))) = 'RTK' THEN 'Rừng trồng khác'
              WHEN TRIM(UPPER(COALESCE(ldlr, ''))) = 'RTCD' THEN 'Rừng trồng cây dược liệu'
              WHEN TRIM(UPPER(COALESCE(ldlr, ''))) = 'TXN' THEN 'Trồng xen nương'
              WHEN TRIM(UPPER(COALESCE(ldlr, ''))) = 'TXP' THEN 'Trồng xen phụ'
              WHEN TRIM(UPPER(COALESCE(ldlr, ''))) = 'TXK' THEN 'Trồng xen khác'
              WHEN TRIM(UPPER(COALESCE(ldlr, ''))) = 'TXDN' THEN 'Trồng xen đặc nông'
              WHEN TRIM(UPPER(COALESCE(ldlr, ''))) = 'TNK' THEN 'Trồng nương khác'
              WHEN TRIM(UPPER(COALESCE(ldlr, ''))) = 'DT1' THEN 'Đất trống loại 1'
              WHEN TRIM(UPPER(COALESCE(ldlr, ''))) = 'DT2' THEN 'Đất trống loại 2'
              WHEN TRIM(UPPER(COALESCE(ldlr, ''))) = 'DTR' THEN 'Đất trống rừng'
              WHEN TRIM(UPPER(COALESCE(ldlr, ''))) = 'DNN' THEN 'Đất nông nghiệp'
              WHEN TRIM(UPPER(COALESCE(ldlr, ''))) = 'HG1' THEN 'Hỗn giao loại 1'
              WHEN TRIM(UPPER(COALESCE(ldlr, ''))) = 'HG2' THEN 'Hỗn giao loại 2'
              WHEN TRIM(COALESCE(ldlr, '')) != '' THEN ldlr
              ELSE 'Không xác định'
            END,
            'ldlr_code', ldlr,
            'ldlr_category', CASE
              WHEN TRIM(UPPER(COALESCE(ldlr, ''))) IN ('RTG', 'RTN', 'RTTN') THEN 'Rừng tự nhiên'
              WHEN TRIM(UPPER(COALESCE(ldlr, ''))) IN ('RTK', 'RTCD') THEN 'Rừng trồng'
              WHEN TRIM(UPPER(COALESCE(ldlr, ''))) IN ('TXN', 'TXP', 'TXK', 'TXDN', 'TNK') THEN 'Đất trồng cây lâm nghiệp'
              WHEN TRIM(UPPER(COALESCE(ldlr, ''))) IN ('DT1', 'DT2', 'DTR') THEN 'Đất trống'
              WHEN TRIM(UPPER(COALESCE(ldlr, ''))) = 'DNN' THEN 'Đất nông nghiệp'
              WHEN TRIM(UPPER(COALESCE(ldlr, ''))) IN ('HG1', 'HG2') THEN 'Hỗn giao'
              ELSE 'Khác'
            END
          )
        ) as feature
        FROM laocai_rg3lr
        WHERE ST_IsValid(geom) 
          AND geom IS NOT NULL
          AND ldlr IS NOT NULL 
          AND TRIM(ldlr) != ''
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
          forest_function: convertTcvn3ToUnicode(feature.properties.forest_function || "")
        }
      }));
    }

    // Log thống kê chi tiết các loại rừng theo LDLR
    const typeStats = {};
    const categoryStats = {};
    const ldlrStats = {};
    
    geojson.features.forEach(feature => {
      const forestFunction = feature.properties.forest_function;
      const category = feature.properties.ldlr_category;
      const ldlr = feature.properties.ldlr_code || "";
      
      typeStats[forestFunction] = (typeStats[forestFunction] || 0) + 1;
      categoryStats[category] = (categoryStats[category] || 0) + 1;
      if (ldlr.trim()) {
        ldlrStats[ldlr] = (ldlrStats[ldlr] || 0) + 1;
      }
    });
    
    console.log("📊 Thống kê các loại rừng theo LDLR:", typeStats);
    console.log("📊 Thống kê theo nhóm:", categoryStats);
    console.log("📊 Thống kê mã LDLR:", ldlrStats);

    // Thêm metadata về các loại rừng có trong dữ liệu
    geojson.forestTypes = Object.keys(typeStats).map(type => ({
      name: type,
      count: typeStats[type],
      category: Object.keys(categoryStats).find(cat => 
        geojson.features.some(f => 
          f.properties.forest_function === type && f.properties.ldlr_category === cat
        )
      )
    })).sort((a, b) => b.count - a.count);

    // Thêm metadata về các nhóm
    geojson.forestCategories = Object.keys(categoryStats).map(category => ({
      name: category,
      count: categoryStats[category]
    })).sort((a, b) => b.count - a.count);

    console.log(`✅ Loaded ${geojson.features.length} forest features with ${Object.keys(typeStats).length} different types in ${Object.keys(categoryStats).length} categories`);
    res.json(geojson);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu các loại rừng theo LDLR:", err);
    res.status(500).json({ 
      error: "Lỗi server khi lấy dữ liệu các loại rừng theo LDLR",
      details: err.message
    });
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