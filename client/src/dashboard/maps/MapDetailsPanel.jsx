import MonitoringDetails from '../monitoring/MonitoringDetails';
import { useEffect, useRef } from 'react';

export default function MapDetailsPanel({selected,manager,onClose}) {
  const panel=useRef(null);
  useEffect(()=>{if(panel.current){panel.current.scrollTop=0;if(window.matchMedia('(max-width:767px)').matches)panel.current.scrollIntoView({block:'start',behavior:'smooth'});}},[selected]);
  if(!selected)return null;
  return <aside ref={panel} className="map-control-panel map-details-panel" aria-label="Hồ sơ lô được chọn">
    <MonitoringDetails key={selected.id??selected.code} row={selected} manager={manager} onClose={onClose}/>
  </aside>;
}
