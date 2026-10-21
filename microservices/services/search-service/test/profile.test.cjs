const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
function fixture({found=true,province=true}={}){
 const calls={gis:[],admin:[]};
 const plot={gid:10,xa:'Xã A',tieukhu:'150',khoanh:'2',lo:'3',loai_rung:'HG1',chu_rung:'Chủ gốc'};
 const context={exports:{},process,require(name){if(name==='pg')return {Pool:class{async query(sql,params){calls.admin.push({sql,params});return {rows:Array.from({length:51},(_,i)=>({...plot,gid:i+10}))};}}};if(name.includes('tcvn3'))return {convertTcvn3ToUnicode:value=>value};throw Error(name);}};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/controllers/profile.controller.js'),'utf8'),context);
 const req={params:{id:'1'},query:{},searchActor:{province},searchScopeWkt:province?undefined:'POLYGON EMPTY',app:{locals:{db:{async query(sql,params){calls.gis.push({sql,params});return {rows:found?[{gid:1,area:0,wkt:'POLYGON EMPTY',metadata:{detection_status:'Mới phát hiện',end_sau:'2026-10-15',confidence:0}}]:[]};}}}}};
 const res={statusCode:200,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};
 return {req,res,calls,run:()=>context.exports.readProfile(req,res,e=>{throw e;})};
}
test('profile rejects malformed identifiers and offsets before DB reads',async()=>{
 for(const id of ['1e2','1.0','-1','0','1 OR true','2147483648']){const f=fixture();f.req.params.id=id;await f.run();assert.equal(f.res.statusCode,400);assert.equal(f.calls.gis.length,0);}
 const f=fixture();f.req.query.offset='-1';await f.run();assert.equal(f.res.statusCode,400);
});
test('unscoped restricted profile fails closed and out-of-scope alert cannot query original plots',async()=>{
 const missing=fixture({province:false});delete missing.req.searchScopeWkt;await missing.run();assert.equal(missing.res.statusCode,403);assert.equal(missing.calls.gis.length,0);
 const f=fixture({province:false,found:false});await f.run();assert.equal(f.res.statusCode,404);assert.equal(f.calls.admin.length,0);
});
test('profile scopes both alert and original forest records; preserves zero and never substitutes period dates or images',async()=>{
 const f=fixture({province:false});await f.run();assert.equal(f.res.statusCode,200);
 assert.ok(f.calls.gis[0].sql.includes('ST_CoveredBy'));assert.ok(f.calls.admin[0].sql.includes('ST_CoveredBy'));assert.ok(f.calls.admin[0].sql.includes('sonla_hientrangrung'));assert.ok(f.calls.admin[0].sql.includes("'T********'"));
 const {alert,forestPlots,hasMore,nextOffset}=f.res.body.data;
 assert.equal(alert.detection_date,null);assert.equal(alert.confidence,0);assert.equal(alert.area_m2,0);assert.equal(alert.before_image_url,null);assert.equal(alert.after_image_url,null);
 assert.equal(forestPlots.length,50);assert.equal(hasMore,true);assert.equal(nextOffset,50);assert.equal(forestPlots[0].loai_rung,'HG1');assert.equal(forestPlots[0].chu_rung,'Chủ gốc');
 assert.ok(!('geometry'in forestPlots[0]));
});
