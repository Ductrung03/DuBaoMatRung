import test from 'node:test';
import assert from 'node:assert/strict';
import {reportOutcome,reportOutcomeSeries,REPORT_OUTCOMES} from './report-outcomes.js';
test('three outcomes require explicit stored result, never workflow or positive verified area',()=>{
  assert.deepEqual(REPORT_OUTCOMES.map(item=>item.label),['Chưa xác định','Không phải mất rừng','Mất rừng']);
  assert.equal(reportOutcome({reason:' Mất rừng '}),'loss');assert.equal(reportOutcome({reason:'không phải mất rừng'}),'notLoss');
  for(const reason of [null,'','Cháy rừng','chưa xác định','nghi mất rừng'])assert.equal(reportOutcome({reason,status:'verified',verifiedArea:2}),'unknown');
});
test('pie and columns reconcile all filtered areas and zero/missing values without altering records',()=>{
  const rows=[{commune:'Xã A',code:'1',reason:'Mất rừng',area:2,verifiedArea:1},{commune:'Xã A',code:'2',reason:'không phải mất rừng',area:3,verifiedArea:0},{commune:'Xã B',code:'3',reason:null,area:4,verifiedArea:null},{commune:'Xã B',code:'4',reason:'Mất rừng',area:null,verifiedArea:null}];
  const before=JSON.stringify(rows),chart=reportOutcomeSeries(rows);
  assert.equal(chart.missing,1);assert.deepEqual(chart.totals.map(item=>item.area),[4,3,2]);assert.deepEqual(chart.bars,[{name:'Xã A',unknown:0,notLoss:3,loss:2},{name:'Xã B',unknown:4,notLoss:0,loss:0}]);
  const verified=reportOutcomeSeries(rows,'commune','verifiedArea');assert.equal(verified.missing,2);assert.equal(verified.bars.length,4);assert.equal(verified.totals[1].missing,0);assert.equal(verified.totals[2].area,1);assert.equal(JSON.stringify(rows),before);
  assert.deepEqual(reportOutcomeSeries([]).bars,[]);
});
