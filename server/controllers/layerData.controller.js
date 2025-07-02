// server/controllers/layerData.controller.js - FIXED VERSION
const pool = require("../db");
const convertTcvn3ToUnicode = require("../utils/convertTcvn3ToUnicode");

/**
 * Memory cache (giữ nguyên để backward compatibility)
 */
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 phút

/**
 * Progress tracking cho real-time updates
 */
const progressTracking = new Map();

/**
 * ✅ API để lấy progress real-time - FUNCTION BỊ THIẾU
 */
exports.getProgress = async (req, res) => {
  try {
    const { layer } = req.params;
    const progress = progressTracking.get(layer) || { 
      current: 0, 
      total: 0, 
      percentage: 0, 
      stage: 'idle',
      timestamp: Date.now()
    };
    
    console.log(`📊 Progress request for ${layer}:`, progress);
    res.json(progress);
  } catch (error) {
    console.error(`❌ Error getting progress for ${layer}:`, error);
    res.status(500).json({ 
      error: "Error getting progress",
      details: error.message 
    });
  }
};

/**
 * Hàm helper để cập nhật progress
 */
const updateProgress = (layerKey, current, total, stage = 'loading') => {
  const progress = {
    current,
    total,
    percentage: total > 0 ? Math.round((current / total) * 100) : 0,
    stage,
    timestamp: Date.now()
  };
  progressTracking.set(layerKey, progress);
  console.log(`📊 Progress ${layerKey}: ${current}/${total} (${progress.percentage}%)`);
};

/**
 * Hàm streaming với progress tracking
 */
const streamLargeDatasetWithProgress = async (layerKey, tableName, query, simplifyTolerance = 0.00001, pageSize = 5000) => {
  const client = await pool.connect();
  
  try {
    // Initialize progress
    updateProgress(layerKey, 0, 0, 'initializing');
    
    // Get total count first
    const countQuery = `SELECT COUNT(*) as total FROM (${query.replace(/SELECT.*?FROM/, 'SELECT 1 FROM').replace(/ORDER BY.*$/, '')}) as count_query`;
    const countResult = await client.query(countQuery);
    const totalRecords = parseInt(countResult.rows[0].total);
    
    updateProgress(layerKey, 0, totalRecords, 'counting');
    
    console.log(`🔄 Starting streaming for ${layerKey}: ${totalRecords} total records`);
    
    await client.query('BEGIN');
    await client.query('SET work_mem = "256MB"');
    await client.query('COMMIT');
    
    const allFeatures = [];
    let offset = 0;
    let hasMore = true;
    let totalLoaded = 0;
    
    while (hasMore) {
      const startTime = Date.now();
      
      // Update progress
      updateProgress(layerKey, totalLoaded, totalRecords, 'streaming');
      
      const paginatedQuery = query.replace(/ORDER BY.*?;?\s*$/, '') + 
        ` ORDER BY gid LIMIT ${pageSize} OFFSET ${offset}`;
      
      const result = await client.query(paginatedQuery);
      const loadTime = Date.now() - startTime;
      
      if (result.rows.length === 0) {
        hasMore = false;
        break;
      }
      
      // Process features
      for (const row of result.rows) {
        try {
          const feature = {
            type: "Feature",
            geometry: JSON.parse(row.geometry),
            properties: { ...row }
          };
          delete feature.properties.geometry;
          allFeatures.push(feature);
        } catch (err) {
          console.warn(`⚠️ Skipping invalid geometry for gid: ${row.gid}`);
        }
      }
      
      totalLoaded += result.rows.length;
      console.log(`✅ Loaded ${result.rows.length} records in ${loadTime}ms (Total: ${totalLoaded}/${totalRecords})`);
      
      // Update progress
      updateProgress(layerKey, totalLoaded, totalRecords, 'processing');
      
      offset += pageSize;
      
      if (result.rows.length < pageSize) {
        hasMore = false;
      }
      
      if (offset > 1000000) {
        console.warn(`⚠️ Safety limit reached`);
        hasMore = false;
      }
    }
    
    // Final progress update
    updateProgress(layerKey, totalLoaded, totalRecords, 'completed');
    
    console.log(`🎉 Completed streaming ${totalLoaded} features for ${layerKey}`);
    
    return {
      type: "FeatureCollection",
      features: allFeatures,
      metadata: {
        total_features: totalLoaded,
        load_strategy: 'stream_with_progress',
        page_size: pageSize,
        build_time: Date.now() - (progressTracking.get(layerKey)?.timestamp || Date.now()),
        cache_saved: false
      }
    };
    
  } finally {
    client.release();
  }
};

/**
 * ✅ Lấy thông tin tổng quan về các lớp dữ liệu
 */
