// server/controllers/layerData.controller.js - PHIÊN BẢN TỐI ƯU
const pool = require("../db");
const convertTcvn3ToUnicode = require("../utils/convertTcvn3ToUnicode");

/**
 * Cache để lưu trữ kết quả
 */
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 phút

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
 * Hàm helper để xử lý pagination và streaming
 */
const streamLargeDataset = async (tableName, query, simplifyTolerance = 0.00001, pageSize = 5000) => {
  const client = await pool.connect();
  
  try {
    // Bật autocommit để tránh long-running transactions
    await client.query('BEGIN');
    await client.query('SET work_mem = "256MB"'); // Tăng memory cho query
    await client.query('COMMIT');
    
    const allFeatures = [];
    let offset = 0;
    let hasMore = true;
    let totalLoaded = 0;
    
    console.log(`🔄 Bắt đầu stream data từ ${tableName} với page size ${pageSize}`);
    
    while (hasMore) {
      const startTime = Date.now();
      
      // Modify query để có LIMIT và OFFSET
      const paginatedQuery = query.replace(/ORDER BY.*?;?\s*$/, '') + 
        ` ORDER BY gid LIMIT ${pageSize} OFFSET ${offset}`;
      
      console.log(`📄 Loading page ${Math.floor(offset/pageSize) + 1}, offset: ${offset}`);
      
      const result = await client.query(paginatedQuery);
      const loadTime = Date.now() - startTime;
      
      if (result.rows.length === 0) {
        hasMore = false;
        break;
      }
      
      // Process từng row thay vì dùng json_agg()
      for (const row of result.rows) {
        try {
          const feature = {
            type: "Feature",
            geometry: JSON.parse(row.geometry),
            properties: { ...row }
          };
          delete feature.properties.geometry; // Remove geometry from properties
          allFeatures.push(feature);
        } catch (err) {
          console.warn(`⚠️ Skipping invalid geometry for gid: ${row.gid}`);
        }
      }
      
      totalLoaded += result.rows.length;
      console.log(`✅ Loaded ${result.rows.length} records in ${loadTime}ms (Total: ${totalLoaded})`);
      
      // Kiểm tra memory usage
      const memUsage = process.memoryUsage();
      console.log(`💾 Memory: ${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`);
      
      offset += pageSize;
      
      // Dừng nếu ít hơn pageSize (page cuối)
      if (result.rows.length < pageSize) {
        hasMore = false;
      }
      
      // Safety break để tránh infinite loop
      if (offset > 1000000) { // Max 1M records
        console.warn(`⚠️ Reached safety limit at ${offset} records`);
        hasMore = false;
      }
    }
    
    console.log(`🎉 Completed streaming ${totalLoaded} features from ${tableName}`);
    
    return {
      type: "FeatureCollection",
      features: allFeatures,
      metadata: {
        total_features: totalLoaded,
        load_strategy: 'stream_pagination',
        page_size: pageSize
      }
    };
    
  } finally {
    client.release();
  }
};

/**
 * Lấy dữ liệu lớp ranh giới hành chính - TỐI ƯU
 */
exports.getAdministrativeBoundaries = async (req, res) => {
  try {
    const cacheKey = 'administrative_boundaries';
    
    // Kiểm tra cache
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`📋 Cache HIT for ${cacheKey}`);
        return res.json(cached.data);
      }
    }
    
    console.log(`📥 Loading administrative boundaries from laocai_ranhgioihc`);
    
    // Đếm tổng số records trước
    const countResult = await pool.query(`
      SELECT COUNT(*) as total 
      FROM laocai_ranhgioihc 
      WHERE ST_IsValid(geom) AND geom IS NOT NULL
    `);
    
    const totalRecords = parseInt(countResult.rows[0].total);
    console.log(`📊 Total administrative boundaries: ${totalRecords}`);
    
    // Sử dụng tolerance cao hơn để giảm dung lượng
    const tolerance = totalRecords > 10000 ? 0.0001 : 0.00001;
    
    const query = `
      SELECT 
        gid,
        huyen,
        xa,
        tieukhu,
        khoanh,
        ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, ${tolerance})) as geometry
      FROM laocai_ranhgioihc
      WHERE ST_IsValid(geom) AND geom IS NOT NULL
    `;

    const geojson = await streamLargeDataset('laocai_ranhgioihc', query, tolerance, 2000);
    
    // Chuyển đổi TCVN3 sang Unicode và thêm properties
    geojson.features = geojson.features.map(feature => ({
      ...feature,
      properties: {
        gid: feature.properties.gid,
        huyen: convertTcvn3ToUnicode(feature.properties.huyen || ""),
        xa: convertTcvn3ToUnicode(feature.properties.xa || ""),
        tieukhu: convertTcvn3ToUnicode(feature.properties.tieukhu || ""),
        khoanh: convertTcvn3ToUnicode(feature.properties.khoanh || ""),
        layer_type: 'administrative_boundary',
        boundary_level: getBoundaryLevel(feature.properties)
      }
    }));

    // Cache kết quả
    cache.set(cacheKey, {
      data: geojson,
      timestamp: Date.now()
    });

    console.log(`✅ Loaded ${geojson.features.length} administrative boundary features`);
    res.json(geojson);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu ranh giới hành chính:", err);
    res.status(500).json({ error: "Lỗi server khi lấy dữ liệu ranh giới hành chính" });
  }
};

