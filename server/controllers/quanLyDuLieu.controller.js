const pool = require("../db");
const convertTcvn3ToUnicode = require("../utils/convertTcvn3ToUnicode");

exports.traCuuDuLieuBaoMatRung = async (req, res) => {
  const { fromDate, toDate, huyen, xa, tieukhu, khoanh, churung } = req.query;

  if (!fromDate || !toDate) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng chọn đầy đủ 'Từ ngày' và 'Đến ngày'.",
    });
  }

  try {
    // Kiểm tra quyền truy cập dữ liệu huyện
    if (req.user && req.user.role !== "admin" && req.user.district_id) {
      // Nếu người dùng đã chỉ định một huyện khác với huyện của họ
      if (huyen && huyen !== req.user.district_id) {
        return res.status(403).json({
          success: false,
          message: "Bạn không có quyền truy cập dữ liệu của huyện này.",
        });
      }

      // Nếu người dùng không chỉ định huyện, tự động sử dụng huyện của họ
      const userDistrictId = req.user.district_id;

      // Query không trả về tọa độ x, y
      // Truy vấn được tối ưu hóa
const sql = `
  SELECT 
    jsonb_build_object(
      'type', 'FeatureCollection',
      'features', COALESCE(jsonb_agg(
        jsonb_build_object(
          'type', 'Feature',
          'geometry', ST_AsGeoJSON(m.geom, 4326)::jsonb,
          'properties', jsonb_build_object(
            'start_dau', m.start_dau,
            'end_sau', m.end_sau,
            'area', m.area,
            'mahuyen', m.mahuyen,
            'huyen', t.huyen,
            'xa', t.xa,
            'tk', t.tk,
            'khoanh', t.khoanh,
            'churung', t.churung
          )
        )
      ), '[]'::json)
    ) AS geojson
  FROM mat_rung m
  JOIN tlaocai_tkk_3lr_cru t 
    ON ST_Intersects(
      m.geom,
      ST_Transform(t.geom, 4326)
    )
  WHERE m.start_dau::date >= $1
    AND m.end_sau::date <= $2
    AND ($3::text IS NULL OR t.huyen = $3)
    AND ($4::text IS NULL OR t.xa = $4)
    AND ($5::text IS NULL OR t.tk = $5)
    AND ($6::text IS NULL OR t.khoanh = $6)
    AND ($7::text IS NULL OR t.churung = $7)
    AND ST_IsValid(m.geom)
    AND ST_IsValid(t.geom)
  LIMIT CASE 
    WHEN $3 IS NULL AND $4 IS NULL AND $5 IS NULL AND $6 IS NULL AND $7 IS NULL 
    THEN 500 
    ELSE 10000 
  END
`;

      const values = [
        fromDate,
        toDate,
        userDistrictId,
        xa || null,
        tieukhu || null,
        khoanh || null,
        churung || null,
      ];

      const { rows } = await pool.query(sql, values);
      let geojson = rows[0]?.geojson;

      // Không có dữ liệu
      if (!geojson || !geojson.features || geojson.features.length === 0) {
        return res.json({
          success: true,
          message: "Không có dữ liệu phù hợp.",
          data: { type: "FeatureCollection", features: [] },
        });
      }

      // Chuyển các trường sang Unicode
      geojson.features = geojson.features.map((feature) => {
        const props = feature.properties;
        return {
          ...feature,
          properties: {
            ...props,
            huyen: convertTcvn3ToUnicode(props.huyen || ""),
            xa: convertTcvn3ToUnicode(props.xa || ""),
            churung: convertTcvn3ToUnicode(props.churung || ""),
          },
        };
      });

      res.json({ success: true, data: geojson });
    } else {
      // Truy vấn bình thường cho admin hoặc người dùng không bị giới hạn huyện
      // Query không trả về tọa độ x, y và có xử lý hình học an toàn
      const sql = `
        SELECT 
          jsonb_build_object(
            'type', 'FeatureCollection',
            'features', jsonb_agg(
              jsonb_build_object(
                'type', 'Feature',
                'geometry', ST_AsGeoJSON(ST_MakeValid(m.geom), 4326)::jsonb,
                'properties', jsonb_build_object(
                  'start_dau', m.start_dau,
                  'end_sau', m.end_sau,
                  'area', m.area,
                  'mahuyen', m.mahuyen,
                  'huyen', t.huyen,
                  'xa', t.xa,
                  'tk', t.tk,
                  'khoanh', t.khoanh,
                  'churung', t.churung
                )
              )
            )
          ) AS geojson
        FROM mat_rung m
        JOIN tlaocai_tkk_3lr_cru t 
          ON ST_Intersects(
            ST_MakeValid(m.geom),
            ST_Transform(ST_MakeValid(t.geom), 4326)
          )
        WHERE m.start_dau::date >= $1
          AND m.end_sau::date <= $2
          AND ($3::text IS NULL OR t.huyen = $3)
          AND ($4::text IS NULL OR t.xa = $4)
          AND ($5::text IS NULL OR t.tk = $5)
          AND ($6::text IS NULL OR t.khoanh = $6)
          AND ($7::text IS NULL OR t.churung = $7)
          AND ST_IsValid(m.geom)
          AND ST_IsValid(t.geom)
      `;

      const values = [
        fromDate,
        toDate,
        huyen || null,
        xa || null,
        tieukhu || null,
        khoanh || null,
        churung || null,
      ];

      const { rows } = await pool.query(sql, values);
      let geojson = rows[0]?.geojson;

      // Không có dữ liệu
      if (!geojson || !geojson.features || geojson.features.length === 0) {
        return res.json({
          success: true,
          message: "Không có dữ liệu phù hợp.",
          data: { type: "FeatureCollection", features: [] },
        });
      }

      // Chuyển các trường sang Unicode
      geojson.features = geojson.features.map((feature) => {
        const props = feature.properties;
        return {
          ...feature,
          properties: {
            ...props,
            huyen: convertTcvn3ToUnicode(props.huyen || ""),
            xa: convertTcvn3ToUnicode(props.xa || ""),
            churung: convertTcvn3ToUnicode(props.churung || ""),
          },
        };
      });

      res.json({ success: true, data: geojson });
    }
  } catch (err) {
    console.error("❌ Lỗi tra cứu mất rừng:", err.message);
    
    // Phân tích chi tiết lỗi để giúp debug
    let errorMessage = "Lỗi truy vấn dữ liệu";
    if (err.message.includes("LinearRing")) {
      errorMessage = "Lỗi hình học: Đa giác không hợp lệ. Vui lòng thử lại với điều kiện tìm kiếm khác";
    } else if (err.message.includes("transform")) {
      errorMessage = "Lỗi chuyển đổi hệ tọa độ. Vui lòng thử lại với điều kiện tìm kiếm khác";
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: err.message,
    });
  }
};