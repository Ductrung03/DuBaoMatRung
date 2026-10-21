const { Pool } = require('pg');
let admin;
const adminDb = () => admin ||= new Pool({host:process.env.DB_HOST,port:process.env.DB_PORT||5432,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.ADMIN_DB_NAME||'admin_db',max:3,statement_timeout:30000});
const integer = (input, allowZero=false) => typeof input==='string' && (allowZero?/^\d+$/:/^[1-9]\d*$/).test(input) && Number.isSafeInteger(Number(input)) && Number(input)<=2147483647;

exports.readProfile = async (req,res,next) => {
  try {
    if(!integer(req.params.id)||!integer(req.query.offset??'0',true))return res.status(400).json({success:false,message:'Mã lô hoặc trang dữ liệu không hợp lệ'});
    const actor=req.searchActor;
    if(!actor||(!actor.province&&!req.searchScopeWkt))return res.status(403).json({success:false,message:'Chưa được cấp địa bàn'});
    const params=[Number(req.params.id)];
    const scope=actor.province?'':(params.push(req.searchScopeWkt),' AND ST_CoveredBy(m.geom,ST_GeomFromText($2,4326))');
    const {rows}=await req.app.locals.db.query(`SELECT m.gid,to_jsonb(m)-'geom'-'geom_simplified'-'clipped_geom' AS metadata,ST_Area(m.geom::geography) AS area,ST_AsText(m.geom) AS wkt FROM son_la_mat_rung m WHERE m.gid=$1 AND m.geom IS NOT NULL AND ST_IsValid(m.geom)${scope}`,params);
    if(!rows.length)return res.status(404).json({success:false,message:'Không có lô trong phạm vi được cấp quyền'});
    const row=rows[0],p=row.metadata||{},offset=Number(req.query.offset||0),plotParams=[row.wkt,offset];
    const plotScope=actor.province?'':(plotParams.push(req.searchScopeWkt),' AND ST_CoveredBy(s.geom,ST_GeomFromText($3,4326))');
    const plots=await adminDb().query(`SELECT s.gid,s.xa,s.tk AS tieukhu,s.khoanh,s.lo_rs AS lo,s.ldlr_23 AS loai_rung,s.churung_mo AS chu_rung,s.dtuong AS management_code,s.malr3_qd32 AS chuc_nang_code FROM sonla_hientrangrung s WHERE s.geom && ST_GeomFromText($1,4326) AND ST_Relate(CASE WHEN ST_IsValid(s.geom) THEN s.geom ELSE ST_MakeValid(s.geom) END,ST_GeomFromText($1,4326),'T********')${plotScope} ORDER BY s.gid LIMIT 51 OFFSET $2`,plotParams);
    // Source table is already Unicode. Do not double-convert Vietnamese names.
    const forestPlots=plots.rows.slice(0,50);
    res.json({success:true,data:{alert:{gid:row.gid,detection_date:p.detection_date??null,area_m2:row.area,confidence:p.confidence??p.detection_confidence??p.confidence_score??null,confidence_unit:p.confidence_unit??null,detection_status:p.detection_status??null,before_image_url:p.before_image_url??null,after_image_url:p.after_image_url??null,before_image_date:p.before_image_date??null,after_image_date:p.after_image_date??null},forestPlots,source:'admin_db.sonla_hientrangrung',relation:'polygon_interior_intersection',offset,hasMore:plots.rows.length>50,nextOffset:offset+forestPlots.length}});
  }catch(error){next(error);}
};

exports.forestTypes = async(req,res,next) => {
  try {
    if(!req.searchActor||(!req.searchActor.province&&!req.searchScopeWkt))return res.status(403).json({success:false,message:'Chưa được cấp địa bàn'});
    const params=req.searchActor.province?[]:[req.searchScopeWkt];
    const where=params.length?' WHERE s.geom && ST_GeomFromText($1,4326) AND ST_CoveredBy(s.geom,ST_GeomFromText($1,4326))':'';
    const {rows}=await adminDb().query(`SELECT s.ldlr_23 AS code,count(*)::integer AS count FROM sonla_hientrangrung s${where} GROUP BY s.ldlr_23 ORDER BY s.ldlr_23 NULLS LAST`,params);
    res.json({success:true,data:rows.map(row=>({code:row.code??'__missing__',count:row.count})),source:'sonla_hientrangrung.ldlr_23'});
  }catch(error){next(error);}
};
