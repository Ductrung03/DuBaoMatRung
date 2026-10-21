import test from 'node:test';
import assert from 'node:assert/strict';
import {FOREST_FILTER_GROUPS,matchesForestGroup} from './forest-filter-groups.js';
import {filterRows,normalizeFeatures,EMPTY_FILTERS} from '../monitoring/monitoring-data.js';
test('four original display groups filter actual intersected forest codes, retaining multiple memberships',()=>{
  assert.deepEqual(FOREST_FILTER_GROUPS.map(g=>g.label),['Rừng giàu','Rừng trồng','Đất trống','Lúa']);
  const row={forestTypeCodes:['HG1','RTN','DT1D','LKK']};for(const group of FOREST_FILTER_GROUPS)assert.ok(matchesForestGroup(row,group.value));
  assert.equal(matchesForestGroup({forestTypeCodes:['DKH']},'rice'),false);assert.equal(matchesForestGroup({forestTypeCodes:[]},'rich'),false);
});
test('forest type groups combine with commune/status, without changing original areas or geometry',()=>{
  const features=[{type:'Feature',geometry:{type:'Polygon',coordinates:[]},properties:{gid:1,xa:'Xã A',dtich:12345,forest_type_codes:['HG2','RTG','HG2'],detection_status:'Mới phát hiện'}},{type:'Feature',properties:{gid:2,xa:'Xã B',forest_type_codes:['DT2'],dtich:0}}];
  const rows=normalizeFeatures(features);assert.deepEqual(rows[0].forestTypeCodes,['HG2','RTG']);assert.deepEqual(filterRows(rows,{...EMPTY_FILTERS,forestKind:'rich',commune:'Xã A',status:'pending'}).map(r=>r.id),['1']);assert.equal(filterRows(rows,{...EMPTY_FILTERS,forestKind:'rich',commune:'Xã B'}).length,0);assert.equal(features[0].properties.dtich,12345);assert.equal(rows[1].area,0);
});
