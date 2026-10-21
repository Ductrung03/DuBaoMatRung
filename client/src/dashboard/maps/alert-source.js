import api from '../../services/api';
import { normalizeFeatures } from '../monitoring/monitoring-data';

const CHECK_INTERVAL=30000;
const listeners=new Set(),entries=new Map();
let identity=null;
export function alertIdentity(){
  const token=localStorage.getItem('token');
  if(!token)return '';
  let user={};try{user=JSON.parse(localStorage.getItem('user')||'{}')||{};}catch{/* Server still validates the token. */}
  const roles=[...new Set([...(user.roles||[]),...(user.userRoles||[]).map(item=>item.role)].map(role=>typeof role==='string'?role:role?.name).filter(Boolean))].sort();
  return JSON.stringify([token,user.id,user.xa||'',user.tieukhu||'',user.khoanh||'',roles,[...new Set(user.permissions||[])].sort()]);
}
const notify=()=>listeners.forEach(listener=>listener());
export const subscribeAlerts=listener=>{listeners.add(listener);return()=>listeners.delete(listener);};
function entryFor(purpose){
  const nextIdentity=alertIdentity();
  if(identity!==nextIdentity){entries.forEach(entry=>entry.controller?.abort());entries.clear();identity=nextIdentity;}
  if(!entries.has(purpose))entries.set(purpose,{identity,at:0,data:null,pending:null,snapshot:{rows:[],loading:Boolean(identity),refreshing:false,error:'',data:null}});
  return entries.get(purpose);
}
export const alertSnapshot=(purpose='monitoring')=>entryFor(purpose).snapshot;
export function loadAlertCollection({purpose='monitoring',force=false}={}){
  const entry=entryFor(purpose),session=identity;
  if(!session)return Promise.reject(new Error('Chưa đăng nhập'));
  if(entry.pending&&!force)return entry.pending;
  if(!force&&entry.data&&Date.now()-entry.at<CHECK_INTERVAL)return Promise.resolve({data:entry.data});
  entry.controller?.abort();
  const controller=new AbortController();entry.controller=controller;
  const valid=()=>!controller.signal.aborted&&session===alertIdentity()&&entries.get(purpose)===entry;
  entry.pending=(async()=>{
    if(entry.data){
      const {data}=await api.get('/search/revision',{params:{purpose},signal:controller.signal});
      if(!data.success||!data.data?.revision||!data.data?.accessKey)throw new Error('Không kiểm tra được phiên bản dữ liệu');
      if(!valid())throw new Error('Phiên dữ liệu đã thay đổi');
      if(!force&&data.data.revision===entry.data.revision&&data.data.accessKey===entry.data.accessKey){entry.at=Date.now();return {data:entry.data};}
      if(data.data.accessKey!==entry.data.accessKey){entry.data=null;entry.snapshot={rows:[],data:null,accessKey:data.data.accessKey,loading:true,refreshing:false,error:''};notify();}
    }
    entry.snapshot={...entry.snapshot,loading:force||!entry.data,refreshing:Boolean(entry.data),error:''};notify();
    const {data}=await api.get('/search/mat-rung',{params:{limit:0,purpose,includeForestFunctions:true},signal:controller.signal,timeout:120000});
    if(!data.success||!Array.isArray(data.data?.features))throw new Error('Phản hồi dữ liệu không hợp lệ');
    if(!valid())throw new Error('Phiên dữ liệu đã thay đổi');
    entry.data=data;entry.at=Date.now();
    entry.snapshot={rows:normalizeFeatures(data.data.features),accessKey:data.accessKey,loading:false,refreshing:false,error:'',data};notify();
    return {data};
  })().catch(error=>{
    if(valid()){entry.data=null;entry.snapshot={rows:[],data:null,loading:false,refreshing:false,error:error.response?.data?.message||error.message||'Không thể tải dữ liệu'};notify();}
    throw error;
  }).finally(()=>{if(entry.controller===controller)entry.pending=null;});
  return entry.pending;
}
