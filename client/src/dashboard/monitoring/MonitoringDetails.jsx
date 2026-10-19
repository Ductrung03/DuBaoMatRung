import { FaTimes } from 'react-icons/fa';
import { formatArea, formatDate, MISSING, STATUS } from './monitoring-data';

function Fields({ items }) {
  return <dl className="monitor-fields">{items.map(([label, val]) => <div key={label}><dt>{label}</dt><dd>{val === null || val === undefined || val === '' ? MISSING : String(val)}</dd></div>)}</dl>;
}

function safeImage(url) {
  if (typeof url !== 'string') return null;
  try {
    const parsed = new URL(url, window.location.origin);
    return ['https:', 'http:'].includes(parsed.protocol) ? parsed.href : null;
  } catch { return null; }
}

export default function MonitoringDetails({ row, manager, onClose }) {
  return <aside className="monitor-detail" aria-label="Thông tin lô mất rừng">
    <header><h2>Hồ sơ lô: {row.code || 'Chưa có mã'}</h2><button onClick={onClose} aria-label="Đóng hồ sơ lô"><FaTimes /></button></header>
    <div className="monitor-detail-scroll">
      <section><h3>1. THÔNG TIN LÔ MẤT RỪNG</h3><Fields items={[
        ['Mã lô', row.code], ['Xã', row.commune], ['Tiểu khu', row.compartment], ['Khoảnh', row.subcompartment],
        ['Diện tích cảnh báo (ha)', formatArea(row.area)], ['Diện tích xác minh (ha)', formatArea(row.verifiedArea)],
        ['Ngày thu nhận ảnh', row.imageDate ? formatDate(row.imageDate) : null],
        ['Kết thúc kỳ ảnh sau', formatDate(row.periodDate)], ['Trạng thái', STATUS[row.status].label],
        ['Trạng thái nguồn', row.rawStatus], ['Nguyên nhân', row.reason], ['Ngày cập nhật', row.updatedAt ? formatDate(row.updatedAt) : null],
        ['Người cập nhật', row.updatedBy], ['Người xác minh', row.verifier], ['Ngày xác minh', row.verifiedAt ? formatDate(row.verifiedAt) : null],
      ]} /></section>
      <section><h3>2. LÔ HIỆN TRẠNG RỪNG (GỐC)</h3>
        {row.forestPlots.length ? row.forestPlots.map((plot, index) => <Fields key={plot.id ?? index} items={[
          ['Xã', plot.xa], [manager ? 'Huyện' : 'Thôn/Bản', manager ? plot.huyen : plot.thon],
          ['Tiểu khu', plot.tieukhu], ['Khoảnh', plot.khoanh], ['Lô', plot.lo],
          ['Loại đất, loại rừng', plot.loai_rung], ['Chủ quản lý', plot.chu_rung],
        ]} />) : <p className="monitor-empty">Chưa có liên kết lô hiện trạng rừng cho cảnh báo này. Không dùng thông tin lô cảnh báo để thay thế lô gốc.</p>}
      </section>
      <section><h3>3. ẢNH VỆ TINH ĐỐI CHỨNG</h3>
        <div className="monitor-images">{[['Trước khi mất', row.beforeImage], ['Sau khi mất', row.afterImage]].map(([title, image]) => <figure key={title}>
          <figcaption>{title}</figcaption>{safeImage(image) ? <img src={safeImage(image)} alt={`Ảnh vệ tinh ${title.toLowerCase()} của ${row.code}`} /> : <p>Chưa có ảnh</p>}
        </figure>)}</div>
      </section>
      <section><h3>TỌA ĐỘ THAM CHIẾU</h3><Fields items={[
        ['Kinh độ (X)', row.longitude], ['Vĩ độ (Y)', row.latitude], ['Nguồn tọa độ', row.coordinateSource], ['Ghi chú', row.notes],
      ]} /></section>
    </div>
  </aside>;
}
