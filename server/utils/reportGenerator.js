const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, AlignmentType, WidthType, BorderStyle } = require("docx");

// Hàm tạo một ô trong bảng
const createCell = (text, bold = false, align = AlignmentType.CENTER) =>
  new TableCell({
    children: [new Paragraph({ alignment: align, children: [new TextRun({ text, bold })] })],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
    }
  });

// Hàm format ngày để hiển thị đẹp
const formatDate = (dateString) => {
  if (!dateString) return "..........";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  } catch {
    return dateString;
  }
};

// ✅ Hàm xuất file Word (.docx) với 2 template khác nhau
async function createReportDocx(data, { fromDate, toDate, huyen, xa, xacMinh = 'false' }) {
  const isVerified = xacMinh === 'true';
  
  // ✅ Tiêu đề khác nhau cho 2 loại báo cáo
  const reportTitle = isVerified 
    ? "BẢNG THỐNG KÊ VỊ TRÍ MẤT RỪNG ĐÃ XÁC MINH (loại 1b)"
    : "BẢNG THỐNG KÊ VỊ TRÍ PHÁT HIỆN SỚM MẤT RỪNG (loại 1a)";

  // ✅ Header row khác nhau cho 2 loại báo cáo
  const headerRow = isVerified 
    ? new TableRow({
        tableHeader: true,
        children: [
          createCell("TT", true),
          createCell("Xã", true),
          createCell("Lô cảnh báo", true),
          createCell("Tiểu khu", true),
          createCell("Khoảnh", true),
          createCell("Tọa độ VN-2000\nX", true),
          createCell("Tọa độ VN-2000\nY", true),
          createCell("Diện tích\n(ha)", true),
          createCell("Nguyên nhân", true),
        ],
      })
    : new TableRow({
        tableHeader: true,
        children: [
          createCell("TT", true),
          createCell("Xã", true),
          createCell("Lô cảnh báo", true),
          createCell("Tiểu khu", true),
          createCell("Khoảnh", true),
          createCell("Tọa độ VN-2000\nX", true),
          createCell("Tọa độ VN-2000\nY", true),
          createCell("Diện tích\n(ha)", true),
        ],
      });

  // ✅ Data rows khác nhau cho 2 loại báo cáo
  const dataRows = data.map((row, index) => {
    const baseCells = [
      createCell((index + 1).toString()),
      createCell(row.xa || ""),
      createCell(row.gid ? row.gid.toString() : ""),
      createCell(row.tk || ""),
      createCell(row.khoanh || ""),
      createCell(row.x ? row.x.toString() : ""),
      createCell(row.y ? row.y.toString() : ""),
      createCell(row.area ? `${(row.area / 10000).toFixed(1)}` : ""),
    ];

    if (isVerified) {
      baseCells.push(createCell(row.verification_reason || ""));
    }

    return new TableRow({ children: baseCells });
  });

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // ✅ Tiêu đề động
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: reportTitle, bold: true, size: 28 })],
            spacing: { after: 300 },
          }),

          // Thông tin thời gian và địa phương
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun(`Tỉnh: Lào Cai    `),
              new TextRun(`Từ ngày: ${formatDate(fromDate)}  Đến ngày: ${formatDate(toDate)}`),
            ],
          }),

          new Paragraph({ text: "", spacing: { after: 200 } }),

          // Thống kê tổng quan
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ 
                text: `Tổng số khu vực mất rừng${isVerified ? ' đã xác minh' : ''}: ${data.length}`, 
                bold: true, 
                size: 24 
              })
            ],
            spacing: { after: 200 }
          }),

          // ✅ Bảng dữ liệu với template động
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            },
            rows: [headerRow, ...dataRows],
          }),

          new Paragraph({ text: "", spacing: { after: 300 } }),

          // Người ký + ngày
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun(`Lào Cai, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "Hạt kiểm lâm", bold: true })],
          }),

          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: "Người tổng hợp", bold: true })],
          }),

          // ✅ Thêm thông tin về loại báo cáo ở cuối
          new Paragraph({ text: "", spacing: { after: 200 } }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ 
                text: `--- ${isVerified ? 'Báo cáo xác minh' : 'Báo cáo tổng hợp'} ---`, 
                italic: true,
                size: 20
              })
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

module.exports = {
  createReportDocx,
};