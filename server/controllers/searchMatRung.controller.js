// server/controllers/searchMatRung.controller.js - FIXED VERSION
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
    console.log(`🔍 Tìm kiếm lô CB với GID: ${gid}, radius: ${radius}m`);

    // ✅ BƯỚC 1: Tìm lô CB chính với thông tin đầy đủ
    const targetQuery = `
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
        ST_AsGeoJSON(ST_Transform(m.geom, 4326)) as geometry,
        
        -- Thông tin người xác minh
        u.full_name as verified_by_name
        
      FROM mat_rung m
      LEFT JOIN laocai_ranhgioihc r ON ST_Intersects(
        ST_Transform(m.geom, 4326), 
        ST_Transform(r.geom, 4326)
      )
      LEFT JOIN users u ON m.verified_by = u.id
      WHERE m.gid = $1 AND m.geom IS NOT NULL
    `;

    const targetResult = await pool.query(targetQuery, [gid]);

    if (targetResult.rows.length === 0) {
      console.log(`❌ Không tìm thấy lô CB-${gid}`);
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy lô CB-${gid} trong cơ sở dữ liệu`
      });
    }

    const targetFeature = targetResult.rows[0];
    console.log(`✅ Tìm thấy lô CB-${gid}:`, {
      area: targetFeature.area,
      huyen: targetFeature.huyen,
      xa: targetFeature.xa,
      coordinates: `${targetFeature.x_coordinate}, ${targetFeature.y_coordinate}`
    });

    // ✅ BƯỚC 2: Tìm các lô CB xung quanh trong bán kính (OPTIMIZED QUERY)
    const surroundingQuery = `
      WITH target_geom AS (
        SELECT geom FROM mat_rung WHERE gid = $1
      )
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
        
        -- Khoảng cách đến lô CB gốc (chỉ tính cho surrounding)
        CASE 
          WHEN m.gid = $1 THEN 0 
          ELSE ST_Distance(
            ST_Transform(m.geom, 3857), 
            ST_Transform((SELECT geom FROM target_geom), 3857)
          )
        END as distance_meters,
        
        -- Geometry cho bản đồ
        ST_AsGeoJSON(ST_Transform(m.geom, 4326)) as geometry,
        
        -- Thông tin người xác minh
        u.full_name as verified_by_name
        
      FROM mat_rung m
      LEFT JOIN laocai_ranhgioihc r ON ST_Intersects(
        ST_Transform(m.geom, 4326), 
        ST_Transform(r.geom, 4326)
      )
      LEFT JOIN users u ON m.verified_by = u.id,
      target_geom tg
      WHERE m.geom IS NOT NULL 
        AND (
          m.gid = $1  -- Include target
          OR ST_DWithin(
            ST_Transform(m.geom, 3857), 
            ST_Transform(tg.geom, 3857),
            $2
          )
        )
      ORDER BY 
        CASE WHEN m.gid = $1 THEN 0 ELSE 1 END,  -- Target first
        distance_meters ASC
      LIMIT 100
    `;

    const surroundingResult = await pool.query(surroundingQuery, [gid, radius]);
    console.log(`📍 Tìm thấy ${surroundingResult.rows.length} lô CB (bao gồm target) trong bán kính ${radius}m`);

    // ✅ BƯỚC 3: Xây dựng GeoJSON với fallback mapping
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

    const buildFeature = (row) => ({
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
        verified_by_name: row.verified_by_name,
        verified_area: row.verified_area,
        verification_reason: row.verification_reason,
        verification_notes: row.verification_notes,
        
        // ✅ Thông tin hành chính với fallback
        huyen: convertTcvn3ToUnicode(
          row.huyen || huyenMapping[row.mahuyen] || `Huyện ${row.mahuyen}`
        ),
        xa: convertTcvn3ToUnicode(row.xa || ""),
        tk: row.tk,
        khoanh: row.khoanh,
        
        // ✅ Tọa độ
        x_coordinate: row.x_coordinate,
        y_coordinate: row.y_coordinate,
        
        // ✅ Thông tin tìm kiếm
        distance_meters: row.distance_meters,
        is_target: row.gid.toString() === gid.toString()
      }
    });

    const features = surroundingResult.rows.map(buildFeature);
    const targetFeatureData = features.find(f => f.properties.is_target);
    const surroundingFeatures = features.filter(f => !f.properties.is_target);

    const geoJsonData = {
      type: "FeatureCollection",
      features: features
    };

    // ✅ BƯỚC 4: Tính toán bbox để zoom map
    const targetCoords = [targetFeature.x_coordinate, targetFeature.y_coordinate];
    
    // Dynamic bbox based on data extent
    if (features.length > 1) {
      const coords = features.map(f => [f.properties.x_coordinate, f.properties.y_coordinate]);
      const lons = coords.map(c => c[0]);
      const lats = coords.map(c => c[1]);
      
      const bbox = [
        Math.min(...lons),  // west
        Math.min(...lats),  // south
        Math.max(...lons),  // east
        Math.max(...lats)   // north
      ];
      
      // Add padding
      const padding = 0.005;
      bbox[0] -= padding; // west
      bbox[1] -= padding; // south
      bbox[2] += padding; // east
      bbox[3] += padding; // north
      
      console.log(`✅ Search completed for CB-${gid}:`, {
        total_features: features.length,
        surrounding_count: surroundingFeatures.length,
        bbox: bbox
      });

      return res.json({
        success: true,
        message: `Đã tìm thấy lô CB-${gid} và ${surroundingFeatures.length} lô CB xung quanh`,
        data: {
          target_feature: targetFeatureData,
          geojson: geoJsonData,
          center: targetCoords,
          bbox: bbox,
          total_features: features.length,
          surrounding_count: surroundingFeatures.length,
          search_radius_meters: parseInt(radius),
          target_gid: parseInt(gid)
        }
      });
      
    } else {
      // Only target found, create simple bbox
      const bufferSize = 0.01;
      const bbox = [
        targetCoords[0] - bufferSize,  // west
        targetCoords[1] - bufferSize,  // south
        targetCoords[0] + bufferSize,  // east
        targetCoords[1] + bufferSize   // north
      ];
      
      console.log(`✅ Search completed for CB-${gid}: chỉ tìm thấy target, không có surrounding`);

      return res.json({
        success: true,
        message: `Đã tìm thấy lô CB-${gid} (không có lô CB xung quanh trong bán kính ${radius}m)`,
        data: {
          target_feature: targetFeatureData,
          geojson: geoJsonData,
          center: targetCoords,
          bbox: bbox,
          total_features: features.length,
          surrounding_count: 0,
          search_radius_meters: parseInt(radius),
          target_gid: parseInt(gid)
        }
      });
    }

  } catch (err) {
    console.error("❌ Lỗi tìm kiếm lô CB:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tìm kiếm lô CB",
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
};

// ✅ Lấy thông tin chi tiết một lô CB để hiển thị form xác minh
exports.getMatRungDetail = async (req, res) => {
  const { gid } = req.params;

  if (!gid) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng cung cấp mã lô CB (gid)"
    });
  }

  try {
    console.log(`📋 Lấy chi tiết lô CB: ${gid}`);

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
        
        -- Thông tin từ spatial intersection
        r.huyen,
        r.xa,
        r.tieukhu as tk,
        r.khoanh,
        
        -- Tọa độ centroid
        ST_X(ST_Centroid(ST_Transform(m.geom, 4326))) as x_coordinate,
        ST_Y(ST_Centroid(ST_Transform(m.geom, 4326))) as y_coordinate,
        
        -- Thông tin người xác minh
        u.full_name as verified_by_name,
        u.username as verified_by_username
        
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
      console.log(`❌ Không tìm thấy lô CB-${gid} để lấy chi tiết`);
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy lô CB-${gid}`
      });
    }

    const detail = result.rows[0];
    
    // ✅ Fallback mapping cho huyện
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
    
    console.log(`✅ Lấy chi tiết thành công cho CB-${gid}`);
    
    res.json({
      success: true,
      data: {
        gid: detail.gid,
        area: detail.area,
        area_ha: detail.area ? (detail.area / 10000).toFixed(2) : null,
        start_dau: detail.start_dau,
        end_sau: detail.end_sau,
        mahuyen: detail.mahuyen,
        detection_status: detail.detection_status || 'Chưa xác minh',
        detection_date: detail.detection_date,
        verified_by: detail.verified_by,
        verified_by_name: detail.verified_by_name,
        verified_by_username: detail.verified_by_username,
        verified_area: detail.verified_area,
        verified_area_ha: detail.verified_area ? (detail.verified_area / 10000).toFixed(2) : null,
        verification_reason: detail.verification_reason,
        verification_notes: detail.verification_notes,
        
        // ✅ Thông tin địa hành chính với fallback
        huyen: convertTcvn3ToUnicode(
          detail.huyen || huyenMapping[detail.mahuyen] || `Huyện ${detail.mahuyen}`
        ),
        xa: convertTcvn3ToUnicode(detail.xa || ""),
        tk: detail.tk,
        khoanh: detail.khoanh,
        
        // ✅ Tọa độ
        x_coordinate: detail.x_coordinate,
        y_coordinate: detail.y_coordinate,
        
        // ✅ Thông tin bổ sung
        is_verified: detail.detection_status === 'Đã xác minh',
        has_verification_info: !!(detail.verification_reason),
        coordinates_display: detail.x_coordinate && detail.y_coordinate 
          ? `${detail.x_coordinate.toFixed(6)}, ${detail.y_coordinate.toFixed(6)}`
          : null
      }
    });

  } catch (err) {
    console.error("❌ Lỗi lấy chi tiết lô CB:", err);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy chi tiết lô CB",
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
    });
  }
};