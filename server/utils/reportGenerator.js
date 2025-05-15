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

          // Thông tin thời gian và địa phương
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun(`Tỉnh: ${huyen || "........................."}    `),
              new TextRun(`Từ ngày: ${fromDate}  Đến ngày: ${toDate}`),
            ],
          }),

          new Paragraph({ text: "", spacing: { after: 200 } }),

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

          // Người ký + ngày
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun("......., ngày ...... tháng ...... năm ......"),
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