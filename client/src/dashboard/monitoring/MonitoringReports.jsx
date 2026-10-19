import { useMemo, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import useMonitoringData from './useMonitoringData';
import { FilterSelect } from './MonitoringWorkspace';
import { EMPTY_FILTERS, STATUS, filterRows, formatArea, isManager, monthRange, optionsFor, reportRows, sumArea } from './monitoring-data';
import { downloadBlob, exportGeoJSON } from './monitoring-export';
import './monitoring.css';

const COLORS = ['#43ce8c', '#f7b955', '#75b9ee', '#d8a4e4', '#f37d7d', '#8bd6bf', '#c5cc72'];

export default function MonitoringReports() {
  const { user } = useAuth();
  const manager = isManager(user);
  const { rows, loading, error, reload } = useMonitoringData();
  const [level, setLevel] = useState(manager ? 'province' : 'commune');
  const [month, setMonth] = useState('');
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });
  const [mode, setMode] = useState('text');
  const [areaField, setAreaField] = useState('area');
  const [compiler, setCompiler] = useState('');
  const [busy, setBusy] = useState('');
  const [exportError, setExportError] = useState('');
  const reportRef = useRef(null);
  const range = monthRange(month);
  const selectedCommune = filters.commune || (!manager ? user?.xa : '');
  const valid = Boolean(range && (level === 'province' || selectedCommune));
  const filtered = useMemo(() => valid ? filterRows(rows, { ...filters, commune: level === 'commune' ? selectedCommune : filters.commune, from: range.from, to: range.to }) : [], [rows, filters, level, selectedCommune, range?.from, range?.to, valid]);
  const entries = useMemo(() => reportRows(filtered, level, areaField), [filtered, level, areaField]);
  const headers = level === 'province' ? ['Xã', 'Nguyên nhân', 'Số lô', 'Diện tích (ha)'] : ['Mã lô', 'Xã', 'Nguyên nhân', 'Diện tích (ha)'];
  const cells = entries.map(entry => level === 'province' ? [entry.commune || 'Chưa xác định xã', entry.reason, entry.count, formatArea(entry.area)] : [entry.code || '—', entry.commune || '—', entry.reason, formatArea(entry.area)]);
  const total = sumArea(filtered, areaField);
  const missingArea = filtered.filter(row => row[areaField] === null).length;
  const reasons = useMemo(() => [...new Set(entries.map(entry => entry.reason))], [entries]);
  const chart = useMemo(() => {
    const grouped = new Map();
    entries.forEach(entry => {
      const name = level === 'province' ? entry.commune || 'Chưa xác định xã' : entry.code || 'Chưa có mã';
      if (!grouped.has(name)) grouped.set(name, { name });
      const point = grouped.get(name);
      // Index keys avoid collisions with arbitrary cause names such as "name".
      const key = `reason_${reasons.indexOf(entry.reason)}`;
      point[key] = (point[key] || 0) + (entry.area ?? 0);
    });
    return [...grouped.values()];
  }, [entries, level, reasons]);
  const areaLabel = areaField === 'area' ? 'Diện tích cảnh báo' : 'Diện tích xác minh';
  const statusLabel = filters.status === 'unverified' ? 'Chưa xác minh (chưa kiểm tra/đang xử lý)' : filters.status ? STATUS[filters.status].label : 'Tất cả';
  const reportTitle = `BÁO CÁO MẤT RỪNG ${level === 'province' ? 'CẤP TỈNH' : 'CẤP XÃ'}`;

  const exportFile = async kind => {
    setBusy(kind); setExportError('');
    try {
      if (kind === 'geojson') { exportGeoJSON(filtered); return; }
      if (kind === 'docx') {
        const { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType } = await import('docx');
        const tableRow = values => new TableRow({ children: values.map(v => new TableCell({ children: [new Paragraph(String(v))] })) });
        const doc = new Document({ sections: [{ children: [
          new Paragraph({ text: reportTitle, heading: 'Heading1' }),
          new Paragraph(`Tỉnh Sơn La · Tháng ${month}${level === 'commune' ? ` · Xã ${selectedCommune}` : ''}`),
          new Paragraph(`${areaLabel} (ha) · Trạng thái: ${statusLabel} · Nguyên nhân: ${filters.reason || 'Tất cả'}`),
          new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [tableRow(headers), ...cells.map(tableRow)] }),
          new Paragraph(`Tổng ${filtered.length} lô · ${formatArea(total)} ha${missingArea ? ` · ${missingArea} lô thiếu diện tích, không được tính thành 0` : ''}`),
          new Paragraph(`Đơn vị tổng hợp: ${compiler || 'Chưa cung cấp'}`),
          new Paragraph('Thời gian truy vấn theo ngày kết thúc kỳ ảnh sau (end_sau).'),
        ] }] });
        downloadBlob(await Packer.toBlob(doc), `bao-cao-mat-rung-${level}-${month}.docx`);
      }
      if (kind === 'pdf') {
        const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);
        const canvas = await html2canvas(reportRef.current, { scale: 1.5, backgroundColor: '#ffffff', onclone: doc => { const el = doc.querySelector('.monitor-report-document'); el.style.color = '#172b20'; el.style.background = '#fff'; } });
        const pdf = new jsPDF('p', 'mm', 'a4');
        const width = 190;
        const height = canvas.height * width / canvas.width;
        const image = canvas.toDataURL('image/png');
        let offset = 0;
        do {
          if (offset) pdf.addPage();
          pdf.addImage(image, 'PNG', 10, 10 - offset, width, height);
          offset += 277;
        } while (offset < height);
        downloadBlob(pdf.output('blob'), `bao-cao-mat-rung-${level}-${month}.pdf`);
      }
    } catch (err) { setExportError(`Không thể xuất ${kind.toUpperCase()}: ${err.message}`); }
    finally { setBusy(''); }
  };

  return <div className="monitor-report-layout">
    <aside className="monitor-sidebar">
      <section><h2>BÁO CÁO & THỐNG KÊ</h2>
        <label className="monitor-input"><span>Cấp báo cáo</span><select value={level} onChange={e => setLevel(e.target.value)}><option value="province">Cấp tỉnh · Tổng hợp theo xã</option><option value="commune">Cấp xã · Chi tiết từng lô</option></select></label>
        <label className="monitor-input"><span>Tháng báo cáo</span><input type="month" required value={month} onChange={e => setMonth(e.target.value)} /></label>
        <FilterSelect label={level === 'commune' ? 'Xã (bắt buộc)' : 'Xã'} field="commune" filters={filters} setFilters={setFilters} options={optionsFor(rows, 'commune')} empty={level === 'commune' ? user?.xa || 'Chọn xã' : 'Tất cả trong phạm vi quyền'} />
        <FilterSelect label="Trạng thái xác minh" field="status" filters={filters} setFilters={setFilters} options={[{ value: 'unverified', label: 'Chưa xác minh (chưa kiểm tra/đang xử lý)' }, ...Object.entries(STATUS).map(([key, s]) => ({ value: key, label: key === 'verified' ? 'Đã xác minh' : s.label }))]} />
        <FilterSelect label="Nguyên nhân mất rừng" field="reason" filters={filters} setFilters={setFilters} options={[...optionsFor(rows, 'reason'), 'Chưa xác định nguyên nhân']} />
        <label className="monitor-input"><span>Chỉ tiêu diện tích</span><select value={areaField} onChange={e => setAreaField(e.target.value)}><option value="area">Diện tích cảnh báo (ha)</option><option value="verifiedArea">Diện tích xác minh (ha)</option></select></label>
        <label className="monitor-input"><span>Kiểu hiển thị</span><select value={mode} onChange={e => setMode(e.target.value)}><option value="text">Văn bản</option><option value="chart">Biểu đồ</option></select></label>
        <label className="monitor-input"><span>Đơn vị tổng hợp (điền thực tế)</span><input value={compiler} onChange={e => setCompiler(e.target.value)} placeholder={level === 'province' ? 'Chi cục Kiểm lâm / Ban quản lý…' : 'Hạt kiểm lâm / Trạm quản lý…'} /></label>
        <p className="monitor-caption">Kỳ truy vấn theo end_sau của dữ liệu hiện có, không phải ngày xác minh. Cấp tỉnh chỉ tổng hợp dữ liệu trong phạm vi được cấp quyền.</p>
      </section>
    </aside>
    <main className="monitor-report-main">
      <div className="monitor-toolbar"><h1>Báo cáo & thống kê mất rừng</h1>{['docx', 'pdf', 'geojson'].map(kind => <button key={kind} disabled={loading || !valid || !filtered.length || Boolean(busy)} onClick={() => exportFile(kind)}>{busy === kind ? 'Đang xuất…' : `Xuất ${kind.toUpperCase()}`}</button>)}</div>
      {loading && <p role="status">Đang tải dữ liệu báo cáo…</p>}
      {error && <p role="alert" className="monitor-error">{error} <button onClick={reload}>Thử lại</button></p>}
      {exportError && <p role="alert" className="monitor-error">{exportError}</p>}
      {!valid && <p className="monitor-empty">Chọn tháng báo cáo{level === 'commune' ? ' và xã' : ''} để xem kết quả.</p>}
      {valid && !loading && !error && <>
        {mode === 'chart' && <section className="monitor-report-chart" aria-label="Biểu đồ diện tích theo nguyên nhân">
          {chart.length ? <ResponsiveContainer width="100%" height={360}><BarChart data={chart} margin={{ bottom: 60, right: 20 }}><XAxis dataKey="name" angle={-35} textAnchor="end" interval={0} height={80} tick={{ fill: '#bcd9c7', fontSize: 11 }} /><YAxis tick={{ fill: '#bcd9c7' }} unit=" ha" /><Tooltip contentStyle={{ background: '#123322', color: '#fff' }} /><Legend />{reasons.map((reason, i) => <Bar key={reason} dataKey={`reason_${i}`} name={reason} stackId="causes" fill={COLORS[i % COLORS.length]} />)}</BarChart></ResponsiveContainer> : <p className="monitor-empty">Không có dữ liệu cho biểu đồ.</p>}
        </section>}
        <article ref={reportRef} className="monitor-report-document">
          <h2>{reportTitle}</h2><p>Tỉnh: Sơn La · Tháng: {month}{level === 'commune' ? ` · Xã: ${selectedCommune}` : ''}</p>
          <p>{areaLabel} (ha) · Trạng thái: {statusLabel} · Nguyên nhân: {filters.reason || 'Tất cả'}</p>
          <p>Tổng {filtered.length} lô · <strong>{formatArea(total)} ha</strong></p>
          {missingArea > 0 && <p>{missingArea} lô chưa có {areaLabel.toLowerCase()}; tổng chỉ gồm diện tích đã có, chưa đầy đủ.</p>}
          <div className="monitor-report-table"><table><thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead><tbody>{cells.map((row, index) => <tr key={entries[index].key ?? index}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>)}{!cells.length && <tr><td colSpan={headers.length}>Không có dữ liệu phù hợp.</td></tr>}</tbody></table></div>
          <p>Đơn vị tổng hợp: {compiler || 'Chưa cung cấp'}</p>
          <p>Thời gian truy vấn theo ngày kết thúc kỳ ảnh sau (end_sau). Không cộng gộp các vùng chồng lấn khác mã lô nếu chưa có quy tắc nghiệp vụ.</p>
        </article>
      </>}
    </main>
  </div>;
}
