export function presentTrend(value){
  const split=value?.match(/^(\d{4}-\d{2} \/ \d{4}-\d{2}): (.*)$/);
  const text=split?.[2]||'';
  if(!text)return {text:'—',tone:'unknown',title:value||'Chưa có dữ liệu so sánh'};
  return {text,tone:text.startsWith('Giảm')?'decrease':text.startsWith('Tăng')||text.startsWith('Phát sinh mới')?'increase':'unknown',title:split[1]};
}
