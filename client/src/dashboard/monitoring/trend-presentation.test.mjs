import test from 'node:test';
import assert from 'node:assert/strict';
import {presentTrend} from './trend-presentation.js';
import {verificationPercent} from './verification-progress.js';
test('trend cell omits period but preserves source period in tooltip; decrease green and increase red',()=>{
 assert.deepEqual(presentTrend('2026-05 / 2026-04: Giảm 23,9%'),{text:'Giảm 23,9%',tone:'decrease',title:'2026-05 / 2026-04'});
 assert.equal(presentTrend('2026-05 / 2026-04: Tăng 10%').tone,'increase');assert.equal(presentTrend('Chỉ có một tháng').text,'—');
});
test('verification ratios preserve zero and the strict greater-than-80 green threshold',()=>{
 assert.equal(verificationPercent(0,685),0);assert.equal(verificationPercent(80,100),80);assert.ok(verificationPercent(81,100)>80);assert.equal(verificationPercent(100,100),100);assert.equal(verificationPercent(0,0),0);
});
