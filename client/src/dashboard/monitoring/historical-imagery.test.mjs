import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { IMAGE_SOURCES, IMAGE_FRAME_CONTEXT, imagePeriod, imageFrame, coversFrame, selectScene, sceneImage, loadHistoricalImages, precedingImagePeriod } from './historical-imagery.js';

const feature={type:'Feature',geometry:{type:'Polygon',coordinates:[[[103.6,21.9],[103.601,21.9],[103.601,21.901],[103.6,21.901],[103.6,21.9]]]},properties:{start_dau:'2026-01-01',end_dau:'2026-01-15',start_sau:'2026-01-16',end_sau:'2026-01-30'}};
const frame=imageFrame(feature),source=IMAGE_SOURCES[0],period=imagePeriod('2026-01-01','2026-01-15');
const ringsFor=frame=>{const [a,b,c,d]=frame.bbox;return [[[a-100,b-100],[c+100,b-100],[c+100,d+100],[a-100,d+100],[a-100,b-100]]];};
function scene({id=1,date='2026-01-10T03:00:00Z',cloud=.2,provider=source,geometry={rings:ringsFor(frame)}}={}){return {attributes:{[provider.id]:id,[provider.date]:Date.parse(date),[provider.cloud]:cloud,[provider.scene]:'scene-'+id},geometry};}
test('period validates real dates/order and includes full Vietnam-calendar end day',()=>{
  assert.equal(imagePeriod('2026-02-30','2026-03-01'),null);assert.equal(imagePeriod('2026-01-20','2026-01-01'),null);assert.equal(imagePeriod(null,'2026-01-01'),null);
  assert.equal(period.from,Date.parse('2025-12-31T17:00:00Z'));assert.equal(period.to,Date.parse('2026-01-15T16:59:59.999Z'));
  assert.ok(imagePeriod('2024-02-29','2024-02-29'));
});
test('frame is fixed square around selected polygon, accepts multipolygon, rejects missing/huge geometry',()=>{
  assert.equal(IMAGE_FRAME_CONTEXT,1.05);assert.equal(frame.bbox[2]-frame.bbox[0],frame.bbox[3]-frame.bbox[1]);assert.equal(frame.size,640);
  const baseSide=600*1.4;assert.ok(frame.bbox[2]-frame.bbox[0]>baseSide);
  assert.equal(imageFrame({}),null);assert.equal(imageFrame({geometry:{type:'Point',coordinates:[103,21]}}),null);
  assert.ok(imageFrame({...feature,geometry:{type:'MultiPolygon',coordinates:[feature.geometry.coordinates]}}));
  assert.equal(imageFrame({...feature,geometry:{type:'Polygon',coordinates:[[[0,0],[100,50],[0,0]]]}}),null);
});
test('coverage rejects wrong location and holes; scene must cover all image-frame corners',()=>{
  assert.ok(coversFrame({rings:ringsFor(frame)},frame));assert.equal(coversFrame({rings:[[[0,0],[1,0],[1,1],[0,0]]]},frame),false);
  const [a,b,c,d]=frame.bbox;assert.equal(coversFrame({rings:[...ringsFor(frame),[[a,b],[c,b],[c,d],[a,d],[a,b]]]},frame),false);
});
test('selects actual in-period scenes by cloud ascending then acquisition descending; zero preserved',()=>{
  const selected=selectScene([scene({id:1,cloud:0}),scene({id:2,cloud:0,date:'2026-01-12T03:00:00Z'}),scene({id:3,date:'2026-02-01T00:00:00Z'}),scene({id:4,cloud:null})],source,period,frame);
  assert.equal(selected.attributes.objectid,2);assert.equal(selectScene([scene({date:'2025-12-01T00:00:00Z'})],source,period,frame),null);
  assert.equal(selectScene([scene({geometry:{rings:[[[0,0],[1,0],[1,1],[0,0]]]}})],source,period,frame),null);
});
test('export locks actual raster ID; before/after have identical bbox, SR, size and render rule',()=>{
  const a=new URL(sceneImage(scene({id:11}),source,frame).url),b=new URL(sceneImage(scene({id:22}),source,frame).url);
  for(const key of ['bbox','bboxSR','imageSR','size','renderingRule','interpolation'])assert.equal(a.searchParams.get(key),b.searchParams.get(key));
  assert.equal(a.searchParams.get('interpolation'),'RSP_CubicConvolution');
  assert.equal(a.searchParams.get('size'),'640,640');
  assert.deepEqual(JSON.parse(a.searchParams.get('mosaicRule')).lockRasterIds,[11]);assert.deepEqual(JSON.parse(b.searchParams.get('mosaicRule')).lockRasterIds,[22]);
  assert.equal(sceneImage(null,source,frame),null);
});
test('requests JSON geometry, exact periods, no auth/cookies; does not fetch full alert data',async()=>{
  const calls=[];const result=await loadHistoricalImages(feature,{request:async(url,options)=>{const u=new URL(url);calls.push(u);assert.equal(options.credentials,'omit');assert.equal(options.headers,undefined);assert.equal(u.searchParams.get('geometryType'),'esriGeometryEnvelope');assert.equal(JSON.parse(u.searchParams.get('geometry')).spatialReference.wkid,3857);const after=u.searchParams.get('time').startsWith(String(imagePeriod(feature.properties.start_sau,feature.properties.end_sau).from));return {ok:true,json:async()=>({features:[scene({date:after?'2026-01-20T03:00:00Z':'2026-01-10T03:00:00Z',id:after?2:1})]})};}});
  assert.equal(calls.length,2);assert.equal(result.before.id,1);assert.equal(result.after.id,2);assert.equal(result.source.name,source.name);
});
test('falls back to a complete same-provider pair instead of mixing Sentinel/Landsat',async()=>{
  const result=await loadHistoricalImages(feature,{request:async url=>{const u=new URL(url),landsat=u.hostname==='landsat2.arcgis.com',provider=landsat?IMAGE_SOURCES[1]:source,after=u.searchParams.get('time').startsWith(String(imagePeriod(feature.properties.start_sau,feature.properties.end_sau).from));return {ok:true,json:async()=>({features:!landsat&&after?[]:[scene({provider,date:after?'2026-01-20T03:00:00Z':'2026-01-10T03:00:00Z'})]})};}});
  assert.equal(result.source.name,IMAGE_SOURCES[1].name);assert.ok(result.before.url.includes('landsat2'));assert.ok(result.after.url.includes('landsat2'));
});
test('missing scenes remain missing; invalid dates do not trigger historical network queries',async()=>{
  const result=await loadHistoricalImages(feature,{request:async()=>({ok:true,json:async()=>({features:[]})})});assert.equal(result.before,null);assert.equal(result.after,null);
  await assert.rejects(loadHistoricalImages({...feature,properties:{}},{request:()=>{throw Error('Should not fetch');}}),/khoảng ngày/);
});
test('preceding search is exactly 30 Vietnam-calendar days before first period, never the after period',()=>{
  const preceding=precedingImagePeriod(period,imagePeriod('2026-01-16','2026-01-30'));
  assert.equal(preceding.start,'2025-12-02');assert.equal(preceding.end,'2025-12-31');assert.equal(preceding.to,period.from-1);assert.equal(preceding.to-preceding.from+1,30*86400000);
  assert.equal(precedingImagePeriod(null,null),null);
  assert.equal(precedingImagePeriod(period,imagePeriod('2025-11-01','2025-11-30')),null);
});
test('fallback picks nearest valid before across providers, not clearer older/out-of-window/wrong-place imagery; retains actual date',async()=>{
  const calls=[],before=imagePeriod(feature.properties.start_dau,feature.properties.end_dau),after=imagePeriod(feature.properties.start_sau,feature.properties.end_sau),preceding=precedingImagePeriod(before,after),copy=JSON.stringify(feature);
  const result=await loadHistoricalImages(feature,{request:async url=>{
    const u=new URL(url),landsat=u.hostname==='landsat2.arcgis.com',provider=landsat?IMAGE_SOURCES[1]:source,time=u.searchParams.get('time');calls.push({host:u.hostname,time});
    let features=[];
    if(time===`${after.from},${after.to}`)features=[scene({provider,id:10,date:'2026-01-20T03:00:00Z'})];
    if(time===`${preceding.from},${preceding.to}`)features=[scene({provider,id:11,date:landsat?'2025-12-30T03:00:00Z':'2025-12-29T03:00:00Z',cloud:.5}),scene({provider,id:12,date:'2025-12-20T03:00:00Z',cloud:0}),scene({provider,id:13,date:'2026-01-01T03:00:00Z'}),scene({provider,id:14,date:'2025-12-01T03:00:00Z'}),scene({provider,id:15,date:'2025-12-31T03:00:00Z',geometry:{rings:[[[0,0],[1,0],[1,1],[0,0]]]}})];
    return {ok:true,json:async()=>({features})};
  }});
  assert.equal(calls.length,6);assert.ok(calls.slice(0,4).every(call=>call.time!==`${preceding.from},${preceding.to}`));
  assert.equal(result.source,IMAGE_SOURCES[1]);assert.equal(result.before.id,11);assert.equal(result.before.date,'2025-12-30T03:00:00.000Z');assert.equal(result.after.date,'2026-01-20T03:00:00.000Z');assert.equal(result.beforeFallback,true);assert.equal(result.beforePeriod.start,'2026-01-01');assert.equal(JSON.stringify(feature),copy);
  assert.equal(new URL(result.before.url).hostname,new URL(result.after.url).hostname);
});
test('a complete exact-period pair wins over any preceding fallback',async()=>{
  const before=imagePeriod(feature.properties.start_dau,feature.properties.end_dau),after=imagePeriod(feature.properties.start_sau,feature.properties.end_sau);let calls=0;
  const result=await loadHistoricalImages(feature,{request:async url=>{calls++;const u=new URL(url),landsat=u.hostname==='landsat2.arcgis.com',provider=landsat?IMAGE_SOURCES[1]:source,time=u.searchParams.get('time');assert.ok([`${before.from},${before.to}`,`${after.from},${after.to}`].includes(time));return {ok:true,json:async()=>({features:time===`${after.from},${after.to}`?[scene({provider,date:'2026-01-20T03:00:00Z'})]:landsat?[scene({provider,date:'2026-01-10T03:00:00Z'})]:[]})};}});
  assert.equal(calls,4);assert.equal(result.source,IMAGE_SOURCES[1]);assert.equal(result.beforeFallback,undefined);
});
test('empty bounded fallback does not extend farther or replace after images',async()=>{
  const after=imagePeriod(feature.properties.start_sau,feature.properties.end_sau);let calls=0;
  const result=await loadHistoricalImages(feature,{request:async url=>{calls++;const u=new URL(url),provider=u.hostname==='landsat2.arcgis.com'?IMAGE_SOURCES[1]:source;return {ok:true,json:async()=>({features:u.searchParams.get('time')===`${after.from},${after.to}`?[scene({provider,date:'2026-01-20T03:00:00Z'})]:[]})};}});
  assert.equal(calls,6);assert.equal(result.before,null);assert.equal(result.after.date,'2026-01-20T03:00:00.000Z');
});
test('HTTP/ArcGIS/truncation errors never become imagery; cancellation is not retried on another provider',async()=>{
  for(const json of [{error:{code:499}},{exceededTransferLimit:true,features:[]},{}])await assert.rejects(loadHistoricalImages(feature,{request:async()=>({ok:true,json:async()=>json})}));
  await assert.rejects(loadHistoricalImages(feature,{request:async()=>({ok:false})}),/truy cập/);
  const controller=new AbortController();controller.abort();let calls=0;
  await assert.rejects(loadHistoricalImages(feature,{signal:controller.signal,request:async()=>{calls++;throw Error('aborted');}}),/aborted/);assert.equal(calls,2);
});
test('browser network failures have actionable Vietnamese messages',async()=>{
  await assert.rejects(loadHistoricalImages(feature,{request:async()=>{throw new TypeError('Failed to fetch');}}),/Không kết nối được nguồn ảnh lịch sử/);
});
test('production gateway CSP permits exactly the two additional image-query origins, not arbitrary external connections',()=>{
  const text=readFileSync(new URL('../../../../microservices/gateway/src/index.js',import.meta.url),'utf8');
  const origins=JSON.parse(text.match(/connectSrc:\s*(\[[^\]]+\])/)[1]);
  assert.deepEqual(origins,["'self'",'http://103.56.160.66:3000','https://earthengine.googleapis.com',...IMAGE_SOURCES.map(source=>new URL(source.url).origin)]);
});
