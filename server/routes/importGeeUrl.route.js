const express = require("express");
const router = express.Router();
const axios = require("axios");
const fs = require("fs");
const AdmZip = require("adm-zip");
const path = require("path");
const ogr2ogr = require("ogr2ogr");
require("dotenv").config();

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

    // Cấu hình import bằng ogr2ogr
    const ogr = ogr2ogr(fullShpPath)
      .format("PostgreSQL")
      .destination(
        `PG:host=${process.env.PGHOST} user=${process.env.PGUSER} password=${process.env.PGPASSWORD} dbname=${process.env.PGDATABASE} sslmode=require`
      )
      .options(["-nln", TABLE_NAME, "-append"]);

    // Thực thi import
    ogr.exec(async (err) => {
      if (err) {
        console.error("❌ Lỗi import bằng ogr2ogr:", err);
        return res.status(500).json({ message: err.message });
      }

      console.log("✅ Import bằng ogr2ogr thành công!");

      // Truy vấn GeoJSON từ PostGIS
      const { Pool } = require("pg");
      const pool = new Pool({
        host: process.env.PGHOST,
        port: process.env.PGPORT,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        ssl: { rejectUnauthorized: false },
      });

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

      // Xoá file tạm
      fs.unlinkSync(zipPath);
      fs.rmSync(extractPath, { recursive: true });

      res.json({
        message: "✅ Tải, import và trả về GeoJSON thành công!",
        table: TABLE_NAME,
        geojson,
      });
    });
  } catch (err) {
    console.error("❌ Lỗi tổng quát:", err);
    res.status(500).json({ message: err.message });
    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
    if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true });
  }
});

module.exports = router;