// Helper function
function getBoundaryLevel(props) {
  if (props.khoanh && props.khoanh.trim() !== '') return 'khoanh';
  if (props.tieukhu && props.tieukhu.trim() !== '') return 'tieukhu';
  if (props.xa && props.xa.trim() !== '') return 'xa';
  if (props.huyen && props.huyen.trim() !== '') return 'huyen';
  return 'unknown';
}

/**
 * Lấy dữ liệu lớp chủ quản lý rừng - TỐI ƯU
 */
exports.getForestManagement = async (req, res) => {
  try {
    const cacheKey = 'forest_management';
    
    // Kiểm tra cache
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`📋 Cache HIT for ${cacheKey}`);
        return res.json(cached.data);
      }
    }
    
    console.log(`📥 Loading forest management data from laocai_chuquanly`);
    
    const query = `
      SELECT 
        gid,
        tt,
        chuquanly,
        ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.00001)) as geometry
      FROM laocai_chuquanly
      WHERE ST_IsValid(geom) AND geom IS NOT NULL
    `;

    const geojson = await streamLargeDataset('laocai_chuquanly', query, 0.00001, 3000);

    // Chuyển đổi TCVN3 sang Unicode
    geojson.features = geojson.features.map(feature => ({
      ...feature,
      properties: {
        gid: feature.properties.gid,
        tt: feature.properties.tt,
        chuquanly: convertTcvn3ToUnicode(feature.properties.chuquanly || ""),
        layer_type: 'forest_management'
      }
    }));

    // Cache kết quả
    cache.set(cacheKey, {
      data: geojson,
      timestamp: Date.now()
    });

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
 * Lấy dữ liệu lớp nền địa hình - TỐI ƯU
 */
exports.getTerrainData = async (req, res) => {
  try {
    const cacheKey = 'terrain_data';
    
    // Kiểm tra cache
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`📋 Cache HIT for ${cacheKey}`);
        return res.json(cached.data);
      }
    }
    
    console.log(`📥 Loading terrain data from laocai_nendiahinh and laocai_nendiahinh_line`);
    
    // Query cho polygons
    const polygonQuery = `
      SELECT 
        gid,
        id,
        ma,
        ten,
        'terrain_polygon' as layer_type,
        ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.0001)) as geometry
      FROM laocai_nendiahinh
      WHERE ST_IsValid(geom) AND geom IS NOT NULL
    `;

    // Query cho lines  
    const lineQuery = `
      SELECT 
        gid,
        id,
        ma,
        ten,
        'terrain_line' as layer_type,
        ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.0001)) as geometry
      FROM laocai_nendiahinh_line
      WHERE ST_IsValid(geom) AND geom IS NOT NULL
    `;

    // Load cả hai loại song song
    const [polygonData, lineData] = await Promise.all([
      streamLargeDataset('laocai_nendiahinh', polygonQuery, 0.0001, 2000),
      streamLargeDataset('laocai_nendiahinh_line', lineQuery, 0.0001, 2000)
    ]);

    // Gộp features và convert TCVN3
    const allFeatures = [
      ...polygonData.features.map(feature => ({
        ...feature,
        properties: {
          gid: feature.properties.gid,
          id: feature.properties.id,
          ma: feature.properties.ma,
          ten: convertTcvn3ToUnicode(feature.properties.ten || ""),
          layer_type: 'terrain_polygon',
          feature_type: getFeatureType(feature.properties.ten)
        }
      })),
      ...lineData.features.map(feature => ({
        ...feature,
        properties: {
          gid: feature.properties.gid,
          id: feature.properties.id,
          ma: feature.properties.ma,
          ten: convertTcvn3ToUnicode(feature.properties.ten || ""),
          layer_type: 'terrain_line',
          feature_type: getFeatureType(feature.properties.ten)
        }
      }))
    ];

    const geojson = {
      type: "FeatureCollection",
      features: allFeatures,
      metadata: {
        polygon_count: polygonData.features.length,
        line_count: lineData.features.length,
        total_features: allFeatures.length,
        load_strategy: 'parallel_stream'
      }
    };

    // Cache kết quả
    cache.set(cacheKey, {
      data: geojson,
      timestamp: Date.now()
    });
    
    console.log(`✅ Loaded ${geojson.features.length} terrain features (${polygonData.features.length} polygons, ${lineData.features.length} lines)`);
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
 * Lấy dữ liệu lớp các loại rừng - TỐI ƯU MẠNH
 */
