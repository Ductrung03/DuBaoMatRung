const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

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
