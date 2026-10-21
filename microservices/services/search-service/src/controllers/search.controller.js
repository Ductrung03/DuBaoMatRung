// search-service/src/controllers/search.controller.js
const { formatResponse } = require('../../../../shared/utils');
const { convertTcvn3ToUnicode } = require('../../../../shared/utils/tcvn3-converter');
const createLogger = require('../../../../shared/logger');

const logger = createLogger('search-controller');

// Search mat rung - OPTIMIZED VERSION
exports.searchMatRung = async (req, res, next) => {
  let adminDb = null;

  try {
    const { q, status, fromDate, toDate, limit = 100, huyen, xa, xacMinh, includeForestFunctions } = req.query;
    if (includeForestFunctions !== undefined && !['true', 'false'].includes(includeForestFunctions)) {
      return res.status(400).json(formatResponse(false, 'includeForestFunctions phải là true hoặc false', null));
    }

    // ✅ SCOPE ENFORCEMENT
    const userRolesStr = req.headers['x-user-roles'] ? decodeURIComponent(req.headers['x-user-roles']) : '';
    // Check if user is Admin or LanhDao (skip enforcement)
    // Note: Roles might be "Admin,User" string
    const userRoles = userRolesStr.split(',');
    const isRestricted = req.searchActor ? !req.searchActor.province : !userRoles.some(role => ['Admin', 'LanhDao', 'admin', 'super_admin'].includes(role));

    let forcedXa = null;

    if (isRestricted) {
      if (req.headers['x-user-xa']) forcedXa = decodeURIComponent(req.headers['x-user-xa']);
    }

    // Fail closed: a restricted account without an assigned commune must not
    // turn an unfiltered report into a province-wide data download.
    if (isRestricted && !forcedXa) {
      return res.status(403).json(formatResponse(false, 'Tài khoản chưa được cấp phạm vi xã. Vui lòng liên hệ quản trị viên.', null));
    }
    const forcedTk = isRestricted && req.headers['x-user-tieukhu'] ? decodeURIComponent(req.headers['x-user-tieukhu']) : '';
    const forcedKhoanh = isRestricted && req.headers['x-user-khoanh'] ? decodeURIComponent(req.headers['x-user-khoanh']) : '';
    const parsedLimit = Number(limit);
    if (!/^\d+$/.test(String(limit)) || !Number.isSafeInteger(parsedLimit) || parsedLimit < 0) {
      return res.status(400).json(formatResponse(false, 'limit phải là số nguyên không âm', null));
    }

    // Effective filters
    const effectiveXa = forcedXa || xa;
    for(const [key,input]of Object.entries({q,status,fromDate,toDate,huyen,xa,xacMinh}))if(input!==undefined&&(typeof input!=='string'||input.length>200))return res.status(400).json(formatResponse(false,`Điều kiện ${key} không hợp lệ`,null));
    for(const date of [fromDate,toDate])if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date))return res.status(400).json(formatResponse(false,'Ngày truy vấn không hợp lệ',null));
    if(fromDate&&toDate&&fromDate>toDate)return res.status(400).json(formatResponse(false,'Khoảng ngày bị đảo ngược',null));
    let cacheKey = `search:vfis-forest-functions-types-v2:${JSON.stringify([q || '', status || '', fromDate || '', toDate || '', huyen || '', effectiveXa || '', xacMinh || '', parsedLimit, isRestricted, forcedTk, forcedKhoanh, includeForestFunctions === 'true'])}`;

    // Current identity/scope already verified by middleware, before any cache read.
    const assignments=req.searchActor?await require('../management-units').readAssignments():null;
    if(assignments)cacheKey+=':assignments:'+assignments.revision;
    const db = req.app.locals.db;
    const redis = req.app.locals.redis; // Có thể undefined nếu Redis bị disable
    const revision=req.searchActor?await require('../search-revision').readRevision(req,assignments):null;
    if(revision)cacheKey+=':revision:'+JSON.stringify(revision);

    // ✅ Kiểm tra Redis có available không
    if (redis) {
      const cached = await redis.get(cacheKey);

      if (cached) {
        logger.info('Cache hit for search');
        return res.json({ ...cached, cached: true });
      }
    }

    logger.info('Searching mat rung', { q, status, fromDate, toDate, huyen, xa: effectiveXa, xacMinh });

    let whereClause = 'WHERE m.geom IS NOT NULL AND ST_IsValid(m.geom)';
    const params = [];
    let paramIndex = 1;

    // Full-text search on notes
    if (q) {
      whereClause += ` AND (m.verification_notes ILIKE $${paramIndex++} OR CAST(m.gid AS TEXT) ILIKE $${paramIndex++})`;
      params.push(`%${q}%`, `%${q}%`);
    }

    if (status === 'true' || xacMinh === 'true') {
      whereClause += ` AND m.detection_status = $${paramIndex++}`;
      params.push('Đã xác minh');
    }
    else if(status && status!=='false'){
      whereClause+=` AND m.detection_status = $${paramIndex++}`;params.push(status);
    }

    // ✅ FIX: Dùng end_sau thay vì detection_date vì detection_date đều NULL
    if (fromDate) {
      whereClause += ` AND m.end_sau >= $${paramIndex++}`;
      params.push(fromDate);
    }

    if (toDate) {
      whereClause += ` AND m.end_sau <= $${paramIndex++}`;
      params.push(toDate);
    }

    // ✅ Build query with proper admin_db spatial filtering
    let query;
    let needsAdminJoin = huyen || effectiveXa;

    if (needsAdminJoin) {
      // Connect to admin_db for spatial filtering
      const { Pool } = require('pg');
      adminDb = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5433,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.ADMIN_DB_NAME || 'admin_db',
        max: 5,
        idleTimeoutMillis: 5000
      });

      // First, get GIDs that match spatial filter from admin_db
      let spatialWhereClause = '';
      const spatialParams = [];
      let spatialParamIndex = 1;

      if (huyen) {
        spatialWhereClause += ` WHERE to_jsonb(r)->>'huyen' = $${spatialParamIndex++}`;
        spatialParams.push(huyen);
      }

      if (effectiveXa) {
        spatialWhereClause += huyen ? ' AND' : ' WHERE';
        spatialWhereClause += ` r.xa = $${spatialParamIndex++}`;
        spatialParams.push(effectiveXa);
      }

      // Get matching geometries from admin_db
      const spatialQuery = `
        SELECT ST_AsText(ST_Union(r.geom)) as union_geom_wkt
        FROM sonla_rgx r
        ${spatialWhereClause}
      `;

      const spatialResult = await adminDb.query(spatialQuery, spatialParams);

      if (!spatialResult.rows[0] || !spatialResult.rows[0].union_geom_wkt) {
        logger.warn('No matching admin boundaries found', { huyen, xa: effectiveXa });
        return res.json({...formatResponse(true, 'No data found', {
          type: 'FeatureCollection',
          features: []
        }),...(revision||{})});
      }

      // Now query mat_rung with spatial intersection using WKT
      whereClause += ` AND ${isRestricted?'ST_CoveredBy':'ST_Intersects'}(m.geom, ST_GeomFromText($${paramIndex++}, 4326))`;
      params.push(req.searchScopeWkt||spatialResult.rows[0].union_geom_wkt);
    }

    // ✅ OPTIMIZED: Query với tất cả thông tin cần thiết
    // ✅ Tính diện tích từ geometry thay vì dùng field area (vì area = 0)
    // ✅ FIX: Dùng lowercase cho aliases hoặc quote chúng để tránh PostgreSQL auto-lowercase
    // ✅ FIX: Nếu limit=0 thì không giới hạn (dùng cho báo cáo)
    const limitClause = parsedLimit > 0 ? `LIMIT $${paramIndex}` : '';

    query = `
      SELECT
        m.gid,
        m.area,
        m.start_dau,
        m.end_dau,m.start_sau,
        m.end_sau,
        m.mahuyen,
        CONCAT('PH-', m.gid) as lo_canbao,
        ROUND(ST_X(ST_Centroid(m.geom))::numeric, 6) as x,
        ROUND(ST_Y(ST_Centroid(m.geom))::numeric, 6) as y,
        ST_Area(m.geom::geography) as dtich,
        m.verified_area as "dtichXM",
        m.verification_reason,
        m.detection_status,
        m.verification_notes,
        jsonb_build_object(
          'verified_by', metadata.value->'verified_by',
          'verified_by_name', metadata.value->'verified_by_name',
          'verified_at', metadata.value->'verified_at',
          'updated_at', metadata.value->'updated_at',
          'updated_by', metadata.value->'updated_by',
          'updated_by_name', metadata.value->'updated_by_name',
           'detection_date', metadata.value->'detection_date',
           'image_date', metadata.value->'image_date',
          'acquisition_date', metadata.value->'acquisition_date',
          'management_unit', metadata.value->'management_unit',
          'village', metadata.value->'village',
          'forest_origin', metadata.value->'forest_origin',
          'forest_function', metadata.value->'forest_function',
          'forest_type', metadata.value->'forest_type',
          'forest_owner', metadata.value->'forest_owner',
          'before_image_url', metadata.value->'before_image_url',
          'after_image_url', metadata.value->'after_image_url',
          'before_image_date',metadata.value->'before_image_date','after_image_date',metadata.value->'after_image_date'
        ) as detail_metadata,
        ST_AsGeoJSON(m.geom) as geometry,
        ST_AsText(ST_Centroid(m.geom)) as centroid_wkt
      FROM son_la_mat_rung m
      CROSS JOIN LATERAL (SELECT jsonb_build_object(
        'verified_by',m.verified_by,'verified_at',m.verified_at,
        'updated_at',m.updated_at,'updated_by',m.updated_by,'detection_date',m.detection_date,
        'before_image_url',m.before_image_url,'after_image_url',m.after_image_url,
        'before_image_date',m.before_image_date,'after_image_date',m.after_image_date
      ) AS value OFFSET 0) metadata
      ${whereClause}
      ORDER BY m.gid DESC
      ${limitClause}
    `;

    if (parsedLimit > 0) {
      params.push(parsedLimit);
    }

    const result = await db.query(query, params);

    logger.info(`Found ${result.rows.length} son_la_mat_rung records`);

    // ✅ OPTIMIZED: Get admin info for all results
    if (result.rows.length === 0) {
      return res.json({...formatResponse(true, 'No data found', {
        type: 'FeatureCollection',
        features: []
      }),...(revision||{})});
    }

    // Connect to admin_db for admin info lookup (if not already connected)
    if (!adminDb) {
      const { Pool } = require('pg');
      adminDb = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5433,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.ADMIN_DB_NAME || 'admin_db',
        max: 5,
        idleTimeoutMillis: 5000,
        connectionTimeoutMillis: 10000
      });
    }

    // ✅ OPTIMIZED: Batch query thay vì query từng record
    // Lấy tất cả centroids
    const centroids = result.rows.map(row => row.centroid_wkt);

    // Query admin info cho tất cả records trong 1 lần
    let adminInfoMap = {};

    if (centroids.length > 0) {
      try {
        // Tạo temporary table với centroids
        // ✅ FIX: JOIN với sonla_tkkl để lấy xa, tieukhu, khoanh
        // ✅ FIX: Fallback to sonla_rgx if sonla_tkkl misses
        const BATCH_SIZE = 1000;

        for (let i = 0; i < centroids.length; i += BATCH_SIZE) {
          const batchCentroids = centroids.slice(i, i + BATCH_SIZE);
          const tempTableQuery = `
              WITH centroids AS (
                SELECT
                  unnest(ARRAY[${batchCentroids.map((_, idx) => `$${idx + 1}::text`).join(',')}]) as point_wkt
              )
              SELECT
                COALESCE(tk.xa, rgx.xa) as xa,
                tk.tieukhu,
                tk.khoanh,
                c.point_wkt as centroid_key
              FROM centroids c
              LEFT JOIN sonla_tkkl tk
                ON ST_Intersects(tk.geom, ST_GeomFromText(c.point_wkt, 4326))
              LEFT JOIN sonla_rgx rgx 
                ON tk.xa IS NULL AND ST_Intersects(rgx.geom, ST_GeomFromText(c.point_wkt, 4326))
            `;

          const adminResult = await adminDb.query(tempTableQuery, batchCentroids);

          // Map kết quả theo centroid
          // ✅ FIX: Data trong sonla_tkkl đã là Unicode, KHÔNG cần convert
          adminResult.rows.forEach(row => {
            if (row.centroid_key) {
              const info = {
                huyen_name: null,
                xa_name: row.xa,
                tk: row.tieukhu,
                khoanh: row.khoanh
              };
              const previous=adminInfoMap[row.centroid_key];
              if(!previous)adminInfoMap[row.centroid_key]=info;
              else for(const key of ['xa_name','tk','khoanh'])if(previous[key]!==info[key])previous[key]=null;
            }
          });
        }

        logger.info(`Retrieved admin info for ${Object.keys(adminInfoMap).length} locations`);
      } catch (err) {
        logger.error('Failed to batch query admin info:', err.message);
      }
    }

    // ✅ Map kết quả với admin info
    let features = result.rows.map((row) => {
      const adminInfo = adminInfoMap[row.centroid_wkt] || {
        huyen_name: row.mahuyen,
        xa_name: null,
        tk: null,
        khoanh: null
      };

      return {
        type: 'Feature',
        geometry: JSON.parse(row.geometry),
        properties: {
          ...(row.detail_metadata || {}),
          gid: row.gid,
          area: row.area,
          start_dau: row.start_dau,
          end_dau:row.end_dau,start_sau:row.start_sau,
          end_sau: row.end_sau,
          mahuyen: row.mahuyen,
          xa: adminInfo.xa_name,
          lo_canbao: row.lo_canbao,
          tk: adminInfo.tk,
          khoanh: adminInfo.khoanh,
          x: row.x,
          y: row.y,
          dtich: row.dtich,
          dtichXM: row.dtichXM,
          verification_reason: row.verification_reason,
          detection_status: row.detection_status,
          verification_notes: row.verification_notes,
          xacminh: row.detection_status === 'Đã xác minh' ? 1 : 0,
          huyen_name: adminInfo.huyen_name,
          xa_name: adminInfo.xa_name
        }
      };
    });
    if(assignments)require('../management-units').attachManagementUnits(features,assignments.rows);
    if(req.resolveSearchNames){
      const ids=[...new Set(features.flatMap(f=>[f.properties.verified_by,f.properties.updated_by]).filter(Number.isInteger))];
      const names=await req.resolveSearchNames(ids),lookup=new Map(names.map(n=>[n.id,n.full_name]));
      for(const feature of features){const p=feature.properties;p.verified_by_name=p.verified_by_name||lookup.get(p.verified_by)||null;p.updated_by_name=p.updated_by_name||lookup.get(p.updated_by)||null;}
    }

    // ✅ FIX: Post-filter to remove boundary overlaps
    if (effectiveXa && !req.searchScopeWkt) {
      features = features.filter(f => f.properties.xa_name === effectiveXa);
    }
    if (forcedTk && !req.searchScopeWkt) features = features.filter(f => String(f.properties.tk ?? '') === forcedTk);
    if (forcedKhoanh && !req.searchScopeWkt) features = features.filter(f => String(f.properties.khoanh ?? '') === forcedKhoanh);
    if (includeForestFunctions === 'true') {
      await require('../forest-functions').attachForestFunctions(features, adminDb);
    }
    // Note: search params use 'huyen', 'xa', but properties map filtering.
    // 'req.query.xa' is mapped to 'effectiveXa'.
    // If user filtered by 'tk' or 'khoanh' (not currently in search params but good practice)
    // The search-service routes (lines 13) don't seem to extract tk/khoanh from req.query. 
    // Checking lines 13: const { q, status, fromDate, toDate, limit = 100, huyen, xa, xacMinh } = req.query;
    // Tk and Khoanh are NOT in req.query. 
    // However, if the user requested filtering by Xa, we must ensure the result is in that Xa.

    const geoJSON = {
      type: 'FeatureCollection',
      features
    };

    const response = formatResponse(true, `Found ${features.length} results`, geoJSON);
    if(revision){response.revision=revision.revision;response.accessKey=revision.accessKey;response.access=revision.access;}

    // ✅ Cache lâu hơn nếu không có search query động (nếu Redis available)
    if (redis) {
      const cacheTime = q ? 60 : 300; // 1 min nếu có search, 5 min nếu filter tĩnh
      await redis.set(cacheKey, response, cacheTime);
    }

    res.json(response);
  } catch (error) {
    logger.error('Error in searchMatRung:', error);
    next(error);
  } finally {
    // ✅ Đảm bảo đóng connection
    if (adminDb) {
      try {
        await adminDb.end();
      } catch (err) {
        logger.warn('Error closing admin_db pool:', err.message);
      }
    }
  }
};

