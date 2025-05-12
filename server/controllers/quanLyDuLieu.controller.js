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

      const sql = `
  SELECT 
    jsonb_build_object(
      'type', 'FeatureCollection',
      'features', jsonb_agg(
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
            'churung', t.churung,
            'x', CASE 
                  WHEN ST_IsValid(m.geom) THEN 
                    COALESCE(
                      ST_X(ST_Transform(
                        ST_PointOnSurface(
                          -- Sử dụng buffer để đảm bảo tọa độ hợp lệ
                          ST_Buffer(m.geom, 0)
                        ), 
                        3405
                      )), 
                      NULL
                    )
                  ELSE NULL
                END,
            'y', CASE 
                  WHEN ST_IsValid(m.geom) THEN 
                    COALESCE(
                      ST_Y(ST_Transform(
                        ST_PointOnSurface(
                          ST_Buffer(m.geom, 0)
                        ), 
                        3405
                      )), 
                      NULL
                    )
                  ELSE NULL
                END
          )
        )
      )
    ) AS geojson
  FROM mat_rung m
  JOIN tlaocai_tkk_3lr_cru t 
    ON ST_Intersects(
      ST_Buffer(m.geom, 0), 
      ST_Transform(ST_Buffer(t.geom, 0), 4326)
    )
  WHERE m.start_dau::date >= $1
    AND m.end_sau::date <= $2
    AND ($3::text IS NULL OR t.huyen = $3)
    AND ($4::text IS NULL OR t.xa = $4)
    AND ($5::text IS NULL OR t.tk = $5)
    AND ($6::text IS NULL OR t.khoanh = $6)
    AND ($7::text IS NULL OR t.churung = $7)
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
      const sql = `
        SELECT 
          jsonb_build_object(
            'type', 'FeatureCollection',
            'features', jsonb_agg(
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
                  'churung', t.churung,
                  'x', ST_X(ST_Transform(ST_Centroid(m.geom), 3405)),
                  'y', ST_Y(ST_Transform(ST_Centroid(m.geom), 3405))
                )
              )
            )
          ) AS geojson
        FROM mat_rung m
        JOIN tlaocai_tkk_3lr_cru t 
          ON ST_Intersects(m.geom, ST_Transform(t.geom, 4326))
        WHERE m.start_dau::date >= $1
          AND m.end_sau::date <= $2
          AND ($3::text IS NULL OR t.huyen = $3)
          AND ($4::text IS NULL OR t.xa = $4)
          AND ($5::text IS NULL OR t.tk = $5)
          AND ($6::text IS NULL OR t.khoanh = $6)
          AND ($7::text IS NULL OR t.churung = $7)
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
    res.status(500).json({
      success: false,
      message: "Lỗi truy vấn dữ liệu",
      error: err.message,
    });
  }
};
