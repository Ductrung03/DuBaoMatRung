import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function fixture({truncated=false}={}) {
  const source=fs.readFileSync(new URL('./layer-source.js',import.meta.url),'utf8').replace(/^import .*$/m,'').replaceAll('export ','');
  let token='identity-a',now=1000;
  const calls=[];
  const api={async get(url,options){calls.push({url,options});return {data:{success:true,data:{type:'FeatureCollection',truncated,features:[]}}};}};
  const localStorage={getItem:()=>token};
  const result=new Function('api','localStorage','Date',source+';return {loadMapLayer,requestBox};')(api,localStorage,{now:()=>now});
  return {...result,calls,token:value=>{token=value;},tick:ms=>{now+=ms;}};
}

test('boundary zoom changes reuse one complete server-scoped outline request',async()=>{
  const f=fixture();
  await f.loadMapLayer({name:'boundaries',box:[103,20,105,22],scopeKey:'commune-a'});
  await f.loadMapLayer({name:'boundaries',box:[103.5,20.5,104.5,21.5],scopeKey:'commune-a'});
  assert.equal(f.calls.length,1);
  assert.equal(f.calls[0].options.params.bbox,'95,5,115,30');
});

test('forest zoom within a complete buffered collection does not fetch again',async()=>{
  const f=fixture();
  const original=await f.loadMapLayer({name:'forest',box:[103,20,105,22],scopeKey:'commune-a'});
  const zoomed=await f.loadMapLayer({name:'forest',box:[103.5,20.5,104.5,21.5],scopeKey:'commune-a'});
  assert.equal(original,zoomed);assert.equal(f.calls.length,1);
  f.tick(30001);await f.loadMapLayer({name:'forest',box:[103.5,20.5,104.5,21.5],scopeKey:'commune-a'});
  assert.equal(f.calls.length,2);
});

test('truncated forest collections are never used to claim complete zoomed-in coverage',async()=>{
  const f=fixture({truncated:true});
  await f.loadMapLayer({name:'forest',box:[103,20,105,22],scopeKey:'commune-a'});
  await f.loadMapLayer({name:'forest',box:[103.5,20.5,104.5,21.5],scopeKey:'commune-a'});
  assert.equal(f.calls.length,2);
});

test('layer cache is invalidated by login identity and territory changes',async()=>{
  const f=fixture(),request={name:'boundaries',box:[103,20,105,22],scopeKey:'commune-a'};
  await f.loadMapLayer(request);f.token('identity-b');await f.loadMapLayer(request);
  await f.loadMapLayer({...request,scopeKey:'commune-b'});assert.equal(f.calls.length,3);
  f.token(null);await assert.rejects(f.loadMapLayer(request),/Chưa đăng nhập/);
});

test('malformed/reversed forest bounds never reach the API',async()=>{
  const f=fixture();
  for(const box of [[105,20,103,22],[NaN,20,105,22],[103,22,105,20]])assert.throws(()=>f.requestBox('forest',box));
  assert.equal(f.calls.length,0);
});
