import { useContext, useLayoutEffect, useRef } from 'react';
import MapSessionContext from './MapSessionContext';
import { useGeoData } from '../contexts/GeoDataContext';

// Routes own only a slot and their controls. Leaflet lives above the routes.
export default function SharedForestMap(props) {
  const register=useContext(MapSessionContext),slot=useRef(null),owner=useRef(Symbol('map-slot'));
  const {mapViewReset}=useGeoData();
  useLayoutEffect(()=>{register(owner.current,{...props,viewResetKey:mapViewReset,slot:slot.current,legendTarget:document.querySelector('.original-layer-legend-host')});},[register,props,mapViewReset]);
  useLayoutEffect(()=>{const id=owner.current;return()=>register(id,null);},[register]);
  return <div ref={slot} className="persistent-map-slot"/>;
}
