const PAGES=new Set(['/dashboard','/dashboard/dubaomatrung','/dashboard/quanlydulieu']);
export const mapPageKey=pathname=>{const path=pathname.replace(/\/+$/,'');return PAGES.has(path)?path:null;};
export const shouldResetMapWork=(previous,next)=>previous!==next&&Boolean(mapPageKey(previous)||mapPageKey(next));
export function freshMapPresentation(previous){
  return {base:previous.base||'satellite',layers:{forest:true,boundaries:true,compartments:false,alerts:true,labels:true,opacity:.75,hiddenForestTypes:[],hiddenAlertStatuses:[],hiddenAlertKinds:[],forestTypeCatalog:previous.layers?.forestTypeCatalog,forestCount:previous.layers?.forestCount??null}};
}
