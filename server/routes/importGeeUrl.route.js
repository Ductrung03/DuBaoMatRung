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

async function downloadZip(zipUrl, savePath) {
  const response = await axios.get(zipUrl, {
    responseType: "arraybuffer"
  });
  fs.writeFileSync(savePath, response.data);
  console.log("✅ Tải ZIP thành công từ GEE.");
}

async function ensureWorkspaceAndStore(geoserver) {
  const axiosAuth = {
    auth: { username: geoserver.user, password: geoserver.password },
    headers: { "Content-Type": "application/xml" },
  };

  const listUrl = `${geoserver.url}/rest/workspaces.json`;
  const res = await axios.get(listUrl, axiosAuth);
  const workspaceNames =
    res.data?.workspaces?.workspace?.map((ws) => ws.name) || [];
  if (!workspaceNames.includes(geoserver.workspace)) {
    const wsXML = `<workspace><name>${geoserver.workspace}</name></workspace>`;
    await axios.post(`${geoserver.url}/rest/workspaces`, wsXML, axiosAuth);
    console.log("✅ Đã tạo workspace.");
  } else {
    console.log("✅ Workspace đã tồn tại.");
  }

  try {
    await axios.get(
      `${geoserver.url}/rest/workspaces/${geoserver.workspace}/datastores/${geoserver.store}`,
      axiosAuth
    );
    console.log("✅ Datastore đã tồn tại.");
  } catch (err) {
    if (err.response?.status === 404) {
      const dsXML = `
        <dataStore>
          <name>${geoserver.store}</name>
          <connectionParameters>
            <host>${process.env.PGHOST}</host>
            <port>${process.env.PGPORT}</port>
            <database>${process.env.PGDATABASE}</database>
            <user>${process.env.PGUSER}</user>
            <passwd>${process.env.PGPASSWORD}</passwd>
            <dbtype>postgis</dbtype>
            <schema>public</schema>
          </connectionParameters>
        </dataStore>`;
      await axios.post(
        `${geoserver.url}/rest/workspaces/${geoserver.workspace}/datastores`,
        dsXML,
        axiosAuth
      );
      console.log("✅ Tạo datastore thành công.");
    } else {
      throw new Error("❌ Lỗi kiểm tra datastore: " + err.message);
    }
  }
}

async function publishToGeoServer() {
  const tableName = "mat_rung";
  const geoserver = {
    url: "http://localhost:8080/geoserver",
    workspace: "rung",
    store: "postgis_rung",
    user: process.env.GEOSERVER_USER,
    password: process.env.GEOSERVER_PASS,
  };

  await ensureWorkspaceAndStore(geoserver);

  const featureTypeCheckUrl = `${geoserver.url}/rest/workspaces/${geoserver.workspace}/datastores/${geoserver.store}/featuretypes/${tableName}.json`;
  const featureTypeCreateUrl = `${geoserver.url}/rest/workspaces/${geoserver.workspace}/datastores/${geoserver.store}/featuretypes`;

  const axiosAuth = {
    headers: { "Content-Type": "application/xml" },
    auth: { username: geoserver.user, password: geoserver.password },
    timeout: 30000, // tăng timeout nếu GeoServer load chậm
  };

  try {
    console.log(`🔎 Kiểm tra xem layer '${tableName}' đã được publish chưa...`);
    const response = await axios.get(featureTypeCheckUrl, axiosAuth);
    if (response.status === 200) {
      console.log("✅ Layer đã tồn tại, bỏ qua bước publish.");
      return;
    }
  } catch (err) {
    if (err.response?.status === 404) {
      console.log("⚠️ Layer chưa tồn tại, tiến hành publish mới...");
      const featureTypeXML = `
        <featureType>
          <name>${tableName}</name>
          <nativeName>${tableName}</nativeName>
          <title>${tableName}</title>
          <srs>EPSG:4326</srs>
        </featureType>`;

      // đợi datastore đồng bộ hóa schema
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const createRes = await axios.post(featureTypeCreateUrl, featureTypeXML, axiosAuth);
      console.log("✅ Publish layer thành công:", createRes.status);
    } else {
      throw new Error("❌ Lỗi kiểm tra hoặc publish layer: " + err.message);
    }
  }
}


router.post("/", async (req, res) => {
  const { zipUrl, tableName } = req.body;
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
    const checkExist = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'mat_rung'
      );
    `);
    
    const tableExists = checkExist.rows[0].exists;
    const shp2pgsqlFlag = tableExists ? "-a -s 4326" : "-c -I -s 4326";
    
    const importCmd =
      process.platform === "win32"
        ? `set PGPASSWORD=${process.env.PGPASSWORD}&& shp2pgsql ${shp2pgsqlFlag} "${fullShpPath}" mat_rung | psql -h ${process.env.PGHOST} -p ${process.env.PGPORT} -d ${process.env.PGDATABASE} -U ${process.env.PGUSER}`
        : `PGPASSWORD=${process.env.PGPASSWORD} shp2pgsql ${shp2pgsqlFlag} "${fullShpPath}" mat_rung | psql -h ${process.env.PGHOST} -p ${process.env.PGPORT} -d ${process.env.PGDATABASE} -U ${process.env.PGUSER}`;
    

    console.log("📥 Import vào PostgreSQL...");
    await exec(importCmd);
    console.log("✅ Import thành công!");

    await publishToGeoServer();

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
  FROM mat_rung AS t;
`;


    const result = await pool.query(geojsonQuery);
    const geojson = result.rows[0].json_build_object;

    fs.unlinkSync(zipPath);
    fs.rmSync(extractPath, { recursive: true });

    res.json({
      message: "✅ Tải, Import và Publish lên GeoServer thành công!",
      layer: `rung:${tableName}`,
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
