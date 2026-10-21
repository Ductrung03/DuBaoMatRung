export const MIN_IMAGE_ZOOM=1,MAX_IMAGE_ZOOM=3;
export function clampImageView(zoom,x=0,y=0){
  const scale=Math.min(MAX_IMAGE_ZOOM,Math.max(MIN_IMAGE_ZOOM,Number.isFinite(zoom)?zoom:1)),limit=Math.max(0,(scale-1)/2);
  const clamp=value=>Math.min(limit,Math.max(-limit,Number.isFinite(value)?value:0))||0;
  return {zoom:scale,x:clamp(x),y:clamp(y)};
}
export const imageExportSize=zoom=>zoom>1.5?1920:1280;
export function comparisonImageUrl(input,size=640){
  if(typeof input!=='string'||!input.trim())return null;
  try{
    const url=new URL(input,typeof window==='undefined'?'http://localhost':window.location.origin);
    if(!['https:','http:'].includes(url.protocol))return null;
    // Only alter our locked public imagery exports, never arbitrary stored URLs.
    if(['sentinel.arcgis.com','landsat2.arcgis.com'].includes(url.hostname)&&url.pathname.endsWith('/ImageServer/exportImage')){
      const bounded=[640,1280,1920].includes(size)?size:640;
      url.searchParams.set('size',`${bounded},${bounded}`);
    }
    return url.href;
  }catch{return null;}
}
