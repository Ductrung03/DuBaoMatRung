import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MAP_MAX_ZOOM } from './map-zoom.js';
test('shared map and both basemap tile layers use the same zoom ceiling',()=>{
  assert.equal(MAP_MAX_ZOOM,18);
  const map=readFileSync(new URL('../monitoring/MonitoringMap.jsx',import.meta.url),'utf8');
  const base=readFileSync(new URL('./MapBasemap.jsx',import.meta.url),'utf8');
  assert.match(map,/maxZoom=\{MAP_MAX_ZOOM\}/);
  assert.equal((base.match(/maxZoom=\{MAP_MAX_ZOOM\}/g)||[]).length,2);
  assert.equal((base.match(/maxNativeZoom=\{MAP_MAX_ZOOM\}/g)||[]).length,2);
});
