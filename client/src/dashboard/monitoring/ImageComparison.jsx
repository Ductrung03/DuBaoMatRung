import { useEffect, useId, useRef, useState } from 'react';
import { formatDate } from './monitoring-data';
import { hasVisiblePixels } from './image-pixels';
import { clampImageView, comparisonImageUrl, imageExportSize, MAX_IMAGE_ZOOM } from './image-viewport';

function ComparisonViewport({images}) {
  const [position,setPosition]=useState(50),[view,setView]=useState(()=>clampImageView(1));
  const [size,setSize]=useState(640),[loaded,setLoaded]=useState({}),[errors,setErrors]=useState({});
  const stage=useRef(null),current=useRef(view),pointers=useRef(new Map()),gesture=useRef(null),comparisonDrag=useRef(false);
  current.current=view;
  const filterId='comparison-sharpen-'+useId().replace(/:/g,'');
  const urls=images.map(image=>comparisonImageUrl(image.url,size)),urlKey=JSON.stringify(urls);
  const ready=urls.every(url=>loaded[url]&&!errors[url]);
  const sameSize=ready&&urls.every(url=>loaded[url].width===loaded[urls[0]].width&&loaded[url].height===loaded[urls[0]].height);
  const pair=images.length===2;
  const changeZoom=next=>setView(old=>clampImageView(typeof next==='function'?next(old.zoom):next,old.x,old.y));
  useEffect(()=>{
    const timer=setTimeout(()=>setSize(imageExportSize(view.zoom)),250);
    return()=>clearTimeout(timer);
  },[view.zoom]);
  useEffect(()=>{
    const requested=JSON.parse(urlKey);
    const timer=setTimeout(()=>setErrors(old=>Object.fromEntries([...Object.entries(old),...requested.filter(url=>!loaded[url]).map(url=>[url,'Không tải được ảnh.'])])),30000);
    return()=>clearTimeout(timer);
  },[urlKey,loaded]);
  useEffect(()=>{
    const node=stage.current;
    if(!node)return undefined;
    const wheel=event=>{event.preventDefault();event.stopPropagation();setView(old=>clampImageView(old.zoom*(event.deltaY<0?1.18:1/1.18),old.x,old.y));};
    node.addEventListener('wheel',wheel,{passive:false});
    return()=>node.removeEventListener('wheel',wheel);
  },[]);
  const onKeyDown=event=>{
    if(!(event.ctrlKey||event.metaKey))return;
    if(event.key==='+'||event.key==='='||event.key==='-'){
      event.preventDefault();changeZoom(zoom=>zoom*(event.key==='-'?1/1.25:1.25));
    } else if(event.key==='0'){event.preventDefault();setView(clampImageView(1));}
  };
  const onLoad=event=>{
    const img=event.currentTarget,url=img.src;
    try{
      const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;
      const context=canvas.getContext('2d');context.drawImage(img,0,0,32,32);
      if(!hasVisiblePixels(context.getImageData(0,0,32,32).data))throw Error('Ảnh trả về rỗng, không thể so sánh.');
      setLoaded(old=>({...old,[url]:{width:img.naturalWidth,height:img.naturalHeight}}));
    }catch(error){setErrors(old=>({...old,[url]:error.message||'Không đọc được nội dung ảnh.'}));}
  };
  const startGesture=()=>{
    const points=[...pointers.current.values()],base=current.current;
    gesture.current=points.length>=2?{base,distance:Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y)}:points.length?{base,start:points[0]}:null;
  };
  const pointerDown=event=>{
    if(event.button!==0)return;
    event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);
    if(pair&&sameSize&&event.target.closest?.('.comparison-handle')){comparisonDrag.current=true;return;}
    if(current.current.zoom<=1)return;
    pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});startGesture();
  };
  const pointerMove=event=>{
    if(comparisonDrag.current){
      event.preventDefault();event.stopPropagation();const box=stage.current.getBoundingClientRect();
      if(box.width)setPosition(Math.max(0,Math.min(100,(event.clientX-box.left)/box.width*100)));return;
    }
    if(!pointers.current.has(event.pointerId))return;
    event.preventDefault();event.stopPropagation();pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    const points=[...pointers.current.values()],active=gesture.current,box=stage.current.getBoundingClientRect();
    if(!active||!box.width||!box.height)return;
    if(points.length>=2&&active.distance>0){const distance=Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y);setView(clampImageView(active.base.zoom*distance/active.distance,active.base.x,active.base.y));}
    else if(active.start)setView(clampImageView(active.base.zoom,active.base.x+(event.clientX-active.start.x)/box.width,active.base.y+(event.clientY-active.start.y)/box.height));
  };
  const pointerUp=event=>{comparisonDrag.current=false;pointers.current.delete(event.pointerId);startGesture();};
  const imageStyle={transform:`translate(${view.x*100}%,${view.y*100}%) scale(${view.zoom})`,filter:`url(#${filterId})`};
  return <div className="comparison-viewer">
    <svg className="comparison-filter-defs" aria-hidden="true" width="0" height="0"><defs><filter id={filterId} colorInterpolationFilters="sRGB"><feConvolveMatrix order="3" kernelMatrix="0 -0.16 0 -0.16 1.64 -0.16 0 -0.16 0" preserveAlpha="true" edgeMode="duplicate"/></filter></defs></svg>
    <div ref={stage} className={`image-comparison ${view.zoom>1?'is-zoomed':''}`} style={{aspectRatio:sameSize?`${loaded[urls[0]].width}/${loaded[urls[0]].height}`:'1/1'}}
      tabIndex={0} aria-label="Ảnh so sánh; lăn chuột để phóng to thu nhỏ, kéo tay cầm để so sánh" onKeyDown={onKeyDown}
      onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onLostPointerCapture={pointerUp}>
      {images.map((image,index)=><div key={image.key} className={`comparison-image-layer ${pair&&index===0?'comparison-before':''}`} style={pair&&index===0?{clipPath:`inset(0 ${100-position}% 0 0)`}:undefined}>
        <img className="comparison-image" style={imageStyle} src={urls[index]} alt={image.alt} crossOrigin="anonymous" draggable={false} data-acquisition-date={image.date} hidden={Boolean(errors[urls[index]])} onLoad={onLoad} onError={()=>setErrors(old=>({...old,[urls[index]]:'Không tải được ảnh.'}))}/>
      </div>)}
      {pair&&sameSize&&<div className="comparison-handle" style={{left:`${position}%`}} role="slider" aria-label="Vị trí so sánh ảnh trước và sau" aria-valuemin="0" aria-valuemax="100" aria-valuenow={position}><span>↔</span></div>}
      {!ready&&!urls.some(url=>errors[url])&&<span className="comparison-loading" role="status">Đang tải ảnh…</span>}
    </div>
    {urls.map((url,index)=>errors[url]&&<p key={url} role="alert">{images[index].label}: {errors[url]}</p>)}
    {ready&&!sameSize&&<p role="alert">Hai ảnh không cùng kích thước; chưa thể chồng khít để so sánh.</p>}
  </div>;
}

export default function ImageComparison({before,after,beforeDate,afterDate}) {
  const images=[{url:comparisonImageUrl(before),key:'before',alt:'Ảnh kỳ đầu',label:'Trước khi mất',date:beforeDate},{url:comparisonImageUrl(after),key:'after',alt:'Ảnh kỳ cuối',label:'Sau khi mất',date:afterDate}];
  const complete=images.every(image=>image.url);
  return <>
    {complete?<ComparisonViewport key={images.map(image=>image.url).join('|')} images={images}/>:<div className="image-comparison-missing">{images.map(image=><figure key={image.key}><figcaption>{image.label}</figcaption>{image.url?<ComparisonViewport key={image.url} images={[image]}/>:<p>Chưa có dữ liệu ảnh.</p>}</figure>)}</div>}
    <div className="comparison-dates"><span>Trước khi mất: {beforeDate?formatDate(beforeDate):'Chưa có dữ liệu'}</span><span>Sau khi mất: {afterDate?formatDate(afterDate):'Chưa có dữ liệu'}</span></div>
  </>;
}
