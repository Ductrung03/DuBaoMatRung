import { useCallback, useEffect, useMemo, useState } from 'react';
import { FaChartBar, FaFilter, FaFileExcel, FaSearch } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import useMonitoringData from './useMonitoringData';
import MonitoringMap from '../maps/SharedForestMap';
import MapControlPanel from '../maps/MapControlPanel';
import AlertFilters from '../maps/AlertFilters';
import {useGeoData} from '../contexts/GeoDataContext';
import MonitoringCharts from './MonitoringCharts';
import MapDetailsPanel from '../maps/MapDetailsPanel';
import { EMPTY_FILTERS, filterRows, formatArea, isManager, summarizeCommunes, sumArea, normalizeFeatures } from './monitoring-data';
import { territoryTrends } from './territory-trends';
import {presentTrend} from './trend-presentation';
import VerificationProgress from './VerificationProgress';
import {verificationPercent} from './verification-progress';
import { DETAIL_HEADERS, detailCells, exportExcel, exportGeoJSON } from './monitoring-export';
import './monitoring.css';

export function FilterSelect({ label, field, filters, setFilters, options, empty = 'Tất cả' }) {
  return <label className="monitor-input"><span>{label}</span><select aria-label={label} value={filters[field]} onChange={e => setFilters(current => ({ ...current, [field]: e.target.value }))}>
    <option value="">{empty}</option>{options.map(option => <option key={typeof option === 'string' ? option : option.value} value={typeof option === 'string' ? option : option.value}>{typeof option === 'string' ? option : option.label}</option>)}
  </select></label>;
}

