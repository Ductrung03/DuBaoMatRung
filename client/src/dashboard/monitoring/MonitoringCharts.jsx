import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { monthlySeries, summarizeCommunes, STATUS } from './monitoring-data';

export default function MonitoringCharts({ rows, manager }) {
  const series = monthlySeries(rows);
  const ranked = summarizeCommunes(rows).slice(0, 5).map(row => ({ name: row.commune || 'Chưa xác định xã', area: row.area }));
  const verified = rows.filter(row => row.status === 'verified').length;
  const unknown = rows.filter(row => row.status === 'unknown').length;
  return <>
    {!manager && <dl className="monitor-metrics">
      <div><dt>Tổng cảnh báo</dt><dd>{rows.length}</dd></div>
      <div><dt>Đã xác minh</dt><dd>{verified}</dd></div>
      <div><dt>Chưa hoàn tất</dt><dd>{rows.length - verified - unknown}</dd></div>
      {unknown > 0 && <div><dt>Chưa rõ trạng thái</dt><dd>{unknown}</dd></div>}
    </dl>}
    <p className="monitor-caption">{manager ? 'Diễn biến diện tích cảnh báo (ha)' : 'Cảnh báo theo tháng và trạng thái'}</p>
    {series.length ? <div className="monitor-chart"><ResponsiveContainer width="100%" height="100%">
      <BarChart data={series} margin={{ left: -20, right: 8, top: 8 }}>
        <XAxis dataKey="month" tick={{ fill: '#bad5c5', fontSize: 10 }} /><YAxis tick={{ fill: '#bad5c5', fontSize: 10 }} />
        <Tooltip contentStyle={{ background: '#123322', border: '1px solid #38694c', color: '#fff' }} />
        {manager ? <Bar dataKey="area" name="Diện tích (ha)" fill="#45c88a" /> : <>
          <Legend wrapperStyle={{ fontSize: 10 }} />
          {Object.entries(STATUS).map(([key, status]) => <Bar key={key} dataKey={key} stackId="status" name={status.label} fill={status.color} />)}
        </>}
      </BarChart>
    </ResponsiveContainer></div> : <p className="monitor-empty">Chưa có dữ liệu thời gian phù hợp.</p>}
    {manager && <><p className="monitor-caption">Địa bàn có diện tích cảnh báo cao nhất</p>
      <ol className="monitor-ranking">{ranked.map((row, index) => <li key={`${row.name}-${index}`}><span>{index + 1}. {row.name}</span><strong>{row.area.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} ha</strong></li>)}</ol>
    </>}
  </>;
}
