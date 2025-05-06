/**
 * @swagger
 * /api/import-gee-url:
 *   post:
 *     tags:
 *       - Shapefile
 *     summary: Nhập dữ liệu từ Google Earth Engine URL và xử lý
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               zipUrl:
 *                 type: string
 *               tableName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Nhập dữ liệu thành công
 */

require("dotenv").config();
const express = require("express");
const router = express.Router();
const axios = require("axios");
const fs = require("fs");
const AdmZip = require("adm-zip");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const path = require("path");
const { Pool } = require("pg");
const pool = new Pool();

const TABLE_NAME = "mat_rung";

async function downloadZip(zipUrl, savePath) {
  const response = await axios.get(zipUrl, {
    responseType: "arraybuffer",
  });
  fs.writeFileSync(savePath, response.data);
  console.log("✅ Tải ZIP thành công từ GEE.");
}

router.post("/", async (req, res) => {
  const { zipUrl } = req.body;
  const tmpDir = path.join(__dirname, "../tmp");
  const zipPath = path.join(tmpDir, "shapefile.zip");
  const extractPath = path.join(tmpDir, "unzip");

  try {
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    console.log("⬇️ Tải và giải nén shapefile...");
    await downloadZip(zipUrl, zipPath);
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);

    const shpFile = fs.readdirSync(extractPath).find((f) => f.endsWith(".shp"));
    if (!shpFile) throw new Error("Không tìm thấy file SHP.");
    const fullShpPath = path.join(extractPath, shpFile);

    const checkExist = await pool.query(
      `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `,
      [TABLE_NAME]
    );

    const tableExists = checkExist.rows[0].exists;
    const shp2pgsqlFlag = tableExists ? "-a -s 4326" : "-c -I -s 4326";

    const importCmd =
      process.platform === "win32"
        ? `set PGPASSWORD=${process.env.PGPASSWORD}&& shp2pgsql ${shp2pgsqlFlag} "${fullShpPath}" ${TABLE_NAME} | psql "host=${process.env.PGHOST} port=${process.env.PGPORT} dbname=${process.env.PGDATABASE} user=${process.env.PGUSER} sslmode=require"`
        : `PGPASSWORD=${process.env.PGPASSWORD} shp2pgsql ${shp2pgsqlFlag} "${fullShpPath}" ${TABLE_NAME} | psql "host=${process.env.PGHOST} port=${process.env.PGPORT} dbname=${process.env.PGDATABASE} user=${process.env.PGUSER} sslmode=require"`;

    console.log("📥 Import vào PostgreSQL...");
    await exec(importCmd);
    console.log("✅ Import thành công!");

    const geojsonQuery = `
      SELECT json_build_object(
        'type', 'FeatureCollection',
        'features', json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(ST_Transform(geom, 4326))::json,
            'properties', to_jsonb(t) - 'geom'
          )
        )
      )
      FROM ${TABLE_NAME} AS t;
    `;
    const result = await pool.query(geojsonQuery);
    const geojson = result.rows[0].json_build_object;

    fs.unlinkSync(zipPath);
    fs.rmSync(extractPath, { recursive: true });

    res.json({
      message: "✅ Tải và import vào PostgreSQL thành công!",
      table: TABLE_NAME,
      geojson,
    });
  } catch (err) {
    console.error("❌ Lỗi tổng quát:", err);
    res.status(500).json({ message: err.message });
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true });
  }
});

module.exports = router;
