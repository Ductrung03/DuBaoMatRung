// Original hientrangrung mapfile colors and class opacity; no new classifications.
const rules=[
 [/^HG1$/i,'#008200',.90,'#005000',.8,.95],[/^HG2$/i,'#22aa22',.85,'#147814',.7,.90],
 [/^HGD$/i,'#009600',.92,'#006400',.8,.95],[/^RTG$/i,'#3cdc3c',.85,'#28a028',.6,.90],
 [/^RTN$/i,'#78a032',.80,'#5a7828',.6,.85],[/^RTK$/i,'#8cff32',.80,'#64c81e',.6,.85],
 [/^TXG$/i,'#a0faa0',.75,'#50c878',.5,.85],[/^TXN$/i,'#a0c8a0',.75,'#648c3c',.5,.80],
 [/^TXK$/i,'#aaffaa',.70,'#78b432',.5,.80],[/^LKG$/i,'#d2c882',.75,'#a09632',.5,.85],
 [/^LKN$/i,'#f0b432',.70,'#c88c14',.5,.80],[/^LKK$/i,'#faf5be',.70,'#d2c882',.4,.80],
 [/^LKP$/i,'#faf0a0',.70,'#d2be78',.4,.80],[/^DT1[D]?$/i,'#ffb46e',.70,'#e67832',.5,.80],
 [/^DT2[D]?$/i,'#fff0dc',.65,'#e6c8a0',.4,.75],[/^DTR[D]?$/i,'#ffe6be',.70,'#f0c896',.5,.80],
 [/^(DNN|NND)$/i,'#fffcdc',.65,'#d2c882',.4,.75],[/^DKH$/i,'#f0f0f0',.60,'#b4b4b4',.4,.70],
 [/.*/,'#dcdcdc',.55,'#b4b4b4',.3,.65]
];
function forestTypeSld(input) {
 if(typeof input!=='string'||input.length>1024)throw new Error('Loại rừng không hợp lệ');
 const codes=[...new Set(input.split(','))];
 if(!codes.length||codes.length>100||codes.some(code=>!/^([A-Za-z0-9_-]{1,32})$/.test(code)))throw new Error('Loại rừng không hợp lệ');
 const groups=new Map();
 for(const code of codes){const index=rules.findIndex(([pattern])=>pattern.test(code));if(!groups.has(index))groups.set(index,[]);groups.get(index).push(code);}
 const body=[...groups].map(([index,group])=>{
  const [,fill,alpha,stroke,width,strokeAlpha]=rules[index];
  const filters=group.map(code=>code==='__missing__'?'<ogc:PropertyIsNull><ogc:PropertyName>ldlr_23</ogc:PropertyName></ogc:PropertyIsNull>':`<ogc:PropertyIsEqualTo><ogc:PropertyName>ldlr_23</ogc:PropertyName><ogc:Literal>${code}</ogc:Literal></ogc:PropertyIsEqualTo>`);
  return `<Rule><ogc:Filter>${filters.length>1?'<ogc:Or>'+filters.join('')+'</ogc:Or>':filters[0]}</ogc:Filter><PolygonSymbolizer><Fill><CssParameter name="fill">${fill}</CssParameter><CssParameter name="fill-opacity">${alpha}</CssParameter></Fill><Stroke><CssParameter name="stroke">${stroke}</CssParameter><CssParameter name="stroke-width">${width}</CssParameter><CssParameter name="stroke-opacity">${strokeAlpha}</CssParameter></Stroke></PolygonSymbolizer></Rule>`;
 }).join('');
 return `<?xml version="1.0"?><StyledLayerDescriptor version="1.0.0" xmlns="http://www.opengis.net/sld" xmlns:ogc="http://www.opengis.net/ogc"><NamedLayer><Name>hientrangrung</Name><UserStyle><FeatureTypeStyle>${body}</FeatureTypeStyle></UserStyle></NamedLayer></StyledLayerDescriptor>`;
}
function applyForestTypeFilter(query) {
 const entry=Object.entries(query).find(([key])=>key.toLowerCase()==='forest_types');
 if(!entry)return new URLSearchParams(query);
 const values=Object.fromEntries(Object.entries(query).map(([key,value])=>[key.toLowerCase(),value]));
 if(values.layers!=='hientrangrung'||String(values.request).toLowerCase()!=='getmap')throw new Error('Bộ lọc chỉ áp dụng cho lớp hiện trạng rừng');
 const params=new URLSearchParams(query);
 for(const key of [...params.keys()])if(['forest_types','sld','sld_body','styles'].includes(key.toLowerCase()))params.delete(key);
 params.set('SLD_BODY',forestTypeSld(entry[1]));
 return params;
}
module.exports={forestTypeSld,applyForestTypeFilter};
