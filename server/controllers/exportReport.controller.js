const { createReportDocx } = require("../utils/reportGenerator");
const pool = require("../db");
const convertTcvn3ToUnicode = require("../utils/convertTcvn3ToUnicode");

// ✅ Hàm chung để lấy dữ liệu báo cáo - LOGIC ĐÚNG: mat_rung là chính
const getReportData = async (fromDate, toDate, huyen, xa) => {
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

  // ✅ Query đúng: mat_rung là bảng chính, overlay với laocai_ranhgioihc để lấy thông tin hành chính
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

  console.log("🚀 Export query (mat_rung based):");
  console.log(query.replace(/\$\d+/g, '?'));
  console.log("📋 Export values:", values);

  const result = await pool.query(query, values);
  let rows = result.rows;

  console.log(`📊 Export found ${rows.length} mat_rung records`);

  // Convert các trường text sang Unicode
  rows = rows.map(row => ({
    ...row,
    huyen: convertTcvn3ToUnicode(row.huyen || ""),
    xa: convertTcvn3ToUnicode(row.xa || ""),
    churung: row.churung ? convertTcvn3ToUnicode(row.churung) : "",
    // Làm tròn tọa độ đến 2 chữ số thập phân
    x: row.x ? parseFloat(parseFloat(row.x).toFixed(2)) : null,
    y: row.y ? parseFloat(parseFloat(row.y).toFixed(2)) : null
  }));

  console.log(`✅ Export processed ${rows.length} rows`);
  return rows;
};

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

    console.log("📄 Exporting DOCX with params:", { fromDate, toDate, huyen, xa });

    // Lấy dữ liệu từ database - ưu tiên mat_rung
    const rows = await getReportData(fromDate, toDate, huyen, xa);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Không có dữ liệu mất rừng phù hợp để tạo báo cáo",
        filters: { fromDate, toDate, huyen, xa }
      });
    }

    // Tạo file DOCX
    const docxBuffer = await createReportDocx(rows, { fromDate, toDate, huyen, xa });

    // Gửi file về client
    res.setHeader('Content-Disposition', `attachment; filename=bao-cao-mat-rung-${fromDate}-${toDate}.docx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(docxBuffer);

    console.log(`📄 DOCX exported successfully with ${rows.length} records`);
  } catch (err) {
    console.error("❌ Lỗi xuất báo cáo DOCX:", err);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi khi tạo file báo cáo: " + err.message,
      error: err.message 
    });
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

    console.log("📄 Exporting PDF with params:", { fromDate, toDate, huyen, xa });

    // Lấy dữ liệu từ database - ưu tiên mat_rung
    const rows = await getReportData(fromDate, toDate, huyen, xa);

    if (rows.length === 0) {
      const noDataHtml = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <title>Không có dữ liệu mất rừng</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; color: #666; }
            .message { font-size: 18px; margin: 20px 0; }
            .info { font-size: 14px; background: #f0f8ff; padding: 15px; border-radius: 5px; }
          </style>
        </head>
        <body>
          <h1>📊 Báo cáo mất rừng</h1>
          <p class="message">⚠️ Không có dữ liệu mất rừng phù hợp với điều kiện tìm kiếm</p>
          <div class="info">
            <p><strong>Thời gian:</strong> ${fromDate} đến ${toDate}</p>
            ${huyen ? `<p><strong>Huyện:</strong> ${huyen}</p>` : ''}
            ${xa ? `<p><strong>Xã:</strong> ${xa}</p>` : ''}
            <p><em>Vui lòng thử điều chỉnh điều kiện tìm kiếm hoặc mở rộng khoảng thời gian</em></p>
          </div>
        </body>
        </html>
      `;
      return res.send(noDataHtml);
    }

    // Thiết lập header đúng
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    
    // Tạo HTML với dữ liệu mất rừng
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
        
        .stats {
          background: #f0f8ff;
          padding: 10px;
          border-radius: 5px;
          margin-bottom: 15px;
          text-align: center;
          font-size: 14px;
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
        
        #report-content {
          background: white;
          padding: 20px;
          margin-bottom: 30px;
        }
        
        @media print {
          .control-panel {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="control-panel no-print">
        <button class="control-button" onclick="downloadPDF()">📄 Tải PDF</button>
        <button class="control-button print" onclick="window.print()">🖨️ In báo cáo</button>
        <div style="font-size: 12px; color: #666; text-align: center;">
          📊 ${rows.length} khu vực mất rừng
        </div>
      </div>
      
      <div id="report-content">
        <h1>THỐNG KÊ KẾT QUẢ DỰ BÁO MẤT RỪNG</h1>
        
        <div class="header">
          <p>Tỉnh: Lào Cai</p>
          <p>Từ ngày: ${fromDate} Đến ngày: ${toDate}</p>
        </div>
        
        <div class="stats">
          <strong>🌳 Tổng số khu vực mất rừng: ${rows.length}</strong>
          ${huyen ? ` | 📍 Huyện: ${huyen}` : ''}
          ${xa ? ` | 🏘️ Xã: ${xa}` : ''}
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
              <th>Diện tích (ha)</th>
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
                <td>${item.area ? (item.area / 10000).toFixed(1) : ""}</td>
                <td>${item.ghichu || ""}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Người tổng hợp</p>
          <div>
            <p>Lào Cai, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</p>
            <p style="text-align: center;"><strong>Chi cục trưởng</strong></p>
          </div>
        </div>
      </div>
      
      <script>
        function downloadPDF() {
          const { jsPDF } = window.jsPDF;
          
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
          loadingMessage.innerHTML = '<div style="text-align: center;"><div>📄 Đang tạo file PDF...</div><div style="font-size: 14px; margin-top: 10px;">Vui lòng đợi...</div></div>';
          document.body.appendChild(loadingMessage);
          
          // Lấy phần tử cần chuyển đổi
          const element = document.getElementById('report-content');
          
          setTimeout(() => {
            html2canvas(element, {
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff'
            }).then(canvas => {
              const imgData = canvas.toDataURL('image/png');
              
              const pdf = new jsPDF('p', 'mm', 'a4');
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = pdf.internal.pageSize.getHeight();
              
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
              
              alert('✅ File PDF đã được tải về thành công!');
            }).catch(error => {
              console.error('Error creating PDF:', error);
              document.body.removeChild(loadingMessage);
              alert('❌ Có lỗi xảy ra khi tạo PDF. Vui lòng thử lại.');
            });
          }, 500);
        }
      </script>
    </body>
    </html>
    `;

    console.log(`📄 PDF page generated successfully with ${rows.length} mat_rung records`);
    
    // Gửi HTML về client
    res.send(html);
  } catch (err) {
    console.error("❌ Lỗi xuất báo cáo PDF:", err);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi khi tạo file báo cáo: " + err.message,
      error: err.message 
    });
  }
};

// Giữ lại hàm cũ cho tương thích ngược
exports.exportHtml = exports.exportPdf;