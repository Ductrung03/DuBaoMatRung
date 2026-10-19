import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaChartBar, FaFilter, FaLayerGroup, FaSatellite, FaFileExcel, FaSearch } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import useMonitoringData from './useMonitoringData';
import MonitoringMap from './MonitoringMap';
import MonitoringCharts from './MonitoringCharts';
import MonitoringDetails from './MonitoringDetails';
import { EMPTY_FILTERS, STATUS, filterRows, formatArea, isManager, optionsFor, summarizeCommunes, sumArea, monthRange } from './monitoring-data';
import { DETAIL_HEADERS, detailCells, exportExcel, exportGeoJSON } from './monitoring-export';
import './monitoring.css';
import { canOpenPage } from '../layout/navigation';

export function FilterSelect({ label, field, filters, setFilters, options, empty = 'Tất cả' }) {
  return <label className="monitor-input"><span>{label}</span><select aria-label={label} value={filters[field]} onChange={e => setFilters(current => ({ ...current, [field]: e.target.value }))}>
    <option value="">{empty}</option>{options.map(option => <option key={typeof option === 'string' ? option : option.value} value={typeof option === 'string' ? option : option.value}>{typeof option === 'string' ? option : option.label}</option>)}
  </select></label>;
}

function trendFor(group, rows, filters) {
  // Only compare complete calendar months; do not invent a comparison for arbitrary periods.
  const month = filters.from?.slice(0, 7);
  const range = monthRange(month || '');
  if (!range || range.from !== filters.from || range.to !== filters.to) return 'Chọn trọn tháng để so sánh';
  const [year, m] = month.split('-').map(Number);
  const previous = new Date(Date.UTC(year, m - 2, 1)).toISOString().slice(0, 7);
  const previousRange = monthRange(previous);
  const matching = filterRows(rows, { ...filters, from: previousRange.from, to: previousRange.to }).filter(row => row.commune === group.commune && row.unit === group.unit);
  const area = sumArea(matching);
  if (matching.some(row => row.area === null) || group.missingArea) return 'Thiếu diện tích';
  if (!area) return group.area ? 'Phát sinh mới (kỳ trước 0 ha)' : 'Không biến động';
  const percent = (group.area - area) / area * 100;
  return `${percent > 0 ? 'Tăng' : percent < 0 ? 'Giảm' : 'Không đổi'} ${Math.abs(percent).toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
}

export default function MonitoringWorkspace() {
  const { user, isAdmin } = useAuth();
  const manager = isManager(user);
  const { rows, loading, error, reload } = useMonitoringData();
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [selected, setSelected] = useState(null);
  const [base, setBase] = useState('satellite');
  const [layers, setLayers] = useState({ forest: true, boundaries: true, alerts: true });
  const [page, setPage] = useState(1);
  const [exportError, setExportError] = useState('');
  const filtered = useMemo(() => filterRows(rows, filters), [rows, filters]);
  const groups = useMemo(() => summarizeCommunes(filtered), [filtered]);
  const selectRow = useCallback(row => setSelected(row), []);
  useEffect(() => { setPage(1); setSelected(null); }, [filters, rows]);
  const tableRows = manager ? groups : filtered;
  const pageCount = Math.max(1, Math.ceil(tableRows.length / 50));
  const currentRows = tableRows.slice((page - 1) * 50, page * 50);
  const calendarMonth = monthRange(filters.from.slice(0, 7));
  const selectedMonth = calendarMonth?.from === filters.from && calendarMonth?.to === filters.to ? filters.from.slice(0, 7) : '';
  const managerHeaders = ['STT', 'Xã', 'Đơn vị quản lý', 'Xu hướng (so với tháng trước)', 'Số lô', 'Diện tích cảnh báo (ha)', 'Tình trạng'];
  const managerCells = (group, index) => [index + 1, group.commune || 'Chưa xác định xã', group.unit || 'Chưa có dữ liệu', trendFor(group, rows, filters), group.count, formatArea(group.area), `Đã xác minh ${group.verified}/${group.count}`];
  const handleExcel = async () => {
    try { setExportError(''); await exportExcel(manager ? managerHeaders : DETAIL_HEADERS, manager ? groups.map(managerCells) : filtered.map(detailCells)); }
    catch { setExportError('Không thể xuất Excel. Vui lòng thử lại.'); }
  };
  const hasPermission = prefix => canOpenPage(user, isAdmin(), prefix);

  return <div className={`monitor-workspace ${selected ? 'has-detail' : ''}`}>
    <aside className="monitor-sidebar" aria-label="Thống kê và bộ lọc">
      <section><h2><FaChartBar /> 1. THỐNG KÊ ĐIỂM NÓNG</h2><p className="monitor-caption">{manager ? 'Lãnh đạo / Người quản lý' : 'Người sử dụng'} · Phạm vi được cấp quyền</p>
        <MonitoringCharts rows={filtered} manager={manager} />
      </section>
      <section><h2><FaFilter /> 2. BỘ LỌC NHANH</h2>
        <label className="monitor-input"><span>Chọn nhanh tháng</span><input type="month" value={selectedMonth} onChange={e => {
          const range = monthRange(e.target.value);
          setFilters(f => ({ ...f, from: range?.from || '', to: range?.to || '' }));
        }} /></label>
        <label className="monitor-input"><span>Từ ngày (kết thúc kỳ ảnh sau)</span><input type="date" value={filters.from} max={filters.to || undefined} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} /></label>
        <label className="monitor-input"><span>Đến ngày</span><input type="date" value={filters.to} min={filters.from || undefined} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} /></label>
        <FilterSelect label="Xã" field="commune" filters={filters} setFilters={setFilters} options={optionsFor(rows, 'commune')} />
        {manager ? <FilterSelect label="Đơn vị quản lý" field="unit" filters={filters} setFilters={setFilters} options={optionsFor(rows, 'unit')} /> : <>
          <FilterSelect label="Thôn/Bản" field="village" filters={filters} setFilters={setFilters} options={optionsFor(rows, 'village')} />
          <FilterSelect label="Tiểu khu" field="compartment" filters={filters} setFilters={setFilters} options={optionsFor(rows, 'compartment')} />
        </>}
        <FilterSelect label="Trạng thái xác minh" field="status" filters={filters} setFilters={setFilters} options={Object.entries(STATUS).map(([key, s]) => ({ value: key, label: s.label }))} />
        <FilterSelect label="Nguồn gốc rừng (tự nhiên/trồng)" field="origin" filters={filters} setFilters={setFilters} options={optionsFor(rows, 'origin')} empty={optionsFor(rows, 'origin').length ? 'Tất cả' : 'Chưa có danh mục trong dữ liệu'} />
        {manager && <FilterSelect label="Chức năng rừng (phòng hộ/đặc dụng…)" field="purpose" filters={filters} setFilters={setFilters} options={optionsFor(rows, 'purpose')} empty={optionsFor(rows, 'purpose').length ? 'Tất cả' : 'Chưa có danh mục trong dữ liệu'} />}
        <button onClick={() => setFilters({ ...EMPTY_FILTERS })}>Xóa bộ lọc</button>
      </section>
      <section><h2><FaLayerGroup /> 3. CÁC LỚP KHÔNG GIAN</h2>
        <label className="monitor-input"><span>Nền bản đồ</span><select value={base} onChange={e => setBase(e.target.value)}><option value="satellite">Vệ tinh · Esri</option><option value="normal">Bản đồ nền · OpenStreetMap</option></select></label>
        {Object.entries({ boundaries: 'Ranh giới xã', forest: 'Hiện trạng rừng (gốc)', alerts: 'Mất rừng' }).map(([key, label]) => <label className="monitor-check" key={key}><input type="checkbox" checked={layers[key]} onChange={e => setLayers(l => ({ ...l, [key]: e.target.checked }))} />{label}</label>)}
        <details><summary>Chú giải trạng thái cảnh báo</summary>{Object.entries(STATUS).map(([key, s]) => <p className="monitor-legend" key={key}><i style={{ backgroundColor: s.color }} />{s.label}</p>)}</details>
        <p className="monitor-caption">Hiện trạng rừng dùng lớp WMS gốc. Chưa có danh mục trạng thái WMS được xác nhận để tách riêng từng loại.</p>
      </section>
      <section><h2><FaSatellite /> CÔNG CỤ HIỆN CÓ</h2>
        {hasPermission('detection') && <Link to="/dashboard/phathienmatrung?tool=imagery">Xử lý ảnh viễn thám / Nhập shapefile</Link>}
        {hasPermission('forecast') && <Link to="/dashboard/dubaomatrung">Dự báo tự động / Tùy chỉnh</Link>}
      </section>
    </aside>
    <main className="monitor-center">
      <div className="monitor-map-wrap">
        <MonitoringMap rows={filtered} selected={selected} onSelect={selectRow} layers={layers} base={base} />
        {loading && <div className="monitor-map-message" role="status">Đang tải dữ liệu trong phạm vi được cấp quyền…</div>}
        {error && <div className="monitor-map-message monitor-error" role="alert">{error}<button onClick={reload}>Thử lại</button></div>}
      </div>
      <section className="monitor-table-section" aria-label="Danh sách mất rừng">
        <div className="monitor-toolbar"><h2>{manager ? 'TỔNG HỢP THEO ĐỊA BÀN' : 'DANH SÁCH LÔ MẤT RỪNG'}</h2>
          <button disabled={loading || !filtered.length} onClick={handleExcel}><FaFileExcel /> Excel</button>
          <button disabled={loading || !filtered.length} onClick={() => exportGeoJSON(filtered)}>GeoJSON</button>
          <label className="monitor-search"><FaSearch /><span className="sr-only">Tìm mã lô, địa điểm, chủ rừng</span><input value={filters.query} placeholder="Mã lô, địa điểm, chủ rừng…" onChange={e => setFilters(f => ({ ...f, query: e.target.value }))} /></label>
        </div>
        <p className="monitor-caption">{filtered.length} lô · {formatArea(sumArea(filtered))} ha diện tích cảnh báo{filtered.some(row => row.area === null) ? ' (chưa đầy đủ: có lô thiếu diện tích)' : ''} · Kỳ thống kê theo end_sau. Tọa độ là tâm polygon, không phải vị trí kiểm tra hiện trường.</p>
        {exportError && <p role="alert" className="monitor-error">{exportError}</p>}
        <div className="monitor-table-scroll"><table><thead>{manager ? <tr>{managerHeaders.map(h => <th key={h}>{h}</th>)}</tr> : <>
          <tr>{DETAIL_HEADERS.slice(0, 4).map(h => <th key={h} rowSpan={2}>{h}</th>)}<th colSpan={2}>Tọa độ WGS84 (tâm polygon)</th>{DETAIL_HEADERS.slice(6).map(h => <th key={h} rowSpan={2}>{h}</th>)}</tr>
          <tr><th>Longitude (X)</th><th>Latitude (Y)</th></tr>
        </>}</thead><tbody>
          {manager ? currentRows.map((group, index) => <tr key={group.key}>{managerCells(group, (page - 1) * 50 + index).map((cell, i) => <td key={i}>{cell}</td>)}</tr>) : currentRows.map((row, index) => <tr key={row.id ?? index} className={selected === row ? 'is-selected' : ''}>{detailCells(row).map((cell, i) => <td key={i}>{i === 0 ? <button className="monitor-row-link" onClick={() => selectRow(row)}>{cell}</button> : cell}</td>)}</tr>)}
          {!loading && !error && !tableRows.length && <tr><td colSpan={manager ? 7 : 12} className="monitor-empty">Không có dữ liệu phù hợp. Hãy thay đổi bộ lọc hoặc tải lại.</td></tr>}
        </tbody></table></div>
        <div className="monitor-pagination"><button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</button><span>Trang {page}/{pageCount}</span><button disabled={page >= pageCount} onClick={() => setPage(p => p + 1)}>Sau</button></div>
      </section>
    </main>
    {selected && <MonitoringDetails row={selected} manager={manager} onClose={() => setSelected(null)} />}
  </div>;
}
