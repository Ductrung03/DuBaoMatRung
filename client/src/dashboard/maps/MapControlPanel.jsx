import { useEffect, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../contexts/AuthContext';
import { EMPTY_FILTERS } from '../monitoring/monitoring-data';
import AlertFilters from './AlertFilters';

export default function MapControlPanel({rows,filters,setFilters,layers,setLayers,base,setBase,numbered=false,overview=false}) {
  const {token}=useAuth();
  const setLayersRef=useRef(setLayers);setLayersRef.current=setLayers;
  useEffect(()=>{
    const controller=new AbortController();
    // Template 1 has whole-layer controls, not the replacement raw-code filters.
    setLayersRef.current(current=>({...current,labels:true,forestCount:current.forestCount??null}));
    api.get('/search/forest-types',{signal:controller.signal}).then(({data})=>{
      if(data.success&&Array.isArray(data.data)&&!controller.signal.aborted){
        const total=data.data.reduce((sum,type)=>sum+(Number(type.count)||0),0);
        setLayersRef.current(current=>({...current,forestCount:total,forestTypeCatalog:data.data.map(type=>String(type.code))}));
      }
    }).catch(()=>{});
    return()=>controller.abort();
  },[token]);
  if(overview)return <div className="map-control-panel map-controls-left overview-layer-controls" aria-label="Lớp bản đồ">
    <section className="map-layers-unified"><h2>3. LỚP BẢN ĐỒ</h2>
      <label className="monitor-input"><span>Bản đồ nền</span><select aria-label="Nền bản đồ" value={base} onChange={event=>setBase(event.target.value)}><option value="normal">Bản đồ</option><option value="satellite">Vệ tinh</option></select></label>
      <label className="monitor-check"><input type="checkbox" checked={Boolean(layers.boundaries)} onChange={event=>setLayers(current=>({...current,boundaries:event.target.checked}))}/>Lớp Ranh giới Xã</label>
      <div className="original-layer-legend-host" aria-label="Lớp bản đồ — mẫu gốc main"/>
      <label className="monitor-input"><span>Độ đậm hiện trạng</span><input aria-label="Độ đậm lớp hiện trạng rừng" type="range" min="0" max="1" step="0.1" value={layers.opacity} onChange={event=>setLayers(current=>({...current,opacity:Number(event.target.value)}))}/></label>
    </section>
  </div>;
  return <div className="map-control-panel map-controls-left" aria-label="Bộ lọc ranh giới và lớp bản đồ">
    <details open className="map-control-section"><summary>{numbered?'3. ':''}RANH GIỚI VÀ ĐỊA BÀN</summary>
      <AlertFilters rows={rows} filters={filters} setFilters={setFilters} section="boundary"/>
      <div className="map-filter-actions"><button type="button" onClick={()=>setFilters({...EMPTY_FILTERS})}>Xóa bộ lọc</button></div>
    </details>
    <section className="map-layers-unified" aria-label="Lớp bản đồ">
      <div className="original-layer-legend-host" aria-label="Lớp bản đồ — mẫu gốc main"/>
      <div className="map-layer-settings">
      {Object.entries({boundaries:'Ranh giới xã',compartments:'Ranh giới tiểu khu / khoảnh'}).map(([key,label])=><label className="monitor-check" key={key}><input type="checkbox" checked={Boolean(layers[key])} onChange={event=>setLayers(current=>({...current,[key]:event.target.checked}))}/>{label}</label>)}
      <label className="monitor-input"><span>Nền bản đồ</span><select aria-label="Nền bản đồ" value={base} onChange={event=>setBase(event.target.value)}><option value="satellite">Vệ tinh · Esri</option><option value="normal">Bản đồ nền · OpenStreetMap</option></select></label>
      <label className="monitor-input"><span title="Độ đậm lớp hiện trạng rừng">Độ đậm hiện trạng</span><input aria-label="Độ đậm lớp hiện trạng rừng" type="range" min="0" max="1" step="0.1" value={layers.opacity} onChange={event=>setLayers(current=>({...current,opacity:Number(event.target.value)}))}/></label>
      </div>
    </section>
  </div>;
}
