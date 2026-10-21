const {sql}=require('kysely');
module.exports=function scopedKysely(req){
  const db=req.app.locals.kyselyDb;
  if(!req.searchScopeWkt)return db;
  // A non-recursive CTE shadows only the alert table for this request. All
  // existing selects/aggregates/limits therefore see authorized rows first.
  return db.with('son_la_mat_rung',qb=>qb.selectFrom('son_la_mat_rung').selectAll()
    .where(sql`ST_CoveredBy(geom,ST_GeomFromText(${req.searchScopeWkt},4326))`));
};
