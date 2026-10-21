import api from '../../services/api';

const TTL = 30000; // Never extend the previous browser authorization-cache window.
const MAX_BYTES = 24 * 1024 * 1024;
let identity = null;
let bytes = 0;
const entries = new Map();
const contains = (outer, inner) => outer[0] <= inner[0] && outer[1] <= inner[1] && outer[2] >= inner[2] && outer[3] >= inner[3];
const remove = key => { const entry = entries.get(key); if (entry) bytes -= entry.bytes; entries.delete(key); };

export function requestBox(name, box) {
  if (name === 'boundaries') return [95, 5, 115, 30]; // All 75 commune outlines, still server-scoped.
  if (box.length !== 4 || box.some(n => !Number.isFinite(n)) || box[0] >= box[2] || box[1] >= box[3]) throw new Error('Khung bản đồ không hợp lệ');
  const dx = (box[2] - box[0]) / 4, dy = (box[3] - box[1]) / 4;
  return [Math.max(-180, Math.floor((box[0]-dx)*10000)/10000), Math.max(-85, Math.floor((box[1]-dy)*10000)/10000), Math.min(180, Math.ceil((box[2]+dx)*10000)/10000), Math.min(85, Math.ceil((box[3]+dy)*10000)/10000)];
}

export async function loadMapLayer({name, box, scopeKey, signal}) {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Chưa đăng nhập');
  const session = `${token}:${scopeKey}`;
  if (identity !== session) { entries.clear(); bytes = 0; identity = session; }
  const requested = requestBox(name, box), key = `${name}:${requested.join(',')}`;
  for (const [cachedKey, entry] of entries) {
    if (Date.now()-entry.at >= TTL) { remove(cachedKey); continue; }
    if (entry.name === name && (cachedKey === key || (!entry.data.truncated && contains(entry.box, box)))) return entry.data;
  }
  const {data} = await api.get(`/search/layers/${name}`, {params:{bbox:requested.join(',')}, signal});
  if (signal?.aborted || identity !== session || token !== localStorage.getItem('token')) throw new Error('Phiên dữ liệu đã thay đổi');
  if (!data.success || !Array.isArray(data.data?.features)) throw new Error('Phản hồi lớp bản đồ không hợp lệ');
  const size = JSON.stringify(data.data).length * 2;
  if (size <= MAX_BYTES) {
    remove(key);
    while (entries.size && (entries.size >= 12 || bytes+size > MAX_BYTES)) remove(entries.keys().next().value);
    entries.set(key, {name,box:requested,data:data.data,at:Date.now(),bytes:size}); bytes+=size;
  }
  return data.data;
}
