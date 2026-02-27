// gis-service/src/controllers/shapefile.controller.js
const multer = require('multer');
const AdmZip = require('adm-zip');
const shapefile = require('shapefile'); // ✅ Pure JavaScript shapefile reader (no GDAL required)
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const createLogger = require('../../../../shared/logger');
const { ValidationError } = require('../../../../shared/errors');
const { formatResponse } = require('../../../../shared/utils');

const logger = createLogger('shapefile-controller');

// ✅ Hàm đọc file .prj và phát hiện SRID
async function detectSRIDFromPrj(prjPath) {
  try {
    const prjContent = await fs.readFile(prjPath, 'utf-8');
    logger.info('PRJ content detected', { prjContent: prjContent.substring(0, 300) });

    // Common SRID patterns from GEE exports
    if (prjContent.includes('WGS_1984') || prjContent.includes('WGS 84') || prjContent.includes('GCS_WGS_1984')) {
      return 4326; // WGS84
    }
    if (prjContent.includes('UTM_Zone_48N') || prjContent.includes('UTM zone 48N') || prjContent.includes('WGS_1984_UTM_Zone_48N')) {
      return 32648; // UTM Zone 48N (Việt Nam)
    }
    if (prjContent.includes('UTM_Zone_49N') || prjContent.includes('UTM zone 49N') || prjContent.includes('WGS_1984_UTM_Zone_49N')) {
      return 32649; // UTM Zone 49N (Việt Nam)
    }
    if (prjContent.includes('VN-2000') || prjContent.includes('Vietnam_2000')) {
      return 4756; // VN-2000
    }
    if (prjContent.includes('Pseudo_Mercator') || prjContent.includes('Web_Mercator') || prjContent.includes('Auxiliary_Sphere')) {
      return 3857; // Web Mercator (Google)
    }
    if (prjContent.includes('EPSG')) {
      const match = prjContent.match(/EPSG[:\s"]*(\d+)/i);
      if (match) {
        return parseInt(match[1]);
      }
    }

    // Default to WGS84 if cannot determine
    return 4326;
  } catch (error) {
    logger.warn('Could not read .prj file, assuming WGS84', { error: error.message });
    return 4326;
  }
}

// ✅ Hàm kiểm tra xem coordinates có phải là WGS84 không (auto-detect từ giá trị)
function detectSRIDFromCoordinates(geometry) {
  try {
    let coords;
    if (geometry.type === 'Polygon') {
      coords = geometry.coordinates[0][0];
    } else if (geometry.type === 'MultiPolygon') {
      coords = geometry.coordinates[0][0][0];
    } else if (geometry.type === 'Point') {
      coords = geometry.coordinates;
    } else {
      return 4326;
    }

    if (!coords || coords.length < 2) return 4326;

    const [x, y] = coords;

    // WGS84 (lat/lon): x trong [-180, 180], y trong [-90, 90]
    // Việt Nam WGS84: x [102-110], y [8-24]
    const isVietnamWGS84 = x >= 100 && x <= 115 && y >= 5 && y <= 25;

    // UTM Zone 48N (Sơn La): x ~400000-600000, y ~2000000-2500000
    const isUTM48N = x >= 300000 && x <= 700000 && y >= 1800000 && y <= 2600000;

    if (isVietnamWGS84) {
      logger.info('Coordinates detected as WGS84', { x, y });
      return 4326;
    }

    if (isUTM48N) {
      logger.info('Coordinates detected as UTM Zone 48N', { x, y });
      return 32648;
    }

    // Nếu x,y quá lớn (> 1000) -> có thể là projected
    if (Math.abs(x) > 1000 || Math.abs(y) > 1000) {
      logger.warn('Unknown projected coordinates, will try UTM 48N', { x, y });
      return 32648;
    }

    return 4326;
  } catch (error) {
    logger.warn('Error detecting SRID from coordinates', { error: error.message });
    return 4326;
  }
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    fs.mkdir(uploadDir, { recursive: true })
      .then(() => cb(null, uploadDir))
      .catch(err => cb(err));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new ValidationError('Only ZIP files are allowed'));
    }
  }
});

// Upload middleware
exports.uploadMiddleware = upload.single('file');

