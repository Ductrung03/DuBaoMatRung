// gis-service/src/controllers/shapefile.controller.js
const multer = require('multer');
const AdmZip = require('adm-zip');
const { ogr2ogr } = require('ogr2ogr'); // ✅ Destructure để lấy named export
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const createLogger = require('../../../../shared/logger');
const { ValidationError } = require('../../../../shared/errors');
const { formatResponse } = require('../../../../shared/utils');

const logger = createLogger('shapefile-controller');

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

    logger.info('Converting shapefile to GeoJSON', { shpFile });

    // Convert to GeoJSON using ogr2ogr (v6.x API)
    const result = await ogr2ogr(shpPath, {
      options: ['-t_srs', 'EPSG:4326'] // ✅ Sử dụng options array thay vì targetSrs
    });

    const geoJSON = result.data; // ✅ Lấy data từ result object

    logger.info('Shapefile converted', {
      features: geoJSON.features?.length || 0
    });

    // Validate GeoJSON
    if (!geoJSON.features || geoJSON.features.length === 0) {
      throw new ValidationError('Shapefile contains no features');
    }

    // Insert into database
    let insertedCount = 0;
    let errorCount = 0;

    for (const feature of geoJSON.features) {
      try {
        const props = feature.properties || {};
        const geometry = feature.geometry;

        // Build insert query
        const insertQuery = `
          INSERT INTO mat_rung (
            geom,
            area,
            start_dau,
            end_sau,
            mahuyen,
            detection_status
          ) VALUES (
            ST_GeomFromGeoJSON($1),
            $2,
            $3,
            $4,
            $5,
            'Chưa xác minh'
          )
        `;

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

    logger.info('Shapefile import completed', {
      total: geoJSON.features.length,
      inserted: insertedCount,
      errors: errorCount
    });

    res.json(formatResponse(
      true,
      'Shapefile imported successfully',
      {
        total_features: geoJSON.features.length,
        inserted: insertedCount,
        errors: errorCount
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

    logger.info('Converting shapefile to GeoJSON', { shpFile });

    // Convert to GeoJSON using ogr2ogr (v6.x API)
    const result = await ogr2ogr(shpPath, {
      options: ['-t_srs', 'EPSG:4326'] // ✅ Sử dụng options array thay vì targetSrs
    });

    const geoJSON = result.data; // ✅ Lấy data từ result object

    logger.info('Shapefile converted to GeoJSON', {
      features: geoJSON.features?.length || 0
    });

    // Validate GeoJSON
    if (!geoJSON.features || geoJSON.features.length === 0) {
      throw new ValidationError('Shapefile contains no features');
    }

    // Check for duplicates before importing
    let existingCount = 0;
    let insertedCount = 0;
    let errorCount = 0;

    // Process features in batches for better performance
    const BATCH_SIZE = 50;
    const features = geoJSON.features;

    logger.info('Starting batch processing', { totalFeatures: features.length, batchSize: BATCH_SIZE });

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

          // Check for duplicate based on geometry and date
          const checkQuery = `
            SELECT COUNT(*) as count FROM mat_rung
            WHERE ST_Equals(geom, ST_GeomFromGeoJSON($1))
            AND start_dau = $2
          `;

          const checkResult = await db.query(checkQuery, [
            JSON.stringify(geometry),
            props.start_dau || new Date().toISOString()
          ]);

          if (parseInt(checkResult.rows[0].count) > 0) {
            return { status: 'existing' };
          }

          // Insert new record
          const insertQuery = `
            INSERT INTO mat_rung (
              geom,
              area,
              start_dau,
              end_sau,
              mahuyen,
              detection_status
            ) VALUES (
              ST_GeomFromGeoJSON($1),
              $2,
              $3,
              $4,
              $5,
              'Chưa xác minh'
            )
          `;

          await db.query(insertQuery, [
            JSON.stringify(geometry),
            props.area || props.areaHa || 0,
            props.start_dau || props.startDate || new Date().toISOString(),
            props.end_sau || props.endDate || new Date().toISOString(),
            props.mahuyen || props.districtCode || '01'
          ]);

          return { status: 'inserted' };
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

    logger.info('Google Earth Engine import completed', {
      total: geoJSON.features.length,
      inserted: insertedCount,
      existing: existingCount,
      errors: errorCount
    });

    // Prepare response
    const totalProcessed = insertedCount + existingCount + errorCount;
    let message = '';
    let alreadyExists = false;

    if (insertedCount === 0 && existingCount > 0) {
      message = `Dữ liệu đã tồn tại trong hệ thống. Không có bản ghi mới nào được thêm.`;
      alreadyExists = true;
    } else if (insertedCount > 0 && existingCount > 0) {
      message = `Import thành công! Đã thêm ${insertedCount} bản ghi mới, ${existingCount} bản ghi đã tồn tại.`;
    } else if (insertedCount > 0) {
      message = `Import thành công! Đã thêm ${insertedCount} bản ghi mới.`;
    } else {
      message = `Import thất bại. Không có bản ghi nào được thêm vào hệ thống.`;
    }

    // Get recently added data for display (only new records from this import)
    // Chỉ lấy dữ liệu được thêm trong vòng 1 phút qua để tránh timeout
    const getAllQuery = `
      SELECT
        gid,
        ST_AsGeoJSON(geom)::json as geometry,
        area,
        start_dau,
        end_sau,
        mahuyen,
        detection_status,
        verification_notes,
        created_at
      FROM mat_rung
      WHERE created_at >= NOW() - INTERVAL '1 minute'
      ORDER BY created_at DESC
      LIMIT 500
    `;

    const allDataResult = await db.query(getAllQuery);

    const geojsonData = {
      type: 'FeatureCollection',
      features: allDataResult.rows.map(row => ({
        type: 'Feature',
        geometry: row.geometry,
        properties: {
          gid: row.gid,
          area: row.area,
          start_dau: row.start_dau,
          end_sau: row.end_sau,
          mahuyen: row.mahuyen,
          detection_status: row.detection_status,
          verification_notes: row.verification_notes,
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

module.exports = exports;
