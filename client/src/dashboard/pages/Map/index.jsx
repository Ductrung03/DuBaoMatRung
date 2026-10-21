import { useCallback, useEffect, useMemo } from 'react';
import { useGeoData } from '../../contexts/GeoDataContext';
import SharedForestMap from '../../maps/SharedForestMap';
import MapDetailsPanel from '../../maps/MapDetailsPanel';
import useMonitoringData from '../../monitoring/useMonitoringData';
import { normalizeFeatures, filterRows, isManager } from '../../monitoring/monitoring-data';
import { useAuth } from '../../contexts/AuthContext';
import TableDisplay from './components/TableDisplay';
import '../../monitoring/monitoring.css';

export default function Map() {
  const {geoData,loading,mapFilters,mapPresentation,selectedMapRow:selected,setSelectedMapRow:setSelected}=useGeoData();
  const {user}=useAuth();
  const baseline=useMonitoringData();
  const rows=useMemo(()=>baseline.error?[]:geoData?normalizeFeatures(geoData.features||[]):baseline.rows,[geoData,baseline.rows,baseline.error]);
  const filtered=useMemo(()=>filterRows(rows,mapFilters),[rows,mapFilters]);
  const data=useMemo(()=>({type:'FeatureCollection',features:filtered.map(row=>row.feature)}),[filtered]);
  const select=useCallback(row=>setSelected({...row}),[setSelected]);
  useEffect(()=>{if(selected&&!filtered.some(row=>row.id===selected.id))setSelected(null);},[filtered,selected,setSelected]);
  useEffect(()=>{
    const zoom=event=>{const feature=event.detail?.feature;const gid=feature?.properties?.gid??feature?.id;const match=filtered.find(row=>String(row.id)===String(gid));if(match)select(match);};
    window.addEventListener('zoomToFeature',zoom);window.addEventListener('zoomToFeatureFromMap',zoom);
    return()=>{window.removeEventListener('zoomToFeature',zoom);window.removeEventListener('zoomToFeatureFromMap',zoom);};
  },[filtered,select]);
  return <div className="shared-map-page"><div className="shared-map-body">
    <section className="shared-map-center" aria-label="Bản đồ và dữ liệu tra cứu">
      <div className="shared-map-surface"><SharedForestMap rows={filtered} selected={selected} onSelect={select} layers={mapPresentation.layers} base={mapPresentation.base} loading={baseline.loading||loading}/>
        {baseline.error&&!geoData&&<div role="alert" className="monitor-map-message monitor-error">{baseline.error}<button onClick={baseline.reload}>Thử lại</button></div>}
      </div>
      <div className="shared-table-wrap"><TableDisplay loading={loading||baseline.loading} geoData={data} loadingDetails={false} onRowClick={row=>{const gid=row.gid??row.id;const match=filtered.find(item=>String(item.id)===String(gid));if(match)select(match);}}/></div>
    </section>
    <MapDetailsPanel selected={selected} manager={isManager(user)} onClose={()=>setSelected(null)}/>
  </div></div>;
}
