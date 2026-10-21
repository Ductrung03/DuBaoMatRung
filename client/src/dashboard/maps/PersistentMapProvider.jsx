import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import MonitoringMap from '../monitoring/MonitoringMap';
import MapSessionContext from './MapSessionContext';
import { alertIdentity, alertSnapshot, subscribeAlerts } from './alert-source';
import { useAuth } from '../contexts/AuthContext';

export default function PersistentMapProvider({children}) {
  useAuth();
  const snapshot=useSyncExternalStore(subscribeAlerts,()=>alertSnapshot(),()=>alertSnapshot());
  const [host]=useState(()=>{const node=document.createElement('div');node.className='persistent-map-host';return node;});
  const parking=useRef(null),lastRows=useRef([]);
  const [viewport,setViewport]=useState(null);
  const register=useCallback((owner,next)=>{
    setViewport(previous=>next?{...next,owner}:previous?.owner===owner?{...previous,slot:null}:previous);
  },[]);
  useLayoutEffect(()=>{
    const target=viewport?.slot?.isConnected?viewport.slot:parking.current;
    if(target&&host.parentNode!==target)target.appendChild(host);
    return()=>{};
  },[host,viewport]);
  const incoming=viewport?.rows||[];
  if(incoming.length!==lastRows.current.length||incoming.some((row,index)=>row.feature!==lastRows.current[index]?.feature))lastRows.current=incoming;
  const identity=alertIdentity();
  const canDraw=Boolean(snapshot.data)&&!snapshot.error;
  const mapKey=identity+':'+(snapshot.accessKey||'initial');
  return <MapSessionContext.Provider value={register}>
    {children}<div hidden ref={parking} aria-hidden="true"/>
    {viewport&&createPortal(<MonitoringMap {...viewport} key={mapKey} rows={canDraw?lastRows.current:[]} sourceReady={canDraw} access={snapshot.data?.access} accessKey={snapshot.accessKey} loading={viewport.loading||snapshot.loading}/>,host)}
  </MapSessionContext.Provider>;
}
