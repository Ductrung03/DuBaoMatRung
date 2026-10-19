import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeFeatures, filterRows, EMPTY_FILTERS, monthRange, summarizeCommunes, monthlySeries, reportRows, statusOf, sumArea, numberOrNull, isManager } from './monitoring-data.js';

const feature = (gid, properties = {}) => ({ type: 'Feature', geometry: null, properties: { gid, dtich: 10000, xa: 'Xã A', end_sau: '2026-10-15', detection_status: 'Chưa xác minh', ...properties } });

test('square metres become hectares, missing verified area does not fall back', () => {
  const [row] = normalizeFeatures([feature(1)]);
  assert.equal(row.area, 1);
  assert.equal(row.verifiedArea, null);
});
test('verified zero is real data; null and empty are missing', () => {
  assert.equal(normalizeFeatures([feature(1, { dtichXM: 0 })])[0].verifiedArea, 0);
  assert.equal(numberOrNull(''), null);
  assert.equal(numberOrNull(null), null);
  assert.equal(numberOrNull('bad'), null);
});
test('remove only duplicate identifiers, not overlapping records', () => {
  assert.equal(normalizeFeatures([feature(1), feature(1), feature(2)]).length, 2);
});
test('do not invent identifiers for missing IDs', () => {
  const [row] = normalizeFeatures([{ properties: {} }]);
  assert.equal(row.id, null);
  assert.equal(row.code, null);
});
test('status mapping is explicit and unknown stays unknown', () => {
  assert.equal(statusOf({ detection_status: 'Đã xác minh' }), 'verified');
  assert.equal(statusOf({ detection_status: 'Đang xử lý' }), 'processing');
  assert.equal(statusOf({ detection_status: 'Đã nộp biên bản' }), 'unknown');
  assert.equal(statusOf({}), 'unknown');
});
test('date, commune, status, cause and search filters combine', () => {
  const rows = normalizeFeatures([feature(1, { verification_reason: 'Cháy' }), feature(2, { xa: 'Xã B' }), feature(3, { end_sau: '2026-09-01' })]);
  const found = filterRows(rows, { ...EMPTY_FILTERS, from: '2026-10-01', to: '2026-10-31', commune: 'Xã A', status: 'pending', reason: 'Cháy', query: 'PH-1' });
  assert.deepEqual(found.map(row => row.id), ['1']);
});
test('missing dates are excluded from time filters', () => {
  assert.equal(filterRows(normalizeFeatures([feature(1, { end_sau: null })]), { ...EMPTY_FILTERS, from: '2026-01-01' }).length, 0);
});
test('unverified report combines pending and processing, not unknown', () => {
  const rows = normalizeFeatures([feature(1), feature(2, { detection_status: 'Đang xử lý' }), feature(3, { detection_status: 'Khác' }), feature(4, { detection_status: 'Đã xác minh' })]);
  assert.deepEqual(filterRows(rows, { ...EMPTY_FILTERS, status: 'unverified' }).map(row => row.id), ['1', '2']);
});
test('calendar month supports leap year and rejects bad input', () => {
  assert.deepEqual(monthRange('2024-02'), { from: '2024-02-01', to: '2024-02-29' });
  assert.equal(monthRange('2026-13'), null);
  assert.equal(monthRange(''), null);
});
test('manager table groups by commune and management unit', () => {
  const groups = summarizeCommunes(normalizeFeatures([feature(1), feature(2, { detection_status: 'Đã xác minh' }), feature(3, { management_unit: 'Đơn vị B' })]));
  assert.equal(groups.length, 2);
  assert.equal(groups[0].count, 2);
  assert.equal(groups[0].verified, 1);
});
test('monthly series includes processing and unknown without pretending verified', () => {
  const series = monthlySeries(normalizeFeatures([feature(1), feature(2, { detection_status: 'Đang xử lý' }), feature(3, { detection_status: 'Khác' })]));
  assert.equal(series[0].pending, 1);
  assert.equal(series[0].processing, 1);
  assert.equal(series[0].unknown, 1);
});
test('province report cause totals reconcile with source area', () => {
  const rows = normalizeFeatures([feature(1, { verification_reason: 'Cháy' }), feature(2), feature(3, { xa: 'Xã B', dtich: 25000 })]);
  const grouped = reportRows(rows, 'province', 'area');
  assert.equal(grouped.reduce((sum, row) => sum + row.area, 0), sumArea(rows));
  assert.equal(grouped.reduce((sum, row) => sum + row.count, 0), rows.length);
  assert.ok(grouped.some(row => row.reason === 'Chưa xác định nguyên nhân'));
});
test('commune report remains one row per record and preserves missing verified area', () => {
  const entries = reportRows(normalizeFeatures([feature(1), feature(2, { dtichXM: 15000 })]), 'commune', 'verifiedArea');
  assert.equal(entries.length, 2);
  assert.equal(entries[0].area, null);
  assert.equal(entries[1].area, 1.5);
});
test('period end date is not represented as image acquisition date', () => {
  const [row] = normalizeFeatures([feature(1)]);
  assert.equal(row.imageDate, null);
  assert.equal(row.periodDate, '2026-10-15');
  assert.match(row.coordinateSource, /không phải tọa độ hiện trường/);
});
test('presentation role is exact, not guessed from username', () => {
  assert.equal(isManager({ username: 'Admin', roles: [] }), false);
  assert.equal(isManager({ roles: [{ name: 'LanhDao' }] }), true);
  assert.equal(isManager({ userRoles: [{ role: { name: 'Admin' } }] }), true);
});
