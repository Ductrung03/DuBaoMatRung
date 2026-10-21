const test=require('node:test'),assert=require('node:assert/strict');
const {forestTypeSld,applyForestTypeFilter}=require('../src/forest-type-filter');
test('forest filter preserves original colors and wraps selected types as equality predicates',()=>{
 const sld=forestTypeSld('HG1,TXN,TXDK');assert.ok(sld.includes('#008200'));assert.ok(sld.includes('#a0c8a0'));assert.ok(sld.includes('#dcdcdc'));
 for(const code of ['HG1','TXN','TXDK'])assert.ok(sld.includes(`<ogc:Literal>${code}</ogc:Literal>`));assert.ok(!sld.includes('ElseFilter'));
});
test('all-types WMS untouched; selected types do not accept XML/URL/SQL injection',()=>{
 const input={layers:'hientrangrung',request:'GetMap',format:'image/png'};assert.equal(applyForestTypeFilter(input).get('SLD_BODY'),null);
 for(const value of ['','HG1,<xml>','https://bad.example','HG1\';DROP TABLE x','a'.repeat(1100)])assert.throws(()=>forestTypeSld(value));
 assert.throws(()=>applyForestTypeFilter({...input,layers:'ranhgioixa',forest_types:'HG1'}));
 const params=applyForestTypeFilter({...input,forest_types:'HG1',SLD:'https://bad.example',sld_body:'raw',styles:'other'});
 assert.equal(params.get('forest_types'),null);assert.equal(params.get('SLD'),null);assert.equal(params.get('sld_body'),null);assert.equal(params.get('styles'),null);assert.ok(params.get('SLD_BODY').includes('<Name>hientrangrung</Name>'));
});
