/**
 * @swagger
 * /api/import-shapefile:
 *   post:
 *     tags:
 *       - Shapefile
 *     summary: Upload shapefile ZIP và import vào hệ thống
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               zip:
 *                 type: string
 *                 format: binary
 *               tableName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Nhập và publish thành công
 */


const express = require("express");
const router = express.Router();
const axios = require("axios");
const fs = require("fs");
const AdmZip = require("adm-zip");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const path = require("path");
const multer = require("multer");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, "../tmp");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, "shapefile.zip"),
});
const upload = multer({ storage });

async function ensureWorkspaceAndStore(geoserver) {
  const axiosAuth = {
    auth: { username: geoserver.user, password: geoserver.password },
    headers: { "Content-Type": "application/xml" },
  };

  try {
    await axios.get(`${geoserver.url}/rest/workspaces/${geoserver.workspace}`, axiosAuth);
  } catch {
    const wsXML = `<workspace><name>${geoserver.workspace}</name></workspace>`;
    await axios.post(`${geoserver.url}/rest/workspaces`, wsXML, axiosAuth);
  }

  try {
    await axios.get(`${geoserver.url}/rest/workspaces/${geoserver.workspace}/datastores/${geoserver.store}`, axiosAuth);
  } catch {
    const dsXML = `
    <dataStore>
      <name>${geoserver.store}</name>
      <connectionParameters>
        <host>localhost</host>
        <port>5432</port>
        <database>${process.env.PGDATABASE}</database>
        <user>${process.env.PGUSER}</user>
        <passwd>${process.env.PGPASSWORD}</passwd>
        <dbtype>postgis</dbtype>
        <schema>public</schema>
      </connectionParameters>
    </dataStore>`;
    await axios.post(`${geoserver.url}/rest/workspaces/${geoserver.workspace}/datastores`, dsXML, axiosAuth);
  }
}

async function publishToGeoServer(tableName) {
  const geoserver = {
    url: "http://localhost:8080/geoserver",
    workspace: "rung",
    store: "postgis_rung",
    user: process.env.GEOSERVER_USER,
    password: process.env.GEOSERVER_PASS,
  };

  await ensureWorkspaceAndStore(geoserver);

  const featureTypeXML = `
    <featureType>
      <name>${tableName}</name>
      <nativeName>${tableName}</nativeName>
      <title>${tableName}</title>
      <srs>EPSG:4326</srs>
    </featureType>`;

  await axios.post(
    `${geoserver.url}/rest/workspaces/${geoserver.workspace}/datastores/${geoserver.store}/featuretypes`,
    featureTypeXML,
    { headers: { "Content-Type": "application/xml" }, auth: { username: geoserver.user, password: geoserver.password } }
  );
}

router.post("/", upload.single("zip"), async (req, res) => {
  const { tableName } = req.body;
  const downloadPath = req.file.path;
  const extractPath = path.join(__dirname, "../tmp/unzip");

  try {
    if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });
    fs.mkdirSync(extractPath, { recursive: true });

    const zip = new AdmZip(downloadPath);
    zip.extractAllTo(extractPath, true);

    const shpFile = fs.readdirSync(extractPath).find((f) => f.endsWith(".shp"));
    if (!shpFile) throw new Error("Không tìm thấy file .shp.");

    const fullShpPath = path.join(extractPath, shpFile);
    const importCmd = `set PGPASSWORD=${process.env.PGPASSWORD}&& shp2pgsql -I -s 4326 "${fullShpPath}" ${tableName} | psql -d ${process.env.PGDATABASE} -U ${process.env.PGUSER}`;


await exec(importCmd);


    await exec(importCmd);

    await publishToGeoServer(tableName);

    if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
    if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });

    res.json({
      message: "✅ Đã import & publish thành công!",
      layer: `rung:${tableName}`,
      wms: `http://localhost:8080/geoserver/rung/wms?service=WMS&request=GetMap&layers=rung:${tableName}&format=image/png&transparent=true`,
    });
  } catch (err) {
    console.error("❌ Lỗi xử lý:", err.message);
    res.status(500).json({ message: "Lỗi xử lý", error: err.message });

    if (fs.existsSync(downloadPath)) fs.unlinkSync(downloadPath);
    if (fs.existsSync(extractPath)) fs.rmSync(extractPath, { recursive: true, force: true });
  }
});

module.exports = router;