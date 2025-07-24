// server/routes/matrung.route.js - FIXED VERSION WITH USER JOIN
const express = require("express");
const { Pool } = require("pg");
const router = express.Router();
const convertTcvn3ToUnicode = require("../utils/convertTcvn3ToUnicode");

const pool = new Pool();

router.get("/", async (req, res) => {
  const {
    fromDate,
    toDate,
    huyen,
    xa,
    tk,
    khoanh,
    churung,
    limit = 1000,
  } = req.query;

  try {
    // ✅ TRƯỜNG HỢP 1: Không có filter gì - lấy dữ liệu 3 THÁNG GẦN NHẤT
    if (!fromDate && !toDate && !huyen && !xa && !tk && !khoanh && !churung) {
      console.log("🔴 Loading dữ liệu mat_rung 3 tháng gần nhất với spatial intersection và user info...");
      
      const defaultQuery = `
        SELECT 
          m.gid,
          m.start_sau,
          m.area,
          m.start_dau,
          m.end_sau,
          m.mahuyen,
          m.end_dau,
          m.detection_status,
          m.detection_date,
          m.verified_by,
          m.verified_area,
          m.verification_reason,
          m.verification_notes,
          
          -- ✅ FIX: JOIN với bảng users để lấy tên thật
          u.full_name as verified_by_name,
          u.username as verified_by_username,
          
          -- Thông tin từ spatial intersection
          r.huyen,
          r.xa,
          r.tieukhu as tk,
          r.khoanh,
          
          -- Extract tọa độ centroid
          ST_X(ST_Centroid(ST_Transform(m.geom, 4326))) as x_coordinate,
          ST_Y(ST_Centroid(ST_Transform(m.geom, 4326))) as y_coordinate,
          
          -- Geometry cho bản đồ
          ST_AsGeoJSON(ST_Transform(m.geom, 4326)) as geometry
          
        FROM mat_rung m
        LEFT JOIN laocai_ranhgioihc r ON ST_Intersects(
          ST_Transform(m.geom, 4326), 
          ST_Transform(r.geom, 4326)
        )
        -- ✅ FIX: LEFT JOIN với bảng users
        LEFT JOIN users u ON m.verified_by = u.id
        WHERE m.geom IS NOT NULL 
          AND m.end_sau::date >= CURRENT_DATE - INTERVAL '3 months'
        ORDER BY m.end_sau DESC, m.gid DESC 
        LIMIT $1
      `;

      const defaultResult = await pool.query(defaultQuery, [limit]);

      // ✅ Xây dựng GeoJSON với thông tin user đầy đủ
      const features = defaultResult.rows.map(row => {
        // Fallback mapping cho huyện nếu không có spatial intersection
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

        return {
          type: "Feature",
          geometry: JSON.parse(row.geometry),
          properties: {
            gid: row.gid,
            start_sau: row.start_sau,
            area: row.area,
            start_dau: row.start_dau,
            end_sau: row.end_sau,
            mahuyen: row.mahuyen,
            end_dau: row.end_dau,
            detection_status: row.detection_status,
            detection_date: row.detection_date,
            verified_by: row.verified_by,
            verified_area: row.verified_area,
            verification_reason: row.verification_reason,
            verification_notes: row.verification_notes,
            
            // ✅ FIX: Thêm thông tin người xác minh đầy đủ
            verified_by_name: row.verified_by_name,
            verified_by_username: row.verified_by_username,
            
            // ✅ Thông tin từ spatial intersection (có fallback)
            huyen: convertTcvn3ToUnicode(row.huyen || huyenMapping[row.mahuyen] || `Huyện ${row.mahuyen}`),
            xa: convertTcvn3ToUnicode(row.xa || ""),
            tk: row.tk,
            khoanh: row.khoanh,
            
            // ✅ Tọa độ
            x_coordinate: row.x_coordinate,
            y_coordinate: row.y_coordinate
          }
        };
      });

      const matRungGeoJSON = {
        type: "FeatureCollection",
        features: features
      };

      console.log(`✅ Loaded ${matRungGeoJSON.features?.length || 0} mat_rung features (3 tháng gần nhất) với user info`);

      return res.json({
        message: `✅ Đã tải ${matRungGeoJSON.features?.length || 0} khu vực mất rừng (3 tháng gần nhất)`,
        mat_rung: matRungGeoJSON,
        tkk_3lr_cru: { type: "FeatureCollection", features: [] },
        isDefault: true,
        timeRange: '3_months',
        totalLoaded: matRungGeoJSON.features?.length || 0,
        spatialIntersectionUsed: true,
        userInfoIncluded: true // ✅ Flag mới
      });
    }

    // ✅ TRƯỜNG HỢP 2: Có filter - sử dụng spatial intersection + user info
    if (!fromDate || !toDate) {
      return res.status(400).json({ 
        message: "Cần có tham số từ ngày và đến ngày khi tìm kiếm có điều kiện." 
      });
    }

    console.log("🔍 Loading dữ liệu mat_rung với filter, spatial intersection và user info...");

    // ========= Truy vấn với spatial intersection + user info =========
    const conditions = [];
    const params = [];
    let index = 1;

    // Điều kiện cơ bản
    conditions.push(`m.start_dau >= $${index++}`);
    conditions.push(`m.end_sau <= $${index++}`);
    params.push(fromDate, toDate);

    // Điều kiện spatial
    if (huyen) {
      conditions.push(`r.huyen = $${index++}`);
      params.push(huyen);
    }
    if (xa) {
      conditions.push(`r.xa = $${index++}`);
      params.push(xa);
    }
    if (tk) {
      conditions.push(`r.tieukhu = $${index++}`);
      params.push(tk);
    }
    if (khoanh) {
      conditions.push(`r.khoanh = $${index++}`);
      params.push(khoanh);
    }

    // Chủ rừng từ bảng laocai_rg3lr
    let churungJoin = "";
    if (churung) {
      churungJoin = `LEFT JOIN laocai_rg3lr t ON ST_Intersects(m.geom, t.geom)`;
      conditions.push(`t.churung ILIKE $${index++}`);
      params.push(`%${churung}%`);
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    const matRungQuery = `
      SELECT 
        m.gid,
        m.start_sau,
        m.area,
        m.start_dau,
        m.end_sau,
        m.mahuyen,
        m.end_dau,
        m.detection_status,
        m.detection_date,
        m.verified_by,
        m.verified_area,
        m.verification_reason,
        m.verification_notes,
        
        -- ✅ FIX: Thông tin người xác minh
        u.full_name as verified_by_name,
        u.username as verified_by_username,
        
        -- Spatial intersection data
        r.huyen,
        r.xa,
        r.tieukhu as tk,
        r.khoanh,
        ${churung ? 't.churung,' : 'NULL as churung,'}
        
        -- Coordinates
        ST_X(ST_Centroid(ST_Transform(m.geom, 4326))) as x_coordinate,
        ST_Y(ST_Centroid(ST_Transform(m.geom, 4326))) as y_coordinate,
        
        -- Geometry
        ST_AsGeoJSON(ST_Transform(m.geom, 4326)) as geometry
        
      FROM mat_rung m
      LEFT JOIN laocai_ranhgioihc r ON ST_Intersects(
        ST_Transform(m.geom, 4326), 
        ST_Transform(r.geom, 4326)
      )
      -- ✅ FIX: LEFT JOIN với bảng users
      LEFT JOIN users u ON m.verified_by = u.id
      ${churungJoin}
      ${whereClause}
      AND m.geom IS NOT NULL
      ORDER BY m.end_sau DESC, m.gid DESC
      LIMIT $${index++}
    `;

    params.push(limit);

    const matRungResult = await pool.query(matRungQuery, params);

    // Xây dựng GeoJSON với spatial data + user info
    const matRungFeatures = matRungResult.rows.map(row => {
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

      return {
        type: "Feature",
        geometry: JSON.parse(row.geometry),
        properties: {
          gid: row.gid,
          start_sau: row.start_sau,
          area: row.area,
          start_dau: row.start_dau,
          end_sau: row.end_sau,
          mahuyen: row.mahuyen,
          end_dau: row.end_dau,
          detection_status: row.detection_status,
          detection_date: row.detection_date,
          verified_by: row.verified_by,
          verified_area: row.verified_area,
          verification_reason: row.verification_reason,
          verification_notes: row.verification_notes,
          
          // ✅ FIX: Thông tin người xác minh đầy đủ
          verified_by_name: row.verified_by_name,
          verified_by_username: row.verified_by_username,
          
          // Spatial intersection data với fallback
          huyen: convertTcvn3ToUnicode(row.huyen || huyenMapping[row.mahuyen] || `Huyện ${row.mahuyen}`),
          xa: convertTcvn3ToUnicode(row.xa || ""),
          tk: row.tk,
          khoanh: row.khoanh,
          churung: convertTcvn3ToUnicode(row.churung || ""),
          
          // Coordinates
          x_coordinate: row.x_coordinate,
          y_coordinate: row.y_coordinate
        }
      };
    });

    const matRungGeoJSON = {
      type: "FeatureCollection",
      features: matRungFeatures
    };

    console.log(`✅ Loaded ${matRungGeoJSON.features?.length || 0} mat_rung features với filter và user info`);

    res.json({
      message: "✅ Dữ liệu đã được truy xuất thành công với spatial intersection và user info.",
      mat_rung: matRungGeoJSON,
      tkk_3lr_cru: { type: "FeatureCollection", features: [] },
      isDefault: false,
      spatialIntersectionUsed: true,
      userInfoIncluded: true, // ✅ Flag mới
      filters: {
        fromDate,
        toDate,
        huyen,
        xa,
        tk,
        khoanh,
        churung
      }
    });
  } catch (err) {
    console.error("❌ Lỗi truy vấn dữ liệu mat_rung:", err);
    res.status(500).json({ 
      message: "Lỗi server khi truy vấn dữ liệu.", 
      error: err.message 
    });
  }
});

// ✅ ENDPOINT: Lấy toàn bộ dữ liệu mat_rung với spatial intersection + user info
router.get("/all", async (req, res) => {
  const { limit = 1000, months = 3 } = req.query;
  
  try {
    console.log(`🔴 Loading mat_rung data ${months} tháng gần nhất với user info, limit: ${limit}`);
    
    const query = `
      SELECT 
        m.gid,
        m.start_sau,
        m.area,
        m.start_dau,
        m.end_sau,
        m.mahuyen,
        m.end_dau,
        m.detection_status,
        m.detection_date,
        m.verified_by,
        m.verified_area,
        m.verification_reason,
        m.verification_notes,
        
        -- ✅ FIX: Thông tin người xác minh
        u.full_name as verified_by_name,
        u.username as verified_by_username,
        
        -- Spatial intersection
        r.huyen,
        r.xa,
        r.tieukhu as tk,
        r.khoanh,
        
        -- Coordinates
        ST_X(ST_Centroid(ST_Transform(m.geom, 4326))) as x_coordinate,
        ST_Y(ST_Centroid(ST_Transform(m.geom, 4326))) as y_coordinate,
        
        -- Geometry
        ST_AsGeoJSON(ST_Transform(m.geom, 4326)) as geometry
        
      FROM mat_rung m
      LEFT JOIN laocai_ranhgioihc r ON ST_Intersects(
        ST_Transform(m.geom, 4326), 
        ST_Transform(r.geom, 4326)
      )
      -- ✅ FIX: LEFT JOIN với bảng users
      LEFT JOIN users u ON m.verified_by = u.id
      WHERE m.geom IS NOT NULL 
        AND m.end_sau::date >= CURRENT_DATE - INTERVAL '${months} months'
      ORDER BY m.end_sau DESC, m.gid DESC 
      LIMIT $1
    `;

    const result = await pool.query(query, [parseInt(limit)]);

    // Xây dựng GeoJSON với spatial data + user info
    const features = result.rows.map(row => {
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

      return {
        type: "Feature",
        geometry: JSON.parse(row.geometry),
        properties: {
          gid: row.gid,
          start_sau: row.start_sau,
          area: row.area,
          start_dau: row.start_dau,
          end_sau: row.end_sau,
          mahuyen: row.mahuyen,
          end_dau: row.end_dau,
          detection_status: row.detection_status,
          detection_date: row.detection_date,
          verified_by: row.verified_by,
          verified_area: row.verified_area,
          verification_reason: row.verification_reason,
          verification_notes: row.verification_notes,
          
          // ✅ FIX: Thông tin người xác minh đầy đủ
          verified_by_name: row.verified_by_name,
          verified_by_username: row.verified_by_username,
          
          // Spatial data với fallback
          huyen: convertTcvn3ToUnicode(row.huyen || huyenMapping[row.mahuyen] || `Huyện ${row.mahuyen}`),
          xa: convertTcvn3ToUnicode(row.xa || ""),
          tk: row.tk,
          khoanh: row.khoanh,
          
          // Coordinates
          x_coordinate: row.x_coordinate,
          y_coordinate: row.y_coordinate
        }
      };
    });

    const geoJSON = {
      type: "FeatureCollection",
      features: features
    };

    console.log(`✅ Successfully loaded ${geoJSON.features?.length || 0} mat_rung features (${months} tháng) với user info`);

    res.json({
      success: true,
      message: `Đã tải ${geoJSON.features?.length || 0} khu vực mất rừng (${months} tháng gần nhất)`,
      data: geoJSON,
      total: geoJSON.features?.length || 0,
      limit: parseInt(limit),
      timeRange: `${months}_months`,
      spatialIntersectionUsed: true,
      userInfoIncluded: true // ✅ Flag mới
    });

  } catch (err) {
    console.error("❌ Lỗi khi lấy toàn bộ dữ liệu mat_rung:", err);
    res.status(500).json({ 
      success: false,
      message: "Lỗi server khi lấy dữ liệu mất rừng",
      error: err.message 
    });
  }
});

// ✅ ENDPOINT: Lấy thống kê dữ liệu mat_rung - CẬP NHẬT VỚI USER INFO
router.get("/stats", async (req, res) => {
  try {
    console.log("📊 Getting mat_rung statistics với user info...");
    
    const statsQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN m.geom IS NOT NULL THEN 1 END) as records_with_geometry,
        COUNT(CASE WHEN r.gid IS NOT NULL THEN 1 END) as records_with_spatial_data,
        COUNT(CASE WHEN m.end_sau::date >= CURRENT_DATE - INTERVAL '3 months' THEN 1 END) as recent_3_months,
        COUNT(CASE WHEN m.end_sau::date >= CURRENT_DATE - INTERVAL '12 months' THEN 1 END) as recent_12_months,
        MIN(m.start_dau) as earliest_date,
        MAX(m.end_sau) as latest_date,
        SUM(m.area) as total_area,
        COUNT(DISTINCT m.mahuyen) as unique_districts,
        COUNT(DISTINCT r.huyen) as unique_huyen_names,
        COUNT(DISTINCT r.xa) as unique_xa_names,
        -- ✅ FIX: Thống kê về xác minh
        COUNT(CASE WHEN m.detection_status = 'Đã xác minh' THEN 1 END) as verified_records,
        COUNT(CASE WHEN m.verified_by IS NOT NULL THEN 1 END) as records_with_verifier,
        COUNT(DISTINCT m.verified_by) as unique_verifiers
      FROM mat_rung m
      LEFT JOIN laocai_ranhgioihc r ON ST_Intersects(
        ST_Transform(m.geom, 4326), 
        ST_Transform(r.geom, 4326)
      )
      LEFT JOIN users u ON m.verified_by = u.id;
    `;

    const result = await pool.query(statsQuery);
    const stats = result.rows[0];

    // Format area thành hectares
    stats.total_area_ha = stats.total_area ? parseFloat((stats.total_area / 10000).toFixed(2)) : 0;
    stats.spatial_intersection_rate = stats.total_records > 0 
      ? ((stats.records_with_spatial_data / stats.total_records) * 100).toFixed(2) + '%'
      : '0%';
    stats.verification_rate = stats.total_records > 0
      ? ((stats.verified_records / stats.total_records) * 100).toFixed(2) + '%'
      : '0%';

    console.log("📊 Mat rung statistics với user info:", stats);

    res.json({
      success: true,
      data: stats
    });

  } catch (err) {
    console.error("❌ Lỗi khi lấy thống kê mat_rung:", err);
    res.status(500).json({ 
      success: false,
      message: "Lỗi server khi lấy thống kê",
      error: err.message 
    });
  }
});

module.exports = router;