// ✅ NEW: Search mat rung by ID with surrounding features
exports.searchMatRungById = async (req, res, next) => {
  let adminDb = null;

  try {
    const { id } = req.params;
    const { radius = 5000 } = req.query; // Default 5km radius

    const db = req.app.locals.db;
    const redis = req.searchActor ? null : req.app.locals.redis; // Detail is always fresh for authenticated scoped reads.

    // Validate ID
    if (!id || !/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || !Number.isFinite(Number(radius)) || Number(radius)<0 || Number(radius)>50000) {
      return res.status(400).json(
        formatResponse(false, 'Invalid GID parameter')
      );
    }

    const gid = parseInt(id);

    // ✅ Check cache nếu Redis available
    if (redis) {
      const cacheKey = `search:t10:id:${gid}:radius:${radius}:scope:${JSON.stringify(req.searchActor||{})}`;
      const cached = await redis.get(cacheKey);

      if (cached) {
        logger.info(`Cache hit for PH-${gid}`);
        return res.json({ ...cached, cached: true });
      }
    }

    logger.info(`Searching for PH-${gid} with radius ${radius}m`);

    // Step 1: Get target feature
    // ✅ FIX: Thêm dtich và dtichXM để tương thích với searchMatRung
    const targetQuery = `
      SELECT
        m.gid,
        m.area,
        m.start_dau,
        m.end_sau,
        m.mahuyen,
        m.detection_status,
        m.detection_date,
        m.verified_area,
        m.verified_by,
        m.verification_reason,
        m.verification_notes,
        ST_Area(m.geom::geography) as dtich,
        m.verified_area as "dtichXM",
        ROUND(ST_X(ST_Centroid(m.geom))::numeric, 6) as x,
        ROUND(ST_Y(ST_Centroid(m.geom))::numeric, 6) as y,
        ST_AsGeoJSON(ST_Transform(m.geom, 4326)) as geometry,
        ST_X(ST_Centroid(ST_Transform(m.geom, 4326))) as center_lng,
        ST_Y(ST_Centroid(ST_Transform(m.geom, 4326))) as center_lat,
        ST_XMin(ST_Envelope(ST_Transform(m.geom, 4326))) as bbox_xmin,
        ST_YMin(ST_Envelope(ST_Transform(m.geom, 4326))) as bbox_ymin,
        ST_XMax(ST_Envelope(ST_Transform(m.geom, 4326))) as bbox_xmax,
        ST_YMax(ST_Envelope(ST_Transform(m.geom, 4326))) as bbox_ymax
      FROM son_la_mat_rung m
      WHERE m.gid = $1 AND m.geom IS NOT NULL
      AND ($2::text IS NULL OR ST_CoveredBy(m.geom,ST_GeomFromText($2,4326)))
    `;

    const targetResult = await db.query(targetQuery, [gid,req.searchScopeWkt||null]);

    if (targetResult.rows.length === 0) {
      logger.warn(`PH-${gid} not found in database`);
      return res.status(404).json(
        formatResponse(false, `Không tìm thấy lô PH-${gid} trong cơ sở dữ liệu`)
      );
    }

    const targetRow = targetResult.rows[0];

    // Build target feature
    // ✅ FIX: Thêm dtich, dtichXM, x, y để tương thích với searchMatRung
    const targetFeature = {
      type: 'Feature',
      geometry: JSON.parse(targetRow.geometry),
      properties: {
        gid: targetRow.gid,
        area: targetRow.area,
        start_dau: targetRow.start_dau,
        end_sau: targetRow.end_sau,
        mahuyen: targetRow.mahuyen,
        detection_status: targetRow.detection_status,
        detection_date: targetRow.detection_date,
        verified_area: targetRow.verified_area,
        verified_by: targetRow.verified_by,
        verification_reason: targetRow.verification_reason,
        verification_notes: targetRow.verification_notes,
        dtich: targetRow.dtich, // ✅ Diện tích từ geometry
        dtichXM: targetRow.dtichXM, // ✅ Diện tích xác minh
        x: targetRow.x, // ✅ Tọa độ X
        y: targetRow.y, // ✅ Tọa độ Y
        isTarget: true // Mark as target for highlighting
      }
    };

    const center = {
      lat: parseFloat(targetRow.center_lat),
      lng: parseFloat(targetRow.center_lng)
    };

    const bbox = [
      [parseFloat(targetRow.bbox_ymin), parseFloat(targetRow.bbox_xmin)],
      [parseFloat(targetRow.bbox_ymax), parseFloat(targetRow.bbox_xmax)]
    ];

    logger.info(`Found PH-${gid} at [${center.lat}, ${center.lng}]`);

    // Step 2: Get surrounding features within radius
    // ✅ FIX: Thêm dtich, dtichXM, x, y để tương thích với searchMatRung
    const surroundingQuery = `
      SELECT
        m.gid,
        m.area,
        m.start_dau,
        m.end_sau,
        m.mahuyen,
        m.detection_status,
        m.detection_date,
        m.verified_area,
        m.verified_by,
        m.verification_reason,
        m.verification_notes,
        ST_Area(m.geom::geography) as dtich,
        m.verified_area as "dtichXM",
        ROUND(ST_X(ST_Centroid(m.geom))::numeric, 6) as x,
        ROUND(ST_Y(ST_Centroid(m.geom))::numeric, 6) as y,
        ST_AsGeoJSON(ST_Transform(m.geom, 4326)) as geometry,
        ST_Distance(
          ST_Transform(m.geom, 3857),
          (SELECT ST_Transform(geom, 3857) FROM son_la_mat_rung WHERE gid = $1)
        ) as distance
      FROM son_la_mat_rung m
      WHERE m.gid != $1
        AND m.geom IS NOT NULL
        AND ($3::text IS NULL OR ST_CoveredBy(m.geom,ST_GeomFromText($3,4326)))
        AND ST_DWithin(
          ST_Transform(m.geom, 3857),
          (SELECT ST_Transform(geom, 3857) FROM son_la_mat_rung WHERE gid = $1),
          $2
        )
      ORDER BY distance ASC
      LIMIT 50
    `;

    const surroundingResult = await db.query(surroundingQuery, [gid, parseFloat(radius),req.searchScopeWkt||null]);

    // ✅ FIX: Thêm dtich, dtichXM, x, y vào surroundingFeatures
    const surroundingFeatures = surroundingResult.rows.map(row => ({
      type: 'Feature',
      geometry: JSON.parse(row.geometry),
      properties: {
        gid: row.gid,
        area: row.area,
        start_dau: row.start_dau,
        end_sau: row.end_sau,
        mahuyen: row.mahuyen,
        detection_status: row.detection_status,
        detection_date: row.detection_date,
        verified_area: row.verified_area,
        verified_by: row.verified_by,
        verification_reason: row.verification_reason,
        verification_notes: row.verification_notes,
        dtich: row.dtich, // ✅ Diện tích từ geometry
        dtichXM: row.dtichXM, // ✅ Diện tích xác minh
        x: row.x, // ✅ Tọa độ X
        y: row.y, // ✅ Tọa độ Y
        distance: parseFloat(row.distance).toFixed(2),
        isTarget: false
      }
    }));

    logger.info(`Found ${surroundingFeatures.length} features within ${radius}m of PH-${gid}`);

    // ✅ Step 2.5: Get admin info for all features
    const allRows = [targetResult.rows[0], ...surroundingResult.rows];

    try {
      const { Pool } = require('pg');
      adminDb = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5433,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        database: process.env.ADMIN_DB_NAME || 'admin_db',
        max: 5,
        idleTimeoutMillis: 5000
      });

      const geometries = allRows.map(row => row.geometry);
      const placeholders = geometries.map((_, idx) => `$${idx + 1}`).join(',');

      // ✅ FIX: JOIN với sonla_tkkl để lấy xa, tieukhu, khoanh
      const adminQuery = `
        WITH geoms AS (
          SELECT
            unnest(ARRAY[${placeholders}])::text as geom_json,
            generate_series(1, ${geometries.length}) as idx
        )
        SELECT idx, tk.xa, tk.tieukhu, tk.khoanh
        FROM geoms g
        LEFT JOIN sonla_tkkl tk
          ON ST_Intersects(tk.geom, ST_SetSRID(ST_GeomFromGeoJSON(g.geom_json), 4326))
      `;

      const adminResult = await adminDb.query(adminQuery, geometries);
      const adminInfoMap = {};

      // ✅ FIX: Data trong sonla_tkkl đã là Unicode, KHÔNG cần convert
      adminResult.rows.forEach(row => {
        if (row.idx) {
          adminInfoMap[row.idx - 1] = {
            huyen_name: null, // Không có thông tin huyện trong sonla_tkkl
            xa_name: row.xa, // Đã là Unicode, không cần convert
            tk: row.tieukhu,
            khoanh: row.khoanh
          };
        }
      });

      // Add admin info to target feature
      const targetAdminInfo = adminInfoMap[0] || {};
      targetFeature.properties.huyen_name = targetAdminInfo.huyen_name;
      targetFeature.properties.xa_name = targetAdminInfo.xa_name;
      targetFeature.properties.tk = targetAdminInfo.tk;
      targetFeature.properties.khoanh = targetAdminInfo.khoanh;

      // Add admin info to surrounding features
      surroundingFeatures.forEach((feature, idx) => {
        const adminInfo = adminInfoMap[idx + 1] || {};
        feature.properties.huyen_name = adminInfo.huyen_name;
        feature.properties.xa_name = adminInfo.xa_name;
        feature.properties.tk = adminInfo.tk;
        feature.properties.khoanh = adminInfo.khoanh;
      });

      logger.info(`Added admin info for ${Object.keys(adminInfoMap).length} features`);
    } catch (err) {
      logger.error('Failed to get admin info:', err.message);
    }

    // Step 3: Combine all features (target first)
    const allFeatures = [targetFeature, ...surroundingFeatures];

    const geoJSON = {
      type: 'FeatureCollection',
      features: allFeatures
    };

    const response = formatResponse(
      true,
      `Tìm thấy PH-${gid} và ${surroundingFeatures.length} khu vực xung quanh`,
      {
        target_feature: targetFeature,
        geojson: geoJSON,
        center: center,
        bbox: bbox,
        total_features: allFeatures.length,
        radius: parseFloat(radius)
      }
    );

    // Cache for 5 minutes (nếu Redis available)
    if (redis) {
      const cacheKey = `search:t10:id:${gid}:radius:${radius}:scope:${JSON.stringify(req.searchActor||{})}`;
      await redis.set(cacheKey, response, 300);
    }

    res.json(response);

  } catch (error) {
    logger.error(`Error searching for mat rung by ID:`, error);
    next(error);
  } finally {
    if (adminDb) {
      try {
        await adminDb.end();
      } catch (err) {
        logger.warn('Error closing admin_db:', err.message);
      }
    }
  }
};

module.exports = exports;
