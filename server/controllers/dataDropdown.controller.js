const pool = require("../db");
const { convertTcvn3ToUnicode } = require("../utils/encoding");
const cache = require("../utils/cache");
const { getCacheKey, getCachedData, setCachedData } = require("../utils/cacheUtils");

// ✅ CẬP NHẬT: Lấy danh sách huyện từ bảng laocai_ranhgioihc
exports.getHuyen = async (req, res) => {
  try {
    const cacheKey = getCacheKey('huyen');
    const cached = getCachedData(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    console.log("🚀 Fetching huyen from laocai_ranhgioihc...");
    
    const huyenQuery = `
      SELECT DISTINCT huyen 
      FROM laocai_ranhgioihc 
      WHERE huyen IS NOT NULL AND trim(huyen) != ''
      ORDER BY huyen
    `;
    
    const result = await pool.query(huyenQuery);
    
    const data = result.rows.map((row) => ({
      value: row.huyen,
      label: convertTcvn3ToUnicode(row.huyen),
    }));

    setCachedData(cacheKey, data);
    console.log(`✅ Loaded ${data.length} huyen options from laocai_ranhgioihc`);
    
    res.json(data);
  } catch (error) {
    console.error("❌ Lỗi lấy danh sách huyện:", error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ CẬP NHẬT: Lấy xã từ bảng laocai_ranhgioihc theo huyện
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

    console.log("🚀 Fetching xa from laocai_ranhgioihc by huyen...");
    
    const xaQuery = `
      SELECT DISTINCT xa
      FROM laocai_ranhgioihc 
      WHERE huyen = $1 AND xa IS NOT NULL AND trim(xa) != ''
      ORDER BY xa
    `;
    
    const result = await pool.query(xaQuery, [huyen]);
    
    const data = result.rows.map((row) => ({
      value: row.xa,
      label: convertTcvn3ToUnicode(row.xa),
    }));

    setCachedData(cacheKey, data);
    console.log(`✅ Loaded ${data.length} xa options for huyen: ${huyen} from laocai_ranhgioihc`);
    
    res.json(data);
  } catch (error) {
    console.error("❌ Lỗi lấy danh sách xã:", error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ CẬP NHẬT: Lấy tiểu khu từ bảng laocai_ranhgioihc theo xã
exports.getTieuKhuByXa = async (req, res) => {
  const { xa } = req.query;
  
  console.log("🎯 Xã FE truyền lên:", xa);
  
  if (!xa) {
    return res.status(400).json({ error: "Thiếu tham số xã" });
  }

  try {
    const cacheKey = getCacheKey('tieukhu', xa);
    const cached = getCachedData(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    console.log("🚀 Fetching tieukhu from laocai_ranhgioihc by xa...");
    
    const tkQuery = `
      SELECT DISTINCT tieukhu as tk
      FROM laocai_ranhgioihc 
      WHERE xa = $1 AND tieukhu IS NOT NULL AND trim(tieukhu) != ''
      ORDER BY tieukhu
    `;
    
    const result = await pool.query(tkQuery, [xa]);
    
    const data = result.rows.map((row) => ({
      tk: row.tk,
    }));

    setCachedData(cacheKey, data);
    console.log(`✅ Loaded ${data.length} tk options for xa: ${xa} from laocai_ranhgioihc`);
    
    res.json(data);
  } catch (error) {
    console.error("❌ Lỗi lấy danh sách tiểu khu:", error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ CẬP NHẬT: Lấy tất cả khoảnh từ bảng laocai_ranhgioihc
exports.getAllKhoanh = async (req, res) => {
  try {
    const cacheKey = getCacheKey('khoanh');
    const cached = getCachedData(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    console.log("🚀 Fetching khoanh from laocai_ranhgioihc...");
    
    const khoanhQuery = `
      SELECT DISTINCT khoanh
      FROM laocai_ranhgioihc 
      WHERE khoanh IS NOT NULL AND trim(khoanh) != ''
      ORDER BY khoanh
    `;
    
    const result = await pool.query(khoanhQuery);
    
    const data = result.rows.map((row) => ({
      khoanh: row.khoanh,
    }));

    setCachedData(cacheKey, data);
    console.log(`✅ Loaded ${data.length} khoanh options from laocai_ranhgioihc`);
    
    res.json(data);
  } catch (error) {
    console.error("❌ Lỗi lấy danh sách khoảnh:", error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ CẬP NHẬT: Lấy chức năng rừng từ bảng chuc_nang_rung
exports.getChucNangRung = async (req, res) => {
  try {
    const cacheKey = getCacheKey('chucnangrung');
    const cached = getCachedData(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    console.log("🚀 Fetching chucnangrung from chuc_nang_rung...");
    
    const query = `
      SELECT id as value, ten as label
      FROM chuc_nang_rung
      ORDER BY label
    `;
    
    const result = await pool.query(query);
    
    const data = result.rows.map(row => ({
      value: row.value.toString(),
      label: row.label
    }));

    setCachedData(cacheKey, data);
    console.log(`✅ Loaded ${data.length} chucnangrung options`);
    
    res.json(data);
  } catch (error) {
    console.error("❌ Lỗi lấy danh sách chức năng rừng:", error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ CẬP NHẬT: Lấy trạng thái xác minh từ bảng trang_thai_xac_minh
exports.getTrangThaiXacMinh = async (req, res) => {
  try {
    const cacheKey = getCacheKey('trangthaixacminh');
    const cached = getCachedData(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    console.log("🚀 Fetching trangthaixacminh from trang_thai_xac_minh...");
    
    const query = `
      SELECT id as value, ten as label
      FROM trang_thai_xac_minh
      ORDER BY label
    `;
    
    const result = await pool.query(query);
    
    const data = result.rows.map(row => ({
      value: row.value.toString(),
      label: row.label
    }));

    setCachedData(cacheKey, data);
    console.log(`✅ Loaded ${data.length} trangthaixacminh options`);
    
    res.json(data);
  } catch (error) {
    console.error("❌ Lỗi lấy danh sách trạng thái xác minh:", error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ CẬP NHẬT: Lấy nguyên nhân từ bảng nguyen_nhan
exports.getNguyenNhan = async (req, res) => {
  try {
    const cacheKey = getCacheKey('nguyennhan');
    const cached = getCachedData(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    console.log("🚀 Fetching nguyennhan from nguyen_nhan...");
    
    const query = `
      SELECT id as value, ten as label
      FROM nguyen_nhan
      ORDER BY label
    `;
    
    const result = await pool.query(query);
    
    const data = result.rows.map(row => ({
      value: row.value.toString(),
      label: row.label
    }));

    setCachedData(cacheKey, data);
    console.log(`✅ Loaded ${data.length} nguyennhan options`);
    
    res.json(data);
  } catch (error) {
    console.error("❌ Lỗi lấy danh sách nguyên nhân:", error);
    res.status(500).json({ error: error.message });
  }
};

// ✅ CẬP NHẬT: Lấy tất cả chủ rừng từ bảng tlaocai_tkk_3lr_cru
exports.getAllChuRung = async (req, res) => {
  try {
    const cacheKey = getCacheKey('churung');
    const cached = getCachedData(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }

    console.log("🚀 Fetching churung from tlaocai_tkk_3lr_cru...");
    
    const churungQuery = `
      SELECT DISTINCT churung
      FROM tlaocai_tkk_3lr_cru 
      WHERE churung IS NOT NULL AND trim(churung) != ''
      ORDER BY churung
    `;
    
    const result = await pool.query(churungQuery);
    
    const data = result.rows.map((row) => ({
      value: row.churung,
      label: convertTcvn3ToUnicode(row.churung),
    }));

    setCachedData(cacheKey, data);
    console.log(`✅ Loaded ${data.length} churung options from tlaocai_tkk_3lr_cru`);
    
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

// API để check cache status
exports.getCacheStatus = async (req, res) => {
  try {
    const cacheInfo = {
      size: cache.size,
      keys: Array.from(cache.keys()),
      stats: cache.getStats()
    };
    res.json(cacheInfo);
  } catch (error) {
    console.error("❌ Lỗi lấy cache status:", error);
    res.status(500).json({ error: error.message });
  }
};