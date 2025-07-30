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
      xacMinh = 'false'
    } = req.query;

    console.log("🔍 Báo cáo params:", { fromDate, toDate, huyen, xa, type, xacMinh });

    // ✅ QUERY ĐỞN GIẢN - Không dùng CTE phức tạp
    let query = `
      SELECT 
        m.gid,
        m.start_dau, 
        m.end_sau, 
        m.area,
        m.mahuyen,
        m.detection_status,
        m.verification_reason,
        m.verification_notes,
        u.full_name as verified_by_name,
        r.huyen,
        r.xa,
        r.tieukhu as tk,
        r.khoanh,
        ST_X(ST_Transform(ST_Centroid(m.geom), 3405)) as x,
        ST_Y(ST_Transform(ST_Centroid(m.geom), 3405)) as y
      FROM mat_rung m
      LEFT JOIN laocai_ranhgioihc r ON ST_Intersects(m.geom, r.geom)
      LEFT JOIN users u ON m.verified_by = u.id
      WHERE TO_DATE(m.start_dau, 'YYYY-MM-DD') >= $1 
        AND TO_DATE(m.end_sau, 'YYYY-MM-DD') <= $2
        AND m.geom IS NOT NULL
    `;

    // ✅ Build parameters đơn giản
    const values = [fromDate, toDate];
    let paramIndex = 3;

    // ✅ Thêm điều kiện xác minh
    if (xacMinh === 'true') {
      query += ` AND m.detection_status = 'Đã xác minh'`;
    }

    // ✅ Thêm filter hành chính
    if (huyen) {
      query += ` AND LOWER(r.huyen) = LOWER($${paramIndex++})`;
      values.push(huyen);
    }

    if (xa) {
      query += ` AND LOWER(r.xa) = LOWER($${paramIndex++})`;
      values.push(xa);
    }

    // ✅ Order và limit
    query += ` ORDER BY m.gid `;

    console.log("🚀 Final query:", query.replace(/\$\d+/g, '?'));
    console.log("📋 Values:", values);

    const result = await pool.query(query, values);
    let rows = result.rows;

    console.log(`📊 Found ${rows.length} rows`);

    if (rows.length === 0) {
      return res.json({ 
        success: true, 
        data: [],
        message: `Không có dữ liệu ${xacMinh === 'true' ? 'đã xác minh' : ''} phù hợp`,
        filters: { fromDate, toDate, huyen, xa, xacMinh }
      });
    }

    // ✅ Fallback mapping đơn giản
    const huyenMapping = {
      '01': 'Lào Cai', '02': 'Bát Xát', '03': 'Mường Khương',
      '04': 'Si Ma Cai', '05': 'Bắc Hà', '06': 'Bảo Thắng',
      '07': 'Bảo Yên', '08': 'Sa Pa', '09': 'Văn Bàn', '80': 'Lào Cai'
    };

    // ✅ Process data đơn giản
    rows = rows.map(row => ({
      gid: row.gid,
      start_dau: row.start_dau,
      end_sau: row.end_sau,
      area: row.area,
      mahuyen: row.mahuyen,
      detection_status: row.detection_status,
      verification_reason: convertTcvn3ToUnicode(row.verification_reason || ""),
      verification_notes: row.verification_notes,
      verified_by_name: convertTcvn3ToUnicode(row.verified_by_name || ""),
      
      // ✅ Fallback cho huyen/xa
      huyen: row.huyen ? convertTcvn3ToUnicode(row.huyen) : (huyenMapping[row.mahuyen] || `Huyện ${row.mahuyen}`),
      xa: convertTcvn3ToUnicode(row.xa || ""),
      tk: row.tk || "",
      khoanh: row.khoanh || "",
      
      // ✅ TỌA ĐỘ - LÀM TRÒN KHÔNG LẤY SAU DẤU PHẨY
      x: row.x ? Math.round(parseFloat(row.x)) : null,
      y: row.y ? Math.round(parseFloat(row.y)) : null,
      
      // ✅ Các field cố định
      maxa: "",
      churung: "",
      ghichu: ""
    }));

    console.log(`✅ Processed ${rows.length} rows successfully`);

    if (type === "Văn bản") {
      return res.json({ 
        success: true, 
        data: rows,
        total: rows.length,
        filters: { fromDate, toDate, huyen, xa, xacMinh },
        reportType: xacMinh === 'true' ? 'verified' : 'all'
      });
    }

    if (type === "Biểu đồ") {
      const chartData = {};
      for (const row of rows) {
        const h = row.huyen || "Không rõ";
        if (xacMinh === 'true') {
          const status = row.detection_status || "Chưa xác minh";
          if (!chartData[h]) chartData[h] = {};
          chartData[h][status] = (chartData[h][status] || 0) + 1;
        } else {
          chartData[h] = (chartData[h] || 0) + 1;
        }
      }

      return res.json({ 
        success: true, 
        data: chartData,
        total: rows.length,
        filters: { fromDate, toDate, huyen, xa, xacMinh },
        reportType: xacMinh === 'true' ? 'verified' : 'all'
      });
    }

    return res.status(400).json({ success: false, message: "Loại báo cáo không hợp lệ" });

  } catch (err) {
    console.error("❌ Lỗi tra cứu báo cáo:", err);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi khi tạo báo cáo: " + err.message,
      error: err.message
    });
  }
};