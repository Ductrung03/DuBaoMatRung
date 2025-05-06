const express = require("express");
const router = express.Router();
const controller = require("../controllers/baoCaoDuLieu.controller");

router.get("/tra-cuu-du-lieu-bao-mat-rung", controller.traCuuDuLieuBaoMatRung);

module.exports = router;
