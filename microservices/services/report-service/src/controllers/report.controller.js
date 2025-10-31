// report-service/src/controllers/report.controller.js
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const { formatResponse } = require('../../../../shared/utils');
const { convertTcvn3ToUnicode } = require('../../../../shared/utils/tcvn3-converter');
const createLogger = require('../../../../shared/logger');

const logger = createLogger('report-controller');

// Generate PDF report
exports.generatePDF = async (req, res, next) => {
  try {
    const { title, data } = req.body;

    logger.info('Generating PDF report', { title });a

    const doc = new PDFDocument();
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${title || 'report'}.pdf"`);
      res.send(pdfData);
    });

    // Add content
    doc.fontSize(20).text(title || 'Báo Cáo Mất Rừng', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}`);
    doc.moveDown();

    if (data && data.features) {
      doc.text(`Tổng số khu vực: ${data.features.length}`);
      doc.text(`Diện tích: ${calculateTotalArea(data.features)} ha`);
    }

    doc.end();

  } catch (error) {
    next(error);
  }
};

// Generate DOCX report
exports.generateDOCX = async (req, res, next) => {
  try {
    const { title, data } = req.body;

    logger.info('Generating DOCX report', { title });

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: title || 'Báo Cáo Mất Rừng',
                bold: true,
                size: 32
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}`,
                size: 24
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Tổng số khu vực: ${data?.features?.length || 0}`,
                size: 24
              })
            ]
          })
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${title || 'report'}.docx"`);
    res.send(buffer);

  } catch (error) {
    next(error);
  }
};

// Get statistics
exports.getStats = async (req, res, next) => {
  try {
    const { fromDate, toDate } = req.query;
    const db = req.app.locals.db;

    logger.info('Generating statistics', { fromDate, toDate });

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (fromDate) {
      whereClause += ` AND end_sau >= $${paramIndex++}`;
      params.push(fromDate);
    }

    if (toDate) {
      whereClause += ` AND end_sau <= $${paramIndex++}`;
      params.push(toDate);
    }

    const query = `
      SELECT
        COUNT(*) as total_count,
        SUM(area) as total_area,
        AVG(area) as avg_area,
        COUNT(CASE WHEN detection_status = 'Đã xác minh' THEN 1 END) as verified_count,
        COUNT(DISTINCT mahuyen) as district_count
      FROM mat_rung
      ${whereClause}
    `;

    const result = await db.query(query, params);
    const stats = result.rows[0];

    // Format
    stats.total_area_ha = stats.total_area ? parseFloat((stats.total_area / 10000).toFixed(2)) : 0;
    stats.avg_area_ha = stats.avg_area ? parseFloat((stats.avg_area / 10000).toFixed(2)) : 0;

    res.json(formatResponse(true, 'Statistics generated', stats));

  } catch (error) {
    next(error);
  }
};

