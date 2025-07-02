// server/controllers/layerData.controller.js - FIXED VERSION
const pool = require("../db");
const convertTcvn3ToUnicode = require("../utils/convertTcvn3ToUnicode");

/**
 * Memory cache (giữ nguyên để backward compatibility)
 */
const cache = new Map();
const CACHE_TTL = 9999999999999999999999999999999 * 60 * 1000; // 10 phút

/**
 * Progress tracking cho real-time updates
 */
const progressTracking = new Map();

/**
 * ✅ API để lấy progress real-time
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
 * FIXED: Hàm streaming với improved error handling
 */
const streamLargeDatasetWithProgress = async (layerKey, tableName, query, simplifyTolerance = 0.00001, pageSize = 5000) => {
  let client;
  
  try {
    // Initialize progress
    updateProgress(layerKey, 0, 0, 'initializing');
    
    // Get client from pool
    client = await pool.connect();
    console.log(`🔗 Connected to database for ${layerKey}`);
    
    // FIXED: Set work_mem outside of transaction, with error handling
    try {
      await client.query('SET work_mem = "256MB"');
      console.log(`🔧 Set work_mem for ${layerKey}`);
    } catch (configError) {
      console.warn(`⚠️ Could not set work_mem for ${layerKey}:`, configError.message);
      // Continue without setting work_mem
    }
    
    // Get total count first
    updateProgress(layerKey, 0, 0, 'counting');
    const countQuery = `SELECT COUNT(*) as total FROM (${query.replace(/SELECT.*?FROM/, 'SELECT 1 FROM').replace(/ORDER BY.*$/, '')}) as count_query`;
    const countResult = await client.query(countQuery);
    const totalRecords = parseInt(countResult.rows[0].total);
    
    updateProgress(layerKey, 0, totalRecords, 'database_loading');
    
    console.log(`🔄 Starting streaming for ${layerKey}: ${totalRecords} total records`);
    
    const allFeatures = [];
    let offset = 0;
    let hasMore = true;
    let totalLoaded = 0;
    let batchCount = 0;
    
    while (hasMore && totalLoaded < 500000) { // Safety limit
      const startTime = Date.now();
      batchCount++;
      
      // Update progress
      updateProgress(layerKey, totalLoaded, totalRecords, 'streaming');
      
      // Build paginated query with proper ORDER BY
      const paginatedQuery = query.replace(/ORDER BY.*?;?\s*$/, '') + 
        ` ORDER BY gid LIMIT ${pageSize} OFFSET ${offset}`;
      
      try {
        const result = await client.query(paginatedQuery);
        const loadTime = Date.now() - startTime;
        
        if (result.rows.length === 0) {
          hasMore = false;
          break;
        }
        
        // Process features with better error handling
        let validFeatures = 0;
        for (const row of result.rows) {
          try {
            if (row.geometry) {
              const feature = {
                type: "Feature",
                geometry: JSON.parse(row.geometry),
                properties: { ...row }
              };
              delete feature.properties.geometry;
              allFeatures.push(feature);
              validFeatures++;
            }
          } catch (geomError) {
            console.warn(`⚠️ Skipping invalid geometry for gid: ${row.gid || 'unknown'} - ${geomError.message}`);
          }
        }
        
        totalLoaded += validFeatures;
        console.log(`✅ Batch ${batchCount}: Loaded ${validFeatures}/${result.rows.length} valid features in ${loadTime}ms (Total: ${totalLoaded}/${totalRecords})`);
        
        // Update progress
        updateProgress(layerKey, totalLoaded, totalRecords, 'processing');
        
        offset += pageSize;
        
        // Break conditions
        if (result.rows.length < pageSize) {
          hasMore = false;
        }
        
        // Small delay to prevent overwhelming the database
        if (batchCount % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (queryError) {
        console.error(`❌ Error in batch ${batchCount} for ${layerKey}:`, queryError.message);
        
        // If it's a serious error, break the loop
        if (queryError.code === '25P02' || queryError.code === '57P01') {
          console.error(`💀 Fatal database error, stopping stream for ${layerKey}`);
          break;
        }
        
        // For other errors, skip this batch and continue
        offset += pageSize;
        continue;
      }
    }
    
    // Final progress update
    updateProgress(layerKey, totalLoaded, totalRecords, 'completed');
    
    console.log(`🎉 Completed streaming ${totalLoaded} features for ${layerKey} in ${batchCount} batches`);
    
    return {
      type: "FeatureCollection",
      features: allFeatures,
      metadata: {
        total_features: totalLoaded,
        total_records: totalRecords,
        load_strategy: 'stream_with_progress',
        page_size: pageSize,
        batch_count: batchCount,
        build_time: Date.now() - (progressTracking.get(layerKey)?.timestamp || Date.now()),
        cache_saved: false
      }
    };
    
  } catch (error) {
    console.error(`❌ Fatal error streaming ${layerKey}:`, error);
    updateProgress(layerKey, 0, 0, 'error');
    throw error;
  } finally {
    // ALWAYS release the client
    if (client) {
      try {
        client.release();
        console.log(`🔌 Released database connection for ${layerKey}`);
      } catch (releaseError) {
        console.error(`⚠️ Error releasing client for ${layerKey}:`, releaseError.message);
      }
    }
  }
};

/**
 * IMPROVED: Enhanced caching with better error handling
 */
const loadLayerWithCache = async (layerKey, loadFunction, ...args) => {
  try {
    console.log(`📥 Loading ${layerKey} with cache check...`);
    
    // Check memory cache first
    const cacheKey = `${layerKey}_${JSON.stringify(args)}`;
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`⚡ Memory cache HIT for ${layerKey}`);
        updateProgress(layerKey, cached.data.features?.length || 0, cached.data.features?.length || 0, 'cache_loaded');
        return cached.data;
      } else {
        cache.delete(cacheKey);
        console.log(`🗑️ Expired cache cleared for ${layerKey}`);
      }
    }
    
    console.log(`❌ Cache MISS: ${layerKey} - Loading fresh data`);
    
    // Load fresh data
    const data = await loadFunction(...args);
    
    // Cache the result
    cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    console.log(`💾 Cached fresh data for ${layerKey}`);
    return data;
    
  } catch (error) {
    console.error(`❌ Error loading ${layerKey}:`, error);
    updateProgress(layerKey, 0, 0, 'error');
    throw error;
  }
};

