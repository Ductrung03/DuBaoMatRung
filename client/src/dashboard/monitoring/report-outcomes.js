export const REPORT_OUTCOMES=[
  {key:'unknown',label:'Chưa xác định',color:'#94a3b8'},
  {key:'notLoss',label:'Không phải mất rừng',color:'#43ce8c'},
  {key:'loss',label:'Mất rừng',color:'#ef6262'},
];
export function reportOutcome(row){
  const reason=String(row.reason??'').normalize('NFC').trim().replace(/\s+/g,' ').toLocaleLowerCase('vi');
  // Only explicit stored results are classifications. Workflow status and area are not results.
  return reason==='mất rừng'?'loss':reason==='không phải mất rừng'?'notLoss':'unknown';
}
export function reportOutcomeSeries(rows,level='province',areaField='area'){
  const grouped=new Map();
  const totals=REPORT_OUTCOMES.map(item=>({...item,area:0,count:0,missing:0}));
  for(const row of rows){
    const key=reportOutcome(row),total=totals.find(item=>item.key===key);
    const name=level==='province'?row.commune||'Chưa xác định xã':row.code||'Chưa có mã';
    if(!grouped.has(name))grouped.set(name,{name,unknown:0,notLoss:0,loss:0});
    total.count++;
    const area=row[areaField];
    if(typeof area!=='number'||!Number.isFinite(area)){total.missing++;continue;}
    total.area+=area;grouped.get(name)[key]+=area;
  }
  return {bars:[...grouped.values()],totals,missing:totals.reduce((sum,item)=>sum+item.missing,0)};
}