exports.getForestTypes = async (req, res) => {
  try {
    const cacheKey = 'forest_types';
    
    // Kiểm tra cache
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`📋 Cache HIT for ${cacheKey}`);
        return res.json(cached.data);
      }
    }
    
    console.log(`📥 Loading forest types data from laocai_rg3lr based on LDLR column - OPTIMIZED`);
    
    // Đếm tổng số records trước
    const countResult = await pool.query(`
      SELECT COUNT(*) as total 
      FROM laocai_rg3lr 
      WHERE ST_IsValid(geom) AND geom IS NOT NULL AND ldlr IS NOT NULL AND TRIM(ldlr) != ''
    `);
    
    const totalRecords = parseInt(countResult.rows[0].total);
    console.log(`📊 Total forest type records: ${totalRecords}`);

    // Với dataset lớn, tăng tolerance và giảm detail
    const tolerance = totalRecords > 100000 ? 0.001 : 0.0001; // Tolerance cao hơn cho dataset lớn
    const pageSize = 3000; // Page size nhỏ hơn để tránh timeout

    const query = `
      SELECT 
        gid,
        xa,
        tk,
        khoanh,
        lo,
        dtich,
        ldlr,
        malr3,
        churung,
        tinh,
        huyen,
        ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, ${tolerance})) as geometry
      FROM laocai_rg3lr
      WHERE ST_IsValid(geom) 
        AND geom IS NOT NULL
        AND ldlr IS NOT NULL 
        AND TRIM(ldlr) != ''
    `;

    console.log(`🚀 Starting optimized streaming with tolerance: ${tolerance}, pageSize: ${pageSize}`);
    
    const geojson = await streamLargeDataset('laocai_rg3lr', query, tolerance, pageSize);

    // Chuyển đổi TCVN3 và thêm metadata
    geojson.features = geojson.features.map(feature => ({
      ...feature,
      properties: {
        gid: feature.properties.gid,
        xa: convertTcvn3ToUnicode(feature.properties.xa || ""),
        tk: feature.properties.tk,
        khoanh: feature.properties.khoanh,
        lo: feature.properties.lo,
        dtich: feature.properties.dtich,
        ldlr: feature.properties.ldlr,
        malr3: feature.properties.malr3,
        churung: convertTcvn3ToUnicode(feature.properties.churung || ""),
        tinh: convertTcvn3ToUnicode(feature.properties.tinh || ""),
        huyen: convertTcvn3ToUnicode(feature.properties.huyen || ""),
        layer_type: 'forest_types_ldlr',
        forest_function: getForestFunction(feature.properties.ldlr),
        ldlr_code: feature.properties.ldlr,
        ldlr_category: getLdlrCategory(feature.properties.ldlr)
      }
    }));

    // Tính toán thống kê
    const typeStats = {};
    const categoryStats = {};
    
    geojson.features.forEach(feature => {
      const forestFunction = feature.properties.forest_function;
      const category = feature.properties.ldlr_category;
      
      typeStats[forestFunction] = (typeStats[forestFunction] || 0) + 1;
      categoryStats[category] = (categoryStats[category] || 0) + 1;
    });
    
    // Thêm metadata
    geojson.forestTypes = Object.keys(typeStats).map(type => ({
      name: type,
      count: typeStats[type]
    })).sort((a, b) => b.count - a.count);

    geojson.forestCategories = Object.keys(categoryStats).map(category => ({
      name: category,
      count: categoryStats[category]
    })).sort((a, b) => b.count - a.count);

    // Cache kết quả
    cache.set(cacheKey, {
      data: geojson,
      timestamp: Date.now()
    });

    console.log(`📊 Thống kê các loại rừng theo LDLR:`, typeStats);
    console.log(`📊 Thống kê theo nhóm:`, categoryStats);
    console.log(`✅ Loaded ${geojson.features.length} forest features with ${Object.keys(typeStats).length} different types`);
    
    res.json(geojson);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu các loại rừng theo LDLR:", err);
    res.status(500).json({ 
      error: "Lỗi server khi lấy dữ liệu các loại rừng theo LDLR",
      details: err.message
    });
  }
};

