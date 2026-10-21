const {Pool}=require('pg');let admin;
exports.readLayer=async(req,res,next)=>{
 try{
   if(!['forest','boundaries','compartments'].includes(req.params.name))return res.status(404).json({success:false,message:'Lớp không tồn tại'});
  const box=String(req.query.bbox||'').split(',').map(Number);
  if(box.length!==4||box.some(n=>!Number.isFinite(n))||box[0]>=box[2]||box[1]>=box[3]||box[0]<-180||box[2]>180||box[1]<-90||box[3]>90)return res.status(400).json({success:false,message:'Khung bản đồ không hợp lệ'});
  const actor=req.searchActor,forest=req.params.name==='forest';
  admin ||= new Pool({host:process.env.DB_HOST,port:process.env.DB_PORT||5432,user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.ADMIN_DB_NAME||'admin_db',max:3,statement_timeout:30000});
  let rows;
   if(req.params.name==='boundaries'&&!actor.province&&(actor.tieukhu||actor.khoanh)){
    rows=(await admin.query('SELECT ST_AsGeoJSON(ST_GeomFromText($1,4326)) AS geometry',[req.searchScopeWkt])).rows;
  }else{
    const params=[...box],where=['s.geom && ST_MakeEnvelope($1,$2,$3,$4,4326)'];
    if(!actor.province){params.push(req.searchScopeWkt);where.push('ST_CoveredBy(s.geom,ST_GeomFromText($5,4326))');}
    rows=(await admin.query(`SELECT s.gid,s.xa,${forest?'s.ldlr_23,s.malr3_qd32,':''}ST_AsGeoJSON(ST_SimplifyPreserveTopology(s.geom,0.00002)) AS geometry FROM ${forest?'sonla_hientrangrung':req.params.name==='compartments'?'sonla_tkkl':'sonla_rgx'} s WHERE ${where.join(' AND ')} ORDER BY s.gid LIMIT 1001`,params)).rows;
  }
   res.json({success:true,data:{type:'FeatureCollection',source:forest?'sonla_hientrangrung':req.params.name==='compartments'?'sonla_tkkl':'sonla_rgx',truncated:rows.length>1000,features:rows.slice(0,1000).map((r,index)=>({type:'Feature',id:r.gid??index,geometry:JSON.parse(r.geometry),properties:{gid:r.gid,xa:r.xa,...(forest?{ldlr_23:r.ldlr_23,malr3_qd32:r.malr3_qd32}:{})}}))}});
 }catch(error){next(error);}
};