/**
 * WRAPPER function để load data với cache
 */
const loadAdministrativeData = async (layerKey) => {
  console.log(`📥 Loading fresh data for ${layerKey} from laocai_ranhgioihc`);
  
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
    ORDER BY gid
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

  return geojson;
};

/**
 * ✅ Lấy dữ liệu lớp ranh giới hành chính - FIXED
 */
exports.getAdministrativeBoundaries = async (req, res) => {
  const layerKey = 'administrative';
  
  try {
    const geojson = await loadLayerWithCache(layerKey, loadAdministrativeData, layerKey);
    console.log(`✅ Loaded ${geojson.features.length} administrative boundary features`);
    res.json(geojson);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu ranh giới hành chính:", err);
    res.status(500).json({ 
      error: "Lỗi server khi lấy dữ liệu ranh giới hành chính",
      details: err.message
    });
  }
};

/**
 * WRAPPER function để load forest management data
 */
const loadForestManagementData = async (layerKey) => {
  console.log(`📥 Loading fresh data for ${layerKey} from laocai_chuquanly`);
  
  const query = `
    SELECT 
      gid,
      tt,
      chuquanly,
      ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.00001)) as geometry
    FROM laocai_chuquanly
    WHERE ST_IsValid(geom) AND geom IS NOT NULL
    ORDER BY gid
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

  return geojson;
};

/**
 * ✅ Lấy dữ liệu lớp chủ quản lý rừng - FIXED
 */
exports.getForestManagement = async (req, res) => {
  const layerKey = 'forestManagement';
  
  try {
    const geojson = await loadLayerWithCache(layerKey, loadForestManagementData, layerKey);
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
 * WRAPPER function để load terrain data
 */
const loadTerrainData = async (layerKey) => {
  console.log(`📥 Loading fresh data for ${layerKey} from terrain tables`);
  
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
    ORDER BY gid
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
    ORDER BY gid
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

  return {
    type: "FeatureCollection",
    features: allFeatures,
    metadata: {
      polygon_count: polygonData.features.length,
      line_count: lineData.features.length,
      total_features: allFeatures.length,
      load_strategy: 'parallel_stream'
    }
  };
};

/**
 * ✅ Lấy dữ liệu lớp nền địa hình - FIXED
 */
exports.getTerrainData = async (req, res) => {
  const layerKey = 'terrain';
  
  try {
    const geojson = await loadLayerWithCache(layerKey, loadTerrainData, layerKey);
    console.log(`✅ Loaded ${geojson.features.length} terrain features`);
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
 * WRAPPER function để load forest types data
 */
const loadForestTypesData = async (layerKey) => {
  console.log(`📥 Loading fresh data for ${layerKey} from laocai_rg3lr`);
  
  // Đếm tổng số records trước
  const client = await pool.connect();
  try {
    const countResult = await client.query(`
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
      ORDER BY gid
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
    
    return geojson;
    
  } finally {
    client.release();
  }
};

/**
 * ✅ Lấy dữ liệu lớp các loại rừng - FIXED  
 */
exports.getForestTypes = async (req, res) => {
  const layerKey = 'forestTypes';
  
  try {
    const geojson = await loadLayerWithCache(layerKey, loadForestTypesData, layerKey);
    console.log(`✅ Loaded ${geojson.features.length} forest features with ${geojson.forestTypes?.length || 0} different types`);
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
 * WRAPPER function để load deforestation alerts data
 */
const loadDeforestationAlertsData = async (layerKey, days = 365) => {
  console.log(`📥 Loading fresh data for ${layerKey} from mat_rung`);
  
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
    ORDER BY gid
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

  return geojson;
};

/**
 * ✅ Lấy dữ liệu lớp dự báo mất rừng mới nhất - FIXED
 */
exports.getDeforestationAlerts = async (req, res) => {
  const days = parseInt(req.query.days) || 365;
  const layerKey = `deforestationAlerts`;
  
  try {
    const geojson = await loadLayerWithCache(layerKey, loadDeforestationAlertsData, layerKey, days);
    console.log(`✅ Loaded ${geojson.features.length} deforestation alert features from last ${days} days`);
    res.json(geojson);
  } catch (err) {
    console.error("❌ Lỗi lấy dữ liệu dự báo mất rừng:", err);
    res.status(500).json({ 
      error: "Lỗi server khi lấy dữ liệu dự báo mất rừng",
      details: err.message
    });
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
 * ✅ Lấy dữ liệu lớp hiện trạng rừng (legacy endpoint)
 */
exports.getForestStatus = async (req, res) => {
  const layerKey = 'forestStatus';
  
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
      ORDER BY gid
    `;

    const geojson = await streamLargeDatasetWithProgress(layerKey, 'tlaocai_tkk_3lr_cru', query, 0.0001, 3000);

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
    res.status(500).json({ 
      error: "Lỗi server khi lấy dữ liệu hiện trạng rừng",
      details: err.message
    });
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
      cached_layers: Array.from(cache.keys()).map(key => key.split('_')[0]),
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