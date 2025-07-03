const pool = require("../db");
const convertTcvn3ToUnicode = require("../utils/convertTcvn3ToUnicode");

// ✅ CẬP NHẬT: Tra cứu dữ liệu với spatial intersection giữa mat_rung và laocai_ranhgioihc
exports.traCuuDuLieuBaoMatRung = async (req, res) => {
  const { fromDate, toDate, huyen, xa, tieukhu, khoanh, churung, page = 1, limit = 500 } = req.query;

  if (!fromDate || !toDate) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng chọn đầy đủ 'Từ ngày' và 'Đến ngày'.",
    });
  }

  try {
    console.log("🚀 Sử dụng spatial intersection giữa mat_rung và laocai_ranhgioihc");

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

    // ✅ THAY ĐỔI: Xây dựng WHERE conditions cho bảng laocai_ranhgioihc
    const ranhgioihcConditions = [];
    const ranhgioihcParams = [];
    let ranhgioihcParamIndex = 1;

    if (finalHuyen) {
      ranhgioihcConditions.push(`r.huyen = $${ranhgioihcParamIndex++}`);
      ranhgioihcParams.push(finalHuyen);
    }

    if (xa) {
      ranhgioihcConditions.push(`r.xa = $${ranhgioihcParamIndex++}`);
      ranhgioihcParams.push(xa);
    }

    if (tieukhu) {
      ranhgioihcConditions.push(`r.tieukhu = $${ranhgioihcParamIndex++}`);
      ranhgioihcParams.push(tieukhu);
    }

    if (khoanh) {
      ranhgioihcConditions.push(`r.khoanh = $${ranhgioihcParamIndex++}`);
      ranhgioihcParams.push(khoanh);
    }

    // ✅ THAY ĐỔI: Xây dựng WHERE conditions cho bảng mat_rung
    const matRungConditions = [
      `m.start_dau::date >= $${ranhgioihcParamIndex++}::date`,
      `m.end_sau::date <= $${ranhgioihcParamIndex++}::date`
    ];
    ranhgioihcParams.push(fromDate, toDate);

    // ✅ XỬ LÝ CHURUNG: Vì churung không có trong laocai_ranhgioihc, ta sẽ join với tlaocai_tkk_3lr_cru
    let churungJoin = "";
    let churungCondition = "";
    
    if (churung) {
      churungJoin = `
        LEFT JOIN tlaocai_tkk_3lr_cru t ON ST_Intersects(r.geom, ST_Transform(t.geom, 4326))
      `;
      churungCondition = `AND t.churung ILIKE $${ranhgioihcParamIndex++}`;
      ranhgioihcParams.push(`%${churung}%`);
    }

    const ranhgioihcWhereClause = ranhgioihcConditions.length > 0 
      ? `WHERE ${ranhgioihcConditions.join(" AND ")}` 
      : "";

    const matRungWhereClause = `WHERE ${matRungConditions.join(" AND ")}`;

    // ✅ TRUY VẤN MỚI: Spatial intersection giữa mat_rung và laocai_ranhgioihc
    console.log("📊 Counting total records with spatial intersection...");
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM mat_rung m
      INNER JOIN laocai_ranhgioihc r ON ST_Intersects(m.geom, r.geom)
      ${churungJoin}
      ${matRungWhereClause}
      ${ranhgioihcWhereClause.replace('WHERE', 'AND')}
      ${churungCondition}
      AND ST_IsValid(m.geom) AND ST_IsValid(r.geom)
    `;
    
    const countResult = await pool.query(countQuery, ranhgioihcParams);
    const totalRecords = parseInt(countResult.rows[0].total);
    
    console.log(`📊 Total intersecting records found: ${totalRecords}`);

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

    // ✅ TRUY VẤN DỮ LIỆU: Lấy dữ liệu với spatial intersection
    console.log("📊 Fetching data with spatial intersection...");
    
    const dataQuery = `
      SELECT 
        m.gid,
        m.start_dau,
        m.end_sau,
        m.area,
        m.mahuyen,
        r.huyen,
        r.xa,
        r.tieukhu as tk,
        r.khoanh,
        ${churung ? 't.churung,' : 'NULL as churung,'}
        ST_AsGeoJSON(m.geom) as geometry
      FROM mat_rung m
      INNER JOIN laocai_ranhgioihc r ON ST_Intersects(m.geom, r.geom)
      ${churungJoin}
      ${matRungWhereClause}
      ${ranhgioihcWhereClause.replace('WHERE', 'AND')}
      ${churungCondition}
      AND ST_IsValid(m.geom) AND ST_IsValid(r.geom)
      ORDER BY m.gid DESC
      LIMIT $${ranhgioihcParamIndex++} OFFSET $${ranhgioihcParamIndex++}
    `;

    ranhgioihcParams.push(queryLimit, offset);

    const dataResult = await pool.query(dataQuery, ranhgioihcParams);
    const queryTime = Date.now() - startTime;
    
    console.log(`⏱️ Spatial intersection query executed in ${queryTime}ms`);

    // ✅ XÂY DỰNG GEOJSON
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

    console.log(`✅ Spatial intersection query completed: ${features.length} features, ${queryTime}ms`);

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
        optimizationUsed: "spatial_intersection_mat_rung_ranhgioihc"
      },
      dataSource: {
        intersectionTables: ["mat_rung", "laocai_ranhgioihc"],
        churungSource: churung ? "tlaocai_tkk_3lr_cru" : null
      }
    });

  } catch (err) {
    console.error("❌ Lỗi spatial intersection tra cứu:", err.message);
    console.error("Stack trace:", err.stack);
    
    res.status(500).json({
      success: false,
      message: "Lỗi truy vấn dữ liệu spatial intersection",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

// ✅ THÊM: Endpoint để test spatial intersection
exports.testSpatialIntersection = async (req, res) => {
  try {
    console.log("🧪 Testing spatial intersection between mat_rung and laocai_ranhgioihc...");
    
    const testQuery = `
      SELECT 
        COUNT(*) as total_mat_rung,
        COUNT(CASE WHEN r.gid IS NOT NULL THEN 1 END) as intersecting_records,
        COUNT(DISTINCT r.huyen) as unique_huyen,
        COUNT(DISTINCT r.xa) as unique_xa
      FROM mat_rung m
      LEFT JOIN laocai_ranhgioihc r ON ST_Intersects(m.geom, r.geom)
      WHERE ST_IsValid(m.geom) AND ST_IsValid(r.geom)
    `;
    
    const result = await pool.query(testQuery);
    const stats = result.rows[0];
    
    console.log("📊 Spatial intersection test results:", stats);
    
    res.json({
      success: true,
      message: "Spatial intersection test completed",
      stats: {
        total_mat_rung_records: parseInt(stats.total_mat_rung),
        intersecting_records: parseInt(stats.intersecting_records),
        unique_huyen: parseInt(stats.unique_huyen),
        unique_xa: parseInt(stats.unique_xa),
        intersection_rate: stats.total_mat_rung > 0 
          ? ((stats.intersecting_records / stats.total_mat_rung) * 100).toFixed(2) + '%'
          : '0%'
      }
    });
    
  } catch (err) {
    console.error("❌ Lỗi test spatial intersection:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi test spatial intersection",
      error: err.message
    });
  }
};