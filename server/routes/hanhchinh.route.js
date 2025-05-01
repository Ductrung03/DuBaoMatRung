/**
 * @swagger
 * /api/hanhchinh:
 *   get:
 *     summary: Lấy dữ liệu hành chính từ PostgreSQL
 *     tags:
 *       - Dữ liệu hành chính
 *     responses:
 *       200:
 *         description: Thành công
 */

const express = require("express");
const router = express.Router();
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

// Hàm chuyển đổi TCVN3 sang Unicode
const convertTcvn3ToUnicode = (text) => {
  if (typeof text !== "string") return text;

  const tcvn3Chars = "µ¸¶·¹¨»¾Æ©ÊÇÈÉËÐÌÎÏÑªÒÕÓÔ­ÕÖ×Ý";
  const unicodeChars = "àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ";
  const mapping = {};

  for (let i = 0; i < tcvn3Chars.length; i++) {
    mapping[tcvn3Chars[i]] = unicodeChars[i];
  }

  let result = text;
  for (const [tcvn3Char, unicodeChar] of Object.entries(mapping)) {
    result = result.replace(new RegExp(tcvn3Char, "g"), unicodeChar);
  }
  return result;
};

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT gid, matinh, tinh, huyen, mahuyen_1,
          ST_AsGeoJSON(ST_Transform(ST_SetSRID(geom, 3405), 4326)) AS geometry
      FROM laocai_huyen
    `);

    const geojson = {
      type: "FeatureCollection",
      features: result.rows.map((row) => ({
        type: "Feature",
        geometry: JSON.parse(row.geometry),
        properties: {
          gid: row.gid,
          matinh: row.matinh,
          tinh: convertTcvn3ToUnicode(row.tinh), // Chuyển đổi cột tinh
          huyen: convertTcvn3ToUnicode(row.huyen), // Chuyển đổi cột huyen
          mahuyen: row.mahuyen_1,
        },
      })),
    };

    // Debug feature mẫu để kiểm tra
    console.log("✅ Feature mẫu:", JSON.stringify(geojson.features[0], null, 2));

    res.json(geojson);
  } catch (err) {
    console.error("❌ Lỗi truy vấn dữ liệu hành chính:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;