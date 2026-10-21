import { useRef, useState } from 'react';
import { TileLayer } from 'react-leaflet';
import { MAP_MAX_ZOOM } from './map-zoom';

export default function MapBasemap({base,labels=true}) {
  const [attempt,setAttempt]=useState(0);
  const [failed,setFailed]=useState(false);
  const failures=useRef(new Set());
  const tileKey=event=>event.coords?`${event.coords.z}/${event.coords.x}/${event.coords.y}`:event.tile?.src;
  const clearTile=event=>{failures.current.delete(tileKey(event));setFailed(failures.current.size>0);};
  const satellite=base==='satellite';
  return <>
    <TileLayer key={attempt} noWrap
      url={satellite?'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}':'https://tile.openstreetmap.org/{z}/{x}/{y}.png'}
      attribution={satellite?'Tiles © Esri':'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}
      maxNativeZoom={MAP_MAX_ZOOM} maxZoom={MAP_MAX_ZOOM} updateWhenZooming={false} updateWhenIdle keepBuffer={2}
      referrerPolicy="strict-origin-when-cross-origin"
      eventHandlers={{tileerror:event=>{failures.current.add(tileKey(event));setFailed(true);},tileload:clearTile,tileunload:clearTile}}/>
    {satellite&&labels&&<TileLayer noWrap url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" attribution="Esri · Địa danh" maxNativeZoom={MAP_MAX_ZOOM} maxZoom={MAP_MAX_ZOOM} updateWhenZooming={false} updateWhenIdle/>}
    {failed&&<div className="monitor-map-message map-basemap-error" role="alert">Không tải được một số ô ảnh nền {satellite?'vệ tinh':'OpenStreetMap'}. <button type="button" onClick={()=>{failures.current.clear();setFailed(false);setAttempt(n=>n+1);}}>Thử lại nền bản đồ</button></div>}
  </>;
}
