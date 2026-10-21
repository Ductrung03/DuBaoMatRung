import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, GeoJSON, Pane, ScaleControl, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import MapServerLayers from '../components/MapServerLayers';
import { STATUS, formatArea } from './monitoring-data';
import { useAuth } from '../contexts/AuthContext';
import { loadMapLayer } from '../maps/layer-source';
import { forestLayerStyle } from '../maps/forest-layer-style';
import { getDefaultMatRungStyle } from '../pages/Map/utils/mapStyles';
import MapBasemap from '../maps/MapBasemap';
import { MAP_MAX_ZOOM } from '../maps/map-zoom';
import MapLoading from '../maps/MapLoading';
import MapLayerLegend from '../components/MapLayerLegend';
import { useGeoData } from '../contexts/GeoDataContext';
import { toggleForestColor, visibleForestTypes, alertColorKind } from '../maps/forest-color-visibility';

function ScopedLayer({name,opacity,scopeKey,hiddenTypes}) {
  const map=useMap();
  const [bbox,setBbox]=useState(map.getBounds().toBBoxString());
  const [data,setData]=useState(null),[error,setError]=useState('');
  const boundary=name==='boundaries';
  useMapEvents({moveend:()=>{if(!boundary)setBbox(map.getBounds().toBBoxString());}});
  useEffect(()=>{
    const controller=new AbortController();
    const timer=setTimeout(()=>{
      setError('');
      loadMapLayer({name,box:bbox.split(',').map(Number),scopeKey,signal:controller.signal}).then(next=>{
        if(!controller.signal.aborted){setData(next);if(next.truncated)setError('Lớp bản đồ giới hạn theo khung nhìn; phóng to để xem chi tiết.');}
      }).catch(e=>{if(!controller.signal.aborted)setError(e.response?.data?.message||'Không tải được lớp theo phạm vi tài khoản');});
    },boundary?0:300);
    return()=>{clearTimeout(timer);controller.abort();};
  },[bbox,boundary,name,scopeKey]);
  // Never remove a successfully drawn layer while a new viewport is in flight.
  const displayed=useMemo(()=>!data||name!=='forest'||!hiddenTypes?.length?data:{...data,features:data.features.filter(feature=>!hiddenTypes.includes(feature.properties?.ldlr_23??'__missing__'))},[data,name,hiddenTypes]);
  const bindData=layer=>{if(layer&&layer.__collection!==displayed){layer.clearLayers();layer.addData(displayed);layer.__collection=displayed;}};
  return <>{displayed&&<GeoJSON ref={bindData} data={{type:'FeatureCollection',features:[]}} interactive={name==='forest'} style={boundary?{color:'#000000',weight:2,opacity:.72,fillColor:'#f0f0f0',fillOpacity:.16}:name==='compartments'?{color:'#646464',weight:1,opacity:.56,fillColor:'#dcdcdc',fillOpacity:.105}:feature=>forestLayerStyle(feature,opacity)}/>}{error&&<div className="monitor-map-message map-layer-warning" role="note">{error}</div>}</>;
}

function MapSize({ rows, selected,resetKey }) {
  const map = useMap();
  const currentRows=useRef(rows);currentRows.current=rows;
  const fitKey=rows.map(row=>row.id).join(',');
  useEffect(() => {
    window._leaflet_map=map;
    const observer = new ResizeObserver(() => {if(!map.getContainer().offsetWidth||!map.getContainer().offsetHeight)return;const center=map.getCenter();map.invalidateSize({pan:false});map.setView(center,map.getZoom(),{animate:false});});
    observer.observe(map.getContainer());
    return () => {observer.disconnect();if(window._leaflet_map===map)window._leaflet_map=null;};
  }, [map]);
  useEffect(() => {
    const features = currentRows.current.map(row => row.feature).filter(f => f.geometry);
    map.stop();map.invalidateSize({pan:false});
    if (!features.length) {map.setView([21.3276,103.9144],8,{animate:false});return;}
    const bounds = L.geoJSON({ type: 'FeatureCollection', features }).getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15, animate: false });
  }, [map, fitKey,resetKey]);
  useEffect(() => {
    if (!selected?.feature.geometry) return;
    const bounds = L.geoJSON(selected.feature).getBounds();
    if (bounds.isValid()) {
      map.stop();
      map.flyToBounds(bounds, { padding: [40, 40], maxZoom: 17, duration: 0.8, animate: true });
    }
  }, [map, selected]);
  return null;
}

function AlertLayer({ rows, selected, onSelect }) {
  const ref = useRef(null);
  const drawn=useRef(new Map());
  const selection=useRef(null);
  const callback=useRef(onSelect);
  callback.current=onSelect;
  useEffect(() => {
    const group = ref.current;
    if (!group) return;
    group.clearLayers();
    drawn.current.clear();
    rows.forEach(row => {
      if (!row.feature.geometry) return;
      // Exact original Lookup style, not the replacement monitoring status palette.
      const style = getDefaultMatRungStyle(row.feature, false);
      L.geoJSON(row.feature, { style, onEachFeature: (_, layer) => {
        // Use textContent, never interpolate database strings as HTML.
        const tooltip = document.createElement('div');
        tooltip.textContent = `${row.code || 'Chưa có mã'} · ${row.commune || 'Chưa rõ xã'} · ${formatArea(row.area)} ha · ${STATUS[row.status].label}`;
        layer.bindTooltip(tooltip, { sticky: true });
        const key=row.id||row;
        drawn.current.set(key,{layer,style,feature:row.feature});
        layer.on('click', () => callback.current(row));
        layer.on('mouseover', () => {layer.setStyle?.({...style,weight:3,color:'#ff7800'});layer.bringToFront();});
        layer.on('mouseout', () => layer.setStyle?.(getDefaultMatRungStyle(row.feature, selection.current===key)));
      } }).addTo(group);
    });
  }, [rows]);
  useEffect(()=>{
    const previous=drawn.current.get(selection.current);
    if(previous)previous.layer.setStyle(previous.style);
    selection.current=selected?.id||selected||null;
    const next=drawn.current.get(selection.current);
    if(next){next.layer.setStyle(getDefaultMatRungStyle(next.feature,true));next.layer.bringToFront();}
  },[selected,rows]);
  return <GeoJSON ref={ref} data={{ type: 'FeatureCollection', features: [] }} />;
}

