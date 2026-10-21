// Presentation groups, not a new forestry code dictionary.
export function forestOriginGroup(value){
  const key=String(value??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  return ['tu nhien','rung tu nhien','natural'].includes(key)?'natural':['trong','rung trong','planted'].includes(key)?'planted':null;
}
const day=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}/.test(value)&&Number.isFinite(Date.parse(value.slice(0,10)))&&new Date(value.slice(0,10)).toISOString().slice(0,10)===value.slice(0,10)?value.slice(0,10):null;
export function alertCountSeries(rows,mode='month'){
  const groups=new Map();let missing=0;
  for(const row of rows){
    const p=row.feature?.properties||{},dates=[p.start_dau,p.end_dau,p.start_sau,p.end_sau].map(day);
    const end=day(row.periodDate);
    if(mode==='period'?dates.some(date=>!date)||dates[0]>dates[1]||dates[2]>dates[3]:!end){missing++;continue;}
    const key=mode==='period'?JSON.stringify(dates):end.slice(0,7);
    if(!groups.has(key))groups.set(key,{key,label:mode==='period'?`${dates[0]} – ${dates[1]} → ${dates[2]} – ${dates[3]}`:key,tick:mode==='period'?dates[3]:key,sort:mode==='period'?dates[3]+dates.join(''):key,total:0,verified:0,unverified:0,unknown:0});
    const group=groups.get(key);group.total++;group[row.status==='verified'?'verified':['pending','processing'].includes(row.status)?'unverified':'unknown']++;
  }
  return {series:[...groups.values()].sort((a,b)=>a.sort.localeCompare(b.sort)),missing};
}
