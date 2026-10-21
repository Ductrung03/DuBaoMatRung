import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {clampImageView,comparisonImageUrl,imageExportSize,MIN_IMAGE_ZOOM,MAX_IMAGE_ZOOM} from './image-viewport.js';
test('image zoom/pan is bounded and resetting fits the original frame',()=>{
  assert.deepEqual(clampImageView(10,100,-100),{zoom:3,x:1,y:-1});
  assert.equal(MIN_IMAGE_ZOOM,1);assert.equal(MAX_IMAGE_ZOOM,3);assert.deepEqual(clampImageView(.25,2,-2),{zoom:1,x:0,y:0});
  assert.deepEqual(clampImageView(NaN,NaN,Infinity),{zoom:1,x:0,y:0});
  assert.deepEqual(clampImageView(2,.1,-.2),{zoom:2,x:.1,y:-.2});
});
test('higher output sizes preserve raster/date/footprint/render settings and only touch owned image exports',()=>{
  assert.equal(imageExportSize(1),1280);assert.equal(imageExportSize(2),1920);assert.equal(imageExportSize(4),1920);
  const original='https://sentinel.arcgis.com/arcgis/rest/services/Sentinel2/ImageServer/exportImage?bbox=1,2,3,4&size=640,640&mosaicRule=locked&renderingRule=dra&interpolation=RSP_CubicConvolution';
  const a=new URL(original),b=new URL(comparisonImageUrl(original,1920));assert.equal(b.searchParams.get('size'),'1920,1920');
  for(const key of ['bbox','mosaicRule','renderingRule','interpolation'])assert.equal(b.searchParams.get(key),a.searchParams.get(key));
  assert.equal(new URL(comparisonImageUrl(original,9999)).searchParams.get('size'),'640,640');
  assert.equal(comparisonImageUrl('https://example.com/image.png?size=640',1920),'https://example.com/image.png?size=640');
  assert.equal(comparisonImageUrl('javascript:alert(1)'),null);assert.equal(comparisonImageUrl(null),null);
});
test('image controls are interaction-only: no toolbar is required and zoom remains bounded',()=>{
  const source=readFileSync(new URL('./ImageComparison.jsx',import.meta.url),'utf8');
  assert.match(source,/addEventListener\('wheel',wheel,\{passive:false\}\)/);assert.match(source,/onKeyDown=\{onKeyDown\}/);assert.match(source,/event\.ctrlKey\|\|event\.metaKey/);assert.match(source,/comparisonDrag/);assert.match(source,/Vị trí so sánh ảnh trước và sau/);
  assert.doesNotMatch(source,/aria-label="Phóng to ảnh"/);assert.doesNotMatch(source,/aria-label="Thu nhỏ ảnh"/);assert.doesNotMatch(source,/Tăng nét ảnh/);assert.doesNotMatch(source,/comparison-zoom-toolbar/);assert.doesNotMatch(source,/comparison-slider/);
  assert.match(source,/kernelMatrix="0 -0\.16 0 -0\.16 1\.64 -0\.16 0 -0\.16 0"/);
});
