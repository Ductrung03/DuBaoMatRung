// Public, dated image services, not the undated World Imagery basemap.
export const IMAGE_SOURCES = [
  {name:'Sentinel-2 · Esri/Copernicus',resolution:10,url:'https://sentinel.arcgis.com/arcgis/rest/services/Sentinel2/ImageServer',id:'objectid',date:'acquisitiondate',cloud:'cloudcover',scene:'name',category:'category'},
  {name:'Landsat · Esri/USGS',resolution:30,url:'https://landsat2.arcgis.com/arcgis/rest/services/Landsat/MS/ImageServer',id:'OBJECTID',date:'AcquisitionDate',cloud:'CloudCover',scene:'Name',category:'Category'},
];
const DAY=86400000,R=6378137;
export const IMAGE_FRAME_CONTEXT=1.05;
export function imagePeriod(start,end) {
  const parse=input=>{
    if(typeof input!=='string'||!/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(input))return null;
    const day=input.slice(0,10),utc=Date.parse(day+'T00:00:00Z');
    return Number.isFinite(utc)&&new Date(utc).toISOString().slice(0,10)===day?{day,utc}:null;
  };
  const first=parse(start),last=parse(end);
  return first&&last&&first.utc<=last.utc?{start:first.day,end:last.day,from:first.utc-7*3600000,to:last.utc+DAY-7*3600000-1}:null;
}
export function imageFrame(feature) {
  const points=[];
  const walk=coordinates=>{if(!Array.isArray(coordinates))return;if(typeof coordinates[0]==='number'){const [x,y]=coordinates;if(Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x)<=180&&Math.abs(y)<85)points.push([R*x*Math.PI/180,R*Math.log(Math.tan(Math.PI/4+y*Math.PI/360))]);}else coordinates.forEach(walk);};
  if(!['Polygon','MultiPolygon'].includes(feature?.geometry?.type))return null;
  walk(feature.geometry.coordinates);if(!points.length)return null;
  let xmin=Infinity,xmax=-Infinity,ymin=Infinity,ymax=-Infinity;
  for(const [x,y] of points){xmin=Math.min(xmin,x);xmax=Math.max(xmax,x);ymin=Math.min(ymin,y);ymax=Math.max(ymax,y);}
  // Add the same 5% context around the existing square for both periods.
  // This reduces apparent enlargement while keeping identical before/after footprints.
  const side=Math.max(xmax-xmin,ymax-ymin,600)*1.4*IMAGE_FRAME_CONTEXT,cx=(xmin+xmax)/2,cy=(ymin+ymax)/2;
  if(side>50000)return null; // Fail closed for malformed/unexpected geometry; no huge external requests.
  return {bbox:[cx-side/2,cy-side/2,cx+side/2,cy+side/2],size:640};
}
function inRing(point,ring) {
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const [x,y]=ring[i],[u,v]=ring[j];
    if((y>point[1])!==(v>point[1])&&point[0]<(u-x)*(point[1]-y)/(v-y)+x)inside=!inside;
  }
  return inside;
}
export function coversFrame(geometry,frame) {
  const rings=geometry?.rings;if(!rings?.length)return false;
  const [a,b,c,d]=frame.bbox;
  return [[a,b],[a,d],[c,b],[c,d],[(a+c)/2,(b+d)/2]].every(point=>rings.reduce((inside,ring)=>inside!==inRing(point,ring),false));
}
export function precedingImagePeriod(beforePeriod,afterPeriod) {
  if(!beforePeriod)return null;
  const from=beforePeriod.from-30*DAY,to=Math.min(beforePeriod.from-1,afterPeriod?afterPeriod.from-1:Infinity);
  if(to<from)return null;
  const calendarDay=time=>new Date(time+7*3600000).toISOString().slice(0,10);
  return {start:calendarDay(from),end:calendarDay(to),from,to};
}
export function selectScene(features,source,period,frame,nearest=false) {
  if(!period)return null;
  return features.filter(item=>{
    const p=item.attributes||{},id=p[source.id],date=p[source.date];
    return Number.isSafeInteger(id)&&id>0&&Number.isFinite(date)&&date>=period.from&&date<=period.to&&coversFrame(item.geometry,frame);
  }).sort((a,b)=>{
    const cloud=item=>{const v=item.attributes[source.cloud];return typeof v==='number'&&v>=0&&v<=1?v:Infinity;};
    return nearest?(b.attributes[source.date]-a.attributes[source.date]||cloud(a)-cloud(b)):(cloud(a)-cloud(b)||b.attributes[source.date]-a.attributes[source.date]);
  })[0]||null;
}
export function sceneImage(scene,source,frame) {
  if(!scene)return null;
  const p=scene.attributes,url=new URL(source.url+'/exportImage');
  url.search=new URLSearchParams({f:'image',bbox:frame.bbox.join(','),bboxSR:'3857',imageSR:'3857',size:`${frame.size},${frame.size}`,format:'png32',transparent:'true',interpolation:'RSP_CubicConvolution',mosaicRule:JSON.stringify({mosaicMethod:'esriMosaicLockRaster',lockRasterIds:[p[source.id]],mosaicOperation:'MT_FIRST'}),renderingRule:JSON.stringify({rasterFunction:'Natural Color with DRA'})});
  return {url:url.href,date:new Date(p[source.date]).toISOString(),id:p[source.id],name:p[source.scene]||String(p[source.id]),cloud:typeof p[source.cloud]==='number'&&p[source.cloud]>=0&&p[source.cloud]<=1?p[source.cloud]:null};
}
async function queryScene(source,period,frame,signal,request,nearest=false) {
  if(!period)return null;
  const [xmin,ymin,xmax,ymax]=frame.bbox,url=new URL(source.url+'/query');
  url.search=new URLSearchParams({f:'json',where:`${source.category} = 1`,geometry:JSON.stringify({xmin,ymin,xmax,ymax,spatialReference:{wkid:3857}}),geometryType:'esriGeometryEnvelope',spatialRel:'esriSpatialRelIntersects',inSR:'3857',outSR:'3857',time:`${period.from},${period.to}`,outFields:[source.id,source.date,source.cloud,source.scene].join(','),returnGeometry:'true',resultRecordCount:'200'});
  const response=await request(url.href,{signal,credentials:'omit',referrerPolicy:'no-referrer'});
  if(!response.ok)throw Error('Không truy cập được nguồn ảnh lịch sử.');
  const json=await response.json();
  if(json.error)throw Error('Nguồn ảnh lịch sử từ chối truy vấn.');
  if(json.exceededTransferLimit)throw Error('Quá nhiều cảnh ảnh trong kỳ; chưa thể chọn ảnh đầy đủ.');
  if(!Array.isArray(json.features))throw Error('Nguồn ảnh trả dữ liệu không hợp lệ.');
  return sceneImage(selectScene(json.features,source,period,frame,nearest),source,frame);
}
export async function loadHistoricalImages(feature,{signal,request=fetch}={}) {
  const p=feature?.properties||{},frame=imageFrame(feature),beforePeriod=imagePeriod(p.start_dau,p.end_dau),afterPeriod=imagePeriod(p.start_sau,p.end_sau);
  if(!frame)throw Error('Thiếu hình học hợp lệ để xác định vị trí ảnh.');
  if(!beforePeriod&&!afterPeriod)throw Error('Chưa có khoảng ngày kỳ đầu/kỳ cuối hợp lệ.');
  let best=null;const failures=[],pairs=[];
  for(const source of IMAGE_SOURCES){
    try{
      const [before,after]=await Promise.all([queryScene(source,beforePeriod,frame,signal,request),queryScene(source,afterPeriod,frame,signal,request)]);
      const pair={before,after,beforePeriod,afterPeriod,source,frame};
      pairs.push(pair);
      if(!best||Number(Boolean(before))+Number(Boolean(after))>Number(Boolean(best.before))+Number(Boolean(best.after)))best=pair;
      if(before&&after)return pair;
    }catch(error){if(signal?.aborted)throw error;failures.push(error.name==='TypeError'?'Không kết nối được nguồn ảnh lịch sử. Vui lòng kiểm tra mạng hoặc thử lại.':error.message);}
  }
  // Exhaust exact-period pairs first. Only a missing before image may use the
  // approved preceding 30 days; dates, original periods and after imagery stay intact.
  const preceding=precedingImagePeriod(beforePeriod,afterPeriod);
  const replacements=[];
  if(preceding)for(const pair of pairs.filter(item=>!item.before)){
    try{
      const before=await queryScene(pair.source,preceding,frame,signal,request,true);
      if(before)replacements.push({...pair,before,beforeFallback:true,beforeSearchPeriod:preceding});
    }catch(error){if(signal?.aborted)throw error;failures.push(error.name==='TypeError'?'Không kết nối được nguồn ảnh lịch sử. Vui lòng kiểm tra mạng hoặc thử lại.':error.message);}
  }
  replacements.sort((a,b)=>Number(Boolean(b.after))-Number(Boolean(a.after))||Date.parse(b.before.date)-Date.parse(a.before.date));
  if(replacements.length){const replacement=replacements[0];if(!best||Number(Boolean(replacement.before))+Number(Boolean(replacement.after))>=Number(Boolean(best.before))+Number(Boolean(best.after)))best=replacement;}
  if(!best)throw Error(failures[0]||'Chưa truy vấn được ảnh lịch sử.');
  return {...best,warning:failures.length?'Một nguồn ảnh chưa truy cập được; kết quả có thể chưa đầy đủ.':null};
}
