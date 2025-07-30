const { createReportDocx } = require("../utils/reportGenerator");
const pool = require("../db");
const convertTcvn3ToUnicode = require("../utils/convertTcvn3ToUnicode");

// ✅ Hàm đơn giản để lấy dữ liệu báo cáo - GIỐNG HỆT CONTROLLER CHÍNH
const getReportData = async (fromDate, toDate, huyen, xa, xacMinh = 'false') => {
  // ✅ Query đơn giản - giống y hệt controller chính
  let baseQuery = `
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
    WHERE m.start_dau >= $1 
      AND m.end_sau <= $2
      AND m.geom IS NOT NULL
  `;

  const values = [fromDate, toDate];

  // ✅ Thêm điều kiện xác minh
  if (xacMinh === 'true') {
    baseQuery += ` AND m.detection_status = 'Đã xác minh'`;
  }

  // ✅ Filter huyện - STRATEGY ĐƠN GIẢN: Chỉ filter theo mahuyen
  if (huyen) {
    // Map tên về mã huyện
    let huyenCode = null;
    const huyenLower = huyen.toLowerCase()
      .replace(/[µ]/g, 'à')
      .replace(/[¶]/g, 'ả')
      .trim();
      
    if (huyenLower.includes('lào cai') || huyenLower.includes('tp.')) {
      huyenCode = '80';
    } else if (huyenLower.includes('bát xát')) {
      huyenCode = '02';
    } else if (huyenLower.includes('mường khương')) {
      huyenCode = '03';
    } else if (huyenLower.includes('si ma cai')) {
      huyenCode = '04';
    } else if (huyenLower.includes('bắc hà')) {
      huyenCode = '05';
    } else if (huyenLower.includes('bảo thắng')) {
      huyenCode = '06';
    } else if (huyenLower.includes('bảo yên')) {
      huyenCode = '07';
    } else if (huyenLower.includes('sa pa')) {
      huyenCode = '08';
    } else if (huyenLower.includes('văn bàn')) {
      huyenCode = '09';
    }

    if (huyenCode) {
      baseQuery += ` AND m.mahuyen = $${values.length + 1}`;
      values.push(huyenCode);
    }
  }

  baseQuery += ` ORDER BY m.gid LIMIT 1000`;

  console.log("🚀 Export query:", baseQuery.replace(/\$\d+/g, '?'));
  console.log("📋 Export values:", values);

  const result = await pool.query(baseQuery, values);
  let rows = result.rows;

  console.log(`📊 Export found ${rows.length} records`);

  // ✅ Fallback mapping đơn giản
  const huyenMapping = {
    '01': 'Lào Cai', '02': 'Bát Xát', '03': 'Mường Khương',
    '04': 'Si Ma Cai', '05': 'Bắc Hà', '06': 'Bảo Thắng',
    '07': 'Bảo Yên', '08': 'Sa Pa', '09': 'Văn Bàn', '80': 'TP. Lào Cai'
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
    
    // ✅ Tọa độ - LÀM TRÒN KHÔNG LẤY SAU DẤU PHẨY
    x: row.x ? Math.round(parseFloat(row.x)) : null,
    y: row.y ? Math.round(parseFloat(row.y)) : null,
    
    // ✅ Các field cố định
    maxa: "",
    churung: "",
    ghichu: ""
  }));

  console.log(`✅ Export processed ${rows.length} rows`);
  return rows;
};

