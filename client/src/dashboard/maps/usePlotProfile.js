import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function usePlotProfile(id) {
  const {token}=useAuth();
  const [version,setVersion]=useState(0);
  const [state,setState]=useState({data:null,loading:true,moreLoading:false,error:''});
  const request=useRef(null);
  useEffect(()=>{
    const controller=new AbortController();request.current=controller;
    setState({data:null,loading:true,moreLoading:false,error:''});
    if(!id||!/^\d+$/.test(String(id))){setState({data:null,loading:false,moreLoading:false,error:'Lô chưa có mã định danh hợp lệ.'});return()=>controller.abort();}
    api.get(`/search/alerts/${id}/profile`,{signal:controller.signal}).then(({data})=>{
      if(!data.success||!data.data?.alert||!Array.isArray(data.data?.forestPlots))throw new Error('Phản hồi hồ sơ không hợp lệ');
      if(!controller.signal.aborted)setState({data:data.data,loading:false,moreLoading:false,error:''});
    }).catch(error=>{if(!controller.signal.aborted)setState({data:null,loading:false,moreLoading:false,error:error.response?.data?.message||'Không tải được hồ sơ lô.'});});
    return()=>controller.abort();
  },[id,token,version]);
  const loadMore=async()=>{
    if(!state.data?.hasMore||state.moreLoading)return;
    const controller=request.current;
    setState(old=>({...old,moreLoading:true,error:''}));
    try {
      const {data}=await api.get(`/search/alerts/${id}/profile`,{params:{offset:state.data.nextOffset},signal:controller.signal});
      if(!data.success||!Array.isArray(data.data?.forestPlots))throw new Error('Phản hồi hồ sơ không hợp lệ');
      if(!controller.signal.aborted)setState(old=>({...old,data:{...data.data,forestPlots:[...old.data.forestPlots,...data.data.forestPlots]},moreLoading:false}));
    }catch(error){if(!controller.signal.aborted)setState(old=>({...old,moreLoading:false,error:error.response?.data?.message||'Không tải được trang dữ liệu gốc.'}));}
  };
  return {...state,loadMore,reload:()=>setVersion(n=>n+1)};
}
