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

    // Thiết lập header đúng
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
    // Tạo HTML
    const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Báo cáo mất rừng - ${fromDate} đến ${toDate}</title>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
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
        
        .control-panel {
          position: fixed;
          top: 10px;
          right: 10px;
          background-color: #f9f9f9;
          padding: 10px;
          border-radius: 4px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .control-button {
          background-color: #4CAF50;
          color: white;
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: bold;
        }
        
        .control-button.print {
          background-color: #2196F3;
        }
        
        .control-button:hover {
          opacity: 0.8;
        }
        
        .instruction {
          position: fixed;
          top: 100px;
          right: 10px;
          background-color: #f9f9f9;
          border: 1px solid #ddd;
          padding: 10px;
          border-radius: 4px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.2);
          width: 250px;
          z-index: 1000;
        }
        
        #report-content {
          background: white;
          padding: 20px;
          margin-bottom: 30px;
        }
        
        @media print {
          .control-panel, .instruction {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="control-panel no-print">
        <button class="control-button" onclick="downloadPDF()">Tải PDF</button>
        <button class="control-button print" onclick="window.print()">In báo cáo</button>
      </div>
      
      <div id="report-content">
        <h1>THỐNG KÊ KẾT QUẢ DỰ BÁO MẤT RỪNG</h1>
        
        <div class="header">
          <p>Tỉnh: ${"TP.Lào Cai" || "..........................."}</p>
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
      </div>
      
      <script>
        function downloadPDF() {
          const { jsPDF } = window.jspdf;
          
          // Hiển thị trạng thái đang tải
          const loadingMessage = document.createElement('div');
          loadingMessage.style.position = 'fixed';
          loadingMessage.style.top = '0';
          loadingMessage.style.left = '0';
          loadingMessage.style.width = '100%';
          loadingMessage.style.height = '100%';
          loadingMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
          loadingMessage.style.display = 'flex';
          loadingMessage.style.alignItems = 'center';
          loadingMessage.style.justifyContent = 'center';
          loadingMessage.style.color = 'white';
          loadingMessage.style.fontSize = '20px';
          loadingMessage.style.zIndex = '9999';
          loadingMessage.textContent = 'Đang tạo file PDF...';
          document.body.appendChild(loadingMessage);
          
          // Lấy phần tử cần chuyển đổi
          const element = document.getElementById('report-content');
          
          // Để đảm bảo tạo PDF đúng, chờ một chút
          setTimeout(() => {
            html2canvas(element, {
              scale: 2, // Tăng scale để cải thiện chất lượng
              useCORS: true,
              logging: false
            }).then(canvas => {
              const imgData = canvas.toDataURL('image/png');
              
              // Xác định kích thước của PDF dựa trên A4
              const pdf = new jsPDF('p', 'mm', 'a4');
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = pdf.internal.pageSize.getHeight();
              
              // Tính toán tỷ lệ để phù hợp với trang A4
              const imgWidth = canvas.width;
              const imgHeight = canvas.height;
              const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
              const imgX = (pdfWidth - imgWidth * ratio) / 2;
              const imgY = 0;
              
              pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
              
              // Tải PDF
              pdf.save('bao-cao-mat-rung-${fromDate}-${toDate}.pdf');
              
              // Xóa thông báo đang tải
              document.body.removeChild(loadingMessage);
            });
          }, 500);
        }
      </script>
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
