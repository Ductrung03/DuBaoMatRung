import test from 'node:test';
import assert from 'node:assert/strict';
import { alertCountSeries,forestOriginGroup } from './overview-statistics.js';
import { filterRows,EMPTY_FILTERS } from './monitoring-data.js';
const row=(id,status,origin,dates={start_dau:'2025-01-01',end_dau:'2025-01-15',start_sau:'2026-01-01',end_sau:'2026-01-15'})=>({id,status,origin,periodDate:dates.end_sau,area:100,commune:'Xã A',village:id===1?'Bản A':'Bản B',compartment:id===1?'1':'2',feature:{properties:dates}});
test('count charts partition real alerts, not hectares; missing dates never become zero months',()=>{
  const rows=[row(1,'pending','Tự nhiên'),row(2,'processing','Trồng'),row(3,'verified',null),{...row(4,'unknown',null),periodDate:null}];
  const {series,missing}=alertCountSeries(rows);assert.equal(series.length,1);assert.equal(series[0].total,3);assert.equal(series[0].unverified,2);assert.equal(series[0].verified,1);assert.equal(series[0].unknown,0);assert.equal(missing,1);
});
test('image periods use complete four-date tuples, not repeated import counts or only end date',()=>{
  const rows=[row(1,'pending',null),row(2,'verified',null,{start_dau:'2025-01-02',end_dau:'2025-01-15',start_sau:'2026-01-01',end_sau:'2026-01-15'}),row(3,'unknown',null,{end_sau:'2026-01-15'})];
  const {series,missing}=alertCountSeries(rows,'period');assert.equal(series.length,2);assert.equal(missing,1);assert.equal(series.reduce((n,g)=>n+g.total,0),2);
});
test('forest-origin filters accept explicit source names, never infer from conflicting codes',()=>{
  assert.equal(forestOriginGroup('Rừng tự nhiên'),'natural');assert.equal(forestOriginGroup('Trồng'),'planted');for(const code of [1,2,3,'TXN','HG1',null])assert.equal(forestOriginGroup(code),null);
  const rows=[{...row(1,'pending','Tự nhiên'),forestTypeCodes:['HG1']},{...row(2,'processing','Trồng'),forestTypeCodes:['RTG']},row(3,'verified',null)];
  assert.deepEqual(filterRows(rows,{...EMPTY_FILTERS,forestKind:'rich',village:'Bản A',compartment:'1'}).map(r=>r.id),[1]);assert.equal(filterRows(rows,{...EMPTY_FILTERS,forestKind:'planted',status:'verified'}).length,0);assert.equal(rows.length,3);
});
