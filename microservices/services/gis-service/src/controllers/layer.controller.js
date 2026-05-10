// gis-service/src/controllers/layer.controller.js
const createLogger = require('../../../../shared/logger');
const { formatResponse } = require('../../../../shared/utils');
const { convertTcvn3ToUnicode } = require('../../../../shared/utils/tcvn3-converter');

const logger = createLogger('layer-controller');

// Map frontend layer names to database tables (Sơn La)
const layerMapping = {
  // New unified Sơn La forest layer (replaces 3 old layers)
  'hientrangrung': 'sonla_hientrangrung_new',
  // Deforestation alerts
  'deforestation-alerts': 'son_la_mat_rung',
  'matrung': 'son_la_mat_rung'
};

// ✅ FIX: Danh sách roles có toàn quyền xem dữ liệu (không cần filter theo khu vực)
const ADMIN_ROLES = ['Công ty Fis', 'Chi cục kiểm lâm', 'Admin', 'LanhDao'];

// Get layer data by path parameter (new endpoint for frontend)
exports.getLayerDataByPath = async (req, res, next) => {
  let adminDb = null;

  try {
    const { layerName } = req.params;
    const { format = 'geojson', days } = req.query;

    // ✅ DEBUG: Log all x-user headers
    logger.info('🔍 DEBUG - Headers received:', {
      layerName,
      'x-user-id': req.headers['x-user-id'],
      'x-user-username': req.headers['x-user-username'],
      'x-user-roles': req.headers['x-user-roles'],
      'x-user-xa': req.headers['x-user-xa'],
      'x-user-tieukhu': req.headers['x-user-tieukhu'],
      'x-user-khoanh': req.headers['x-user-khoanh'],
      'authorization': req.headers['authorization'] ? 'Bearer ***' : 'MISSING'
    });

    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    // Map layer name to table
    const tableName = layerMapping[layerName] || layerName;

    // ✅ FIX: Include user scope in cache key - phân biệt Admin/LanhDao vs restricted users
    const userXa = req.headers['x-user-xa'] ? decodeURIComponent(req.headers['x-user-xa']) : '';
    const userTk = req.headers['x-user-tieukhu'] ? decodeURIComponent(req.headers['x-user-tieukhu']) : '';
    const userKhoanh = req.headers['x-user-khoanh'] ? decodeURIComponent(req.headers['x-user-khoanh']) : '';

    // Xác định role để tạo cache key chính xác
    const userRolesForCache = req.headers['x-user-roles'] ? decodeURIComponent(req.headers['x-user-roles']).split(',').filter(r => r) : [];
    const isAdminOrLeaderForCache = userRolesForCache.some(role => ADMIN_ROLES.includes(role));

    let userScope;
    if (isAdminOrLeaderForCache) {
      userScope = 'admin';  // Admin/LanhDao share cache của toàn bộ data
    } else if (userXa || userTk || userKhoanh) {
      userScope = `scoped:${userXa}:${userTk}:${userKhoanh}`;  // User có scope cụ thể
    } else {
      userScope = 'noscope';  // Restricted user không có scope - cache riêng (sẽ trả về empty)
    }

    const cacheKey = `layer:${layerName}:${format}:${days || 'all'}:${userScope}`;

    // ✅ FIX: Nếu restricted user không có scope, trả về empty ngay (không cần query DB)
    if (userScope === 'noscope') {
      logger.warn('Restricted user without scope, returning empty immediately', {
        layerName,
        userId: req.headers['x-user-id']
      });
      const emptyResponse = formatResponse(
        true,
        `No data available - please contact admin to assign management area`,
        { type: 'FeatureCollection', features: [] },
        { layer: layerName, cached: false, noScope: true }
      );
      // Cache empty response for 5 minutes to avoid repeated queries
      await redis.set(cacheKey, emptyResponse, 300);
      return res.json(emptyResponse);
    }

    // Try cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info('Cache hit for layer data', { layerName, userScope });
      return res.json({
        ...cached,
        cached: true
      });
    }

    logger.info('Loading layer data from database', { layerName, tableName });

    // Check if table exists
    const tableCheckQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = $1
      )
    `;

    const tableExists = await db.query(tableCheckQuery, [tableName]);

    if (!tableExists.rows[0].exists) {
      logger.warn('Table does not exist', { tableName });
      return res.json(formatResponse(
        true,
        `Layer ${layerName} is not available yet`,
        { type: 'FeatureCollection', features: [] },
        { layer: layerName, cached: false, available: false }
      ));
    }

    // Build query with optional date filter
    let query;
    let queryParams = [];

    // ✅ Đặc biệt cho mat_rung (deforestation-alerts): Lấy đầy đủ properties + X,Y coordinates
    if (layerName === 'deforestation-alerts') {
      // ✅ FIX: Cho restricted users, dùng spatial join với admin_db để filter trực tiếp trong SQL
      // Điều này nhanh hơn nhiều so với load tất cả rồi filter trong JS
      const effectiveXa = req.headers['x-user-xa'] ? decodeURIComponent(req.headers['x-user-xa']) : null;
      const effectiveTk = req.headers['x-user-tieukhu'] ? decodeURIComponent(req.headers['x-user-tieukhu']) : null;
      const effectiveKhoanh = req.headers['x-user-khoanh'] ? decodeURIComponent(req.headers['x-user-khoanh']) : null;

      if (!isAdminOrLeaderForCache && effectiveXa) {
        // ✅ Query với spatial filter cho restricted user có xa
        // Bước 1: Lấy union geometry từ admin_db cho khu vực xa
        logger.info('Using spatial filter query for restricted user', { effectiveXa, effectiveTk, effectiveKhoanh });

        try {
          const { Pool } = require('pg');
          adminDb = new Pool({
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
            database: 'admin_db',
            max: 5,
            idleTimeoutMillis: 10000,
            connectionTimeoutMillis: 10000
          });

          // Lấy union geometry của tất cả khu vực trong xa
          let adminQuery = `
            SELECT ST_AsText(ST_Union(geom)) as union_geom
            FROM sonla_tkkl
            WHERE xa = $1
          `;
          const adminParams = [effectiveXa];

          if (effectiveTk) {
            adminQuery = `
              SELECT ST_AsText(ST_Union(geom)) as union_geom
              FROM sonla_tkkl
              WHERE xa = $1 AND tieukhu = $2
            `;
            adminParams.push(effectiveTk);
          }
          if (effectiveKhoanh) {
            adminQuery = `
              SELECT ST_AsText(ST_Union(geom)) as union_geom
              FROM sonla_tkkl
              WHERE xa = $1 AND tieukhu = $2 AND khoanh = $3
            `;
            adminParams.push(effectiveKhoanh);
          }

          const adminResult = await adminDb.query(adminQuery, adminParams);

          if (adminResult.rows[0]?.union_geom) {
            const unionGeomWKT = adminResult.rows[0].union_geom;

            // Bước 2: Query gis_db với spatial filter
            // ✅ FIX: Không set cố định xa/tk/khoanh từ user scope
            // enrichWithAdminInfo sẽ lookup chính xác cho từng điểm
            query = `
              SELECT
                gid,
                start_sau,
                area,
                start_dau,
                end_sau,
                mahuyen,
                end_dau,
                detection_status,
                detection_date,
                verified_by,
                verified_area,
                verification_reason,
                verification_notes,
                created_at,
                updated_at,
                COALESCE(NULLIF(clipped_area, 0), ST_Area(ST_Transform(ST_MakeValid(COALESCE(clipped_geom, geom)), 4326)::geography)) as dtich,
                COALESCE(verified_area, 0) as "dtichXM",
                ST_X(ST_Transform(ST_Centroid(COALESCE(clipped_geom, geom)), 4326)) as x_coordinate,
                ST_Y(ST_Transform(ST_Centroid(COALESCE(clipped_geom, geom)), 4326)) as y_coordinate,
                ST_X(ST_Transform(ST_Centroid(COALESCE(clipped_geom, geom)), 4326)) as x,
                ST_Y(ST_Transform(ST_Centroid(COALESCE(clipped_geom, geom)), 4326)) as y,
                ST_AsGeoJSON(ST_Transform(COALESCE(clipped_geom, geom), 4326)) as geometry
              FROM ${tableName}
              WHERE geom IS NOT NULL
                AND ST_Intersects(geom, ST_GeomFromText('${unionGeomWKT}', 4326))
            `;

            if (days) {
              query += ` AND end_sau::date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'`;
            }

            query += ' ORDER BY start_dau DESC LIMIT 5000';
            logger.info('Spatial filter query built successfully');

          } else {
            logger.warn('No geometry found for xa, returning empty', { effectiveXa });
            // Return empty response
            const emptyResponse = formatResponse(
              true,
              `No data available for area ${effectiveXa}`,
              { type: 'FeatureCollection', features: [] },
              { layer: layerName, cached: false }
            );
            return res.json(emptyResponse);
          }

        } catch (adminErr) {
          logger.error('Failed to get admin geometry:', adminErr.message);
          // Fallback: return empty for restricted user if admin query fails
          const emptyResponse = formatResponse(
            true,
            `Unable to filter by area - please try again`,
            { type: 'FeatureCollection', features: [] },
            { layer: layerName, cached: false, error: adminErr.message }
          );
          return res.json(emptyResponse);
        }

      } else {
        // ✅ Query đơn giản cho Admin/LanhDao hoặc user không có xa
        query = `
          SELECT
            gid,
            start_sau,
            area,
            start_dau,
            end_sau,
            mahuyen,
            end_dau,
            detection_status,
            detection_date,
            verified_by,
            verified_area,
            verification_reason,
            verification_notes,
            created_at,
            updated_at,
            COALESCE(NULLIF(clipped_area, 0), ST_Area(ST_Transform(ST_MakeValid(COALESCE(clipped_geom, geom)), 4326)::geography)) as dtich,
            COALESCE(verified_area, 0) as "dtichXM",
            ST_X(ST_Transform(ST_Centroid(COALESCE(clipped_geom, geom)), 4326)) as x_coordinate,
            ST_Y(ST_Transform(ST_Centroid(COALESCE(clipped_geom, geom)), 4326)) as y_coordinate,
            ST_X(ST_Transform(ST_Centroid(COALESCE(clipped_geom, geom)), 4326)) as x,
            ST_Y(ST_Transform(ST_Centroid(COALESCE(clipped_geom, geom)), 4326)) as y,
            ST_AsGeoJSON(ST_Transform(COALESCE(clipped_geom, geom), 4326)) as geometry,
            has_intersection
          FROM ${tableName}
          WHERE geom IS NOT NULL
            AND has_intersection IS NOT FALSE
        `;

        if (days) {
          query += ` AND start_dau::date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'`;
        }

        query += ' ORDER BY start_dau DESC LIMIT 5000';
      }

    } else {
      // Query mặc định cho các layer khác
      query = `
        SELECT
          gid,
          ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry
        FROM ${tableName}
        WHERE geom IS NOT NULL
        LIMIT 10000
      `;
    }

    const result = await db.query(query, queryParams);

    // ✅ FIX: Kiểm tra xem result đã có xa từ spatial filter query chưa
    // Nếu có thì không cần enrich thêm
    const alreadyHasAdminInfo = result.rows.length > 0 && result.rows[0].xa !== undefined;

    // ✅ FIX: Admin/LanhDao cũng cần admin info để hiển thị xa/tk/khoanh trong bảng
    // Chỉ skip nếu đã có từ spatial filter query
    const needsAdminInfo = !alreadyHasAdminInfo;

    // ✅ Nếu là deforestation-alerts VÀ cần admin info VÀ chưa có từ spatial filter
    if (layerName === 'deforestation-alerts' && result.rows.length > 0 && needsAdminInfo) {
      try {
        const { Pool } = require('pg');
        adminDb = new Pool({
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 5432,
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD,
          database: 'admin_db',
          max: 10,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 15000,
          statement_timeout: 120000  // 120s timeout cho query
        });

        // ✅ FIX: Sử dụng point-based lookup với x_coordinate, y_coordinate
        // Hiệu quả hơn nhiều so với ST_GeomFromGeoJSON
        const BATCH_SIZE = 100;
        const adminInfoMap = {};

        logger.info(`Starting admin info enrichment for ${result.rows.length} features`);
        const enrichStartTime = Date.now();

        for (let i = 0; i < result.rows.length; i += BATCH_SIZE) {
          const batch = result.rows.slice(i, i + BATCH_SIZE);
          const validPoints = [];
          const pointIndexMap = [];

          batch.forEach((row, batchIdx) => {
            // Sử dụng x_coordinate và y_coordinate đã query sẵn
            if (row.x_coordinate && row.y_coordinate &&
              !isNaN(row.x_coordinate) && !isNaN(row.y_coordinate)) {
              validPoints.push(`${row.x_coordinate},${row.y_coordinate}`);
              pointIndexMap.push(i + batchIdx);
            }
          });

          if (validPoints.length === 0) continue;

          const adminQuery = `
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
              COALESCE(t.xa, r.xa) as xa,
              t.tieukhu as tk,
              t.khoanh
            FROM input_points g
            LEFT JOIN sonla_tkkl t ON t.geom IS NOT NULL AND ST_Intersects(t.geom, g.pt)
            LEFT JOIN sonla_rgx r ON t.xa IS NULL AND r.geom IS NOT NULL AND ST_Intersects(r.geom, g.pt)
            WHERE g.pt IS NOT NULL
            ORDER BY g.idx
          `;

          try {
            const batchResult = await adminDb.query(adminQuery, [validPoints]);

            batchResult.rows.forEach(row => {
              if (row.idx && row.idx > 0 && row.idx <= pointIndexMap.length) {
                const originalIdx = pointIndexMap[row.idx - 1];
                adminInfoMap[originalIdx] = {
                  xa: row.xa,
                  tk: row.tk,
                  khoanh: row.khoanh
                };
              }
            });
          } catch (batchErr) {
            logger.warn(`Batch ${i}-${i + BATCH_SIZE} failed:`, batchErr.message);
          }
        }

        const enrichDuration = Date.now() - enrichStartTime;
        logger.info(`Admin info enriched: ${Object.keys(adminInfoMap).length}/${result.rows.length} records in ${enrichDuration}ms`);

        // Get usernames from auth_db
        const userIds = [...new Set(result.rows.map(r => r.verified_by).filter(id => id))];
        const userMap = {};

        if (userIds.length > 0) {
          try {
            const authDb = new Pool({
              host: process.env.DB_HOST || 'localhost',
              port: process.env.DB_PORT || 5433,
              user: process.env.DB_USER || 'postgres',
              password: process.env.DB_PASSWORD,
              database: 'auth_db',
              max: 3,
              idleTimeoutMillis: 3000
            });

            const userQuery = `SELECT id, username, email FROM "User" WHERE id = ANY($1::int[])`;
            const userResult = await authDb.query(userQuery, [userIds]);

            userResult.rows.forEach(user => {
              userMap[user.id] = user.username || user.email || `User ${user.id}`;
            });

            await authDb.end();
            logger.info(`Fetched ${userResult.rows.length} usernames from auth_db`);
          } catch (err) {
            logger.warn('Failed to fetch usernames:', err.message);
          }
        }

        // Merge admin info và username vào result
        result.rows = result.rows.map((row, idx) => {
          const adminInfo = adminInfoMap[idx] || {};
          return {
            ...row,
            xa: adminInfo.xa || null,
            tk: adminInfo.tk || null,
            khoanh: adminInfo.khoanh || null,
            verified_by_name: row.verified_by ? (userMap[row.verified_by] || null) : null
          };
        });

        logger.info(`Added admin info for ${Object.keys(adminInfoMap).length}/${result.rows.length} features`);
      } catch (err) {
        logger.error('Failed to get admin info for layer:', err.message);
      }
    }

    // ✅ FIX: Apply scope filtering based on user headers
    // Skip nếu đã filter trong spatial query (alreadyHasAdminInfo)
    const userRolesStr = req.headers['x-user-roles'] ? decodeURIComponent(req.headers['x-user-roles']) : '';
    const userRoles = userRolesStr.split(',').filter(r => r);
    // Sử dụng cùng ADMIN_ROLES constant
    const isRestricted = !userRoles.some(role => ADMIN_ROLES.includes(role));

    // ✅ FIX: Skip scope filter nếu đã filter bằng spatial query (result đã có xa)
    if (isRestricted && layerName === 'deforestation-alerts' && !alreadyHasAdminInfo) {
      const effectiveXa = req.headers['x-user-xa'] ? decodeURIComponent(req.headers['x-user-xa']) : null;
      const effectiveTk = req.headers['x-user-tieukhu'] ? decodeURIComponent(req.headers['x-user-tieukhu']) : null;
      const effectiveKhoanh = req.headers['x-user-khoanh'] ? decodeURIComponent(req.headers['x-user-khoanh']) : null;

      logger.info('Applying scope filter (post-query)', { effectiveXa, effectiveTk, effectiveKhoanh, isRestricted });

      // ✅ FIX: Nếu restricted user KHÔNG có bất kỳ scope nào → return empty data
      if (!effectiveXa && !effectiveTk && !effectiveKhoanh) {
        logger.warn('Restricted user without scope assigned, returning empty data', {
          userId: req.headers['x-user-id'],
          username: req.headers['x-user-username']
        });
        result.rows = [];  // Không cho phép xem data nếu chưa được gán khu vực quản lý
      } else {
        // Filter rows by user scope
        const originalCount = result.rows.length;
        result.rows = result.rows.filter(row => {
          if (effectiveXa && row.xa !== effectiveXa) return false;
          if (effectiveTk && row.tk !== effectiveTk) return false;
          if (effectiveKhoanh && row.khoanh !== effectiveKhoanh) return false;
          return true;
        });

        logger.info(`Scope filter applied: ${result.rows.length}/${originalCount} features after filtering`);
      }
    } else if (alreadyHasAdminInfo) {
      logger.info('Skipping post-query scope filter - already filtered via spatial query', { count: result.rows.length });
    }

    // Enrich so_lan, end_dau, start_sau từ bang_ke_xu_ly_anh
    // Match theo xa name + khoảng ngày: mat_rung.start_dau nằm trong [bk.start_dau, bk.end_sau]
    if (layerName === 'deforestation-alerts' && result.rows.length > 0) {
      try {
        const xaNames = [...new Set(result.rows.map(r => r.xa).filter(Boolean))];
        if (xaNames.length > 0) {
          const bangKeResult = await db.query(
            'SELECT ten_xa, so_lan, start_dau, end_dau, start_sau, end_sau FROM bang_ke_xu_ly_anh WHERE ten_xa = ANY($1) ORDER BY so_lan ASC',
            [xaNames]
          );

          // Group theo xa
          const bangKeByXa = {};
          bangKeResult.rows.forEach(r => {
            if (!bangKeByXa[r.ten_xa]) bangKeByXa[r.ten_xa] = [];
            bangKeByXa[r.ten_xa].push(r);
          });

          result.rows = result.rows.map(row => {
            const bangKeList = bangKeByXa[row.xa];
            if (!bangKeList || bangKeList.length === 0) return row;

            const rowStart = new Date(row.start_dau);

            // Tìm bang_ke bao hàm start_dau của mat_rung (lấy so_lan nhỏ nhất khớp)
            let matched = bangKeList.find(bk => {
              const bkStart = new Date(bk.start_dau);
              const bkEnd = new Date(bk.end_sau);
              return rowStart >= bkStart && rowStart <= bkEnd;
            });

            // Fallback: start_dau gần nhất
            if (!matched) {
              matched = bangKeList.reduce((prev, curr) => {
                const prevDiff = Math.abs(new Date(prev.start_dau) - rowStart);
                const currDiff = Math.abs(new Date(curr.start_dau) - rowStart);
                return currDiff < prevDiff ? curr : prev;
              });
            }

            return {
              ...row,
              so_lan: matched.so_lan ?? null,
              end_dau: matched.end_dau || row.end_dau || null,
              start_sau: matched.start_sau || row.start_sau || null,
            };
          });

          logger.info(`so_lan enriched by date-match: ${Object.keys(bangKeByXa).length} xa in bang_ke_xu_ly_anh`);
        }
      } catch (bangKeErr) {
        logger.warn('Failed to enrich so_lan from bang_ke_xu_ly_anh:', bangKeErr.message);
      }
    }

    const features = result.rows.map(row => {
      // Build properties object, loại bỏ geometry
      const properties = { ...row };
      delete properties.geometry;

      return {
        type: 'Feature',
        id: row.gid,
        geometry: JSON.parse(row.geometry),
        properties: properties
      };
    });

    const geoJSON = {
      type: 'FeatureCollection',
      features
    };

    const response = formatResponse(
      true,
      `Loaded ${features.length} features from ${layerName}`,
      geoJSON,
      { layer: layerName, format, cached: false }
    );

    // Cache for 1 hour
    await redis.set(cacheKey, response, 3600);

    res.json(response);

  } catch (error) {
    logger.error('Error loading layer data', { error: error.message });
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

// Get layer data with smart caching (legacy - query parameter)
exports.getLayerData = async (req, res, next) => {
  try {
    const { layer, format = 'geojson' } = req.query;

    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    const cacheKey = `layer:${layer}:${format}`;

    // Try cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.info('Cache hit for layer data', { layer });
      return res.json({
        ...cached,
        cached: true
      });
    }

    logger.info('Loading layer data from database', { layer });

    let query;
    let tableName;

    // Determine table based on layer (Sơn La)
    switch (layer) {
      case 'hientrangrung':
        tableName = 'sonla_hientrangrung';
        break;
      case 'ranhgioixa':
        tableName = 'sonla_rgx';
        break;
      case 'tieukukhoanh':
        tableName = 'sonla_tkkl';
        break;
      case 'matrung':
        tableName = 'son_la_mat_rung';
        break;
      default:
        tableName = layer;
    }

    // Build query
    query = `
      SELECT
        gid,
        ST_AsGeoJSON(ST_Transform(geom, 4326)) as geometry
      FROM ${tableName}
      WHERE geom IS NOT NULL
      LIMIT 10000
    `;

    const result = await db.query(query);

    const features = result.rows.map(row => ({
      type: 'Feature',
      id: row.gid,
      geometry: JSON.parse(row.geometry),
      properties: { gid: row.gid }
    }));

    const geoJSON = {
      type: 'FeatureCollection',
      features
    };

    const response = formatResponse(
      true,
      `Loaded ${features.length} features from ${layer}`,
      geoJSON,
      { layer, format, cached: false }
    );

    // Cache for 1 hour
    await redis.set(cacheKey, response, 3600);

    res.json(response);

  } catch (error) {
    next(error);
  }
};