// Export DOCX report
exports.exportDOCX = async (req, res, next) => {
  try {
    const { fromDate, toDate, huyen, xa, xacMinh } = req.query;

    logger.info('Exporting DOCX report', { fromDate, toDate, huyen, xa, xacMinh });

    // Get data from search service
    const axios = require('axios');
    const searchUrl = `${process.env.SEARCH_SERVICE_URL || 'http://localhost:3006'}/api/search/mat-rung`;
    const searchParams = new URLSearchParams();

    if (fromDate) searchParams.append('fromDate', fromDate);
    if (toDate) searchParams.append('toDate', toDate);
    if (huyen) searchParams.append('huyen', huyen);
    if (xa) searchParams.append('xa', xa);
    if (xacMinh === 'true') searchParams.append('xacMinh', 'true');

    // Get user info from headers forwarded by gateway
    const userHeaders = {};
    if (req.headers['x-user-id']) userHeaders['x-user-id'] = req.headers['x-user-id'];
    if (req.headers['x-user-username']) userHeaders['x-user-username'] = req.headers['x-user-username'];
    if (req.headers['x-user-roles']) userHeaders['x-user-roles'] = req.headers['x-user-roles'];
    if (req.headers['x-user-permissions']) userHeaders['x-user-permissions'] = req.headers['x-user-permissions'];

    const searchResponse = await axios.get(`${searchUrl}?${searchParams.toString()}`, { headers: userHeaders });
    const data = searchResponse.data.data;

    if (!data || !data.features || data.features.length === 0) {
      return res.status(404).json({ success: false, message: 'Không có dữ liệu để xuất báo cáo' });
    }

    const features = data.features;
    const isVerified = xacMinh === 'true';
    const reportTitle = isVerified
      ? "BẢNG THỐNG KÊ VỊ TRÍ MẤT RỪNG"
      : "BẢNG THỐNG KÊ PHÁT HIỆN SỚM MẤT RỪNG";

    // Calculate totals
    const totalLots = features.length;
    const totalArea = features.reduce((sum, item) => {
      const areaField = isVerified ? item.properties.dtichXM : item.properties.dtich;
      return sum + (areaField || 0);
    }, 0) / 10000; // Convert to hectares

    // Create DOCX document
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Title
          new Paragraph({
            children: [
              new TextRun({
                text: reportTitle,
                bold: true,
                size: 32,
                color: "000000"
              })
            ],
            alignment: "center"
          }),
          // Header info
          new Paragraph({
            children: [
              new TextRun({
                text: `Tỉnh: Lào Cai`,
                size: 24
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Huyện: ${huyen ? convertTcvn3ToUnicode(huyen) : '..........'}`,
                size: 24
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Xã: ${xa ? convertTcvn3ToUnicode(xa) : '..........'}`,
                size: 24
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Từ ngày: ${fromDate ? new Date(fromDate).toLocaleDateString('vi-VN') : '..........'} Đến ngày: ${toDate ? new Date(toDate).toLocaleDateString('vi-VN') : '..........'}`,
                size: 24
              })
            ]
          }),
          // Table
          new Paragraph({
            children: [
              new TextRun({
                text: "",
                size: 24
              })
            ]
          }),
          // Table would be complex to implement with docx, sending simplified version
          new Paragraph({
            children: [
              new TextRun({
                text: `Tổng số lô: ${totalLots}`,
                size: 24
              })
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Tổng diện tích: ${totalArea.toFixed(2)} ha`,
                size: 24
              })
            ]
          }),
          // Signature
          new Paragraph({
            children: [
              new TextRun({
                text: `Lào Cai, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`,
                size: 24
              })
            ],
            alignment: "right"
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Người tổng hợp",
                size: 24
              })
            ],
            alignment: "left"
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Ban quản lý rừng",
                size: 24,
                bold: true
              })
            ],
            alignment: "right"
          })
        ]
      }]
    });

    const buffer = await Packer.toBuffer(doc);

    const fileName = isVerified
      ? `bao-cao-xac-minh-mat-rung-${fromDate}-${toDate}.docx`
      : `bao-cao-mat-rung-${fromDate}-${toDate}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);

  } catch (error) {
    logger.error('Error exporting DOCX:', error);
    next(error);
  }
};

// Export PDF report
exports.exportPDF = async (req, res, next) => {
  try {
    const { fromDate, toDate, huyen, xa, xacMinh } = req.query;

    logger.info('Exporting PDF report', { fromDate, toDate, huyen, xa, xacMinh });

    // Get data from search service
    const axios = require('axios');
    const searchUrl = `${process.env.SEARCH_SERVICE_URL || 'http://localhost:3006'}/api/search/mat-rung`;
    const searchParams = new URLSearchParams();

    if (fromDate) searchParams.append('fromDate', fromDate);
    if (toDate) searchParams.append('toDate', toDate);
    if (huyen) searchParams.append('huyen', huyen);
    if (xa) searchParams.append('xa', xa);
    if (xacMinh === 'true') searchParams.append('xacMinh', 'true');

    // Get user info from headers forwarded by gateway
    const userHeaders = {};
    if (req.headers['x-user-id']) userHeaders['x-user-id'] = req.headers['x-user-id'];
    if (req.headers['x-user-username']) userHeaders['x-user-username'] = req.headers['x-user-username'];
    if (req.headers['x-user-roles']) userHeaders['x-user-roles'] = req.headers['x-user-roles'];
    if (req.headers['x-user-permissions']) userHeaders['x-user-permissions'] = req.headers['x-user-permissions'];

    const searchResponse = await axios.get(`${searchUrl}?${searchParams.toString()}`, { headers: userHeaders });
    const data = searchResponse.data.data;

    if (!data || !data.features || data.features.length === 0) {
      return res.status(404).json({ success: false, message: 'Không có dữ liệu để xuất báo cáo' });
    }

    const features = data.features;
    const isVerified = xacMinh === 'true';
    const reportTitle = isVerified
      ? "BẢNG THỐNG KÊ VỊ TRÍ MẤT RỪNG"
      : "BẢNG THỐNG KÊ PHÁT HIỆN SỚM MẤT RỪNG";

    // Calculate totals
    const totalLots = features.length;
    const totalArea = features.reduce((sum, item) => {
      const areaField = isVerified ? item.properties.dtichXM : item.properties.dtich;
      return sum + (areaField || 0);
    }, 0) / 10000; // Convert to hectares

    const doc = new PDFDocument();
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline'); // Display in browser
      res.send(pdfData);
    });

    // Add content
    doc.fontSize(20).text(reportTitle, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Tỉnh: Lào Cai`);
    doc.text(`Huyện: ${huyen ? convertTcvn3ToUnicode(huyen) : '..........'}`);
    doc.text(`Xã: ${xa ? convertTcvn3ToUnicode(xa) : '..........'}`);
    doc.text(`Từ ngày: ${fromDate ? new Date(fromDate).toLocaleDateString('vi-VN') : '..........'} Đến ngày: ${toDate ? new Date(toDate).toLocaleDateString('vi-VN') : '..........'}`);
    doc.moveDown();

    // Table header
    const tableTop = doc.y;
    doc.fontSize(10);
    const colWidths = [30, 60, 60, 40, 40, 50, 50, 50];
    const headers = ['TT', 'Huyện', 'Xã', 'Lô cảnh báo', 'Tiểu khu', 'Khoảnh', 'Tọa độ X', 'Tọa độ Y', 'Diện tích (ha)'];
    if (isVerified) headers.push('Nguyên nhân');

    let xPos = 50;
    headers.forEach((header, i) => {
      doc.text(header, xPos, tableTop, { width: colWidths[i], align: 'center' });
      xPos += colWidths[i];
    });

    doc.moveDown();

    // Table rows
    features.forEach((item, idx) => {
      if (doc.y > 700) { // New page if needed
        doc.addPage();
      }

      xPos = 50;
      const rowData = [
        (idx + 1).toString(),
        item.properties.huyen_name || "",
        item.properties.xa_name || (item.properties.xa ? convertTcvn3ToUnicode(item.properties.xa) : ""),
        item.properties.lo_canbao || `CB-${item.properties.gid}` || "",
        item.properties.tk || "",
        item.properties.khoanh || "",
        item.properties.x ? Math.round(item.properties.x).toString() : "",
        item.properties.y ? Math.round(item.properties.y).toString() : "",
        isVerified
          ? (item.properties.dtichXM ? (item.properties.dtichXM / 10000).toFixed(2) : "")
          : (item.properties.dtich ? (item.properties.dtich / 10000).toFixed(2) : "")
      ];

      if (isVerified) {
        rowData.push(item.properties.verification_reason || "");
      }

      rowData.forEach((cell, i) => {
        doc.text(cell, xPos, doc.y, { width: colWidths[i], align: 'center' });
        xPos += colWidths[i];
      });

      doc.moveDown(0.5);
    });

    // Total row
    doc.moveDown();
    xPos = 50;
    const totalCols = isVerified ? 8 : 7;
    doc.text('Tổng', 50, doc.y, { width: colWidths.slice(0, totalCols).reduce((a, b) => a + b, 0), align: 'center' });
    doc.text(totalArea.toFixed(2), xPos + colWidths.slice(0, totalCols).reduce((a, b) => a + b, 0), doc.y, { width: colWidths[totalCols], align: 'center' });

    // Signature
    doc.moveDown(2);
    doc.text(`Lào Cai, ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`, { align: 'right' });
    doc.moveDown();
    doc.text('Người tổng hợp', { align: 'left' });
    doc.text('Ban quản lý rừng', { align: 'right' });

    doc.end();

  } catch (error) {
    logger.error('Error exporting PDF:', error);
    next(error);
  }
};

// Helper function
function calculateTotalArea(features) {
  const total = features.reduce((sum, f) => sum + (f.properties.area || 0), 0);
  return (total / 10000).toFixed(2);
}

module.exports = exports;
