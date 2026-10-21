import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function fixture(){
 let now=100000,revision='r1',accessKey='a1',denied=false,ids=[1,2];const calls=[];
 const storage={token:'token1',user:JSON.stringify({id:1,xa:'A',roles:['User'],permissions:['detection.view']})};
 const api={async get(path){calls.push(path);if(denied)throw {message:'denied',response:{status:403,data:{message:'Không có quyền'}}};return path==='/search/revision'?{data:{success:true,data:{revision,accessKey}}}:{data:{success:true,revision,accessKey,data:{type:'FeatureCollection',features:ids.map(id=>({properties:{gid:id}}))}}};}};
 const context={api,normalizeFeatures:features=>features.map(feature=>({id:feature.properties.gid,feature})),localStorage:{getItem:key=>storage[key]},Date:{now:()=>now},AbortController,Set,Map,Promise};
 const source=fs.readFileSync(new URL('./alert-source.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
 vm.runInNewContext(source+';globalThis.publicApi={loadAlertCollection,alertSnapshot,subscribeAlerts};',context);
 return {...context.publicApi,calls,storage,advance:()=>now+=31000,change:(r,a=accessKey,next=ids)=>{revision=r;accessKey=a;ids=next;},deny:()=>denied=true};
}
test('same map collection is shared across mounts; expired browser window checks revision without redownloading geometry',async()=>{
 const f=fixture();await Promise.all([f.loadAlertCollection(),f.loadAlertCollection(),f.loadAlertCollection()]);const before=f.alertSnapshot();assert.equal(f.calls.length,1);await f.loadAlertCollection();assert.equal(f.alertSnapshot(),before);f.advance();await f.loadAlertCollection();assert.deepEqual(f.calls,['/search/mat-rung','/search/revision']);assert.equal(f.alertSnapshot(),before);
});
test('changed revision fetches once; changed authorization discards old data before fetching the new scope',async()=>{
 const f=fixture();await f.loadAlertCollection();f.advance();f.change('r2','a2',[9]);let cleared=false;f.subscribeAlerts(()=>{if(f.alertSnapshot().accessKey==='a2'&&f.alertSnapshot().data===null)cleared=true;});await f.loadAlertCollection();assert.ok(cleared);assert.equal(f.alertSnapshot().rows[0].id,9);assert.equal(f.calls.filter(p=>p==='/search/mat-rung').length,2);
});
test('permission denial and changed login cannot reuse the previous actor collection',async()=>{
 const f=fixture();await f.loadAlertCollection();f.advance();f.deny();await assert.rejects(f.loadAlertCollection());assert.equal(f.alertSnapshot().rows.length,0);assert.equal(f.alertSnapshot().data,null);f.storage.token='token2';assert.equal(f.alertSnapshot().rows.length,0);
});