// Import shapefile
exports.importShapefile = async (req, res, next) => {
  let uploadPath;
  let extractPath;

  try {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    uploadPath = req.file.path;
    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    logger.info('Processing shapefile', {
      filename: req.file.originalname,
      size: req.file.size
    });

    // Extract ZIP
    extractPath = path.join(path.dirname(uploadPath), `extract-${Date.now()}`);
    await fs.mkdir(extractPath, { recursive: true });

    const zip = new AdmZip(uploadPath);
    zip.extractAllTo(extractPath, true);

    logger.info('ZIP extracted', { extractPath });

    // Find .shp file
    const files = await fs.readdir(extractPath);
    const shpFile = files.find(f => f.endsWith('.shp'));

    if (!shpFile) {
      throw new ValidationError('No .shp file found in ZIP');
    }

    const shpPath = path.join(extractPath, shpFile);

    // ✅ Detect SRID from .prj file
    const prjFile = files.find(f => f.endsWith('.prj'));
    let detectedSRID = 4326;
    if (prjFile) {
      const prjPath = path.join(extractPath, prjFile);
      detectedSRID = await detectSRIDFromPrj(prjPath);
    }

    logger.info('Converting shapefile to GeoJSON', { shpFile, detectedSRID });

    // Convert to GeoJSON using shapefile package (pure JavaScript, no GDAL needed)
    const featureList = [];
    const source = await shapefile.open(shpPath);

    let result;
    while ((result = await source.read()) && !result.done) {
      featureList.push(result.value);
    }

    const geoJSON = {
      type: 'FeatureCollection',
      features: featureList
    };

    logger.info('Shapefile converted', {
      features: geoJSON.features?.length || 0
    });

    // Validate GeoJSON
    if (!geoJSON.features || geoJSON.features.length === 0) {
      throw new ValidationError('❌ File shapefile không chứa dữ liệu. Vui lòng kiểm tra file shapefile có dữ liệu không');
    }

    // ✅ Auto-detect SRID từ coordinates nếu .prj không rõ ràng
    if (detectedSRID === 4326 && geoJSON.features.length > 0) {
      const sampleGeometry = geoJSON.features[0].geometry;
      const coordSRID = detectSRIDFromCoordinates(sampleGeometry);
      if (coordSRID !== 4326) {
        detectedSRID = coordSRID;
        logger.info('SRID updated from coordinate analysis', { newSRID: detectedSRID });
      }
    }

    // Insert into database
    let insertedCount = 0;
    let errorCount = 0;

    for (const feature of geoJSON.features) {
      try {
        const props = feature.properties || {};
        const geometry = feature.geometry;

        // ✅ Build insert query với ST_Transform nếu cần chuyển đổi hệ tọa độ
        let insertQuery;
        if (detectedSRID !== 4326) {
          // Cần transform từ SRID gốc về WGS84 (4326)
          insertQuery = `
            INSERT INTO son_la_mat_rung (
              geom,
              area,
              start_dau,
              end_sau,
              mahuyen,
              detection_status
            ) VALUES (
              ST_Multi(
                ST_CollectionExtract(
                  ST_Buffer(
                    ST_MakeValid(
                      ST_Transform(
                        ST_SetSRID(ST_GeomFromGeoJSON($1), ${detectedSRID}),
                        4326
                      )
                    ),
                    0
                  ),
                  3
                )
              ),
              $2,
              $3,
              $4,
              $5,
              'Chưa xác minh'
            )
          `;
        } else {
          // Dữ liệu đã là WGS84
          insertQuery = `
            INSERT INTO son_la_mat_rung (
              geom,
              area,
              start_dau,
              end_sau,
              mahuyen,
              detection_status
            ) VALUES (
              ST_Multi(
                ST_CollectionExtract(
                  ST_Buffer(
                    ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)),
                    0
                  ),
                  3
                )
              ),
              $2,
              $3,
              $4,
              $5,
              'Chưa xác minh'
            )
          `;
        }

        await db.query(insertQuery, [
          JSON.stringify(geometry),
          props.area || 0,
          props.start_dau || new Date().toISOString(),
          props.end_sau || new Date().toISOString(),
          props.mahuyen || '01'
        ]);

        insertedCount++;
      } catch (insertError) {
        logger.warn('Failed to insert feature', {
          error: insertError.message
        });
        errorCount++;
      }
    }

    // Clear cache
    await redis.clearPattern('matrung:*');
    await redis.clearPattern('layer:*');

    logger.info('Shapefile import completed', {
      total: geoJSON.features.length,
      inserted: insertedCount,
      errors: errorCount,
      srid: detectedSRID
    });

    res.json(formatResponse(
      true,
      `Shapefile imported successfully (SRID: ${detectedSRID})`,
      {
        total_features: geoJSON.features.length,
        inserted: insertedCount,
        errors: errorCount,
        detected_srid: detectedSRID
      }
    ));

  } catch (error) {
    logger.error('Shapefile import failed', { error: error.message });
    next(error);
  } finally {
    // Cleanup
    try {
      if (uploadPath) await fs.unlink(uploadPath);
      if (extractPath) await fs.rm(extractPath, { recursive: true, force: true });
    } catch (cleanupError) {
      logger.warn('Cleanup failed', { error: cleanupError.message });
    }
  }
};

