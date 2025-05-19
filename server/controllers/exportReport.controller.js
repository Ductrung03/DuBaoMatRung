const { createReportDocx } = require("../utils/reportGenerator");
const pool = require("../db");
const convertTcvn3ToUnicode = require("../utils/convertTcvn3ToUnicode");
const PDFDocument = require("pdfkit");

// Xuất file DOCX
exports.exportDocx = async (req, res) => {
  try {
    const { fromDate, toDate, huyen, xa } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ 
        success: false, 
        message: "Vui lòng cung cấp fromDate và toDate" 
      });
    }

    // Lấy dữ liệu từ database
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

    // Chuyển các trường text sang Unicode
    rows = rows.map(row => ({
      ...row,
      huyen: convertTcvn3ToUnicode(row.huyen),
      xa: convertTcvn3ToUnicode(row.xa),
      churung: row.churung ? convertTcvn3ToUnicode(row.churung) : "",
      // Làm tròn tọa độ đến 2 chữ số thập phân
      x: row.x ? parseFloat(parseFloat(row.x).toFixed(2)) : null,
      y: row.y ? parseFloat(parseFloat(row.y).toFixed(2)) : null
    }));

    // Tạo file DOCX
    const docxBuffer = await createReportDocx(rows, { fromDate, toDate, huyen, xa });

    // Gửi file về client
    res.setHeader('Content-Disposition', `attachment; filename=bao-cao-mat-rung-${fromDate}-${toDate}.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(docxBuffer);
  } catch (err) {
    console.error("❌ Lỗi xuất báo cáo DOCX:", err);
    res.status(500).json({ success: false, message: "Lỗi khi tạo file báo cáo" });
  }
};

// Xuất file PDF với giải pháp mới - sử dụng trang HTML để tạo PDF
exports.exportPdf = async (req, res) => {
  try {
    const { fromDate, toDate, huyen, xa } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ 
        success: false, 
        message: "Vui lòng cung cấp fromDate và toDate" 
      });
    }

    // Lấy dữ liệu từ database
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

    // Chuyển các trường text sang Unicode
    rows = rows.map(row => ({
      ...row,
      huyen: convertTcvn3ToUnicode(row.huyen),
      xa: convertTcvn3ToUnicode(row.xa),
      churung: row.churung ? convertTcvn3ToUnicode(row.churung) : "",
      x: row.x ? parseFloat(parseFloat(row.x).toFixed(2)) : null,
      y: row.y ? parseFloat(parseFloat(row.y).toFixed(2)) : null
    }));

    // Thiết lập header đúng - QUAN TRỌNG: Đổi từ application/pdf sang text/html
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
    // Tạo HTML
    const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Báo cáo mất rừng - ${fromDate} đến ${toDate}</title>
      <style>
        @page {
          size: A4;
          margin: 2cm;
        }
        
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          
          .no-print {
            display: none;
          }
        }
        
        body {
          font-family: Arial, Helvetica, sans-serif;
          margin: 20px;
          color: black;
        }
        
        h1 {
          text-align: center;
          font-size: 18px;
          margin-bottom: 20px;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 5px;
          text-align: center;
          font-size: 12px;
        }
        
        th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        
        .footer {
          display: flex;
          justify-content: space-between;
          margin-top: 30px;
        }
        
        .footer p {
          font-weight: bold;
        }
        
        .save-button {
          position: fixed;
          top: 10px;
          right: 10px;
          background-color: #4CAF50;
          color: white;
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
          z-index: 1000;
        }
        
        .instruction {
          position: fixed;
          top: 50px;
          right: 10px;
          background-color: #f9f9f9;
          border: 1px solid #ddd;
          padding: 10px;
          border-radius: 4px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          width: 250px;
          z-index: 1000;
        }
        
        @media print {
          .save-button, .instruction {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <button class="save-button no-print" onclick="window.print()">Lưu PDF</button>
      
      <div class="instruction no-print">
        <p><strong>Hướng dẫn:</strong> Để lưu báo cáo này dưới dạng PDF, hãy:</p>
        <ol>
          <li>Nhấn nút "Lưu PDF" màu xanh</li>
          <li>Hoặc nhấn tổ hợp phím Ctrl+P</li>
          <li>Trong hộp thoại in, chọn "Lưu dưới dạng PDF"</li>
        </ol>
      </div>
      
      <h1>THỐNG KÊ KẾT QUẢ DỰ BÁO MẤT RỪNG</h1>
      
      <div class="header">
        <p>Tỉnh: ${huyen || "..........................."}</p>
        <p>Từ ngày: ${fromDate} Đến ngày: ${toDate}</p>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>TT</th>
            <th>Huyện</th>
            <th>Mã xã</th>
            <th>Xã</th>
            <th>X</th>
            <th>Y</th>
            <th>Tiểu khu</th>
            <th>Khoảnh</th>
            <th>Diện tích</th>
            <th>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((item, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${item.huyen || ""}</td>
              <td>${item.maxa || ""}</td>
              <td>${item.xa || ""}</td>
              <td>${item.x || ""}</td>
              <td>${item.y || ""}</td>
              <td>${item.tk || ""}</td>
              <td>${item.khoanh || ""}</td>
              <td>${item.area ? (item.area / 10000).toFixed(1) + " ha" : ""}</td>
              <td>${item.ghichu || ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      
      <div class="footer">
        <p>Người tổng hợp</p>
        <div>
          <p>........., ngày ...... tháng ...... năm ......</p>
          <p style="text-align: center;">Chi cục trưởng</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // Gửi HTML về client
    res.send(html);
  } catch (err) {
    console.error("❌ Lỗi xuất báo cáo PDF:", err);
    res.status(500).json({ success: false, message: "Lỗi khi tạo file báo cáo" });
  }
};

// Giữ lại hàm cũ cho tương thích ngược
exports.exportHtml = async (req, res) => {
  try {
    const { fromDate, toDate, huyen, xa } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ 
        success: false, 
        message: "Vui lòng cung cấp fromDate và toDate" 
      });
    }

    // Lấy dữ liệu từ database
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

    // Chuyển các trường text sang Unicode
    rows = rows.map(row => ({
      ...row,
      huyen: convertTcvn3ToUnicode(row.huyen),
      xa: convertTcvn3ToUnicode(row.xa),
      churung: row.churung ? convertTcvn3ToUnicode(row.churung) : "",
      // Làm tròn tọa độ đến 2 chữ số thập phân
      x: row.x ? parseFloat(parseFloat(row.x).toFixed(2)) : null,
      y: row.y ? parseFloat(parseFloat(row.y).toFixed(2)) : null
    }));

    // Thiết lập header đúng
    res.setHeader('Content-Type', 'text/html; charset=utf-8');

    // Tạo HTML
    const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Báo cáo mất rừng</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
        }
        h1 {
          text-align: center;
          font-size: 18px;
          margin-bottom: 20px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #000;
          padding: 5px;
          text-align: center;
          font-size: 12px;
        }
        th {
          background-color: #f2f2f2;
        }
        .footer {
          display: flex;
          justify-content: space-between;
          margin-top: 30px;
        }
        .footer p {
          font-weight: bold;
        }
        @media print {
          body {
            margin: 0;
            padding: 10px;
          }
        }
      </style>
    </head>
    <body>
      <h1>THỐNG KÊ KẾT QUẢ DỰ BÁO MẤT RỪNG</h1>
      
      <div class="header">
        <p>Tỉnh: ${huyen || "..........................."}</p>
        <p>Từ ngày: ${fromDate} Đến ngày: ${toDate}</p>
      </div>
      
      <table>
        <thead>
          <tr>
            <th>TT</th>
            <th>Huyện</th>
            <th>Mã xã</th>
            <th>Xã</th>
            <th>X</th>
            <th>Y</th>
            <th>Tiểu khu</th>
            <th>Khoảnh</th>
            <th>Diện tích</th>
            <th>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((item, idx) => `
            <tr>
              <td>${idx + 1}</td>
              <td>${item.huyen || ""}</td>
              <td>${item.maxa || ""}</td>
              <td>${item.xa || ""}</td>
              <td>${item.x || ""}</td>
              <td>${item.y || ""}</td>
              <td>${item.tk || ""}</td>
              <td>${item.khoanh || ""}</td>
              <td>${item.area ? (item.area / 10000).toFixed(1) + " ha" : ""}</td>
              <td>${item.ghichu || ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
      
      <div class="footer">
        <p>Người tổng hợp</p>
        <div>
          <p>........., ngày ...... tháng ...... năm ......</p>
          <p style="text-align: center;">Chi cục trưởng</p>
        </div>
      </div>
      
      <script>
        // Tự động mở hộp thoại in khi trang được tải
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
    `;

    // Gửi HTML về client
    res.send(html);
  } catch (err) {
    console.error("❌ Lỗi xuất báo cáo HTML:", err);
    res.status(500).json({ success: false, message: "Lỗi khi tạo file báo cáo" });
  }
};