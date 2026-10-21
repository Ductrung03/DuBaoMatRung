const {Pool}=require('pg');
const {createHash}=require('crypto');
let admin;
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
async function readRevision(req,assignments) {
  const actor=req.searchActor;
  if(!actor)throw Object.assign(new Error('Chưa xác thực phạm vi dữ liệu'),{status:401});
  admin ||= new Pool({host:process.env.DB_HOST,port:process.env.DB_PORT||5432,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.ADMIN_DB_NAME||'admin_db',max:2,statement_timeout:15000});
  const [gis,forest,units]=await Promise.all([
    req.app.locals.db.query('SELECT count(*)::text AS count,sum(xmin::text::bigint)::text AS version,max(gid)::text AS last_gid FROM son_la_mat_rung'),
    admin.query(`SELECT 'forest' AS source,count(*)::text AS count,sum(xmin::text::bigint)::text AS version FROM sonla_hientrangrung UNION ALL SELECT 'communes',count(*)::text,sum(xmin::text::bigint)::text FROM sonla_rgx UNION ALL SELECT 'compartments',count(*)::text,sum(xmin::text::bigint)::text FROM sonla_tkkl`),
    assignments?Promise.resolve(assignments):require('./management-units').readAssignments()
  ]);
  return {revision:hash(['forest-types-v2',gis.rows,forest.rows,units.revision]),accessKey:hash([actor.id,[...actor.roles].sort(),[...actor.permissions].sort(),actor.province,actor.xa,actor.tieukhu,actor.khoanh,req.searchScopeWkt||'']),access:{province:actor.province,xa:actor.xa||'',tieukhu:actor.tieukhu||'',khoanh:actor.khoanh||''}};
}
async function readRevisionRoute(req,res,next){try{res.set('Cache-Control','private, no-store');res.json({success:true,data:await readRevision(req)});}catch(error){next(error);}}
module.exports={readRevision,readRevisionRoute};
