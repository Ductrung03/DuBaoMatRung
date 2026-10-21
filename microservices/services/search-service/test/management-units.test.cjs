const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
function fixture(){const context={module:{exports:{}},process,require(name){if(name==='pg')return {Pool:class{}};return require(name);}};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../src/management-units.js'),'utf8'),context);return context.module.exports;}
test('only matching assigned commune/compartment gets unit; duplicates collapse, joint managers retained',()=>{
 const {attachManagementUnits}=fixture(),features=[{properties:{xa:'Xã A',tk:'1',khoanh:'2'}},{properties:{xa:'Xã B',tk:'1',khoanh:'2'}},{properties:{xa:null}}];
 attachManagementUnits(features,[{xa:'Xã A',organization:'Hạt A'},{xa:'Xã A',organization:'Hạt A'},{xa:'Xã A',tieukhu:'1',khoanh:'2',organization:'BQL cùng Hạt'},{xa:'Xã A',tieukhu:'9',organization:'Ngoài phạm vi'}]);
 assert.equal(features[0].properties.management_unit,'BQL cùng Hạt; Hạt A');assert.equal(features[1].properties.management_unit,null);assert.equal(features[2].properties.management_unit,null);assert.ok(!JSON.stringify(features).includes('Ngoài phạm vi'));
});
test('organization assignment read is active-role scoped, independent of alert verification/forest owner',()=>{
 const source=fs.readFileSync(require('node:path').join(__dirname,'../src/management-units.js'),'utf8');assert.ok(source.includes('u.is_active AND r.is_active'));assert.ok(source.includes("['Hạt kiểm lâm']"));assert.ok(!source.includes('u.password'));assert.ok(!source.includes('UPDATE '));
});