// Import from Google Earth Engine URL
exports.importFromGeeUrl = async (req, res, next) => {
  let zipPath;
  let extractPath;

  try {
    const { zipUrl } = req.body;

    if (!zipUrl) {
      throw new ValidationError('zipUrl is required');
    }

    // Validate URL format
    if (!zipUrl.includes('earthengine.googleapis.com')) {
      throw new ValidationError('URL must be from Google Earth Engine (earthengine.googleapis.com)');
    }

    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    logger.info('Downloading ZIP from Google Earth Engine', { url: zipUrl });

    // Download ZIP file from Google Earth Engine
    let response;
    try {
      response = await axios.get(zipUrl, {
        timeout: 280000, // 4 phút 40 giây
        responseType: 'arraybuffer', // Quan trọng: Nhận binary data
        headers: {
          'Accept': 'application/zip, application/octet-stream, */*',
          'User-Agent': 'DuBaoMatRung/1.0'
        },
        maxContentLength: 100 * 1024 * 1024, // 100MB
        maxBodyLength: 100 * 1024 * 1024,
        validateStatus: (status) => status < 500
      });
    } catch (fetchError) {
      logger.error('Failed to download from Google Earth Engine', {
        error: fetchError.message,
        code: fetchError.code
      });
      throw fetchError;
    }

    // Log response info
    logger.info('Google Earth Engine response received', {
      status: response.status,
      contentType: response.headers['content-type'],
      dataSize: response.data.length
    });

    // Check response status
    if (response.status !== 200) {
      logger.error('Google Earth Engine returned non-200 status', {
        status: response.status,
        statusText: response.statusText
      });
      throw new ValidationError(`Google Earth Engine trả về lỗi ${response.status}: ${response.statusText || 'Unknown error'}`);
    }

    // Save ZIP to temporary file
    const uploadDir = path.join(__dirname, '../../uploads');
    await fs.mkdir(uploadDir, { recursive: true });

    zipPath = path.join(uploadDir, `gee-${Date.now()}.zip`);
    await fs.writeFile(zipPath, response.data);

    logger.info('ZIP file saved', { zipPath, size: response.data.length });

    // Extract ZIP
    extractPath = path.join(path.dirname(zipPath), `extract-gee-${Date.now()}`);
    await fs.mkdir(extractPath, { recursive: true });

    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);

    logger.info('ZIP extracted', { extractPath });

    // Find .shp file
    const files = await fs.readdir(extractPath);
    const shpFile = files.find(f => f.endsWith('.shp'));

    if (!shpFile) {
      throw new ValidationError('No .shp file found in ZIP. Vui lòng kiểm tra file ZIP từ Google Earth Engine.');
    }

    const shpPath = path.join(extractPath, shpFile);

    // ✅ Detect SRID from .prj file
    const prjFile = files.find(f => f.endsWith('.prj'));
    let detectedSRID = 4326;
    if (prjFile) {
      const prjPath = path.join(extractPath, prjFile);
      detectedSRID = await detectSRIDFromPrj(prjPath);
    }

    logger.info('Converting shapefile to GeoJSON', { shpFile, detectedSRID });

    // Convert to GeoJSON using shapefile package (pure JavaScript, no GDAL needed)
    const featureList = [];
    const source = await shapefile.open(shpPath);

    let result;
    while ((result = await source.read()) && !result.done) {
      featureList.push(result.value);
    }

    const geoJSON = {
      type: 'FeatureCollection',
      features: featureList
    };

    logger.info('Shapefile converted to GeoJSON', {
      features: geoJSON.features?.length || 0
    });

    // Validate GeoJSON
    if (!geoJSON.features || geoJSON.features.length === 0) {
      throw new ValidationError('❌ File ZIP không chứa dữ liệu. Vui lòng kiểm tra:\n• File shapefile có dữ liệu không\n• Quá trình export từ Google Earth Engine có thành công không\n• Task trên GEE đã hoàn thành chưa');
    }

    // ✅ Auto-detect SRID từ coordinates nếu .prj không rõ ràng
    if (detectedSRID === 4326 && geoJSON.features.length > 0) {
      const sampleGeometry = geoJSON.features[0].geometry;
      const coordSRID = detectSRIDFromCoordinates(sampleGeometry);
      if (coordSRID !== 4326) {
        detectedSRID = coordSRID;
        logger.info('SRID updated from coordinate analysis', { newSRID: detectedSRID });
      }
    }

    logger.info('Final SRID determined', { detectedSRID });

    // Check for duplicates before importing
    let existingCount = 0;
    let insertedCount = 0;
    let errorCount = 0;

    // Process features in batches for better performance
    const BATCH_SIZE = 50;
    const features = geoJSON.features;

    logger.info('Starting batch processing', { totalFeatures: features.length, batchSize: BATCH_SIZE, srid: detectedSRID });

    for (let i = 0; i < features.length; i += BATCH_SIZE) {
      const batch = features.slice(i, Math.min(i + BATCH_SIZE, features.length));

      logger.info('Processing batch', {
        batchNumber: Math.floor(i / BATCH_SIZE) + 1,
        batchStart: i,
        batchEnd: Math.min(i + BATCH_SIZE, features.length),
        total: features.length
      });

      // Process batch with Promise.all for parallel processing
      const batchResults = await Promise.allSettled(
        batch.map(async (feature) => {
          const props = feature.properties || {};
          const geometry = feature.geometry;

          if (!geometry || !geometry.type) {
            throw new Error('Feature has no valid geometry');
          }

          // ✅ Build insert query với ST_Transform nếu cần chuyển đổi hệ tọa độ
          let insertQuery;
          if (detectedSRID !== 4326) {
            // Cần transform từ SRID gốc về WGS84 (4326)
            insertQuery = `
              INSERT INTO son_la_mat_rung (
                geom,
                area,
                start_dau,
                end_sau,
                mahuyen,
                detection_status
              ) VALUES (
                ST_Multi(
                  ST_CollectionExtract(
                    ST_Buffer(
                      ST_MakeValid(
                        ST_Transform(
                          ST_SetSRID(ST_GeomFromGeoJSON($1), ${detectedSRID}),
                          4326
                        )
                      ),
                      0
                    ),
                    3
                  )
                ),
                $2,
                $3,
                $4,
                $5,
                'Chưa xác minh'
              )
              RETURNING gid
            `;
          } else {
            // Dữ liệu đã là WGS84
            insertQuery = `
              INSERT INTO son_la_mat_rung (
                geom,
                area,
                start_dau,
                end_sau,
                mahuyen,
                detection_status
              ) VALUES (
                ST_Multi(
                  ST_CollectionExtract(
                    ST_Buffer(
                      ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)),
                      0
                    ),
                    3
                  )
                ),
                $2,
                $3,
                $4,
                $5,
                'Chưa xác minh'
              )
              RETURNING gid
            `;
          }

          const result = await db.query(insertQuery, [
            JSON.stringify(geometry),
            props.area || props.areaHa || 0,
            props.start_dau || props.startDate || new Date().toISOString(),
            props.end_sau || props.endDate || new Date().toISOString(),
            props.mahuyen || props.districtCode || '01'
          ]);

          return { status: 'inserted', gid: result.rows[0]?.gid };
        })
      );

      // Count results
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.status === 'existing') {
            existingCount++;
          } else if (result.value.status === 'inserted') {
            insertedCount++;
          }
        } else {
          logger.warn('Failed to process feature in batch', {
            error: result.reason?.message || 'Unknown error'
          });
          errorCount++;
        }
      });
    }

    // Clear cache
    await redis.clearPattern('matrung:*');
    await redis.clearPattern('layer:*');

    logger.info('Google Earth Engine import completed', {
      total: geoJSON.features.length,
      inserted: insertedCount,
      existing: existingCount,
      errors: errorCount,
      srid: detectedSRID
    });

    // Prepare response
    let message = '';
    let alreadyExists = false;

    if (insertedCount === 0 && existingCount > 0) {
      message = `Dữ liệu đã tồn tại trong hệ thống. Không có bản ghi mới nào được thêm.`;
      alreadyExists = true;
    } else if (insertedCount > 0 && existingCount > 0) {
      message = `Import thành công! Đã thêm ${insertedCount} bản ghi mới, ${existingCount} bản ghi đã tồn tại. (SRID: ${detectedSRID})`;
    } else if (insertedCount > 0) {
      message = `Import thành công! Đã thêm ${insertedCount} bản ghi mới. (SRID: ${detectedSRID})`;
    } else {
      message = `Import thất bại. Không có bản ghi nào được thêm vào hệ thống.`;
    }

    // Get recently added data for display (only new records from this import)
    // ✅ FIX: Update has_intersection and clipped_geom for newly imported records
    try {
      await db.query(`
        UPDATE son_la_mat_rung
        SET has_intersection = true,
            clipped_geom = geom,
            clipped_area = ST_Area(geom::geography)
        WHERE created_at >= NOW() - INTERVAL '2 minutes'
          AND has_intersection IS NULL
      `);
      logger.info('Updated has_intersection/clipped_geom for GEE imported records');
    } catch (updateErr) {
      logger.warn('Failed to update has_intersection for GEE records:', updateErr.message);
    }

    // ✅ FIX: Get recently added data with ALL fields needed by Table component
    const getAllQuery = `
      SELECT
        m.gid,
        ST_AsGeoJSON(ST_Transform(ST_MakeValid(m.geom), 4326), 6)::json as geometry,
        m.area,
        m.start_dau,
        m.end_sau,
        m.mahuyen,
        m.detection_status,
        m.detection_date,
        m.verification_notes,
        m.verification_reason,
        m.verified_by,
        m.verified_area,
        m.created_at,
        COALESCE(m.clipped_area, ST_Area(m.geom::geography)) as dtich,
        COALESCE(m.verified_area, 0) as "dtichXM",
        ST_X(ST_Centroid(ST_Transform(ST_MakeValid(m.geom), 4326))) as x_coordinate,
        ST_Y(ST_Centroid(ST_Transform(ST_MakeValid(m.geom), 4326))) as y_coordinate
      FROM son_la_mat_rung m
      WHERE m.created_at >= NOW() - INTERVAL '2 minutes'
      ORDER BY m.created_at DESC
      LIMIT 500
    `;

    const allDataResult = await db.query(getAllQuery);

    // ✅ FIX: Enrich with xa, tk, khoanh from sonla_tkkl
    const { Pool } = require('pg');
    const adminDbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: 'admin_db',
      max: 5
    });

    try {
      const validPoints = allDataResult.rows
        .filter(r => r.x_coordinate && r.y_coordinate && !isNaN(r.x_coordinate) && !isNaN(r.y_coordinate))
        .map(r => `${r.x_coordinate},${r.y_coordinate}`);

      if (validPoints.length > 0) {
        const enrichQuery = `
          WITH input_points AS (
            SELECT ordinality as idx,
              ST_SetSRID(ST_MakePoint(
                NULLIF(split_part(coords, ',', 1), '')::float,
                NULLIF(split_part(coords, ',', 2), '')::float
              ), 4326) as pt
            FROM unnest($1::text[]) WITH ORDINALITY AS t(coords, ordinality)
            WHERE coords IS NOT NULL AND coords != 'null,null'
          )
          SELECT DISTINCT ON (g.idx) g.idx, h.xa, h.tieukhu as tk, h.khoanh
          FROM input_points g
          LEFT JOIN sonla_tkkl h ON h.geom IS NOT NULL AND ST_Intersects(h.geom, g.pt)
          WHERE g.pt IS NOT NULL
          ORDER BY g.idx
        `;
        const enrichResult = await adminDbPool.query(enrichQuery, [validPoints]);
        const enrichMap = {};
        enrichResult.rows.forEach(r => { if (r.idx && r.idx > 0) enrichMap[r.idx - 1] = r; });

        let validIdx = 0;
        allDataResult.rows.forEach(row => {
          if (row.x_coordinate && row.y_coordinate && !isNaN(row.x_coordinate) && !isNaN(row.y_coordinate)) {
            const info = enrichMap[validIdx] || {};
            row.xa = info.xa || null;
            row.tk = info.tk || null;
            row.khoanh = info.khoanh || null;
            validIdx++;
          }
        });
      }
    } catch (enrichErr) {
      logger.warn('Failed to enrich GEE import data:', enrichErr.message);
    } finally {
      await adminDbPool.end();
    }

    const filteredRows = allDataResult.rows.filter(r => r.xa && r.xa.trim() !== '');

    const geojsonData = {
      type: 'FeatureCollection',
      features: filteredRows.map(row => ({
        type: 'Feature',
        geometry: row.geometry,
        properties: {
          gid: row.gid,
          area: row.area,
          dtich: row.dtich,
          dtichXM: row.dtichXM,
          start_dau: row.start_dau,
          end_sau: row.end_sau,
          mahuyen: row.mahuyen,
          huyen: row.mahuyen,
          xa: row.xa,
          tk: row.tk,
          khoanh: row.khoanh,
          x: row.x_coordinate,
          y: row.y_coordinate,
          x_coordinate: row.x_coordinate,
          y_coordinate: row.y_coordinate,
          detection_status: row.detection_status || 'Chưa xác minh',
          detection_date: row.detection_date,
          verification_notes: row.verification_notes,
          verification_reason: row.verification_reason,
          verified_by: row.verified_by,
          verified_area: row.verified_area,
          verified_by_name: null,
          verified_by_username: null,
          created_at: row.created_at
        }
      }))
    };

    res.json({
      success: insertedCount > 0 || existingCount > 0,
      message,
      alreadyExists,
      recordsAdded: insertedCount,
      recordsExisting: existingCount,
      recordsError: errorCount,
      totalFeatures: geoJSON.features.length,
      detectedSRID: detectedSRID,
      geojson: geojsonData
    });

  } catch (error) {
    logger.error('Google Earth Engine import failed', {
      error: error.message,
      stack: error.stack
    });

    // Handle specific error types
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(408).json({
        success: false,
        message: 'Hết thời gian chờ khi tải dữ liệu từ Google Earth Engine. Vui lòng thử lại.'
      });
    }

    if (error.response) {
      // HTTP error from Google Earth Engine
      const status = error.response.status;
      let message = 'Không thể tải dữ liệu từ Google Earth Engine';

      if (status === 401 || status === 403) {
        message = '🔐 Không có quyền truy cập URL.\n\n' +
          '💡 Nguyên nhân có thể:\n' +
          '• URL chỉ hoạt động khi đăng nhập Google Earth Engine\n' +
          '• Asset chưa được share public\n' +
          '• Phiên đăng nhập GEE đã hết hạn\n\n' +
          '✅ Giải pháp:\n' +
          '• Export data to Asset → Share → Make PUBLIC\n' +
          '• Hoặc đăng nhập lại Google Earth Engine và lấy URL mới';
      } else if (status === 404) {
        message = '❌ Không tìm thấy dữ liệu tại URL này.\n\n' +
          '💡 Nguyên nhân có thể:\n' +
          '• URL đã hết hạn (URL từ Console chỉ tạm thời)\n' +
          '• Asset đã bị xóa\n' +
          '• URL không đúng định dạng\n' +
          '• Đang sử dụng URL TIFF thay vì FeatureCollection\n\n' +
          '✅ Giải pháp:\n' +
          '• Sử dụng Export.table.toAsset() để tạo asset vĩnh viễn\n' +
          '• Share asset thành PUBLIC\n' +
          '• Copy URL có ":getFeatures" từ asset\n' +
          '• Đảm bảo URL là FeatureCollection (vector), không phải Image (raster)';
      }

      return res.status(error.response.status).json({
        success: false,
        message
      });
    }

    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  } finally {
    // Cleanup ZIP file and extracted folder
    try {
      if (zipPath) await fs.unlink(zipPath);
      if (extractPath) await fs.rm(extractPath, { recursive: true, force: true });
      logger.info('Cleanup completed', { zipPath, extractPath });
    } catch (cleanupError) {
      logger.warn('Cleanup failed', { error: cleanupError.message });
    }
  }
};