export default function MonitoringMap({ rows, selected, onSelect, layers, base, loading=false, legendTitle='Lớp bản đồ',legendTarget,sourceReady=true,access,accessKey='',collapsibleForest=false,viewResetKey=0 }) {
  const {isAdmin,user}=useAuth();
  const {setMapPresentation}=useGeoData();
  const toggleLegendLayer=useCallback(key=>setMapPresentation(previous=>{
    const current=previous.layers;
    if(key.startsWith('forest-color:'))return {...previous,layers:toggleForestColor(current,key.slice('forest-color:'.length))};
    if(key.startsWith('alert-color:')){const kind=key.slice('alert-color:'.length),hidden=current.hiddenAlertKinds||[];return {...previous,layers:{...current,hiddenAlertKinds:hidden.includes(kind)?hidden.filter(item=>item!==kind):[...hidden,kind]}};}
    if(key==='hientrangrung')return {...previous,layers:{...current,forest:!current.forest}};
    if(key==='matrung_verified')return {...previous,layers:{...current,alerts:true,hiddenAlertStatuses:(current.hiddenAlertStatuses||[]).includes('verified')?(current.hiddenAlertStatuses||[]).filter(status=>status!=='verified'):[...(current.hiddenAlertStatuses||[]),'verified']}};
    if(key==='matrung_unverified'){
      const statuses=['pending','processing','unknown'],hidden=current.hiddenAlertStatuses||[];
      const visible=statuses.some(status=>!hidden.includes(status));
      return {...previous,layers:{...current,alerts:true,hiddenAlertStatuses:visible?[...new Set([...hidden,...statuses])]:hidden.filter(status=>!statuses.includes(status))}};
    }
    return previous;
  }),[setMapPresentation]);
  const legendLayers=useMemo(()=>({hientrangrung:{visible:Boolean(layers.forest)},matrung_verified:{visible:!layers.hiddenAlertStatuses?.includes('verified')},matrung_unverified:{visible:['pending','processing','unknown'].some(status=>!layers.hiddenAlertStatuses?.includes(status))}}),[layers.forest,layers.hiddenAlertStatuses]);
  const scopeKey=JSON.stringify([accessKey,user?.id,access||[user?.xa,user?.tieukhu,user?.khoanh,user?.roles,user?.permissions]]);
  const province=access?access.province:isAdmin()||user?.permissions?.includes('detection.scope_province')||[...(user?.roles||[]),...(user?.userRoles||[]).map(r=>r.role)].some(r=>['Công ty Fis','Chi cục kiểm lâm','Admin','LanhDao'].includes(typeof r==='string'?r:r?.name));
  const visibleAlerts=useMemo(()=>rows.filter(row=>!layers.hiddenAlertStatuses?.includes(row.status)&&!(row.status==='verified'&&layers.hiddenAlertKinds?.includes(alertColorKind(row)))),[rows,layers.hiddenAlertStatuses,layers.hiddenAlertKinds]);
  const forestTypes=visibleForestTypes(layers);
  return <MapContainer center={[21.3276, 103.9144]} zoom={8} minZoom={6} maxZoom={MAP_MAX_ZOOM} maxBounds={[[5,95],[30,115]]} maxBoundsViscosity={1} preferCanvas className="monitor-map shared-forest-map" aria-label="Bản đồ giám sát mất rừng">
    <MapBasemap key={base} base={base}/>
    <Pane name="forest-status" style={{ zIndex: 250 }}>
      {sourceReady&&province&&layers.forest && <MapServerLayers visibleLayers={['hientrangrung']} forestOpacity={layers.opacity} forestTypes={forestTypes}/>}
      {sourceReady&&!province&&layers.forest&&<ScopedLayer key={`forest-${scopeKey}`} name="forest" opacity={layers.opacity} scopeKey={scopeKey} hiddenTypes={layers.hiddenForestTypes}/>}
    </Pane>
    <Pane name="commune-boundaries" style={{ zIndex: 300 }}>{sourceReady&&layers.boundaries&&<ScopedLayer key={`boundaries-${scopeKey}`} name="boundaries" scopeKey={scopeKey}/>}</Pane>
    <Pane name="compartment-boundaries" style={{zIndex:350}}>{sourceReady&&layers.compartments&&(province?<MapServerLayers visibleLayers={['tieukukhoanh']}/>:<ScopedLayer key={`compartments-${scopeKey}`} name="compartments" scopeKey={scopeKey}/>)}</Pane>
    {layers.alerts && <AlertLayer rows={visibleAlerts} selected={selected} onSelect={onSelect} />}
    <MapSize rows={rows} selected={selected} resetKey={viewResetKey}/><ScaleControl position="bottomright" imperial={false} />
    <MapLayerLegend mapLayers={legendLayers} colorLayers={layers} toggleLayerVisibility={toggleLegendLayer} mountTarget={legendTarget||'.original-layer-legend-host'} forestCount={layers.forestCount??null} title={legendTitle} collapsibleForest={collapsibleForest}/>
    <MapLoading active={loading}/>
  </MapContainer>;
}
