const pool = require("../db");
const convertTcvn3ToUnicode = require("../utils/convertTcvn3ToUnicode");

// ✅ CẬP NHẬT: Tra cứu dữ liệu với LEFT JOIN để đảm bảo có dữ liệu
exports.traCuuDuLieuBaoMatRung = async (req, res) => {
  const { fromDate, toDate, huyen, xa, tieukhu, khoanh, churung, page = 1, limit = 500 } = req.query;

  if (!fromDate || !toDate) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng chọn đầy đủ 'Từ ngày' và 'Đến ngày'.",
    });
  }

  try {
    console.log("🚀 Sử dụng LEFT JOIN spatial intersection");

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

    // ✅ XÂY DỰNG ĐIỀU KIỆN WHERE
    const conditions = [];
    const queryParams = [];
    let paramIndex = 1;

    // Điều kiện cho bảng mat_rung (bắt buộc)
    conditions.push(`m.start_dau::date >= $${paramIndex++}::date`);
    conditions.push(`m.end_sau::date <= $${paramIndex++}::date`);
    queryParams.push(fromDate, toDate);

    // Điều kiện cho spatial intersection (tùy chọn)
    if (finalHuyen) {
      conditions.push(`r.huyen = $${paramIndex++}`);
      queryParams.push(finalHuyen);
    }

    if (xa) {
      conditions.push(`r.xa = $${paramIndex++}`);
      queryParams.push(xa);
    }

    if (tieukhu) {
      conditions.push(`r.tieukhu = $${paramIndex++}`);
      queryParams.push(tieukhu);
    }

    if (khoanh) {
      conditions.push(`r.khoanh = $${paramIndex++}`);
      queryParams.push(khoanh);
    }

    // XỬ LÝ CHURUNG từ bảng laocai_rg3lr
    let churungJoin = "";
    if (churung) {
      churungJoin = `
        LEFT JOIN laocai_rg3lr t ON ST_Intersects(m.geom, t.geom)
      `;
      conditions.push(`t.churung ILIKE $${paramIndex++}`);
      queryParams.push(`%${churung}%`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // ✅ TRUY VẤN COUNT đơn giản trước
    console.log("📊 Counting total records...");
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM mat_rung m
      LEFT JOIN laocai_ranhgioihc r ON ST_Intersects(
        ST_Transform(m.geom, 4326), 
        ST_Transform(r.geom, 4326)
      )
      ${churungJoin}
      ${whereClause}
      AND m.geom IS NOT NULL
    `;
    
    console.log("📊 Count query:", countQuery);
    console.log("📊 Query params:", queryParams);
    
    const countResult = await pool.query(countQuery, queryParams);
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

    // ✅ TRUY VẤN DỮ LIỆU chính - SỬ DỤNG LEFT JOIN để đảm bảo có dữ liệu
    console.log("📊 Fetching main data...");
    
    const dataQuery = `
      SELECT 
        m.gid,
        m.start_dau,
        m.end_sau,
        m.area,
        m.mahuyen,
        m.detection_status,
        m.detection_date,
        m.verified_by,
        m.verified_area,
        m.verification_reason,
        m.verification_notes,
        
        -- Thông tin từ spatial intersection (có thể NULL)
        r.huyen,
        r.xa,
        r.tieukhu as tk,
        r.khoanh,
        
        -- Thông tin chủ rừng (có thể NULL)
        ${churung ? 't.churung,' : 'NULL as churung,'}
        
        -- Extract tọa độ centroid từ geometry
        ST_X(ST_Centroid(ST_Transform(m.geom, 4326))) as x_coordinate,
        ST_Y(ST_Centroid(ST_Transform(m.geom, 4326))) as y_coordinate,
        
        -- Geometry cho hiển thị trên bản đồ
        ST_AsGeoJSON(ST_Transform(m.geom, 4326)) as geometry
        
      FROM mat_rung m
      LEFT JOIN laocai_ranhgioihc r ON ST_Intersects(
        ST_Transform(m.geom, 4326), 
        ST_Transform(r.geom, 4326)
      )
      ${churungJoin}
      ${whereClause}
      AND m.geom IS NOT NULL
      ORDER BY m.gid DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    queryParams.push(queryLimit, offset);

    console.log("📊 Main data query:", dataQuery);

    const dataResult = await pool.query(dataQuery, queryParams);
    const queryTime = Date.now() - startTime;
    
    console.log(`⏱️ Query executed in ${queryTime}ms`);
    console.log(`📊 Records returned: ${dataResult.rows.length}`);

    // ✅ XÂY DỰNG GEOJSON với đầy đủ thông tin
    const features = dataResult.rows.map(row => {
      // Log để debug spatial intersection
      if (row.huyen) {
        console.log(`✅ GID ${row.gid} HAS spatial data:`, {
          huyen: row.huyen,
          xa: row.xa,
          tk: row.tk,
          khoanh: row.khoanh
        });
      } else {
        console.log(`❌ GID ${row.gid} NO spatial data - checking alternative methods`);
        
        // Thử lấy thông tin từ mã huyện
        const huyenMapping = {
          '01': 'Lào Cai',
          '02': 'Bát Xát', 
          '03': 'Mường Khương',
          '04': 'Si Ma Cai',
          '05': 'Bắc Hà',
          '06': 'Bảo Thắng',
          '07': 'Bảo Yên',
          '08': 'Sa Pa',
          '09': 'Văn Bàn'
        };
        
        // Gán giá trị fallback từ mã huyện
        row.huyen = huyenMapping[row.mahuyen] || `Huyện ${row.mahuyen}`;
        row.xa = null; // Để NULL nếu không có spatial intersection
        row.tk = null;
        row.khoanh = null;
        
        console.log(`🔄 Applied fallback for GID ${row.gid}: huyen = ${row.huyen}`);
      }

      return {
        type: "Feature",
        geometry: JSON.parse(row.geometry),
        properties: {
          gid: row.gid,
          start_dau: row.start_dau,
          end_sau: row.end_sau,
          area: row.area,
          mahuyen: row.mahuyen,
          
          // ✅ Thông tin hành chính (có thể có fallback)
          huyen: convertTcvn3ToUnicode(row.huyen || ""),
          xa: convertTcvn3ToUnicode(row.xa || ""),
          tk: row.tk,
          khoanh: row.khoanh,
          
          // ✅ Tọa độ đã extract
          x_coordinate: row.x_coordinate,
          y_coordinate: row.y_coordinate,
          
          // ✅ Thông tin xác minh
          detection_status: row.detection_status || 'Chưa xác minh',
          detection_date: row.detection_date,
          verified_by: row.verified_by,
          verified_area: row.verified_area,
          verification_reason: row.verification_reason,
          verification_notes: row.verification_notes,
          
          // ✅ Chủ rừng (nếu có)
          churung: convertTcvn3ToUnicode(row.churung || "")
        }
      };
    });

    const geojson = {
      type: "FeatureCollection",
      features: features
    };

    const totalPages = Math.ceil(totalRecords / queryLimit);

    console.log(`✅ Query completed: ${features.length} features, ${queryTime}ms`);

    // ✅ Thống kê spatial intersection
    const withSpatialData = features.filter(f => f.properties.huyen && f.properties.xa).length;
    const withoutSpatialData = features.length - withSpatialData;
    
    console.log(`📊 Spatial intersection stats: ${withSpatialData} with data, ${withoutSpatialData} using fallback`);

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
        spatialIntersectionSuccess: withSpatialData,
        fallbackUsed: withoutSpatialData
      },
      dataSource: {
        intersectionTables: ["mat_rung", "laocai_ranhgioihc"],
        churungSource: churung ? "laocai_rg3lr" : null,
        coordinatesExtracted: true
      }
    });

  } catch (err) {
    console.error("❌ Lỗi truy vấn:", err.message);
    console.error("Stack trace:", err.stack);
    
    res.status(500).json({
      success: false,
      message: "Lỗi truy vấn dữ liệu",
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
        COUNT(DISTINCT r.xa) as unique_xa,
        COUNT(DISTINCT r.tieukhu) as unique_tieukhu,
        COUNT(DISTINCT r.khoanh) as unique_khoanh
      FROM mat_rung m
      LEFT JOIN laocai_ranhgioihc r ON ST_Intersects(
        ST_Transform(m.geom, 4326), 
        ST_Transform(r.geom, 4326)
      )
      WHERE m.geom IS NOT NULL
    `;
    
    const result = await pool.query(testQuery);
    const stats = result.rows[0];
    
    console.log("📊 Spatial intersection test results:", stats);
    
    // Test mẫu với 5 records
    const sampleQuery = `
      SELECT 
        m.gid,
        m.area,
        m.mahuyen,
        r.huyen,
        r.xa,
        r.tieukhu as tk,
        r.khoanh,
        ST_X(ST_Centroid(ST_Transform(m.geom, 4326))) as x_coord,
        ST_Y(ST_Centroid(ST_Transform(m.geom, 4326))) as y_coord
      FROM mat_rung m
      LEFT JOIN laocai_ranhgioihc r ON ST_Intersects(
        ST_Transform(m.geom, 4326), 
        ST_Transform(r.geom, 4326)
      )
      WHERE m.geom IS NOT NULL
      ORDER BY m.gid DESC
      LIMIT 5
    `;
    
    const sampleResult = await pool.query(sampleQuery);
    
    res.json({
      success: true,
      message: "Spatial intersection test completed",
      stats: {
        total_mat_rung_records: parseInt(stats.total_mat_rung),
        intersecting_records: parseInt(stats.intersecting_records),
        unique_huyen: parseInt(stats.unique_huyen),
        unique_xa: parseInt(stats.unique_xa),
        unique_tieukhu: parseInt(stats.unique_tieukhu),
        unique_khoanh: parseInt(stats.unique_khoanh),
        intersection_rate: stats.total_mat_rung > 0 
          ? ((stats.intersecting_records / stats.total_mat_rung) * 100).toFixed(2) + '%'
          : '0%'
      },
      sample_data: sampleResult.rows.map(row => ({
        gid: row.gid,
        area: row.area,
        mahuyen: row.mahuyen,
        huyen: convertTcvn3ToUnicode(row.huyen || "NULL"),
        xa: convertTcvn3ToUnicode(row.xa || "NULL"),
        tk: row.tk || "NULL",
        khoanh: row.khoanh || "NULL",
        coordinates: row.x_coord && row.y_coord ? `${row.x_coord}, ${row.y_coord}` : "NULL"
      }))
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