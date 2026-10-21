import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { normalizeFeatures, filterRows, EMPTY_FILTERS, monthRange, summarizeCommunes, monthlySeries, reportRows, statusOf, sumArea, numberOrNull, isManager, forestFunctionOptions } from './monitoring-data.js';
import { forestLayerStyle } from '../maps/forest-layer-style.js';

const feature = (gid, properties = {}) => ({ type: 'Feature', geometry: null, properties: { gid, dtich: 10000, xa: 'Xã A', end_sau: '2026-10-15', detection_status: 'Chưa xác minh', ...properties } });

test('forest-function filter follows all intersected original codes without inventing one classification or area',()=>{
  const rows=normalizeFeatures([feature(1,{forest_function_codes:['1','3']}),feature(2,{forest_function_codes:['3']}),feature(3,{forest_function_codes:['0']}),feature(4)]);
  assert.deepEqual(forestFunctionOptions(rows).map(option=>option.value),['forest:0','forest:1','forest:3']);
  const matched=filterRows(rows,{...EMPTY_FILTERS,purpose:'forest:3'});
  assert.deepEqual(matched.map(row=>row.id),['1','2']);
  assert.equal(sumArea(matched),2);
  assert.equal(matched[0].purpose,null);
  assert.equal(matched[0].feature.properties.dtich,10000);
  assert.equal(filterRows(rows,{...EMPTY_FILTERS,purpose:'forest:0'}).length,1);
  assert.equal(filterRows(rows,{...EMPTY_FILTERS,purpose:'forest:2'}).length,0);
});

test('scoped forest rendering uses lookup WMS colors, including opacity zero and unknown class',()=>{
  const style=forestLayerStyle({properties:{ldlr_23:'HG1'}},.6);
  assert.equal(style.fillColor,'rgb(0,130,0)');
  assert.equal(style.fillOpacity,.54);
  assert.equal(forestLayerStyle({properties:{ldlr_23:'DT1D'}},0).fillOpacity,0);
  assert.equal(forestLayerStyle({properties:{ldlr_23:'unmapped'}}).fillColor,'rgb(220,220,220)');
});

test('shared boundary filters combine commune, compartment and subcompartment without truncating to 100',()=>{
  const rows=normalizeFeatures(Array.from({length:350},(_,i)=>feature(i,{tk:i<300?'12':'13',khoanh:i<250?'1':'2'})));
  const filtered=filterRows(rows,{...EMPTY_FILTERS,commune:'Xã A',compartment:'12',subcompartment:'1'});
  assert.equal(filtered.length,250);
  assert.equal(sumArea(filtered),250);
  assert.equal(filterRows(rows,{...EMPTY_FILTERS,commune:'Xã B'}).length,0);
  assert.equal(filterRows(rows,{...EMPTY_FILTERS,compartment:'13',subcompartment:'1'}).length,0);
});

test('overview is the dashboard home; surveillance groups forecast and imagery without granting permissions',()=>{
  const source=fs.readFileSync(new URL('../layout/navigation.js',import.meta.url),'utf8').replace(/^import .*$/m,'').replaceAll('export ','');
  const nav=vm.runInNewContext(source+';({navigationItems,canOpenPage,isNavigationActive,isWorkspacePage})',Object.fromEntries(['FaHome','FaTree','FaSearch','FaChartBar','FaUsers','FaUserShield'].map(name=>[name,name])));
  assert.equal(nav.navigationItems[0].path,'/dashboard');
  assert.equal(nav.navigationItems[0].label,'Tổng quan');
  const surveillance=nav.navigationItems.find(item=>item.pageKey==='surveillance');
  assert.deepEqual(Array.from(surveillance.children,child=>child.path),['/dashboard/dubaomatrung','/dashboard/phathienmatrung?tool=imagery']);
  assert.equal(nav.isNavigationActive(nav.navigationItems[0],'/dashboard/dubaomatrung'),false);
  assert.equal(nav.isNavigationActive(surveillance,'/dashboard/phathienmatrung'),true);
  assert.equal(nav.isWorkspacePage('/dashboard/'),true);
  assert.equal(nav.isWorkspacePage('/dashboard/phathienmatrung'),false);
  assert.equal(nav.isWorkspacePage('/dashboard/quanlynguoidung'),true);
  assert.equal(nav.isWorkspacePage('/dashboard/quanlynguoidung/'),true);
  assert.equal(nav.isWorkspacePage('/dashboard/quanlyrole'),true);
  assert.equal(nav.isWorkspacePage('/dashboard/quanlyrole/'),true);
  assert.equal(nav.isWorkspacePage('/dashboard/quanlydulieu'),false);
  assert.equal(nav.isWorkspacePage('/dashboard/dubaomatrung'),false);
  const reader={permissions:['data_management.forecast_search']};
  assert.equal(nav.canOpenPage(reader,false,'monitoring'),true);
  assert.equal(nav.canOpenPage(reader,false,'surveillance'),false);
  assert.equal(nav.canOpenPage({permissions:['forecast.auto']},false,'surveillance'),true);
  assert.equal(nav.canOpenPage({permissions:['forecast.auto']},false,'detection'),false);
});

test('HTML preflight accepts valid UTF-8 base64url JWT payload and rejects expired token',()=>{
  const source=fs.readFileSync(new URL('../../../index.html',import.meta.url),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
  function run(exp){const payload=Buffer.from(JSON.stringify({roles:['Chi cục kiểm lâm'],note:'\u083f\uffff',exp})).toString('base64url');const data=new Map([['token',`header.${payload}.signature`],['user','{}']]);vm.runInNewContext(source,{localStorage:{getItem:k=>data.get(k),removeItem:k=>data.delete(k)},atob,Uint8Array,TextDecoder,Date,console:{log(){},error(){}}});return data;}
  assert.ok(run(Math.floor(Date.now()/1000)+3600).has('token'));
  assert.equal(run(1).has('token'),false);
});

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
test('current production states are classified without rewriting database values',()=>{
  assert.equal(statusOf({detection_status:'Mới phát hiện'}),'pending');
  assert.equal(statusOf({detection_status:'Đang xác minh'}),'processing');
  assert.equal(statusOf({detection_status:'Đã xử lý'}),'verified');
  const source=feature(10,{detection_status:'Mới phát hiện'});
  assert.equal(normalizeFeatures([source])[0].rawStatus,'Mới phát hiện');
  assert.equal(source.properties.detection_status,'Mới phát hiện');
});
test('image period labels preserve independent before/after acquisition metadata',()=>{
  const [row]=normalizeFeatures([feature(1,{before_image_date:'2026-09-10',after_image_date:'2026-10-10',end_sau:'2026-10-15'})]);
  assert.equal(row.beforeImageDate,'2026-09-10');assert.equal(row.afterImageDate,'2026-10-10');assert.equal(row.imageDate,'2026-10-10');assert.notEqual(row.periodDate,row.imageDate);
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
  assert.equal(isManager({roles:[{name:'Công ty Fis'}]}),true);
  assert.equal(isManager({roles:[{name:'Chi cục kiểm lâm'}]}),true);
  assert.equal(isManager({roles:[{name:'Hạt kiểm lâm'}]}),false);
  assert.equal(isManager({ username: 'Admin', roles: [] }), false);
  assert.equal(isManager({ roles: [{ name: 'LanhDao' }] }), true);
  assert.equal(isManager({ userRoles: [{ role: { name: 'Admin' } }] }), true);
});
