// Read-only spatial relationship, not a classification of the whole alert.
// Use the same table as the lookup WMS hientrangrung layer.
const SOURCE = 'admin_db.sonla_hientrangrung.malr3_qd32';
const { createHash } = require('crypto');
const relationCache = new Map();
let forestRevision = null;
const SQL = `
  WITH alerts AS (
    SELECT gid, ST_SetSRID(ST_GeomFromGeoJSON(geometry::text), 4326) AS geom
    FROM jsonb_to_recordset($1::jsonb) AS x(gid integer, geometry jsonb)
  )
  SELECT a.gid,
    array_agg(DISTINCT r.malr3_qd32::text ORDER BY r.malr3_qd32::text) FILTER (WHERE r.malr3_qd32 IS NOT NULL) AS codes,
    array_agg(DISTINCT r.ldlr_23 ORDER BY r.ldlr_23) FILTER (WHERE r.ldlr_23 IS NOT NULL) AS type_codes
  FROM alerts a
  JOIN sonla_hientrangrung r ON r.geom && a.geom
    AND ST_Relate(CASE WHEN ST_IsValid(r.geom) THEN r.geom ELSE ST_MakeValid(r.geom) END, a.geom, 'T********')
  WHERE r.malr3_qd32 IS NOT NULL OR r.ldlr_23 IS NOT NULL
  GROUP BY a.gid`;

async function attachForestFunctions(features, adminDb) {
  // Caller must pass only the alerts already authorized by currentAccess.
  const matches = new Map();
  const types = new Map();
  const polygons = features.filter(f => f.geometry && ['Polygon', 'MultiPolygon'].includes(f.geometry.type));
  const keys = new Map(), missing = [];
  if (polygons.length) {
    // Detect changes to the source without storing classifications in business tables.
    const revision = await adminDb.query({text:'SELECT count(*)::text AS count, max(gid)::text AS last_gid, sum(xmin::text::bigint)::text AS version FROM sonla_hientrangrung',query_timeout:20000});
    const nextRevision = JSON.stringify(revision.rows[0]);
    if (nextRevision !== forestRevision) { relationCache.clear(); forestRevision = nextRevision; }
  }
  for (const feature of polygons) {
    const gid = String(feature.properties.gid);
    const key = `${gid}:${createHash('sha256').update(JSON.stringify(feature.geometry)).digest('hex')}`;
    keys.set(gid,key);
    const cached = relationCache.get(key);
    if (cached && cached.expires > Date.now()) {matches.set(gid,cached.codes);types.set(gid,cached.types||[]);}
    else { relationCache.delete(key); missing.push(feature); }
  }
  const batches=[];
  for(let offset=0;offset<missing.length;offset+=100)batches.push(missing.slice(offset,offset+100).map(f=>({gid:f.properties.gid,geometry:f.geometry})));
  // Bound parallel spatial reads to four connections, never one query per alert.
  for(let offset=0;offset<batches.length;offset+=4)await Promise.all(batches.slice(offset,offset+4).map(async batch=>{
    const { rows } = await adminDb.query({ text: SQL, values: [JSON.stringify(batch)], query_timeout: 20000 });
    for (const row of rows) {matches.set(String(row.gid), [...new Set((row.codes || []).filter(c => c !== null).map(String))]);types.set(String(row.gid),[...new Set((row.type_codes||[]).filter(c=>c!==null).map(String))]);}
    for (const item of batch) {
      const gid=String(item.gid),codes=matches.get(gid)||[];
      matches.set(gid,codes);
      while(relationCache.size>=10000)relationCache.delete(relationCache.keys().next().value);
      relationCache.set(keys.get(gid),{codes,types:types.get(gid)||[],expires:Date.now()+600000});
    }
  }));
  for (const feature of features) {
    feature.properties.forest_function_codes = matches.get(String(feature.properties.gid)) || [];
    feature.properties.forest_function_source = SOURCE;
    feature.properties.forest_function_relation = 'polygon_interior_intersection';
    feature.properties.forest_type_codes=types.get(String(feature.properties.gid))||[];
    feature.properties.forest_type_source='admin_db.sonla_hientrangrung.ldlr_23';
    feature.properties.forest_type_relation='polygon_interior_intersection';
  }
}

module.exports = { SOURCE, SQL, attachForestFunctions };