// Import from GeoJSON URL with spatial intersection validation
exports.importFromGeoJsonUrl = async (req, res, next) => {
  try {
    const { jsonUrl } = req.body;

    if (!jsonUrl) {
      throw new ValidationError('jsonUrl is required');
    }

    const db = req.app.locals.db;
    const redis = req.app.locals.redis;
    const adminDb = req.app.locals.adminDb; // Connection to admin_db

    logger.info('Downloading GeoJSON from URL', { url: jsonUrl });

    // Download GeoJSON file
    let response;
    try {
      response = await axios.get(jsonUrl, {
        timeout: 280000, // 4 phút 40 giây
        responseType: 'json',
        headers: {
          'Accept': 'application/json, application/geo+json, */*',
          'User-Agent': 'DuBaoMatRung/1.0'
        },
        maxContentLength: 100 * 1024 * 1024, // 100MB
        maxBodyLength: 100 * 1024 * 1024,
        validateStatus: (status) => status < 500
      });
    } catch (fetchError) {
      logger.error('Failed to download GeoJSON', {
        error: fetchError.message,
        code: fetchError.code
      });
      throw fetchError;
    }

    logger.info('GeoJSON response received', {
      status: response.status,
      contentType: response.headers['content-type']
    });

    // Check response status
    if (response.status !== 200) {
      logger.error('URL returned non-200 status', {
        status: response.status,
        statusText: response.statusText
      });
      throw new ValidationError(`URL trả về lỗi ${response.status}: ${response.statusText || 'Unknown error'}`);
    }

    const geoJSON = response.data;

    // Validate GeoJSON structure
    if (!geoJSON || typeof geoJSON !== 'object') {
      throw new ValidationError('Dữ liệu tải về không phải là JSON hợp lệ');
    }

    if (!geoJSON.features || !Array.isArray(geoJSON.features)) {
      throw new ValidationError('GeoJSON không có trường "features" hoặc không phải là array');
    }

    if (geoJSON.features.length === 0) {
      throw new ValidationError('GeoJSON không chứa dữ liệu (features rỗng)');
    }

    logger.info('GeoJSON validated', {
      totalFeatures: geoJSON.features.length
    });

    // ✅ STEP: Filter features by spatial intersection with sonla_hientrangrung
    logger.info('Starting spatial intersection validation with sonla_hientrangrung table');

    const validFeatures = [];
    const invalidFeatures = [];
    let validationErrors = 0;

    // Create PostgreSQL connection pool for admin_db
    const { Pool } = require('pg');
    const adminDbPool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      database: 'admin_db',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    });

    try {
      // Process features in batches for performance
      const VALIDATION_BATCH_SIZE = 20;

      for (let i = 0; i < geoJSON.features.length; i += VALIDATION_BATCH_SIZE) {
        const batch = geoJSON.features.slice(i, Math.min(i + VALIDATION_BATCH_SIZE, geoJSON.features.length));

        logger.info('Validating batch', {
          batchNumber: Math.floor(i / VALIDATION_BATCH_SIZE) + 1,
          batchStart: i,
          batchEnd: Math.min(i + VALIDATION_BATCH_SIZE, geoJSON.features.length),
          total: geoJSON.features.length
        });

        // Check each feature in parallel
        const batchResults = await Promise.allSettled(
          batch.map(async (feature, idx) => {
            try {
              if (!feature.geometry || !feature.geometry.type) {
                throw new Error('Feature has no valid geometry');
              }

              // ✅ Query to check spatial intersection with sonla_hientrangrung_new
              const intersectQuery = `
                SELECT EXISTS (
                  SELECT 1
                  FROM sonla_hientrangrung_new
                  WHERE ST_Intersects(
                    geom,
                    ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)
                  )
                ) as intersects
              `;

              const result = await adminDbPool.query(intersectQuery, [
                JSON.stringify(feature.geometry)
              ]);

              return {
                feature,
                intersects: result.rows[0].intersects,
                originalIndex: i + idx
              };
            } catch (error) {
              logger.warn('Error validating feature', {
                featureIndex: i + idx,
                error: error.message
              });
              return {
                feature,
                intersects: false,
                error: error.message,
                originalIndex: i + idx
              };
            }
          })
        );

        // Categorize results
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            if (result.value.intersects) {
              validFeatures.push(result.value.feature);
            } else {
              invalidFeatures.push({
                index: result.value.originalIndex,
                reason: result.value.error || 'Không giao với khu vực hiện trạng rừng'
              });
            }
          } else {
            validationErrors++;
            logger.error('Feature validation failed', {
              error: result.reason?.message
            });
          }
        });
      }

      logger.info('Spatial intersection validation completed', {
        totalFeatures: geoJSON.features.length,
        validFeatures: validFeatures.length,
        invalidFeatures: invalidFeatures.length,
        validationErrors
      });

      // Check if no valid features
      if (validFeatures.length === 0) {
        return res.json({
          success: false,
          message: 'Không có dữ liệu nào hợp lệ để import. Tất cả các vùng trong GeoJSON không giao với khu vực hiện trạng rừng.',
          totalFeatures: geoJSON.features.length,
          validFeatures: 0,
          filteredFeatures: geoJSON.features.length,
          recordsAdded: 0
        });
      }

      // ✅ Insert valid features into son_la_mat_rung (gis_db)
      logger.info('Starting insertion of valid features into son_la_mat_rung');

      let insertedCount = 0;
      let errorCount = 0;

      const INSERT_BATCH_SIZE = 50;

      for (let i = 0; i < validFeatures.length; i += INSERT_BATCH_SIZE) {
        const batch = validFeatures.slice(i, Math.min(i + INSERT_BATCH_SIZE, validFeatures.length));

        logger.info('Inserting batch', {
          batchNumber: Math.floor(i / INSERT_BATCH_SIZE) + 1,
          batchStart: i,
          batchEnd: Math.min(i + INSERT_BATCH_SIZE, validFeatures.length),
          total: validFeatures.length
        });

        const batchResults = await Promise.allSettled(
          batch.map(async (feature) => {
            const props = feature.properties || {};
            const geometry = feature.geometry;

            // Insert into son_la_mat_rung (assuming WGS84 / EPSG:4326)
            const insertQuery = `
              INSERT INTO son_la_mat_rung (
                geom,
                area,
                start_dau,
                end_sau,
                mahuyen,
                detection_status
              ) VALUES (
                ST_Multi(
                  ST_CollectionExtract(
                    ST_Buffer(
                      ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON($1), 4326)),
                      0
                    ),
                    3
                  )
                ),
                $2,
                $3,
                $4,
                $5,
                'Chưa xác minh'
              )
              RETURNING gid
            `;

            const result = await db.query(insertQuery, [
              JSON.stringify(geometry),
              props.area || props.areaHa || 0,
              props.start_dau || props.startDate || new Date().toISOString(),
              props.end_sau || props.endDate || new Date().toISOString(),
              props.mahuyen || props.districtCode || '01'
            ]);

            return { status: 'inserted', gid: result.rows[0]?.gid };
          })
        );

        // Count results
        batchResults.forEach((result) => {
          if (result.status === 'fulfilled') {
            insertedCount++;
          } else {
            logger.warn('Failed to insert feature', {
              error: result.reason?.message || 'Unknown error'
            });
            errorCount++;
          }
        });
      }

      // Clear cache
      await redis.clearPattern('matrung:*');
      await redis.clearPattern('layer:*');

      logger.info('GeoJSON import completed', {
        totalFeatures: geoJSON.features.length,
        validFeatures: validFeatures.length,
        filteredFeatures: invalidFeatures.length,
        inserted: insertedCount,
        errors: errorCount
      });

      // ✅ FIX: Update has_intersection and clipped_geom for newly imported records
      // so they appear in getMatRung/autoForecast queries
      try {
        await db.query(`
          UPDATE son_la_mat_rung
          SET has_intersection = true,
              clipped_geom = geom,
              clipped_area = ST_Area(geom::geography)
          WHERE created_at >= NOW() - INTERVAL '2 minutes'
            AND has_intersection IS NULL
        `);
        logger.info('Updated has_intersection/clipped_geom for newly imported records');
      } catch (updateErr) {
        logger.warn('Failed to update has_intersection for new records:', updateErr.message);
      }

      // ✅ FIX: Get recently added data with ALL fields needed by Table component
      // Matching the same format as getMatRung/autoForecast
      const getAllQuery = `
        SELECT
          m.gid,
          ST_AsGeoJSON(ST_Transform(ST_MakeValid(m.geom), 4326), 6)::json as geometry,
          m.area,
          m.start_dau,
          m.end_sau,
          m.mahuyen,
          m.detection_status,
          m.detection_date,
          m.verification_notes,
          m.verification_reason,
          m.verified_by,
          m.verified_area,
          m.created_at,
          COALESCE(m.clipped_area, ST_Area(m.geom::geography)) as dtich,
          COALESCE(m.verified_area, 0) as "dtichXM",
          ST_X(ST_Centroid(ST_Transform(ST_MakeValid(m.geom), 4326))) as x_coordinate,
          ST_Y(ST_Centroid(ST_Transform(ST_MakeValid(m.geom), 4326))) as y_coordinate
        FROM son_la_mat_rung m
        WHERE m.created_at >= NOW() - INTERVAL '2 minutes'
        ORDER BY m.created_at DESC
        LIMIT 500
      `;

      const allDataResult = await db.query(getAllQuery);

      // ✅ FIX: Enrich with xa, tk, khoanh from sonla_tkkl (same as enrichWithAdminInfo)
      const enrichedRows = [];
      const ENRICH_BATCH = 50;

      for (let i = 0; i < allDataResult.rows.length; i += ENRICH_BATCH) {
        const batch = allDataResult.rows.slice(i, i + ENRICH_BATCH);
        const validPoints = batch
          .filter(r => r.x_coordinate && r.y_coordinate && !isNaN(r.x_coordinate) && !isNaN(r.y_coordinate))
          .map(r => `${r.x_coordinate},${r.y_coordinate}`);

        if (validPoints.length > 0) {
          try {
            const enrichQuery = `
              WITH input_points AS (
                SELECT
                  ordinality as idx,
                  ST_SetSRID(ST_MakePoint(
                    NULLIF(split_part(coords, ',', 1), '')::float,
                    NULLIF(split_part(coords, ',', 2), '')::float
                  ), 4326) as pt
                FROM unnest($1::text[]) WITH ORDINALITY AS t(coords, ordinality)
                WHERE coords IS NOT NULL AND coords != 'null,null' AND coords != ','
              )
              SELECT DISTINCT ON (g.idx)
                g.idx,
                h.xa,
                h.tieukhu as tk,
                h.khoanh
              FROM input_points g
              LEFT JOIN sonla_tkkl h
                ON h.geom IS NOT NULL AND ST_Intersects(h.geom, g.pt)
              WHERE g.pt IS NOT NULL
              ORDER BY g.idx
            `;
            const enrichResult = await adminDbPool.query(enrichQuery, [validPoints]);

            // Map enrich data back to rows
            const enrichMap = {};
            enrichResult.rows.forEach(r => {
              if (r.idx && r.idx > 0) enrichMap[r.idx - 1] = r;
            });

            let validIdx = 0;
            batch.forEach(row => {
              if (row.x_coordinate && row.y_coordinate && !isNaN(row.x_coordinate) && !isNaN(row.y_coordinate)) {
                const adminInfo = enrichMap[validIdx] || {};
                row.xa = adminInfo.xa || null;
                row.tk = adminInfo.tk || null;
                row.khoanh = adminInfo.khoanh || null;
                validIdx++;
              }
            });
          } catch (enrichErr) {
            logger.warn('Failed to enrich batch with admin info:', enrichErr.message);
          }
        }

        enrichedRows.push(...batch);
      }

      // ✅ FIX: Only return records that have xa (within forest area)
      const filteredEnrichedRows = enrichedRows.filter(r => r.xa && r.xa.trim() !== '');

      const geojsonData = {
        type: 'FeatureCollection',
        features: filteredEnrichedRows.map(row => ({
          type: 'Feature',
          geometry: row.geometry,
          properties: {
            gid: row.gid,
            area: row.area,
            dtich: row.dtich,
            dtichXM: row.dtichXM,
            start_dau: row.start_dau,
            end_sau: row.end_sau,
            mahuyen: row.mahuyen,
            huyen: row.mahuyen,
            xa: row.xa,
            tk: row.tk,
            khoanh: row.khoanh,
            x: row.x_coordinate,
            y: row.y_coordinate,
            x_coordinate: row.x_coordinate,
            y_coordinate: row.y_coordinate,
            detection_status: row.detection_status || 'Chưa xác minh',
            detection_date: row.detection_date,
            verification_notes: row.verification_notes,
            verification_reason: row.verification_reason,
            verified_by: row.verified_by,
            verified_area: row.verified_area,
            verified_by_name: null,
            verified_by_username: null,
            created_at: row.created_at
          }
        }))
      };

      res.json({
        success: insertedCount > 0,
        message: `Import thành công! Đã thêm ${insertedCount} bản ghi hợp lệ. Đã lọc bỏ ${invalidFeatures.length} vùng không giao với hiện trạng rừng.`,
        totalFeatures: geoJSON.features.length,
        validFeatures: validFeatures.length,
        filteredFeatures: invalidFeatures.length,
        recordsAdded: insertedCount,
        recordsError: errorCount,
        geojson: geojsonData
      });

    } finally {
      // Close admin_db connection pool
      await adminDbPool.end();
    }

  } catch (error) {
    logger.error('GeoJSON import failed', {
      error: error.message,
      stack: error.stack
    });

    // Handle specific error types
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(408).json({
        success: false,
        message: 'Hết thời gian chờ khi tải dữ liệu. Vui lòng thử lại.'
      });
    }

    if (error.response) {
      const status = error.response.status;
      let message = 'Không thể tải dữ liệu từ URL';

      if (status === 401 || status === 403) {
        message = 'Không có quyền truy cập URL. Vui lòng kiểm tra quyền truy cập.';
      } else if (status === 404) {
        message = 'Không tìm thấy dữ liệu tại URL này. Vui lòng kiểm tra URL.';
      }

      return res.status(status).json({
        success: false,
        message
      });
    }

    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    next(error);
  }
};

module.exports = exports;
