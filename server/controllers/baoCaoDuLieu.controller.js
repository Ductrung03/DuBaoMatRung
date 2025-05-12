const pool = require("../db");
const convertTcvn3ToUnicode = require("../utils/convertTcvn3ToUnicode");

exports.traCuuDuLieuBaoMatRung = async (req, res) => {
  try {
    const {
      fromDate = "1900-01-01",
      toDate = "2100-01-01",
      huyen = null,
      xa = null,
      type = "Văn bản",
    } = req.query;

    const conditions = [];
    const values = [fromDate, toDate];
    let idx = 3;

    if (huyen) {
      conditions.push(`LOWER(t.huyen) = LOWER($${idx++})`);
      values.push(huyen);
    }

    if (xa) {
      conditions.push(`LOWER(t.xa) = LOWER($${idx++})`);
      values.push(xa);
    }

    const whereClause = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

    // Query với tọa độ x, y trong hệ VN-2000 cho báo cáo
    const query = `
      SELECT distinct
        t.*, 
        m.start_dau, m.end_sau, m.area,
        ST_X(ST_Transform(ST_Centroid(ST_Buffer(m.geom, 0)), 3405)) as x,
        ST_Y(ST_Transform(ST_Centroid(ST_Buffer(m.geom, 0)), 3405)) as y
      FROM tlaocai_tkk_3lr_cru t
      JOIN mat_rung m ON ST_Intersects(
        ST_Transform(ST_Buffer(t.geom, 0), 4326),
        ST_Buffer(m.geom, 0)
      )
      WHERE m.start_dau >= $1 AND m.end_sau <= $2
      ${whereClause}
    `;

    const result = await pool.query(query, values);
    let rows = result.rows;

    // 🔁 Convert các trường text sang Unicode
    rows = rows.map(row => ({
      ...row,
      huyen: convertTcvn3ToUnicode(row.huyen),
      xa: convertTcvn3ToUnicode(row.xa),
      churung: row.churung ? convertTcvn3ToUnicode(row.churung) : "",
      // Làm tròn tọa độ đến 2 chữ số thập phân
      x: row.x ? parseFloat(parseFloat(row.x).toFixed(2)) : null,
      y: row.y ? parseFloat(parseFloat(row.y).toFixed(2)) : null
    }));

    if (type === "Văn bản") {
      return res.json({ success: true, data: rows });
    }

    if (type === "Biểu đồ") {
      const chartData = {};
      for (const row of rows) {
        const h = row.huyen || "Không rõ";
        chartData[h] = (chartData[h] || 0) + 1;
      }

      return res.json({ success: true, data: chartData });
    }

    return res.status(400).json({ success: false, message: "Loại báo cáo không hợp lệ" });
  } catch (err) {
    console.error("❌ Lỗi tra cứu báo cáo:", err);
    res.status(500).json({ success: false, message: "Lỗi khi tạo báo cáo" });
  }
};