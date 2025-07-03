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

// Hàm xuất file Word (.docx)
async function createReportDocx(data, { fromDate, toDate, huyen, xa }) {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Tiêu đề
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "THỐNG KÊ KẾT QUẢ DỰ BÁO MẤT RỪNG", bold: true, size: 28 })],
            spacing: { after: 300 },
          }),

          // ✅ SỬA: Thông tin thời gian và địa phương với dữ liệu thực
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun(`Tỉnh: Lào Cai    `),
              new TextRun(`Từ ngày: ${formatDate(fromDate)}  Đến ngày: ${formatDate(toDate)}`),
            ],
          }),

         
         
          new Paragraph({ text: "", spacing: { after: 200 } }),

          // ✅ Thêm thống kê tổng quan
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ 
                text: `Tổng số khu vực mất rừng: ${data.length}`, 
                bold: true, 
                size: 24 
              })
            ],
            spacing: { after: 200 }
          }),

          // Bảng dữ liệu
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              bottom: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              left: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
              right: { style: BorderStyle.SINGLE, size: 1, color: "000000" },
            },
            rows: [
              new TableRow({
                tableHeader: true,
                children: [
                  createCell("TT", true),
                  createCell("Huyện", true),
                  createCell("Mã xã", true),
                  createCell("Xã", true),
                  createCell("X", true),
                  createCell("Y", true),
                  createCell("Tiểu khu", true),
                  createCell("Khoảnh", true),
                  createCell("Diện tích", true),
                  createCell("Ghi chú", true),
                ],
              }),
              ...data.map((row, index) =>
                new TableRow({
                  children: [
                    createCell((index + 1).toString()),
                    createCell(row.huyen || ""),
                    createCell(row.maxa || ""),
                    createCell(row.xa || ""),
                    createCell(row.x ? row.x.toString() : ""),
                    createCell(row.y ? row.y.toString() : ""),
                    createCell(row.tk || ""),
                    createCell(row.khoanh || ""),
                    createCell(row.area ? `${(row.area / 10000).toFixed(1)} ha` : ""),
                    createCell(row.ghichu || ""),
                  ],
                })
              ),
            ],
          }),

          new Paragraph({ text: "", spacing: { after: 300 } }),

          // ✅ SỬA: Người ký + ngày với thông tin thực
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun(`Lào Cai, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [new TextRun({ text: "Chi cục trưởng", bold: true })],
          }),

          new Paragraph({ text: "" }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [new TextRun({ text: "Người tổng hợp", bold: true })],
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