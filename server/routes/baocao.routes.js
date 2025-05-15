const express = require("express");
const router = express.Router();
const baoCaoController = require("../controllers/baoCaoDuLieu.controller");
const exportReportController = require("../controllers/exportReport.controller");

router.get("/tra-cuu-du-lieu-bao-mat-rung", baoCaoController.traCuuDuLieuBaoMatRung);
router.get("/export-docx", exportReportController.exportDocx);
router.get("/export-html", exportReportController.exportHtml);

module.exports = router;