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

    console.log("🔍 Báo cáo params:", { fromDate, toDate, huyen, xa, type });

    // ✅ LOGIC ĐÚNG: Bắt đầu từ bảng mat_rung, overlay với laocai_ranhgioihc để lấy thông tin hành chính
    
    // Build WHERE conditions cho filter hành chính
    const conditions = [];
    const values = [fromDate, toDate];
    let idx = 3;

    if (huyen) {
      conditions.push(`LOWER(r.huyen) = LOWER($${idx++})`);
      values.push(huyen);
    }

    if (xa) {
      conditions.push(`LOWER(r.xa) = LOWER($${idx++})`);
      values.push(xa);
    }

    const adminFilter = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

    // ✅ Query đúng: mat_rung là bảng chính, join với laocai_ranhgioihc để lấy thông tin hành chính
    const query = `
      SELECT DISTINCT
        m.gid,
        m.start_dau, 
        m.end_sau, 
        m.area,
        m.mahuyen,
        r.huyen,
        r.xa,
        r.tieukhu as tk,
        r.khoanh,
        ST_X(ST_Transform(ST_Centroid(m.geom), 3405)) as x,
        ST_Y(ST_Transform(ST_Centroid(m.geom), 3405)) as y,
        '' as maxa,
        '' as churung,
        '' as ghichu
      FROM mat_rung m
      LEFT JOIN laocai_ranhgioihc r ON ST_Intersects(m.geom, r.geom)
      WHERE m.start_dau >= $1 
        AND m.end_sau <= $2
        ${adminFilter}
      ORDER BY r.huyen, r.xa, r.tieukhu, r.khoanh, m.gid
      LIMIT 1000
    `;

    console.log("🚀 Executing báo cáo query:");
    console.log(query.replace(/\$\d+/g, '?'));
    console.log("📋 With values:", values);

    const result = await pool.query(query, values);
    let rows = result.rows;

    console.log(`📊 Báo cáo found ${rows.length} rows from mat_rung`);

    if (rows.length === 0) {
      console.log("⚠️ No data found with current filters");
      return res.json({ 
        success: true, 
        data: [],
        message: "Không có dữ liệu phù hợp với điều kiện tìm kiếm",
        filters: { fromDate, toDate, huyen, xa }
      });
    }

    // 🔁 Convert các trường text sang Unicode
    rows = rows.map(row => ({
      ...row,
      huyen: convertTcvn3ToUnicode(row.huyen || ""),
      xa: convertTcvn3ToUnicode(row.xa || ""),
      churung: row.churung ? convertTcvn3ToUnicode(row.churung) : "",
      // Làm tròn tọa độ đến 2 chữ số thập phân
      x: row.x ? parseFloat(parseFloat(row.x).toFixed(2)) : null,
      y: row.y ? parseFloat(parseFloat(row.y).toFixed(2)) : null
    }));

    console.log(`✅ Processed ${rows.length} rows for report`);

    if (type === "Văn bản") {
      return res.json({ 
        success: true, 
        data: rows,
        total: rows.length,
        filters: { fromDate, toDate, huyen, xa }
      });
    }

    if (type === "Biểu đồ") {
      const chartData = {};
      for (const row of rows) {
        const h = row.huyen || "Không rõ";
        chartData[h] = (chartData[h] || 0) + 1;
      }

      return res.json({ 
        success: true, 
        data: chartData,
        total: rows.length,
        filters: { fromDate, toDate, huyen, xa }
      });
    }

    return res.status(400).json({ success: false, message: "Loại báo cáo không hợp lệ" });
  } catch (err) {
    console.error("❌ Lỗi tra cứu báo cáo:", err);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi khi tạo báo cáo: " + err.message,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};