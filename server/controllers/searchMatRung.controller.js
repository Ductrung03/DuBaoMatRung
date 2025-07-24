// server/controllers/searchMatRung.controller.js
const pool = require("../db");
const convertTcvn3ToUnicode = require("../utils/convertTcvn3ToUnicode");

// ✅ Tìm kiếm lô CB trong CSDL và load dữ liệu xung quanh
exports.searchMatRungById = async (req, res) => {
  const { gid } = req.params;
  const { radius = 5000 } = req.query; // Bán kính tìm kiếm xung quanh (mét)

  if (!gid) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng cung cấp mã lô CB (gid)"
    });
  }

  try {
    console.log(`🔍 Tìm kiếm lô CB với GID: ${gid}`);

    // Bước 1: Tìm lô CB chính
    const mainQuery = `
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
      WHERE m.gid = $1 AND m.geom IS NOT NULL
    `;

    const mainResult = await pool.query(mainQuery, [gid]);

    if (mainResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy lô CB-${gid} trong cơ sở dữ liệu`
      });
    }

    const targetFeature = mainResult.rows[0];
    console.log(`✅ Tìm thấy lô CB-${gid} tại tọa độ: ${targetFeature.x_coordinate}, ${targetFeature.y_coordinate}`);

    // Bước 2: Tìm các lô CB xung quanh trong bán kính
    const surroundingQuery = `
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
        
        -- Thông tin từ spatial intersection
        r.huyen,
        r.xa,
        r.tieukhu as tk,
        r.khoanh,
        
        -- Extract tọa độ centroid
        ST_X(ST_Centroid(ST_Transform(m.geom, 4326))) as x_coordinate,
        ST_Y(ST_Centroid(ST_Transform(m.geom, 4326))) as y_coordinate,
        
        -- Khoảng cách đến lô CB gốc
        ST_Distance(
          ST_Transform(m.geom, 3857), 
          ST_Transform((SELECT geom FROM mat_rung WHERE gid = $1), 3857)
        ) as distance_meters,
        
        -- Geometry cho bản đồ
        ST_AsGeoJSON(ST_Transform(m.geom, 4326)) as geometry
        
      FROM mat_rung m
      LEFT JOIN laocai_ranhgioihc r ON ST_Intersects(
        ST_Transform(m.geom, 4326), 
        ST_Transform(r.geom, 4326)
      )
      WHERE m.geom IS NOT NULL 
        AND ST_DWithin(
          ST_Transform(m.geom, 3857), 
          ST_Transform((SELECT geom FROM mat_rung WHERE gid = $1), 3857),
          $2
        )
      ORDER BY 
        CASE WHEN m.gid = $1 THEN 0 ELSE 1 END,  -- Lô CB gốc lên đầu
        distance_meters ASC
      LIMIT 50
    `;

    const surroundingResult = await pool.query(surroundingQuery, [gid, radius]);
    console.log(`📍 Tìm thấy ${surroundingResult.rows.length} lô CB trong bán kính ${radius}m`);

    // Bước 3: Xây dựng GeoJSON response
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

    const features = surroundingResult.rows.map(row => {
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
          detection_status: row.detection_status || 'Chưa xác minh',
          detection_date: row.detection_date,
          verified_by: row.verified_by,
          verified_area: row.verified_area,
          verification_reason: row.verification_reason,
          verification_notes: row.verification_notes,
          
          // Thông tin hành chính
          huyen: convertTcvn3ToUnicode(row.huyen || huyenMapping[row.mahuyen] || `Huyện ${row.mahuyen}`),
          xa: convertTcvn3ToUnicode(row.xa || ""),
          tk: row.tk,
          khoanh: row.khoanh,
          
          // Tọa độ
          x_coordinate: row.x_coordinate,
          y_coordinate: row.y_coordinate,
          
          // Thông tin tìm kiếm
          distance_meters: row.distance_meters,
          is_target: row.gid.toString() === gid.toString()
        }
      };
    });

    const geoJsonData = {
      type: "FeatureCollection",
      features: features
    };

    // Bước 4: Tính toán bbox để zoom map
    const targetCoords = [targetFeature.x_coordinate, targetFeature.y_coordinate];
    const bufferSize = 0.01; // ~1km buffer
    const bbox = [
      targetCoords[0] - bufferSize, // west
      targetCoords[1] - bufferSize, // south  
      targetCoords[0] + bufferSize, // east
      targetCoords[1] + bufferSize  // north
    ];

    console.log(`✅ Search completed for CB-${gid}`);

    res.json({
      success: true,
      message: `Đã tìm thấy lô CB-${gid} và ${features.length - 1} lô CB xung quanh`,
      data: {
        target_feature: features.find(f => f.properties.is_target),
        geojson: geoJsonData,
        bbox: bbox,
        center: targetCoords,
        total_features: features.length,
        search_radius_meters: radius,
        target_gid: gid
      }
    });

  } catch (err) {
    console.error("❌ Lỗi tìm kiếm lô CB:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tìm kiếm lô CB",
      error: err.message
    });
  }
};

// ✅ Lấy thông tin chi tiết một lô CB để hiển thị form xác minh
exports.getMatRungDetail = async (req, res) => {
  const { gid } = req.params;

  try {
    console.log(`📋 Lấy chi tiết lô CB: ${gid}`);

    const query = `
      SELECT 
        m.*,
        r.huyen,
        r.xa,
        r.tieukhu as tk,
        r.khoanh,
        ST_X(ST_Centroid(ST_Transform(m.geom, 4326))) as x_coordinate,
        ST_Y(ST_Centroid(ST_Transform(m.geom, 4326))) as y_coordinate,
        u.full_name as verified_by_name
      FROM mat_rung m
      LEFT JOIN laocai_ranhgioihc r ON ST_Intersects(
        ST_Transform(m.geom, 4326), 
        ST_Transform(r.geom, 4326)
      )
      LEFT JOIN users u ON m.verified_by = u.id
      WHERE m.gid = $1
    `;

    const result = await pool.query(query, [gid]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy lô CB-${gid}`
      });
    }

    const detail = result.rows[0];
    
    res.json({
      success: true,
      data: {
        gid: detail.gid,
        area: detail.area,
        start_dau: detail.start_dau,
        end_sau: detail.end_sau,
        mahuyen: detail.mahuyen,
        detection_status: detail.detection_status || 'Chưa xác minh',
        detection_date: detail.detection_date,
        verified_by: detail.verified_by,
        verified_by_name: detail.verified_by_name,
        verified_area: detail.verified_area,
        verification_reason: detail.verification_reason,
        verification_notes: detail.verification_notes,
        
        // Thông tin địa hành chính
        huyen: convertTcvn3ToUnicode(detail.huyen || ""),
        xa: convertTcvn3ToUnicode(detail.xa || ""),
        tk: detail.tk,
        khoanh: detail.khoanh,
        
        // Tọa độ
        x_coordinate: detail.x_coordinate,
        y_coordinate: detail.y_coordinate
      }
    });

  } catch (err) {
    console.error("❌ Lỗi lấy chi tiết lô CB:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy chi tiết lô CB",
      error: err.message
    });
  }
};