// Helper functions for forest types
function getForestFunction(ldlr) {
  if (!ldlr) return 'Không xác định';
  
  const ldlrUpper = ldlr.trim().toUpperCase();
  const functionMap = {
    'RTG': 'Rừng tự nhiên giàu',
    'RTN': 'Rừng tự nhiên nghèo',
    'RTTN': 'Rừng trồng tự nhiên',
    'RTK': 'Rừng trồng khác',
    'RTCD': 'Rừng trồng cây dược liệu',
    'TXN': 'Trồng xen nương',
    'TXP': 'Trồng xen phụ',
    'TXK': 'Trồng xen khác',
    'TXDN': 'Trồng xen đặc nông',
    'TNK': 'Trồng nương khác',
    'DT1': 'Đất trống loại 1',
    'DT2': 'Đất trống loại 2',
    'DTR': 'Đất trống rừng',
    'DNN': 'Đất nông nghiệp',
    'HG1': 'Hỗn giao loại 1',
    'HG2': 'Hỗn giao loại 2'
  };
  
  return functionMap[ldlrUpper] || ldlr;
}

function getLdlrCategory(ldlr) {
  if (!ldlr) return 'Khác';
  
  const ldlrUpper = ldlr.trim().toUpperCase();
  
  if (['RTG', 'RTN', 'RTTN'].includes(ldlrUpper)) return 'Rừng tự nhiên';
  if (['RTK', 'RTCD'].includes(ldlrUpper)) return 'Rừng trồng';
  if (['TXN', 'TXP', 'TXK', 'TXDN', 'TNK'].includes(ldlrUpper)) return 'Đất trồng cây lâm nghiệp';
  if (['DT1', 'DT2', 'DTR'].includes(ldlrUpper)) return 'Đất trống';
  if (ldlrUpper === 'DNN') return 'Đất nông nghiệp';
  if (['HG1', 'HG2'].includes(ldlrUpper)) return 'Hỗn giao';
  
  return 'Khác';
}

/**
 * Lấy dữ liệu lớp dự báo mất rừng mới nhất - TỐI ƯU
 */
