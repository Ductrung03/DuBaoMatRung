import test from 'node:test';
import assert from 'node:assert/strict';
import {territoryTrends} from './territory-trends.js';
import {EMPTY_FILTERS,normalizeFeatures} from './monitoring-data.js';
const rows=items=>normalizeFeatures(items.map(([id,month,area,commune='Xã A',unit='Hạt A'])=>({type:'Feature',geometry:null,properties:{gid:id,end_sau:month+'-15',dtich:area===null?null:area*10000,xa:commune,management_unit:unit,detection_status:'Mới phát hiện'}})));
const key=JSON.stringify(['Xã A','Hạt A']);
test('trend skips empty months and compares actual monthly areas, not cumulative group total',()=>{
 const result=territoryTrends(rows([[1,'2026-01',100],[2,'2026-03',10],[3,'2026-08',15]]),EMPTY_FILTERS).get(key);
 assert.equal(result,'2026-08 / 2026-03: Tăng 50%');
});
test('trends remain scoped per territory/unit; a time selection still finds its preceding data month',()=>{
 const data=rows([[1,'2026-01',20],[2,'2026-03',10],[3,'2026-08',30],[4,'2026-03',900,'Xã B'],[5,'2026-01',800,'Xã A','Hạt B']]);
 assert.equal(territoryTrends(data,{...EMPTY_FILTERS,from:'2026-03-01',to:'2026-03-31'}).get(key),'2026-03 / 2026-01: Giảm 50%');
 assert.equal(territoryTrends(data,{...EMPTY_FILTERS,unit:'Hạt A',commune:'Xã A'}).size,1);
});
test('no invented predecessor, null area or percent division by zero',()=>{
 assert.match(territoryTrends(rows([[1,'2026-08',4]]),EMPTY_FILTERS).get(key),/chỉ có cảnh báo kỳ kết thúc tháng 2026-08/);
 assert.equal(territoryTrends(rows([[1,'2026-03',null],[2,'2026-08',4]]),EMPTY_FILTERS).get(key),'2026-08 / 2026-03: Thiếu diện tích');
 assert.equal(territoryTrends(rows([[1,'2026-03',0],[2,'2026-08',4]]),EMPTY_FILTERS).get(key),'2026-08 / 2026-03: Phát sinh mới (kỳ trước 0 ha)');
});
