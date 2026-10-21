import { useMemo } from 'react';
import { useGeoData } from '../contexts/GeoDataContext';
import { normalizeFeatures } from '../monitoring/monitoring-data';
import MapControlPanel from './MapControlPanel';

export default function SidebarMapControls() {
  const {geoData,mapFilters,setMapFilters,mapPresentation,setMapPresentation}=useGeoData();
  const rows=useMemo(()=>normalizeFeatures(geoData?.features||[]),[geoData]);
  return <MapControlPanel rows={rows} filters={mapFilters} setFilters={setMapFilters} layers={mapPresentation.layers}
    setLayers={updater=>setMapPresentation(previous=>({...previous,layers:typeof updater==='function'?updater(previous.layers):updater}))}
    base={mapPresentation.base} setBase={base=>setMapPresentation(previous=>({...previous,base}))}/>;
}
