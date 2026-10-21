const { Pool } = require('pg');
const { createHash } = require('crypto');
let auth;
async function readAssignments() {
  auth ||= new Pool({host:process.env.DB_HOST,port:process.env.DB_PORT||5432,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.AUTH_DB_NAME||'auth_db',max:2,statement_timeout:10000});
  // Organizational assignment fields only, never credentials/contact data.
  const {rows}=await auth.query(`SELECT DISTINCT u.xa,u.tieukhu,u.khoanh,trim(u.organization) AS organization FROM "User" u JOIN "UserRole" ur ON ur.user_id=u.id JOIN "Role" r ON r.id=ur.role_id WHERE u.is_active AND r.is_active AND r.name=$1 AND NULLIF(trim(u.xa),'') IS NOT NULL AND NULLIF(trim(u.organization),'') IS NOT NULL ORDER BY u.xa,u.tieukhu,u.khoanh,organization`,['Hạt kiểm lâm']);
  return {rows,revision:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};
}
function attachManagementUnits(features, assignments) {
  for(const feature of features){
    const p=feature.properties;
    const units=[...new Set(assignments.filter(a=>a.xa===(p.xa_name||p.xa)&&(!a.tieukhu||String(a.tieukhu)===String(p.tk??''))&&(!a.khoanh||String(a.khoanh)===String(p.khoanh??''))).map(a=>a.organization))].sort();
    p.management_units=units;
    p.source_management_unit=p.management_unit??null;
    p.management_unit=units.length?units.join('; '):null;
    p.management_unit_source='active_hat_kiem_lam_territory_assignment';
  }
}
module.exports={readAssignments,attachManagementUnits};
