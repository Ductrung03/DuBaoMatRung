import { ClipLoader } from 'react-spinners';

export default function MapLoading({active}) {
  return active?<div className="map-loading-overlay" role="status" aria-label="Đang tải dữ liệu bản đồ" aria-live="polite"><div><ClipLoader color="#027e02" size={40}/><span>Đang tải dữ liệu bản đồ…</span></div></div>:null;
}
