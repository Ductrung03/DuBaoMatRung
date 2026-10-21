import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { alertSnapshot, loadAlertCollection, subscribeAlerts, alertIdentity } from '../maps/alert-source';
import { useAuth } from '../contexts/AuthContext';

export default function useMonitoringData(purpose='monitoring') {
  const {token,user}=useAuth();
  const identity=alertIdentity();
  const state=useSyncExternalStore(subscribeAlerts,()=>alertSnapshot(purpose),()=>alertSnapshot(purpose));
  useEffect(()=>{
    if(!token)return;
    const check=()=>{if(document.visibilityState!=='hidden')loadAlertCollection({purpose}).catch(()=>{});};
    check();const timer=setInterval(check,30000);
    window.addEventListener('focus',check);
    return()=>{clearInterval(timer);window.removeEventListener('focus',check);};
  },[purpose,token,user,identity]);
  const reload=useCallback(()=>loadAlertCollection({purpose,force:true}).catch(()=>{}),[purpose]);
  return {...state,reload};
}
