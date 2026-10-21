// Current database identity and geographic scope, shared by read services.
const jwt=require('jsonwebtoken');
const {Pool}=require('pg');
const connection=()=>({host:process.env.DB_HOST,port:process.env.DB_PORT||5432,user:process.env.DB_USER,password:process.env.DB_PASSWORD,max:3,connectionTimeoutMillis:10000,statement_timeout:30000});
let auth,admin;
const fail=(status,message)=>Object.assign(new Error(message),{status,statusCode:status});
async function currentAccess(req,res,next){
 try{
  let decoded;try{decoded=jwt.verify((req.headers.authorization||'').replace(/^Bearer /,''),process.env.JWT_SECRET,{algorithms:['HS256']});}catch{throw fail(401,'Phiên đăng nhập không hợp lệ hoặc hết hạn');}
  auth ||= new Pool({...connection(),database:process.env.AUTH_DB_NAME||'auth_db'});
  const result=await auth.query(`SELECT u.id,u.username,u.full_name,u.xa,u.tieukhu,u.khoanh,
    COALESCE((SELECT array_agg(DISTINCT r.name) FROM "UserRole" ur JOIN "Role" r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.is_active),'{}') AS roles,
    COALESCE((SELECT array_agg(DISTINCT p.code) FROM "UserRole" ur JOIN "Role" r ON r.id=ur.role_id JOIN "RolePermission" rp ON rp.role_id=r.id JOIN "Permission" p ON p.id=rp.permission_id WHERE ur.user_id=u.id AND r.is_active AND p.is_active),'{}') AS permissions
    FROM "User" u WHERE u.id=$1 AND u.is_active`,[decoded.id]);
  const actor=result.rows[0];if(!actor)throw fail(401,'Tài khoản không còn hoạt động');
  const adminRole=actor.roles.some(r=>['admin','super_admin','Admin'].includes(r));
  const read=['detection.view','data_management.forecast_search','data_management.satellite_search','data_management.verification','forecast.auto','forecast.custom','reports.view'];
  if(!adminRole&&!read.some(p=>actor.permissions.includes(p)))throw fail(403,'Không có quyền tra cứu dữ liệu');
  if(req.query.purpose==='report'&&!adminRole&&!actor.permissions.includes('reports.view'))throw fail(403,'Không có quyền xem báo cáo');
  actor.province=adminRole||actor.roles.some(role=>['Công ty Fis','Chi cục kiểm lâm','Admin','LanhDao'].includes(role))||actor.permissions.includes('detection.scope_province');
  if(!actor.province&&!actor.xa)throw fail(403,'Tài khoản chưa được cấp phạm vi xã');
  req.searchActor=actor;
  req.headers['x-user-id']=String(actor.id);
  req.headers['x-user-username']=encodeURIComponent(actor.username||'');
  req.resolveSearchNames=async ids=>(await auth.query('SELECT id,full_name FROM "User" WHERE id=ANY($1::integer[])',[ids])).rows;
  req.headers['x-user-roles']=encodeURIComponent(actor.roles.join(','));
  req.headers['x-user-xa']=actor.xa?encodeURIComponent(actor.xa):'';
  req.headers['x-user-tieukhu']=actor.tieukhu?encodeURIComponent(actor.tieukhu):'';
  req.headers['x-user-khoanh']=actor.khoanh?encodeURIComponent(actor.khoanh):'';
  if(!actor.province){
    admin ||= new Pool({...connection(),database:process.env.ADMIN_DB_NAME||'admin_db'});
    const params=[actor.xa],where=['xa=$1'];
    if(actor.tieukhu){params.push(actor.tieukhu);where.push(`tieukhu=$${params.length}`);}
    if(actor.khoanh){params.push(actor.khoanh);where.push(`khoanh=$${params.length}`);}
    const table=actor.tieukhu||actor.khoanh?'sonla_tkkl':'sonla_rgx';
    const scope=await admin.query(`SELECT ST_AsText(ST_UnaryUnion(ST_Collect(geom))) AS wkt FROM ${table} WHERE ${where.join(' AND ')}`,params);
    req.searchScopeWkt=scope.rows[0]?.wkt;if(!req.searchScopeWkt)throw fail(403,'Không tìm thấy hình học địa bàn được cấp');
  }
  next();
 }catch(error){next(error);}
}
module.exports={currentAccess};
