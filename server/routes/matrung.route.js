const express = require("express");
const { Pool } = require("pg");
const router = express.Router();

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
  } = req.query;

  if (!fromDate || !toDate) {
    return res.status(400).json({ message: "Cần có tham số từ ngày và đến ngày." });
  }

  try {
    // ========= Truy vấn bảng mat_rung =========
    const matRungQuery = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(ST_Transform(geom, 4326))::json,
            'properties', to_jsonb(t) - 'geom'
          )
        ), '[]'::json)
      ) AS geojson
      FROM mat_rung AS t
      WHERE start_dau >= $1 AND end_sau <= $2;
    `;

    const matRungResult = await pool.query(matRungQuery, [fromDate, toDate]);
    const matRungGeoJSON = matRungResult.rows[0].geojson;

    // ========= Truy vấn bảng tlaocai_tkk_3lr_cru =========
    const conditions = [];
    const params = [];
    let index = 1;

    if (huyen) {
      conditions.push(`huyen = $${index++}`);
      params.push(huyen);
    }
    if (xa) {
      conditions.push(`xa = $${index++}`);
      params.push(xa);
    }
    if (tk) {
      conditions.push(`tk = $${index++}`);
      params.push(tk);
    }
    if (khoanh) {
      conditions.push(`khoanh = $${index++}`);
      params.push(khoanh);
    }
    if (churung) {
      conditions.push(`churung ILIKE $${index++}`);
      params.push(`%${churung}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const cruQuery = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(ST_Transform(geom, 4326))::json,
            'properties', to_jsonb(t) - 'geom'
          )
        ), '[]'::json)
      ) AS geojson
      FROM tlaocai_tkk_3lr_cru t
      ${whereClause};
    `;

    const cruResult = await pool.query(cruQuery, params);
    const cruGeoJSON = cruResult.rows[0].geojson;

    res.json({
      message: "✅ Dữ liệu đã được truy xuất thành công.",
      mat_rung: matRungGeoJSON,
      tkk_3lr_cru: cruGeoJSON,
    });
  } catch (err) {
    console.error("Lỗi truy vấn dữ liệu:", err);
    res.status(500).json({ message: "Lỗi server khi truy vấn dữ liệu." });
  }
});

module.exports = router;