// Get layer bounds
exports.getLayerBounds = async (req, res, next) => {
  try {
    const { layer } = req.params;

    const db = req.app.locals.db;
    const redis = req.app.locals.redis;

    const cacheKey = `layer:bounds:${layer}`;

    // Try cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    logger.info('Calculating layer bounds', { layer });

    let tableName;
    switch (layer) {
      case 'hientrangrung':
        tableName = 'sonla_hientrangrung';
        break;
      case 'ranhgioixa':
        tableName = 'sonla_rgx';
        break;
      case 'tieukukhoanh':
        tableName = 'sonla_tkkl';
        break;
      case 'matrung':
        tableName = 'son_la_mat_rung';
        break;
      default:
        tableName = layer;
    }

    const query = `
      SELECT
        ST_XMin(ST_Extent(ST_Transform(geom, 4326))) as minx,
        ST_YMin(ST_Extent(ST_Transform(geom, 4326))) as miny,
        ST_XMax(ST_Extent(ST_Transform(geom, 4326))) as maxx,
        ST_YMax(ST_Extent(ST_Transform(geom, 4326))) as maxy
      FROM ${tableName}
      WHERE geom IS NOT NULL
    `;

    const result = await db.query(query);
    const bounds = result.rows[0];

    const response = {
      success: true,
      bounds: {
        southwest: [bounds.minx, bounds.miny],
        northeast: [bounds.maxx, bounds.maxy]
      },
      bbox: [bounds.minx, bounds.miny, bounds.maxx, bounds.maxy]
    };

    // Cache for 24 hours
    await redis.set(cacheKey, response, 86400);

    res.json(response);

  } catch (error) {
    next(error);
  }
};

module.exports = exports;