export default function MonitoringWorkspace() {
  const { user } = useAuth();
  const manager = isManager(user);
  const baseline = useMonitoringData();
  const {mapPresentation,setMapPresentation,geoData,loading:actionLoading,mapFilters:filters,setMapFilters:setFilters,selectedMapRow:selected,setSelectedMapRow:setSelected}=useGeoData();
  const rows=useMemo(()=>baseline.error?[]:geoData?normalizeFeatures(geoData.features||[]):baseline.rows,[geoData,baseline.rows,baseline.error]);
  const {error,reload}=baseline;
  const loading=baseline.loading||actionLoading;
  const {base,layers}=mapPresentation;
  const setBase=next=>setMapPresentation(previous=>({...previous,base:next}));
  const setLayers=updater=>setMapPresentation(previous=>({...previous,layers:typeof updater==='function'?updater(previous.layers):updater}));
  const [page, setPage] = useState(1);
  const [exportError, setExportError] = useState('');
  const filtered = useMemo(() => filterRows(rows, filters), [rows, filters]);
  const groups = useMemo(() => summarizeCommunes(filtered), [filtered]);
  const trends = useMemo(()=>territoryTrends(rows,filters),[rows,filters]);
  const selectRow = useCallback(row => setSelected({...row}), [setSelected]);
  useEffect(() => { setPage(1); }, [filters, rows]);
  useEffect(()=>{if(selected&&!filtered.some(row=>row.id===selected.id))setSelected(null);},[filtered,selected,setSelected]);
  const tableRows = manager ? groups : filtered;
  const pageCount = Math.max(1, Math.ceil(tableRows.length / 50));
  const currentRows = tableRows.slice((page - 1) * 50, page * 50);
  const managerHeaders = ['STT', 'Xã', 'Đơn vị quản lý', 'Xu hướng', 'Số lô', 'Diện tích cảnh báo (ha)', 'Tình trạng xác minh'];
  const managerCells = (group, index) => [index + 1, group.commune || 'Chưa xác định xã', group.unit || 'Chưa có phân công đơn vị', presentTrend(trends.get(group.key)).text, group.count, formatArea(group.area), `${verificationPercent(group.verified,group.count).toLocaleString('vi-VN',{maximumFractionDigits:1})}% (${group.verified}/${group.count})`];
  const handleExcel = async () => {
    try { setExportError(''); await exportExcel(manager ? managerHeaders : DETAIL_HEADERS, manager ? groups.map(managerCells) : filtered.map(detailCells)); }
    catch { setExportError('Không thể xuất Excel. Vui lòng thử lại.'); }
  };

  return <div className={`monitor-workspace ${selected ? 'has-detail' : ''}`}>
    <aside className="monitor-sidebar" aria-label="Thống kê và bộ lọc">
      <section><h2><FaChartBar /> 1. BIỂU ĐỒ THỐNG KÊ</h2>
        <MonitoringCharts rows={filtered} manager={manager} />
      </section>
      <section><h2><FaFilter /> 2. BỘ LỌC NHANH</h2>
        <AlertFilters rows={rows} filters={filters} setFilters={setFilters} section="quick"/>
        <div className="map-filter-actions"><button onClick={() => setFilters({ ...EMPTY_FILTERS })}>Xóa bộ lọc</button></div>
      </section>
      <MapControlPanel overview rows={rows} filters={filters} setFilters={setFilters} layers={layers} setLayers={setLayers} base={base} setBase={setBase}/>
    </aside>
    <main className="monitor-center">
      <div className="monitor-map-wrap">
        <MonitoringMap rows={filtered} selected={selected} onSelect={selectRow} layers={layers} base={base} loading={loading} legendTitle="LỚP BẢN ĐỒ" collapsibleForest />
        {error && <div className="monitor-map-message monitor-error" role="alert">{error}<button onClick={reload}>Thử lại</button></div>}
      </div>
      <section className="monitor-table-section" aria-label="Danh sách mất rừng">
        <div className="monitor-toolbar"><h2>{manager ? 'TỔNG HỢP THEO ĐỊA BÀN' : 'DANH SÁCH LÔ MẤT RỪNG'}</h2>
          <button disabled={loading || !filtered.length} onClick={handleExcel}><FaFileExcel /> Excel</button>
          <button disabled={loading || !filtered.length} onClick={() => exportGeoJSON(filtered)}>GeoJSON</button>
          <label className="monitor-search"><FaSearch /><span className="sr-only">Tìm mã lô, địa điểm, chủ rừng</span><input value={filters.query} placeholder="Mã lô, địa điểm, chủ rừng…" onChange={e => setFilters(f => ({ ...f, query: e.target.value }))} /></label>
        </div>
        <p className="monitor-caption">{filtered.length} lô · {formatArea(sumArea(filtered))} ha diện tích cảnh báo{filtered.some(row => row.area === null) ? ' (có lô thiếu diện tích)' : ''}</p>
        {exportError && <p role="alert" className="monitor-error">{exportError}</p>}
        <div className="monitor-table-scroll"><table><thead>{manager ? <tr>{managerHeaders.map(h => <th key={h}>{h}</th>)}</tr> : <>
          <tr>{DETAIL_HEADERS.slice(0, 4).map(h => <th key={h} rowSpan={2}>{h}</th>)}<th colSpan={2}>Tọa độ WGS84 (tâm polygon)</th>{DETAIL_HEADERS.slice(6).map(h => <th key={h} rowSpan={2}>{h}</th>)}</tr>
          <tr><th>Longitude (X)</th><th>Latitude (Y)</th></tr>
        </>}</thead><tbody>
          {manager ? currentRows.map((group, index) => <tr key={group.key}>{managerCells(group, (page - 1) * 50 + index).map((cell, i) => {
            const trend=presentTrend(trends.get(group.key));
            return <td key={i}>{i===6?<VerificationProgress verified={group.verified} total={group.count}/>:i===3?<span className={`territory-trend trend-${trend.tone}`} title={trend.title}>{trend.text}</span>:cell}</td>;
          })}</tr>) : currentRows.map((row, index) => <tr key={row.id ?? index} className={selected&&(selected.id!==null?selected.id===row.id:selected.feature===row.feature) ? 'is-selected' : ''}>{detailCells(row).map((cell, i) => <td key={i}>{i === 0 ? <button className="monitor-row-link" onClick={() => selectRow(row)}>{cell}</button> : cell}</td>)}</tr>)}
          {!loading && !error && !tableRows.length && <tr><td colSpan={manager ? 7 : 12} className="monitor-empty">Không có dữ liệu phù hợp. Hãy thay đổi bộ lọc hoặc tải lại.</td></tr>}
        </tbody></table></div>
        <div className="monitor-pagination"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</button><span>Trang {page}/{pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage(p => p + 1)}>Sau</button></div>
      </section>
    </main>
    <MapDetailsPanel selected={selected} manager={manager} onClose={()=>setSelected(null)}/>
  </div>;
}
