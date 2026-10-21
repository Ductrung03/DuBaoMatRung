const denied=message=>Object.assign(new Error(message),{status:403,statusCode:403});
function permission(req,code){
  const actor=req.searchActor;
  if(!actor||(!actor.roles.some(r=>['admin','super_admin','Admin'].includes(r))&&!actor.permissions.includes(code)))throw denied('Không có quyền thực hiện thao tác này');
}
async function ids(req,input){
  if(input.some(id=>!((typeof id==='number'&&Number.isSafeInteger(id)&&id>0)||(typeof id==='string'&&/^[1-9]\d*$/.test(id)))))throw Object.assign(new Error('Mã lô không hợp lệ'),{status:400,statusCode:400});
  const values=[...new Set(input.map(Number))];
  if(!values.length||values.length>10000||values.some(id=>!Number.isSafeInteger(id)||id<=0))throw Object.assign(new Error('Mã lô không hợp lệ'),{status:400,statusCode:400});
  const result=await req.app.locals.db.query('SELECT gid FROM son_la_mat_rung WHERE gid=ANY($1::integer[]) AND ($2::text IS NULL OR ST_CoveredBy(geom,ST_GeomFromText($2,4326)))',[values,req.searchScopeWkt||null]);
  if(result.rows.length!==values.length)throw denied('Lô không tồn tại hoặc ngoài địa bàn được cấp');
}
const param=(req,res,next,gid)=>ids(req,[gid]).then(()=>next(),next);
async function verification(req,res,next){
  try{
    permission(req,'data_management.verification');
    const body=req.body||{};
    if(body.gid!==undefined)await ids(req,[body.gid]);
    if(Array.isArray(body.gids))await ids(req,body.gids);
    if(Array.isArray(body.records))await ids(req,body.records.map(r=>r.gid));
    next();
  }catch(error){next(error);}
}
module.exports={permission,ids,param,verification};
