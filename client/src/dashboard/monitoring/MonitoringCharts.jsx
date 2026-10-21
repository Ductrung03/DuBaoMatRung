import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useState } from 'react';
import { alertCountSeries } from './overview-statistics';

export default function MonitoringCharts({ rows }) {
  const [mode,setMode]=useState('month');
  const {series,missing}=alertCountSeries(rows,mode);
  const verified = rows.filter(row => row.status === 'verified').length;
  const unknown = rows.filter(row => row.status === 'unknown').length;
  return <>
    <dl className="monitor-metrics">
      <div><dt>Tổng cảnh báo</dt><dd>{rows.length}</dd></div>
      <div><dt>Đã xác minh</dt><dd>{verified}</dd></div>
      <div><dt>Chưa xác minh xong</dt><dd>{rows.length - verified - unknown}</dd></div>
      {unknown > 0 && <div><dt>Chưa rõ trạng thái</dt><dd>{unknown}</dd></div>}
    </dl>
    <label className="monitor-input"><span>Thống kê theo</span><select aria-label="Thống kê theo" value={mode} onChange={event=>setMode(event.target.value)}><option value="month">Tháng</option><option value="period">Phiên ảnh</option></select></label>
    <p className="monitor-caption">Số cảnh báo theo {mode==='month'?'tháng':'phiên ảnh'} và tình trạng xác minh</p>
    {series.length ? <div className="monitor-chart"><ResponsiveContainer width="100%" height="100%">
      <BarChart data={series} margin={{ left: -20, right: 8, top: 8 }}>
        <XAxis dataKey="key" tickFormatter={key=>series.find(item=>item.key===key)?.tick||key} tick={{ fill: '#52635a', fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fill: '#52635a', fontSize: 10 }} />
        <Tooltip labelFormatter={key=>series.find(item=>item.key===key)?.label||key} contentStyle={{ background: '#ffffff', border: '1px solid #d9e2dd', color: '#172b20' }} />
          <Legend wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="verified" stackId="status" name="Đã xác minh xong" fill="#15803d"/>
          <Bar dataKey="unverified" stackId="status" name="Chưa xác minh xong" fill="#ef6262"/>
          {unknown>0&&<Bar dataKey="unknown" stackId="status" name="Chưa rõ trạng thái" fill="#94a3b8"/>}
      </BarChart>
    </ResponsiveContainer></div> : <p className="monitor-empty">Chưa có dữ liệu thời gian phù hợp.</p>}
    {missing>0&&<p className="monitor-caption">{missing} cảnh báo thiếu khoảng thời gian hợp lệ; chưa đưa vào biểu đồ.</p>}
  </>;
}
