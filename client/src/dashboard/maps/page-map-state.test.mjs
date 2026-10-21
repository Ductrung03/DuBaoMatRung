import test from 'node:test';
import assert from 'node:assert/strict';
import {mapPageKey,shouldResetMapWork,freshMapPresentation} from './page-map-state.js';
test('switching map pages or leaving/reentering map tools resets work; same page does not',()=>{
  const pages=['/dashboard','/dashboard/dubaomatrung','/dashboard/quanlydulieu'];
  for(const a of pages)for(const b of pages)assert.equal(shouldResetMapWork(a,b),a!==b);
  assert.equal(mapPageKey('/dashboard/'),'/dashboard');assert.equal(mapPageKey('/dashboard/baocao'),null);
  assert.equal(shouldResetMapWork('/dashboard','/dashboard/baocao'),true);assert.equal(shouldResetMapWork('/dashboard/baocao','/dashboard'),true);assert.equal(shouldResetMapWork('/dashboard/baocao','/dashboard/quanlyrole'),false);
});
test('fresh working layers retain only basemap and source catalog, never a hidden/filter/selection state',()=>{
  const previous={base:'normal',detailsVisible:false,layers:{forest:false,boundaries:false,alerts:false,compartments:true,opacity:0,hiddenForestTypes:['HG1'],hiddenAlertStatuses:['pending'],hiddenAlertKinds:['processed'],forestTypeCatalog:['HG1','RTG'],forestCount:0}};
  const next=freshMapPresentation(previous);assert.equal(next.base,'normal');assert.equal(next.layers.forest,true);assert.equal(next.layers.boundaries,true);assert.equal(next.layers.alerts,true);assert.equal(next.layers.compartments,false);assert.equal(next.layers.opacity,.75);assert.equal(next.layers.labels,true);assert.deepEqual(next.layers.hiddenForestTypes,[]);assert.deepEqual(next.layers.hiddenAlertStatuses,[]);assert.deepEqual(next.layers.hiddenAlertKinds,[]);assert.equal(next.layers.forestTypeCatalog,previous.layers.forestTypeCatalog);assert.equal(next.layers.forestCount,0);assert.equal(next.detailsVisible,undefined);assert.equal(previous.layers.forest,false);
});
