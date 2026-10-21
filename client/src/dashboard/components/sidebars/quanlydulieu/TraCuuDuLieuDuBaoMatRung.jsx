import { useGeoData } from '../../../contexts/GeoDataContext';
import AlertFilters from '../../../maps/AlertFilters';
import useMonitoringData from '../../../monitoring/useMonitoringData';
import { EMPTY_FILTERS } from '../../../monitoring/monitoring-data';

export default function TraCuuDuLieuDuBaoMatRung(){
  const {mapFilters,setMapFilters}=useGeoData();
  const {rows,error}=useMonitoringData();
  return <section className="lookup-filter-panel"><h2>TRA CỨU DỮ LIỆU PHÂN TÍCH MẤT RỪNG</h2>
    <AlertFilters rows={rows} filters={mapFilters} setFilters={setMapFilters}/>
    <div className="map-filter-actions"><button onClick={()=>setMapFilters({...EMPTY_FILTERS})}>Xóa bộ lọc</button></div>
    {error&&<p role="alert" className="monitor-error">{error}</p>}
  </section>;
}
