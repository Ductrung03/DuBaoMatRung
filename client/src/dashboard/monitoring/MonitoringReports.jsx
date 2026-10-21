import { useMemo, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import useMonitoringData from './useMonitoringData';
import { FilterSelect } from './MonitoringWorkspace';
import { EMPTY_FILTERS, STATUS, filterRows, formatArea, isManager, monthRange, optionsFor, reportRows, sumArea } from './monitoring-data';
import { downloadBlob, exportGeoJSON } from './monitoring-export';
import './monitoring.css';
import { REPORT_OUTCOMES,reportOutcomeSeries } from './report-outcomes';

export default function MonitoringReports() {
  const { user } = useAuth();
  const manager = isManager(user);
  const { rows, loading, error, reload } = useMonitoringData('report');
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
  const chart = useMemo(() => reportOutcomeSeries(filtered,level,areaField),[filtered,level,areaField]);
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
      </section>
    </aside>
    <main className="monitor-report-main">
      <div className="monitor-toolbar"><h1>Báo cáo & thống kê mất rừng</h1>{['docx', 'pdf', 'geojson'].map(kind => <button key={kind} disabled={loading || !valid || !filtered.length || Boolean(busy)} onClick={() => exportFile(kind)}>{busy === kind ? 'Đang xuất…' : `Xuất ${kind.toUpperCase()}`}</button>)}</div>
      {error && <p role="alert" className="monitor-error">{error} <button onClick={reload}>Thử lại</button></p>}
      {exportError && <p role="alert" className="monitor-error">{exportError}</p>}
      {!valid && <p className="monitor-empty">Chọn tháng báo cáo{level === 'commune' ? ' và xã' : ''} để xem kết quả.</p>}
      {valid && !loading && !error && <>
        {mode === 'chart' && <section className="monitor-report-chart" aria-label="Biểu đồ diện tích theo kết quả xác minh">
          {filtered.length ? <>
            <div className="report-outcome-charts">
              <section className="report-outcome-card" aria-label="Biểu đồ tròn"><h3>Tỷ trọng diện tích</h3>
                {chart.totals.some(item=>item.area>0)?<ResponsiveContainer width="100%" height={280}><PieChart><Pie data={chart.totals} dataKey="area" nameKey="label" innerRadius="52%" outerRadius="78%" paddingAngle={0} stroke="none" isAnimationActive={false}>{chart.totals.map(item=><Cell key={item.key} fill={item.color}/>)}</Pie><Tooltip formatter={(value,name)=>[`${formatArea(value)} ha`,name]} contentStyle={{background:'#fff',border:'1px solid #d9e2dd',borderRadius:8,color:'#172b20'}} itemStyle={{color:'#172b20'}} labelStyle={{color:'#172b20'}}/></PieChart></ResponsiveContainer>:<p className="monitor-empty">Không có diện tích dương để vẽ biểu đồ tròn.</p>}
                <ul className="report-outcome-totals">{chart.totals.map(item=><li key={item.key}><span><i style={{background:item.color}}/>{item.label}</span><strong>{formatArea(item.area)} ha</strong></li>)}</ul>
              </section>
              <section className="report-outcome-card report-outcome-bars" aria-label="Biểu đồ cột"><h3>Diện tích theo {level==='province'?'xã':'lô'} (ha)</h3>
                <div className="report-outcome-scroll"><div style={{width:'100%',minWidth:Math.max(280,chart.bars.length*105)}}><ResponsiveContainer width="100%" height={350}><BarChart data={chart.bars} maxBarSize={48} margin={{top:16,right:16,bottom:8,left:4}}><CartesianGrid stroke="#365342" strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" angle={-30} textAnchor="end" interval={0} height={85} tick={{fill:'#bcd9c7',fontSize:11}} tickLine={false}/><YAxis width={64} tick={{fill:'#bcd9c7',fontSize:11}} tickLine={false} axisLine={false} tickFormatter={value=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:1}).format(value)}/><Tooltip formatter={(value,name)=>[`${formatArea(value)} ha`,name]} contentStyle={{background:'#123322',border:'1px solid #40644d',borderRadius:8,color:'#fff'}} itemStyle={{color:'#fff'}} cursor={{fill:'#ffffff08'}}/>{REPORT_OUTCOMES.map(item=><Bar key={item.key} dataKey={item.key} name={item.label} stackId="outcomes" fill={item.color} isAnimationActive={false}/>)}</BarChart></ResponsiveContainer></div></div>
                <div className="report-outcome-legend">{REPORT_OUTCOMES.map(item=><span key={item.key}><i style={{background:item.color}}/>{item.label}</span>)}</div>
              </section>
            </div>
            {chart.missing>0&&<p className="monitor-caption">{chart.missing} lô thiếu {areaLabel.toLowerCase()}, không tính vào diện tích biểu đồ.</p>}
          </>:<p className="monitor-empty">Không có dữ liệu cho biểu đồ.</p>}
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
