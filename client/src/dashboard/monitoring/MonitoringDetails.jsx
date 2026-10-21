import { FaTimes } from 'react-icons/fa';
import { formatArea, formatDate, MISSING, STATUS, numberOrNull } from './monitoring-data';
import usePlotProfile from '../maps/usePlotProfile';
import HistoricalImageComparison from './HistoricalImageComparison';
import { useState } from 'react';

function Fields({items}) {
  return <dl className="monitor-fields">{items.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value===null||value===undefined||value===''?MISSING:String(value)}</dd></div>)}</dl>;
}

export default function MonitoringDetails({row,onClose}) {
  const profile=usePlotProfile(row.id);
  const [acquisitionDate,setAcquisitionDate]=useState(null);
  const alert=profile.data?.alert;
  const plots=profile.data?.forestPlots||[];
  const area=alert?numberOrNull(alert.area_m2)===null?null:Number(alert.area_m2)/10000:row.area;
  return <aside className="monitor-detail" aria-label="Thông tin lô mất rừng">
    <header><h2>Hồ sơ lô: {row.code||'Chưa có mã'}</h2><button onClick={onClose} aria-label="Đóng hồ sơ lô"><FaTimes/></button></header>
    <div className="monitor-detail-scroll">
      {profile.loading&&<p role="status">Đang tải hồ sơ…</p>}
      {profile.error&&<p role="alert" className="monitor-error">{profile.error}<button onClick={profile.reload}>Thử lại hồ sơ</button></p>}
      <section><h3>1. THÔNG TIN LÔ MẤT RỪNG</h3><Fields items={[
        ['Mã lô',row.code],['Xã',row.commune],['Tiểu khu',row.compartment],['Khoảnh',row.subcompartment],
        ['Diện tích (ha)',formatArea(area)],
        ['Ngày thu nhận ảnh',acquisitionDate||alert?.after_image_date||row.afterImageDate?formatDate(acquisitionDate||alert?.after_image_date||row.afterImageDate):null],
        ['Nguyên nhân',row.reason],['Ngày cập nhật',row.updatedAt?formatDate(row.updatedAt):null],['Người cập nhật',typeof row.updatedBy==='number'?`Tài khoản #${row.updatedBy}`:row.updatedBy],
        ['Trạng thái',alert?.detection_status||row.rawStatus||STATUS[row.status].label]
      ]}/>
        <div className="profile-comparison" aria-label="Hình ảnh trước và sau khi mất rừng">{profile.loading?<p role="status">Đang đọc dữ liệu ảnh…</p>:profile.error?<p>Chưa đọc được dữ liệu ảnh.</p>:String(alert?.gid)===String(row.id)&&<HistoricalImageComparison key={row.id} feature={row.feature} onAcquisitionDate={setAcquisitionDate}/>}</div>
      </section>
      <section><h3>2. THÔNG TIN LÔ HIỆN TRẠNG RỪNG</h3>
        {plots.map(plot=><div className="profile-source-plot" key={plot.gid}><Fields items={[
          ['Mã lô hiện trạng',plot.gid],['Thôn',plot.thon??null],['Xã',plot.xa],['Tiểu khu',plot.tieukhu],['Khoảnh',plot.khoanh],['Lô',plot.lo],['Loại đất, loại rừng',plot.loai_rung_name||plot.loai_rung],['Chủ quản lý',plot.chu_rung]
        ]}/></div>)}
        {!profile.loading&&!profile.error&&!plots.length&&<p className="monitor-empty">Chưa có dữ liệu gốc trong phạm vi được cấp quyền.</p>}
        {profile.data?.hasMore&&<button disabled={profile.moreLoading} onClick={profile.loadMore}>{profile.moreLoading?'Đang tải…':'Xem thêm lô gốc'}</button>}
      </section>
    </div>
  </aside>;
}
