const pool = require("../db");
const convertTcvn3ToUnicode = require("../utils/convertTcvn3ToUnicode");

// In-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 phút
const DB_CACHE_TTL = 60 * 60 * 1000; // 1 giờ cho database cache

function getCacheKey(type, param) {
  return `${type}_${param || 'all'}`;
}

function getCachedData(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log(`📋 Cache HIT for ${key}`);
    return cached.data;
  }
  console.log(`📋 Cache MISS for ${key}`);
  return null;
}

function setCachedData(key, data) {
  cache.set(key, {
    data: data,
    timestamp: Date.now()
  });
  console.log(`📋 Cache SET for ${key}`);
}

// Fallback to normal query if materialized view fails
async function fallbackQuery(queryType, param = null) {
  console.log(`🔄 Using fallback query for ${queryType}`);
  
  switch (queryType) {
    case 'huyen':
      const huyenQuery = `
        SELECT DISTINCT huyen
        FROM tlaocai_tkk_3lr_cru 
        WHERE huyen IS NOT NULL AND trim(huyen) != ''
        ORDER BY huyen
      `;
      return await pool.query(huyenQuery);
      
    case 'xa':
      const xaQuery = `
        SELECT DISTINCT xa
        FROM tlaocai_tkk_3lr_cru 
        WHERE huyen = $1 AND xa IS NOT NULL AND trim(xa) != ''
        ORDER BY xa
      `;
      return await pool.query(xaQuery, [param]);
      
    case 'tieukhu':
      const tkQuery = `
        SELECT DISTINCT tk
        FROM tlaocai_tkk_3lr_cru 
        WHERE xa = $1 AND tk IS NOT NULL AND trim(tk) != ''
        ORDER BY tk
      `;
      return await pool.query(tkQuery, [param]);
      
    case 'khoanh':
      const khoanhQuery = `
        SELECT DISTINCT khoanh
        FROM tlaocai_tkk_3lr_cru 
        WHERE khoanh IS NOT NULL AND trim(khoanh) != ''
        ORDER BY khoanh
      `;
      return await pool.query(khoanhQuery);
      
    case 'churung':
      const churungQuery = `
        SELECT DISTINCT churung
        FROM tlaocai_tkk_3lr_cru 
        WHERE churung IS NOT NULL AND trim(churung) != ''
        ORDER BY churung
      `;
      return await pool.query(churungQuery);
      
    default:
      throw new Error(`Unknown query type: ${queryType}`);
  }
}

