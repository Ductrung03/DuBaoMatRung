import test from 'node:test';
import assert from 'node:assert/strict';
import { FOREST_COLOR_CODES,forestColorHidden,toggleForestColor,visibleForestTypes,alertColorKind } from './forest-color-visibility.js';
test('individual colors retain all other catalog entries, aliases/case and unknown classes',()=>{
  const layers={forest:true,forestTypeCatalog:['HG1','HG2','dt1','DT1D','NND','__missing__','LKP'],hiddenForestTypes:[]};
  const hidden=toggleForestColor(layers,'HG1');assert.equal(forestColorHidden(hidden,'HG1'),true);assert.equal(forestColorHidden(hidden,'HG2'),false);
  assert.deepEqual(visibleForestTypes(hidden),layers.forestTypeCatalog.slice(1));assert.deepEqual(visibleForestTypes(layers),null);assert.deepEqual(layers.hiddenForestTypes,[]);
  assert.deepEqual(visibleForestTypes(toggleForestColor(hidden,'HG1')),null);
  const aliases=toggleForestColor(layers,'DT1');assert.deepEqual(visibleForestTypes(aliases),['HG1','HG2','NND','__missing__','LKP']);
  assert.ok(!visibleForestTypes(toggleForestColor(layers,'DNN')).includes('NND'));
});
test('all original legend colors toggle independently without changing forest master visibility or opacity',()=>{
  const initial={forest:false,opacity:0,forestTypeCatalog:Object.keys(FOREST_COLOR_CODES)};let layers=initial;
  for(const code of Object.keys(FOREST_COLOR_CODES))layers=toggleForestColor(layers,code);
  assert.deepEqual(visibleForestTypes(layers),[]);assert.equal(layers.forest,false);assert.equal(layers.opacity,0);
  for(const code of Object.keys(FOREST_COLOR_CODES))layers=toggleForestColor(layers,code);
  assert.equal(visibleForestTypes(layers),null);assert.equal(toggleForestColor(initial,'not-a-code'),initial);
});
test('processed and verified legend swatches remain separate display controls, never rewriting record states',()=>{
  const row={status:'verified',rawStatus:'Đã xử lý'};assert.equal(alertColorKind(row),'processed');assert.equal(alertColorKind({...row,rawStatus:'Đã xác minh'}),'verified');assert.equal(row.rawStatus,'Đã xử lý');
});
