// server/controllers/smartLayerData.controller.js
const enhancedCache = require('../utils/enhancedCache');

exports.getForestTypesViewport = async (req, res) => {
  try {
    const { bbox, zoom } = req.query;
    
    // Parse viewport
    const [minX, minY, maxX, maxY] = bbox.split(',').map(Number);
    const zoomLevel = parseInt(zoom) || 8;
    
    // Cache key based on viewport and zoom
    const cacheKey = `forest_types_${minX}_${minY}_${maxX}_${maxY}_z${zoomLevel}`;
    
    // Check cache first
    let geojson = await enhancedCache.get(cacheKey);
    if (geojson) {
      return res.json(geojson);
    }

    // Determine geometry column and clustering based on zoom
    let geometryColumn, clusteringQuery, tolerance, limit;
    
    if (zoomLevel <= 9) {
      // Low zoom: Use clustered data
      clusteringQuery = `
        SELECT 
          ldlr,
          ST_AsGeoJSON(ST_Union(geom_simplified_low)) as geometry,
          COUNT(*) as feature_count,
          SUM(dtich) as total_area,
          huyen,
          'clustered' as data_type
        FROM laocai_rg3lr 
        WHERE geom_simplified_low && ST_MakeEnvelope($1, $2, $3, $4, 4326)
          AND ST_IsValid(geom_simplified_low)
          AND ldlr IS NOT NULL
        GROUP BY ldlr, huyen
        HAVING COUNT(*) > 5
      `;
      tolerance = 0.01;
      limit = 500;
    } else if (zoomLevel <= 12) {
      // Medium zoom: Simplified geometry
      geometryColumn = 'geom_simplified_medium';
      tolerance = 0.001;
      limit = 2000;
    } else {
      // High zoom: Full detail
      geometryColumn = 'geom_simplified_high';
      tolerance = 0.0001;
      limit = 5000;
    }

    let query, values;
    
    if (clusteringQuery) {
      query = clusteringQuery;
      values = [minX, minY, maxX, maxY];
    } else {
      query = `
        SELECT 
          gid, xa, tk, khoanh, lo, dtich, ldlr, churung, tinh, huyen,
          ST_AsGeoJSON(${geometryColumn}) as geometry,
          'individual' as data_type
        FROM laocai_rg3lr
        WHERE ${geometryColumn} && ST_MakeEnvelope($1, $2, $3, $4, 4326)
          AND ST_IsValid(${geometryColumn})
          AND ldlr IS NOT NULL
        ORDER BY dtich DESC
        LIMIT ${limit}
      `;
      values = [minX, minY, maxX, maxY];
    }

    const result = await pool.query(query, values);
    
    // Build GeoJSON
    const features = result.rows.map(row => ({
      type: "Feature",
      geometry: JSON.parse(row.geometry),
      properties: {
        ...row,
        geometry: undefined,
        forest_function: getForestFunction(row.ldlr),
        layer_type: row.data_type === 'clustered' ? 'forest_types_clustered' : 'forest_types_individual'
      }
    }));

    geojson = {
      type: "FeatureCollection",
      features,
      metadata: {
        viewport: { bbox, zoom: zoomLevel },
        load_strategy: 'viewport_optimized',
        feature_count: features.length,
        data_type: result.rows[0]?.data_type || 'none',
        cache_ttl: zoomLevel <= 9 ? 7200 : 3600 // 2h cho clustered, 1h cho detailed
      }
    };

    // Cache với TTL động
    const ttl = geojson.metadata.cache_ttl;
    await enhancedCache.set(cacheKey, geojson, ttl);

    console.log(`✅ Loaded ${features.length} forest features for viewport (zoom ${zoomLevel})`);
    res.json(geojson);

  } catch (error) {
    console.error('Error loading viewport forest data:', error);
    res.status(500).json({ error: error.message });
  }
};