// Xuất file DOCX
exports.exportDocx = async (req, res) => {
  try {
    const { fromDate, toDate, huyen, xa, xacMinh = 'false' } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ 
        success: false, 
        message: "Vui lòng cung cấp fromDate và toDate" 
      });
    }

    console.log("📄 Exporting DOCX:", { fromDate, toDate, huyen, xa, xacMinh });

    const rows = await getReportData(fromDate, toDate, huyen, xa, xacMinh);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Không có dữ liệu mất rừng ${xacMinh === 'true' ? 'đã xác minh' : ''} phù hợp`,
        filters: { fromDate, toDate, huyen, xa, xacMinh }
      });
    }

    const docxBuffer = await createReportDocx(rows, { fromDate, toDate, huyen, xa, xacMinh });

    const fileName = xacMinh === 'true' 
      ? `bao-cao-xac-minh-mat-rung-${fromDate}-${toDate}.docx`
      : `bao-cao-mat-rung-${fromDate}-${toDate}.docx`;
      
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.send(docxBuffer);

    console.log(`📄 DOCX exported: ${rows.length} records`);
  } catch (err) {
    console.error("❌ Lỗi xuất DOCX:", err);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi khi tạo file báo cáo: " + err.message,
      error: err.message 
    });
  }
};

// ✅ XUẤT PDF - FIXED VERSION
exports.exportPdf = async (req, res) => {
  try {
    const { fromDate, toDate, huyen, xa, xacMinh = 'false' } = req.query;

    if (!fromDate || !toDate) {
      return res.status(400).json({ 
        success: false, 
        message: "Vui lòng cung cấp fromDate và toDate" 
      });
    }

    console.log("📄 Exporting PDF:", { fromDate, toDate, huyen, xa, xacMinh });

    const rows = await getReportData(fromDate, toDate, huyen, xa, xacMinh);

    if (rows.length === 0) {
      const noDataHtml = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <title>Không có dữ liệu</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
            body { 
              font-family: 'Roboto', 'Arial', sans-serif; 
              text-align: center; 
              padding: 50px; 
              color: #333;
            }
            .message { font-size: 18px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>📊 Báo cáo mất rừng</h1>
          <p class="message">⚠️ Không có dữ liệu ${xacMinh === 'true' ? 'đã xác minh' : ''} phù hợp</p>
          <p><strong>Thời gian:</strong> ${fromDate} đến ${toDate}</p>
          ${huyen ? `<p><strong>Huyện:</strong> ${huyen}</p>` : ''}
          ${xa ? `<p><strong>Xã:</strong> ${xa}</p>` : ''}
        </body>
        </html>
      `;
      return res.send(noDataHtml);
    }

    const isVerified = xacMinh === 'true';
    const reportTitle = isVerified 
      ? "BẢNG THỐNG KÊ VỊ TRÍ MẤT RỪNG ĐÃ XÁC MINH "
      : "BẢNG THỐNG KÊ VỊ TRÍ PHÁT HIỆN SỚM MẤT RỪNG ";
    
    const tableHeaders = isVerified 
      ? `<tr>
          <th>TT</th>
          <th>Xã</th>
          <th>Lô cảnh báo</th>
          <th>Tiểu khu</th>
          <th>Khoảnh</th>
          <th>X</th>
          <th>Y</th>
          <th>Diện tích (ha)</th>
          <th>Nguyên nhân</th>
        </tr>`
      : `<tr>
          <th>TT</th>
          <th>Xã</th>
          <th>Lô cảnh báo</th>
          <th>Tiểu khu</th>
          <th>Khoảnh</th>
          <th>X</th>
          <th>Y</th>
          <th>Diện tích (ha)</th>
        </tr>`;
    
    const tableRows = rows.map((item, idx) => {
      const baseRow = `
        <td>${idx + 1}</td>
        <td>${item.xa || ""}</td>
        <td>${item.gid || ""}</td>
        <td>${item.tk || ""}</td>
        <td>${item.khoanh || ""}</td>
        <td>${item.x || ""}</td>
        <td>${item.y || ""}</td>
        <td>${item.area ? (item.area / 10000).toFixed(1) : ""}</td>
      `;
      
      if (isVerified) {
        return `<tr>${baseRow}<td>${item.verification_reason || ""}</td></tr>`;
      } else {
        return `<tr>${baseRow}</tr>`;
      }
    }).join("");
    
    // ✅ HTML ĐƠN GIẢN VÀ TỐI ƯU - FONT TIẾNG VIỆT
    const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>${reportTitle}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body { 
          font-family: 'Roboto', 'Times New Roman', serif;
          margin: 15px;
          color: #000;
          line-height: 1.4;
          background: white;
        }
        
        h1 { 
          text-align: center; 
          font-size: 16px; 
          font-weight: bold;
          margin-bottom: 15px;
          color: #000;
        }
        
        .header-info {
          display: flex; 
          justify-content: space-between; 
          margin-bottom: 10px;
          font-size: 12px;
        }
        
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: 15px;
          font-size: 11px;
        }
        
        th, td { 
          border: 1px solid #000; 
          padding: 4px; 
          text-align: center;
          vertical-align: middle;
        }
        
        th { 
          background-color: #f5f5f5; 
          font-weight: bold;
          font-size: 10px;
        }
        
        .footer {
          display: flex; 
          justify-content: space-between; 
          margin-top: 20px;
          font-size: 12px;
        }
        
        .footer-right {
          text-align: right;
        }
        
        .control-panel { 
          position: fixed; 
          top: 10px; 
          right: 10px; 
          background: #fff; 
          padding: 10px; 
          border: 2px solid #ccc;
          border-radius: 5px;
          z-index: 1000;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .btn { 
          background: #4CAF50; 
          color: white; 
          padding: 8px 16px; 
          border: none; 
          border-radius: 4px; 
          cursor: pointer; 
          margin: 2px;
          font-size: 12px;
        }
        
        .btn:hover {
          background: #45a049;
        }
        
        .btn.print { 
          background: #2196F3; 
        }
        
        .btn.print:hover {
          background: #1976D2;
        }
        
        @media print { 
          .control-panel { 
            display: none !important; 
          }
          
          body {
            margin: 0;
            font-size: 10px;
          }
          
          h1 {
            font-size: 14px;
          }
          
          table {
            font-size: 9px;
          }
        }
      </style>
    </head>
    <body>
      <!-- ✅ PANEL ĐƠN GIẢN -->
      <div class="control-panel">
        <button class="btn" onclick="window.print()">🖨️ In PDF</button>
        <button class="btn print" onclick="downloadPdf()">📥 Tải PDF</button>
        <div style="font-size: 10px; color: #666; margin-top: 5px;">
          📊 ${rows.length} khu vực
        </div>
      </div>
      
      <div id="report-content">
        <h1>${reportTitle}</h1>
        
        <div class="header-info">
          <span><strong>Tỉnh:</strong> Lào Cai</span>
          <span><strong>Từ ngày:</strong> ${fromDate} <strong>Đến ngày:</strong> ${toDate}</span>
        </div>
        
        <table>
          <thead>
            ${tableHeaders}
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        
        <div class="footer">
          <span><strong>Người tổng hợp</strong></span>
          <div class="footer-right">
            <div>Lào Cai, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}</div>
            <div style="margin-top: 5px;"><strong>Hạt kiểm lâm</strong></div>
          </div>
        </div>
      </div>
      
      <!-- ✅ SCRIPT ĐƠN GIẢN - CHỈ SỬ DỤNG WINDOW.PRINT -->
      <script>
        function downloadPdf() {
          // Đơn giản: Chỉ sử dụng window.print() - trình duyệt sẽ tự động xử lý
          alert('Vui lòng chọn "Lưu thành PDF" trong hộp thoại in sắp hiện ra');
          setTimeout(() => {
            window.print();
          }, 500);
        }
        
        // Tự động focus để user có thể Ctrl+P
        window.addEventListener('load', function() {
          console.log('📄 Báo cáo đã tải xong. Bạn có thể:');
          console.log('1. Nhấn Ctrl+P để in');
          console.log('2. Chọn "Lưu thành PDF" trong hộp thoại in');
          console.log('3. Nhấn nút "Tải PDF" để được hướng dẫn');
        });
        
        // Keyboard shortcut
        document.addEventListener('keydown', function(e) {
          if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            downloadPdf();
          }
        });
      </script>
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);

    console.log(`✅ PDF page generated: ${rows.length} records`);
    
  } catch (err) {
    console.error("❌ Lỗi xuất PDF:", err);
    res.status(500).json({ 
      success: false, 
      message: "Lỗi khi tạo PDF: " + err.message,
      error: err.message 
    });
  }
};

exports.exportHtml = exports.exportPdf;