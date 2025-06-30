const pool = require("../db");
const convertTcvn3ToUnicode = require("../utils/convertTcvn3ToUnicode");

exports.traCuuDuLieuBaoMatRung = async (req, res) => {
  const { fromDate, toDate, huyen, xa, tieukhu, khoanh, churung, page = 1, limit = 500 } = req.query;

  if (!fromDate || !toDate) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng chọn đầy đủ 'Từ ngày' và 'Đến ngày'.",
    });
  }

  try {
    console.log("🚀 Sử dụng database functions tối ưu cho tra cứu");

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const queryLimit = Math.min(parseInt(limit), 1000);

    // Kiểm tra quyền truy cập
    let finalHuyen = huyen;
    if (req.user && req.user.role !== "admin" && req.user.district_id) {
      if (huyen && huyen !== req.user.district_id) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền truy cập dữ liệu của huyện này.",
        });
      }
      finalHuyen = req.user.district_id;
    }

    console.log("📊 Query parameters:", {
      fromDate, toDate, finalHuyen, xa, tieukhu, khoanh, churung, page, limit: queryLimit
    });

    const startTime = Date.now();

    // 1. Đếm tổng số records bằng optimized function
    console.log("📊 Counting total records...");
    const countQuery = `
      SELECT count_spatial_intersect($1::date, $2::date, $3, $4, $5, $6, $7) as total
    `;
    
    const countParams = [fromDate, toDate, finalHuyen, xa, tieukhu, khoanh, churung];
    const countResult = await pool.query(countQuery, countParams);
    const totalRecords = parseInt(countResult.rows[0].total);
    
    console.log(`📊 Total records found: ${totalRecords}`);

    if (totalRecords === 0) {
      return res.json({
        success: true,
        message: "Không có dữ liệu phù hợp.",
        data: { type: "FeatureCollection", features: [] },
        pagination: {
          page: parseInt(page),
          limit: queryLimit,
          total: 0,
          totalPages: 0
        }
      });
    }

    // 2. Lấy dữ liệu bằng optimized function
    console.log("📊 Fetching data using optimized function...");
    const dataQuery = `
      SELECT * FROM optimized_spatial_intersect($1::date, $2::date, $3, $4, $5, $6, $7, $8, $9)
    `;
    
    const dataParams = [
      fromDate, toDate, finalHuyen, xa, tieukhu, khoanh, churung, queryLimit, offset
    ];
    
    const dataResult = await pool.query(dataQuery, dataParams);
    const queryTime = Date.now() - startTime;
    
    console.log(`⏱️ Database query executed in ${queryTime}ms`);

    // 3. Xây dựng GeoJSON từ kết quả
    const features = dataResult.rows.map(row => ({
      type: "Feature",
      geometry: JSON.parse(row.geometry),
      properties: {
        gid: row.gid,
        start_dau: row.start_dau,
        end_sau: row.end_sau,
        area: row.area,
        mahuyen: row.mahuyen,
        huyen: convertTcvn3ToUnicode(row.huyen || ""),
        xa: convertTcvn3ToUnicode(row.xa || ""),
        tk: row.tk,
        khoanh: row.khoanh,
        churung: convertTcvn3ToUnicode(row.churung || "")
      }
    }));

    const geojson = {
      type: "FeatureCollection",
      features: features
    };

    const totalPages = Math.ceil(totalRecords / queryLimit);

    console.log(`✅ Ultra-optimized query completed: ${features.length} features, ${queryTime}ms`);

    res.json({
      success: true,
      data: geojson,
      pagination: {
        page: parseInt(page),
        limit: queryLimit,
        total: totalRecords,
        totalPages: totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      },
      performance: {
        queryTime: queryTime,
        recordsReturned: features.length,
        optimizationUsed: "database_functions"
      }
    });

  } catch (err) {
    console.error("❌ Lỗi ultra-optimized tra cứu:", err.message);
    console.error("Stack trace:", err.stack);
    
    // Fallback to normal query if optimized functions fail
    console.log("🔄 Falling back to normal query...");
    
    try {
      // Implement fallback logic here (same as previous optimized version)
      return await this.traCuuDuLieuBaoMatRungFallback(req, res);
    } catch (fallbackErr) {
      console.error("❌ Fallback query also failed:", fallbackErr);
      
      res.status(500).json({
        success: false,
        message: "Lỗi truy vấn dữ liệu",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }
};

// Fallback method sử dụng normal queries
exports.traCuuDuLieuBaoMatRungFallback = async (req, res) => {
  const { fromDate, toDate, huyen, xa, tieukhu, khoanh, churung, page = 1, limit = 500 } = req.query;

  try {
    console.log("🔄 Using fallback normal query method");

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const queryLimit = Math.min(parseInt(limit), 1000);

    // Kiểm tra quyền truy cập
    let finalHuyen = huyen;
    if (req.user && req.user.role !== "admin" && req.user.district_id) {
      if (huyen && huyen !== req.user.district_id) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền truy cập dữ liệu của huyện này.",
        });
      }
      finalHuyen = req.user.district_id;
    }

    // Build WHERE conditions
    const conditions = [];
    const params = [fromDate, toDate];
    let paramIndex = 3;

    conditions.push("m.start_dau::date >= $1::date");
    conditions.push("m.end_sau::date <= $2::date");

    if (finalHuyen) {
      conditions.push(`t.huyen = $${paramIndex++}`);
      params.push(finalHuyen);
    }

    if (xa) {
      conditions.push(`t.xa = $${paramIndex++}`);
      params.push(xa);
    }

    if (tieukhu) {
      conditions.push(`t.tk = $${paramIndex++}`);
      params.push(tieukhu);
    }

    if (khoanh) {
      conditions.push(`t.khoanh = $${paramIndex++}`);
      params.push(khoanh);
    }

    if (churung) {
      conditions.push(`t.churung ILIKE $${paramIndex++}`);
      params.push(`%${churung}%`);
    }

    const whereClause = conditions.join(" AND ");

    // Count query
    const countQuery = `
      SELECT COUNT(*) as total
      FROM v_mat_rung_optimized m
      INNER JOIN tlaocai_tkk_3lr_cru t ON ST_Intersects(m.geom, ST_Transform(t.geom, 4326))
      WHERE ${whereClause}
        AND ST_IsValid(t.geom)
    `;

    const countResult = await pool.query(countQuery, params);
    const totalRecords = parseInt(countResult.rows[0].total);

    if (totalRecords === 0) {
      return res.json({
        success: true,
        message: "Không có dữ liệu phù hợp.",
        data: { type: "FeatureCollection", features: [] },
        pagination: {
          page: parseInt(page),
          limit: queryLimit,
          total: 0,
          totalPages: 0
        }
      });
    }

    // Data query
    const dataQuery = `
      SELECT 
        m.gid,
        m.start_dau,
        m.end_sau,
        m.area,
        m.mahuyen,
        t.huyen,
        t.xa,
        t.tk,
        t.khoanh,
        t.churung,
        ST_AsGeoJSON(m.geom) as geometry
      FROM v_mat_rung_optimized m
      INNER JOIN tlaocai_tkk_3lr_cru t ON ST_Intersects(m.geom, ST_Transform(t.geom, 4326))
      WHERE ${whereClause}
        AND ST_IsValid(t.geom)
      ORDER BY m.gid DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(queryLimit, offset);

    const startTime = Date.now();
    const dataResult = await pool.query(dataQuery, params);
    const queryTime = Date.now() - startTime;

    // Build GeoJSON
    const features = dataResult.rows.map(row => ({
      type: "Feature",
      geometry: JSON.parse(row.geometry),
      properties: {
        gid: row.gid,
        start_dau: row.start_dau,
        end_sau: row.end_sau,
        area: row.area,
        mahuyen: row.mahuyen,
        huyen: convertTcvn3ToUnicode(row.huyen || ""),
        xa: convertTcvn3ToUnicode(row.xa || ""),
        tk: row.tk,
        khoanh: row.khoanh,
        churung: convertTcvn3ToUnicode(row.churung || "")
      }
    }));

    const geojson = {
      type: "FeatureCollection",
      features: features
    };

    const totalPages = Math.ceil(totalRecords / queryLimit);

    res.json({
      success: true,
      data: geojson,
      pagination: {
        page: parseInt(page),
        limit: queryLimit,
        total: totalRecords,
        totalPages: totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      },
      performance: {
        queryTime: queryTime,
        recordsReturned: features.length,
        optimizationUsed: "fallback_normal_query"
      }
    });

  } catch (err) {
    console.error("❌ Fallback query failed:", err);
    throw err;
  }
};