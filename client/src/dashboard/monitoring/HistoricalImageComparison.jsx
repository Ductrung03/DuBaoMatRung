import { useEffect, useState } from 'react';
import ImageComparison from './ImageComparison';
import { loadHistoricalImages } from './historical-imagery';

export default function HistoricalImageComparison({feature,onAcquisitionDate}) {
  const [state,setState]=useState({loading:true});
  useEffect(()=>{
    const controller=new AbortController();let active=true;
    const timeout=setTimeout(()=>controller.abort(),45000);
    setState({loading:true});
    loadHistoricalImages(feature,{signal:controller.signal}).then(data=>{if(active){setState({data});onAcquisitionDate?.(data.after?.date||null);}}).catch(error=>{if(active)setState({error:controller.signal.aborted?'Nguồn ảnh phản hồi quá lâu. Vui lòng thử lại.':error.message});}).finally(()=>{clearTimeout(timeout);controller.abort();});
    return()=>{active=false;clearTimeout(timeout);controller.abort();};
  },[feature,onAcquisitionDate]);
  if(state.loading)return <p role="status">Đang tìm ảnh lịch sử đúng vị trí và kỳ cảnh báo…</p>;
  if(state.error)return <p role="alert">{state.error}</p>;
  const {before,after}=state.data;
  return <div className="historical-image-comparison">
    {before&&after&&before.date>=after.date&&<p role="alert">Ngày chụp hai kỳ trùng nhau hoặc không theo thứ tự thời gian. Không thể dùng cặp này để kết luận biến động.</p>}
    <ImageComparison key={`${before?.url}:${after?.url}`} before={before?.url} after={after?.url} beforeDate={before?.date} afterDate={after?.date}/>
  </div>;
}
