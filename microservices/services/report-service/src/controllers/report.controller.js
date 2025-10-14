// report-service/src/controllers/report.controller.js
const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun } = require('docx');
const { formatResponse } = require('../../../../shared/utils');
const createLogger = require('../../../../shared/logger');

const logger = createLogger('report-controller');

// Generate PDF report
exports.generatePDF = async (req, res, next) => {
  try {
    const { title, data } = req.body;

    logger.info('Generating PDF report', { title });

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

// Helper function
function calculateTotalArea(features) {
  const total = features.reduce((sum, f) => sum + (f.properties.area || 0), 0);
  return (total / 10000).toFixed(2);
}

module.exports = exports;