exports.getLayerInfo = async (req, res) => {
  try {
    const info = {};
    
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
 * ✅ Lấy dữ liệu lớp ranh giới hành chính
 */
exports.getAdministrativeBoundaries = async (req, res) => {
  const layerKey = 'administrative';
  
  try {
    console.log(`📥 Loading administrative boundaries from laocai_ranhgioihc`);
    
    const query = `
      SELECT 
        gid,
        huyen,
        xa,
        tieukhu,
        khoanh,
        ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.00001)) as geometry
      FROM laocai_ranhgioihc
      WHERE ST_IsValid(geom) AND geom IS NOT NULL
    `;

    const geojson = await streamLargeDatasetWithProgress(layerKey, 'laocai_ranhgioihc', query, 0.00001, 2000);
    
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

    console.log(`✅ Loaded ${geojson.features.length} administrative boundary features`);
    res.json(geojson);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu ranh giới hành chính:", err);
    res.status(500).json({ error: "Lỗi server khi lấy dữ liệu ranh giới hành chính" });
  }
};

/**
 * ✅ Lấy dữ liệu lớp chủ quản lý rừng
 */
exports.getForestManagement = async (req, res) => {
  const layerKey = 'forestManagement';
  
  try {
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

    const geojson = await streamLargeDatasetWithProgress(layerKey, 'laocai_chuquanly', query, 0.00001, 3000);

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
 * ✅ Lấy dữ liệu lớp nền địa hình
 */
exports.getTerrainData = async (req, res) => {
  const layerKey = 'terrain';
  
  try {
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
      streamLargeDatasetWithProgress(`${layerKey}_polygon`, 'laocai_nendiahinh', polygonQuery, 0.0001, 2000),
      streamLargeDatasetWithProgress(`${layerKey}_line`, 'laocai_nendiahinh_line', lineQuery, 0.0001, 2000)
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

/**
 * ✅ Lấy dữ liệu lớp các loại rừng - OPTIMIZED
 */
exports.getForestTypes = async (req, res) => {
  const layerKey = 'forestTypes';
  
  try {
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
    const tolerance = totalRecords > 100000 ? 0.001 : 0.0001;
    const pageSize = 3000;

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
    
    const geojson = await streamLargeDatasetWithProgress(layerKey, 'laocai_rg3lr', query, tolerance, pageSize);

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

/**
 * ✅ Lấy dữ liệu lớp dự báo mất rừng mới nhất
 */
exports.getDeforestationAlerts = async (req, res) => {
  const days = parseInt(req.query.days) || 365;
  const layerKey = `deforestationAlerts`;
  
  try {
    console.log(`📥 Loading deforestation alerts from mat_rung`);
    
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

    const geojson = await streamLargeDatasetWithProgress(layerKey, 'mat_rung', query, 0.00001, 2000);

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

    console.log(`✅ Loaded ${geojson.features.length} deforestation alert features from last ${days} days`);
    res.json(geojson);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu dự báo mất rừng:", err);
    res.status(500).json({ error: "Lỗi server khi lấy dữ liệu dự báo mất rừng" });
  }
};

/**
 * ✅ Lấy dữ liệu lớp hiện trạng rừng (legacy endpoint)
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

    const geojson = await streamLargeDatasetWithProgress('forestStatus', 'tlaocai_tkk_3lr_cru', query, 0.0001, 3000);

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

/**
 * ✅ API để clear cache (memory only - giữ cho backward compatibility)
 */
exports.clearCache = async (req, res) => {
  try {
    cache.clear();
    progressTracking.clear();
    console.log("🗑️ Cache cleared");
    res.json({ success: true, message: "Cache đã được xóa" });
  } catch (err) {
    res.status(500).json({ error: "Lỗi khi xóa cache" });
  }
};

/**
 * ✅ API để xem cache status (memory only)
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
      cache_entries: cacheInfo,
      progress_tracking: Object.fromEntries(progressTracking)
    });
  } catch (err) {
    res.status(500).json({ error: "Lỗi khi lấy thông tin cache" });
  }
};

/**
 * ✅ MOCK Server cache management APIs (để tránh lỗi routes)
 */
exports.getServerCacheStatus = async (req, res) => {
  try {
    // Mock response - có thể implement persistent cache sau
    const status = {
      memory_cache_count: cache.size,
      file_cache_count: 0,
      cached_layers: [],
      total_cache_size: 0
    };
    
    console.log("📊 Server cache status (mock):", status);
    res.json(status);
  } catch (err) {
    console.error("❌ Error getting server cache status:", err);
    res.status(500).json({ error: "Error getting server cache status" });
  }
};

exports.clearServerCache = async (req, res) => {
  try {
    // Mock implementation - clear memory cache
    cache.clear();
    progressTracking.clear();
    
    console.log("🗑️ Server cache cleared (mock)");
    res.json({ success: true, message: "Server cache cleared" });
  } catch (err) {
    console.error("❌ Error clearing server cache:", err);
    res.status(500).json({ error: "Error clearing server cache" });
  }
};

exports.rebuildServerCache = async (req, res) => {
  try {
    // Mock implementation  
    cache.clear();
    progressTracking.clear();
    
    console.log("🔄 Server cache rebuild initiated (mock)");
    res.json({ success: true, message: "Server cache rebuild initiated" });
  } catch (err) {
    console.error("❌ Error rebuilding server cache:", err);
    res.status(500).json({ error: "Error rebuilding server cache" });
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getBoundaryLevel(props) {
  if (props.khoanh && props.khoanh.trim() !== '') return 'khoanh';
  if (props.tieukhu && props.tieukhu.trim() !== '') return 'tieukhu';
  if (props.xa && props.xa.trim() !== '') return 'xa';
  if (props.huyen && props.huyen.trim() !== '') return 'huyen';
  return 'unknown';
}

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