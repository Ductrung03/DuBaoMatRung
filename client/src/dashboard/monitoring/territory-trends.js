import { filterRows, monthRange, sumArea } from './monitoring-data.js';

export function territoryTrends(rows, filters) {
  const groups=new Map();
  // Preserve non-time filters; an explicit time range selects the current month,
  // but its predecessor may be outside that range.
  for(const row of filterRows(rows,{...filters,from:'',to:''})){
    const month=row.periodDate?.slice(0,7);
    if(!monthRange(month||''))continue;
    const key=JSON.stringify([row.commune,row.unit]);
    if(!groups.has(key))groups.set(key,new Map());
    const months=groups.get(key);
    if(!months.has(month))months.set(month,[]);
    months.get(month).push(row);
  }
  const selected=new Set(filterRows(rows,filters).map(row=>JSON.stringify([row.commune,row.unit,row.periodDate?.slice(0,7)])));
  return new Map([...groups].map(([key,months])=>{
    const [commune,unit]=JSON.parse(key);
    const ordered=[...months.keys()].sort().reverse();
    const current=ordered.find(month=>selected.has(JSON.stringify([commune,unit,month])));
    const previous=ordered.find(month=>current&&month<current);
    if(!current||!previous)return [key,current?`Địa bàn chỉ có cảnh báo kỳ kết thúc tháng ${current}; chưa có tháng khác để so sánh.`:'Chưa có dữ liệu kỳ so sánh tại địa bàn.'];
    const first=months.get(previous),last=months.get(current),period=`${current} / ${previous}`;
    if([...first,...last].some(row=>row.area===null))return [key,`${period}: Thiếu diện tích`];
    const before=sumArea(first),after=sumArea(last);
    if(before===0)return [key,`${period}: ${after===0?'Không đổi (0 ha)':'Phát sinh mới (kỳ trước 0 ha)'}`];
    const difference=(after-before)/before*100;
    return [key,`${period}: ${difference>0?'Tăng':difference<0?'Giảm':'Không đổi'} ${Math.abs(difference).toLocaleString('vi-VN',{maximumFractionDigits:1})}%`];
  }));
}