exports.getDeforestationAlerts = async (req, res) => {
  try {
    const cacheKey = `deforestation_alerts_${req.query.days || 365}`;
    
    // Kiểm tra cache
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`📋 Cache HIT for ${cacheKey}`);
        return res.json(cached.data);
      }
    }
    
    console.log(`📥 Loading deforestation alerts from mat_rung`);
    
    const days = parseInt(req.query.days) || 365;
    
    const query = `
      SELECT 
        gid,
        start_dau,
        end_sau,
        area,
        mahuyen,
        detection_status,
        ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.00001)) as geometry
      FROM mat_rung
      WHERE ST_IsValid(geom)
        AND end_sau::date >= CURRENT_DATE - INTERVAL '${days} days'
    `;

    const geojson = await streamLargeDataset('mat_rung', query, 0.00001, 2000);

    // Thêm properties cho deforestation alerts
    geojson.features = geojson.features.map(feature => ({
      ...feature,
      properties: {
        gid: feature.properties.gid,
        start_dau: feature.properties.start_dau,
        end_sau: feature.properties.end_sau,
        area: feature.properties.area,
        area_ha: Math.round((feature.properties.area / 10000) * 100) / 100,
        mahuyen: feature.properties.mahuyen,
        layer_type: 'deforestation_alert',
        alert_level: getAlertLevel(feature.properties.end_sau),
        days_since: getDaysSince(feature.properties.end_sau),
        detection_status: feature.properties.detection_status || 'Chưa xác minh'
      }
    }));

    // Cache kết quả
    cache.set(cacheKey, {
      data: geojson,
      timestamp: Date.now()
    });

    console.log(`✅ Loaded ${geojson.features.length} deforestation alert features from last ${days} days`);
    res.json(geojson);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu dự báo mất rừng:", err);
    res.status(500).json({ error: "Lỗi server khi lấy dữ liệu dự báo mất rừng" });
  }
};

// Helper functions for deforestation alerts
function getAlertLevel(endDate) {
  const daysSince = getDaysSince(endDate);
  if (daysSince <= 7) return 'critical';
  if (daysSince <= 15) return 'high';
  if (daysSince <= 30) return 'medium';
  return 'low';
}

function getDaysSince(endDate) {
  const today = new Date();
  const end = new Date(endDate);
  return Math.floor((today - end) / (1000 * 60 * 60 * 24));
}

/**
 * API để clear cache
 */
exports.clearCache = async (req, res) => {
  try {
    cache.clear();
    console.log("🗑️ Cache cleared");
    res.json({ success: true, message: "Cache đã được xóa" });
  } catch (err) {
    res.status(500).json({ error: "Lỗi khi xóa cache" });
  }
};

/**
 * API để xem cache status
 */
exports.getCacheStatus = async (req, res) => {
  try {
    const cacheInfo = [];
    for (const [key, value] of cache.entries()) {
      cacheInfo.push({
        key,
        size: JSON.stringify(value.data).length,
        age: Date.now() - value.timestamp,
        expires_in: CACHE_TTL - (Date.now() - value.timestamp)
      });
    }
    
    res.json({
      cache_count: cache.size,
      cache_ttl: CACHE_TTL,
      cache_entries: cacheInfo
    });
  } catch (err) {
    res.status(500).json({ error: "Lỗi khi lấy thông tin cache" });
  }
};

/**
 * Lấy dữ liệu lớp hiện trạng rừng (giữ nguyên endpoint cũ)
 */
exports.getForestStatus = async (req, res) => {
  try {
    console.log(`📥 Loading forest status data from tlaocai_tkk_3lr_cru`);
    
    const query = `
      SELECT 
        gid,
        huyen,
        xa,
        tk,
        khoanh,
        lo,
        thuad,
        dtich,
        ldlr,
        churung,
        ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.0001)) as geometry
      FROM tlaocai_tkk_3lr_cru
      WHERE ST_IsValid(geom) AND geom IS NOT NULL
    `;

    const geojson = await streamLargeDataset('tlaocai_tkk_3lr_cru', query, 0.0001, 3000);

    // Chuyển đổi TCVN3 sang Unicode
    geojson.features = geojson.features.map(feature => ({
      ...feature,
      properties: {
        gid: feature.properties.gid,
        huyen: convertTcvn3ToUnicode(feature.properties.huyen || ""),
        xa: convertTcvn3ToUnicode(feature.properties.xa || ""),
        tk: feature.properties.tk,
        khoanh: feature.properties.khoanh,
        lo: feature.properties.lo,
        thuad: feature.properties.thuad,
        dtich: feature.properties.dtich,
        ldlr: convertTcvn3ToUnicode(feature.properties.ldlr || ""),
        churung: convertTcvn3ToUnicode(feature.properties.churung || ""),
        layer_type: 'current_forest_status',
        area_ha: Math.round((feature.properties.dtich || 0) * 100) / 100
      }
    }));

    console.log(`✅ Loaded ${geojson.features.length} forest status features`);
    res.json(geojson);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu hiện trạng rừng:", err);
    res.status(500).json({ error: "Lỗi server khi lấy dữ liệu hiện trạng rừng" });
  }
};