exports.getHuyen = async (req, res) => {
  try {
    const cacheKey = getCacheKey('huyen');
    const cached = getCachedData(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    console.log("🚀 Fetching huyen using materialized view...");
    
    let result;
    try {
      // Try materialized view first
      result = await pool.query('SELECT huyen FROM mv_dropdown_huyen ORDER BY huyen');
      console.log("✅ Using materialized view for huyen");
    } catch (mvError) {
      console.log("⚠️ Materialized view failed, using fallback:", mvError.message);
      result = await fallbackQuery('huyen');
    }
    
    const data = result.rows.map((row) => ({
      value: row.huyen,
      label: convertTcvn3ToUnicode(row.huyen),
    }));

    setCachedData(cacheKey, data);
    console.log(`✅ Loaded ${data.length} huyen options`);
    
    res.json(data);
  } catch (error) {
    console.error("❌ Lỗi lấy danh sách huyện:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getXaByHuyen = async (req, res) => {
  const { huyen } = req.query;
  console.log("🎯 Huyện FE truyền lên:", huyen);
  
  if (!huyen) {
    return res.status(400).json({ error: "Thiếu tham số huyện" });
  }

  try {
    const cacheKey = getCacheKey('xa', huyen);
    const cached = getCachedData(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    console.log("🚀 Fetching xa using optimized query...");
    
    let result;
    try {
      // Use optimized query with index
      result = await fallbackQuery('xa', huyen);
      console.log("✅ Using optimized xa query");
    } catch (error) {
      console.error("❌ Optimized xa query failed:", error);
      throw error;
    }
    
    const data = result.rows.map((row) => ({
      value: row.xa,
      label: convertTcvn3ToUnicode(row.xa),
    }));

    setCachedData(cacheKey, data);
    console.log(`✅ Loaded ${data.length} xa options for huyen: ${huyen}`);
    
    res.json(data);
  } catch (error) {
    console.error("❌ Lỗi lấy danh sách xã:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getTieuKhuByXa = async (req, res) => {
  const { xa } = req.query;
  
  if (!xa) {
    return res.status(400).json({ error: "Thiếu tham số xã" });
  }

  try {
    const cacheKey = getCacheKey('tk', xa);
    const cached = getCachedData(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    console.log("🚀 Fetching tk using optimized query...");
    
    const result = await fallbackQuery('tieukhu', xa);
    
    const data = result.rows.map((row) => ({
      tk: row.tk,
    }));

    setCachedData(cacheKey, data);
    console.log(`✅ Loaded ${data.length} tk options for xa: ${xa}`);
    
    res.json(data);
  } catch (error) {
    console.error("❌ Lỗi lấy danh sách tiểu khu:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getAllKhoanh = async (req, res) => {
  try {
    const cacheKey = getCacheKey('khoanh');
    const cached = getCachedData(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    console.log("🚀 Fetching khoanh using materialized view...");
    
    let result;
    try {
      // Try materialized view first
      result = await pool.query('SELECT khoanh FROM mv_dropdown_khoanh ORDER BY khoanh');
      console.log("✅ Using materialized view for khoanh");
    } catch (mvError) {
      console.log("⚠️ Materialized view failed, using fallback:", mvError.message);
      result = await fallbackQuery('khoanh');
    }
    
    const data = result.rows.map((row) => ({
      khoanh: row.khoanh,
    }));

    setCachedData(cacheKey, data);
    console.log(`✅ Loaded ${data.length} khoanh options`);
    
    res.json(data);
  } catch (error) {
    console.error("❌ Lỗi lấy danh sách khoảnh:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getAllChuRung = async (req, res) => {
  try {
    const cacheKey = getCacheKey('churung');
    const cached = getCachedData(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    console.log("🚀 Fetching churung using materialized view...");
    
    let result;
    try {
      // Try materialized view first
      result = await pool.query('SELECT churung FROM mv_dropdown_churung ORDER BY churung');
      console.log("✅ Using materialized view for churung");
    } catch (mvError) {
      console.log("⚠️ Materialized view failed, using fallback:", mvError.message);
      result = await fallbackQuery('churung');
    }
    
    const data = result.rows.map((row) => ({
      churung: convertTcvn3ToUnicode(row.churung),
    }));

    setCachedData(cacheKey, data);
    console.log(`✅ Loaded ${data.length} churung options`);
    
    res.json(data);
  } catch (error) {
    console.error("❌ Lỗi lấy danh sách chủ rừng:", error);
    res.status(500).json({ error: error.message });
  }
};

// API để xóa cache khi cần
exports.clearCache = async (req, res) => {
  cache.clear();
  console.log("🗑️ In-memory cache đã được xóa");
  res.json({ success: true, message: "Cache cleared successfully" });
};

// API để refresh materialized views
exports.refreshMaterializedViews = async (req, res) => {
  try {
    console.log("🔄 Refreshing materialized views...");
    
    await pool.query('SELECT refresh_dropdown_cache()');
    
    // Also clear in-memory cache
    cache.clear();
    
    console.log("✅ Materialized views refreshed successfully");
    res.json({ 
      success: true, 
      message: "Materialized views and cache refreshed successfully",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Lỗi refresh materialized views:", error);
    res.status(500).json({ error: error.message });
  }
};

// API để check cache status
exports.getCacheStatus = async (req, res) => {
  try {
    const cacheInfo = {
      inMemoryCache: {
        size: cache.size,
        keys: Array.from(cache.keys()),
        ttl: CACHE_TTL / 1000 + ' seconds'
      },
      databaseCache: {
        ttl: DB_CACHE_TTL / 1000 + ' seconds'
      }
    };

    // Check materialized view status
    const mvStatusQuery = `
      SELECT 
        schemaname,
        matviewname,
        hasindexes,
        ispopulated
      FROM pg_matviews 
      WHERE matviewname LIKE 'mv_dropdown_%'
    `;
    
    const mvResult = await pool.query(mvStatusQuery);
    cacheInfo.materializedViews = mvResult.rows;

    res.json({
      success: true,
      cacheInfo: cacheInfo
    });
  } catch (error) {
    console.error("❌ Lỗi lấy cache status:", error);
    res.status(500).json({ error: error.message });
  }
};