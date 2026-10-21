const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
test('GIS scope guard rejects ambiguous identifiers before querying or writing',async()=>{
  const access=require('../../gis-service/src/middleware/alert-access');
  const req={app:{locals:{db:{query(){throw Error('Database must not be reached');}}}}};
  for(const id of ['1e2','1.0','1abc',' 1 ','+1',0,null])await assert.rejects(access.ids(req,[id]),error=>error.statusCode===400);
});

function controller({ adminRows = [], cache = null } = {}) {
  const calls = { readKeys: [], writeKeys: [], queries: [], poolsClosed: 0 };
  const context = { exports: {}, module: { exports: {} }, process, console, require(name) {
    if (name.endsWith('/shared/utils')) return { formatResponse: (success, message, data) => ({ success, message, data }) };
    if (name.includes('tcvn3-converter')) return { convertTcvn3ToUnicode: text => text };
    if (name.endsWith('/shared/logger')) return () => ({ info() {}, warn() {}, error() {} });
    if (name === 'pg') return { Pool: class {
      async query(sql) {
        if (sql.includes('union_geom_wkt')) return { rows: [{ union_geom_wkt: 'POLYGON EMPTY' }] };
        return { rows: adminRows };
      }
      async end() { calls.poolsClosed++; }
    } };
    throw new Error(`Unexpected import: ${name}`);
  } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/controllers/search.controller.js'), 'utf8'), context);
  const req = { query: {}, headers: { 'x-user-roles': 'admin' }, app: { locals: {
    db: { async query(sql, params) { calls.queries.push({ sql, params }); return { rows: [] }; } },
    redis: { async get(key) { calls.readKeys.push(key); return cache; }, async set(key) { calls.writeKeys.push(key); } },
  } } };
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  const run = async () => { await context.exports.searchMatRung(req, res, error => { throw error; }); return res; };
  return { req, res, calls, run };
}

test('restricted account without commune fails closed before DB/cache', async () => {
  const c = controller(); c.req.headers['x-user-roles'] = 'User';
  await c.run();
  assert.equal(c.res.statusCode, 403);
  assert.equal(c.calls.queries.length, 0);
  assert.equal(c.calls.readKeys.length, 0);
});
test('limit validation rejects negatives and malformed integers', async () => {
  for (const limit of ['-1', 'NaN', '2.5', '100 OR 1=1']) {
    const c = controller(); c.req.query.limit = limit; await c.run();
    assert.equal(c.res.statusCode, 400);
  }
});
test('cache keys distinguish full report from limited search', async () => {
  const a = controller({ cache: { success: true } }); a.req.query.limit = '0'; await a.run();
  const b = controller({ cache: { success: true } }); b.req.query.limit = '100'; await b.run();
  assert.notEqual(a.calls.readKeys[0], b.calls.readKeys[0]);
});
test('cache keys use forced scope, not requested commune', async () => {
  const c = controller({ cache: { success: true } });
  c.req.headers = { 'x-user-roles': 'User', 'x-user-xa': encodeURIComponent('Xã A'), 'x-user-tieukhu': '150' };
  c.req.query.xa = 'Xã B'; await c.run();
  assert.ok(c.calls.readKeys[0].includes('Xã A'));
  assert.ok(!c.calls.readKeys[0].includes('Xã B'));
  assert.ok(c.calls.readKeys[0].includes('150'));
});
test('full query has no LIMIT; area and metadata stay separate', async () => {
  const c = controller(); c.req.query.limit = '0'; await c.run();
  assert.equal(c.res.statusCode, 200);
  const sql = c.calls.queries[0].sql;
  assert.ok(!sql.includes('LIMIT'));
  assert.ok(sql.includes('m.verified_area as "dtichXM"'));
  assert.ok(sql.includes('as detail_metadata'));
});
test('same cache key is used to read and write successful results', async () => {
  const c = controller({ adminRows: [{ centroid_key: 'POINT(103 21)', xa: 'Xã A', tieukhu: '150', khoanh: '2' }] });
  c.req.app.locals.db.query = async () => ({ rows: [{ gid: 1, centroid_wkt: 'POINT(103 21)', geometry: '{"type":"Point","coordinates":[103,21]}', detection_status: 'Đã xác minh', detail_metadata: { verified_by: 5 } }] });
  await c.run();
  assert.equal(c.calls.readKeys[0], c.calls.writeKeys[0]);
  assert.equal(c.res.body.data.features.length, 1);
  assert.equal(c.res.body.data.features[0].properties.verified_by, 5);
  assert.equal(c.calls.poolsClosed, 1);
});
test('subcompartment scope removes rows outside assigned scope', async () => {
  const c = controller({ adminRows: [{ centroid_key: 'POINT(103 21)', xa: 'Xã A', tieukhu: '150', khoanh: '2' }] });
  c.req.headers = { 'x-user-roles': 'User', 'x-user-xa': encodeURIComponent('Xã A'), 'x-user-tieukhu': '150', 'x-user-khoanh': '3' };
  c.req.app.locals.db.query = async () => ({ rows: [{ gid: 1, centroid_wkt: 'POINT(103 21)', geometry: '{"type":"Point","coordinates":[103,21]}' }] });
  await c.run();
  assert.equal(c.res.body.data.features.length, 0);
});

test('forest enrichment is opt-in, validated and isolated from legacy cached responses', async()=>{
  const invalid=controller();invalid.req.query.includeForestFunctions='yes';await invalid.run();assert.equal(invalid.res.statusCode,400);assert.equal(invalid.calls.queries.length,0);
  const a=controller({cache:{success:true}});a.req.query.includeForestFunctions='true';await a.run();
  const b=controller({cache:{success:true}});await b.run();assert.notEqual(a.calls.readKeys[0],b.calls.readKeys[0]);
});

test('spatial function enrichment batches every permitted polygon, retains multi-code/zero and never rewrites classification or geometry',async()=>{
  const {attachForestFunctions,SQL,SOURCE}=require('../src/forest-functions');
  const features=Array.from({length:250},(_,gid)=>({type:'Feature',geometry:{type:'Polygon',coordinates:[]},properties:{gid,dtich:12345,forest_function:null}}));
  const calls=[];
  await attachForestFunctions(features,{async query(config){if(!config.values)return {rows:[{count:'100',last_gid:'100',version:'1'}]};calls.push(config);return {rows:JSON.parse(config.values[0]).map(row=>({gid:row.gid,codes:['0','1','3','1'],type_codes:['HG1','RTG','HG1']}))};}});
  assert.equal(calls.length,3);assert.equal(calls.reduce((n,c)=>n+JSON.parse(c.values[0]).length,0),250);
  assert.deepEqual(features[0].properties.forest_function_codes,['0','1','3']);
  assert.deepEqual(features[0].properties.forest_type_codes,['HG1','RTG']);assert.equal(features[0].properties.forest_type_source,'admin_db.sonla_hientrangrung.ldlr_23');assert.ok(SQL.includes('r.ldlr_23'));
  assert.equal(features[0].properties.forest_function,null);assert.equal(features[0].properties.dtich,12345);assert.equal(features[0].properties.forest_function_source,SOURCE);
  assert.ok(SQL.includes('JOIN sonla_hientrangrung r'));assert.ok(!SQL.includes('sonla_hientrangrung_new'));assert.ok(SQL.includes("'T********'"));assert.ok(!SQL.includes('Centroid'));
});

test('scope filtering happens before spatial enrichment; layer source is the lookup WMS table',()=>{
  const search=fs.readFileSync(path.join(__dirname,'../src/controllers/search.controller.js'),'utf8');
  assert.ok(search.indexOf("if (forcedKhoanh && !req.searchScopeWkt)")<search.indexOf('attachForestFunctions(features, adminDb)'));
  const layers=fs.readFileSync(path.join(__dirname,'../src/controllers/layer.controller.js'),'utf8');
  assert.ok(layers.includes("forest?'sonla_hientrangrung':req.params.name==='compartments'?'sonla_tkkl':'sonla_rgx'"));assert.ok(!layers.includes('sonla_hientrangrung_new'));assert.ok(layers.includes('ST_CoveredBy'));
});

test('forest relations reuse original geometry matches and invalidate on forest revision or alert geometry changes',async()=>{
  const {attachForestFunctions}=require('../src/forest-functions');
  const rows=()=>[{geometry:{type:'Polygon',coordinates:[[[103,21],[104,21],[104,22],[103,21]]]},properties:{gid:900001}}];
  let revision='2',queries=0;
  const db={async query(config){if(!config.values)return {rows:[{count:'100',last_gid:'100',version:revision}]};queries++;return {rows:[{gid:900001,codes:['3']}]};}};
  await attachForestFunctions(rows(),db);await attachForestFunctions(rows(),db);assert.equal(queries,1);
  revision='3';await attachForestFunctions(rows(),db);assert.equal(queries,2);
  const changed=rows();changed[0].geometry.coordinates[0][0][0]=103.1;await attachForestFunctions(changed,db);assert.equal(queries,3);
});
