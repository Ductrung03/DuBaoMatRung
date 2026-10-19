// Shared by monitoring, reports and exports. Database areas are square metres.
export const MISSING = 'Chưa có dữ liệu';
export const STATUS = {
  pending: { label: 'Chưa kiểm tra', color: '#ef6262' },
  processing: { label: 'Đang xử lý', color: '#fb923c' },
  verified: { label: 'Đã xong', color: '#facc15' },
  unknown: { label: 'Chưa xác định', color: '#94a3b8' },
};

export function value(...values) {
  return values.find(v => v !== null && v !== undefined && v !== '') ?? null;
}

export function numberOrNull(input) {
  if (input === null || input === undefined || input === '' || typeof input === 'boolean') return null;
  const number = Number(input);
  return Number.isFinite(number) ? number : null;
}

export function statusOf(p) {
  const raw = String(value(p.detection_status, p.verification_status, '')).trim();
  if (['Đã xác minh', 'Đã xong'].includes(raw) || (!raw && [1, '1', true].includes(p.xacminh))) return 'verified';
  if (['Đang xác minh', 'Đang xử lý'].includes(raw)) return 'processing';
  if (['Chưa xác minh', 'Chưa kiểm tra', 'Mới'].includes(raw) || (!raw && [0, '0', false].includes(p.xacminh))) return 'pending';
  return 'unknown';
}

export function normalizeFeature(feature) {
  const p = feature.properties || {};
  const id = value(p.gid, feature.id);
  return {
    feature,
    id: id === null ? null : String(id),
    code: value(p.lo_canbao, id === null ? null : `PH-${id}`),
    commune: value(p.xa_name, p.xa),
    district: value(p.huyen_name, p.huyen),
    village: value(p.thon, p.ban, p.village),
    compartment: value(p.tk, p.tieukhu),
    subcompartment: value(p.khoanh),
    unit: value(p.management_unit, p.don_vi_quan_ly),
    origin: value(p.forest_origin, p.nguon_goc_rung),
    purpose: value(p.forest_function, p.chuc_nang_rung),
    forestType: value(p.forest_type, p.loai_rung),
    owner: value(p.forest_owner, p.chu_rung),
    area: numberOrNull(p.dtich) === null ? null : Number(p.dtich) / 10000,
    verifiedArea: numberOrNull(value(p.dtichXM, p.dtich_xm, p.verified_area)) === null ? null : Number(value(p.dtichXM, p.dtich_xm, p.verified_area)) / 10000,
    // end_sau is the existing search-service time axis, not a claimed image capture date.
    periodDate: value(p.end_sau),
    imageDate: value(p.image_date, p.acquisition_date),
    updatedAt: value(p.updated_at),
    updatedBy: value(p.updated_by_name, p.updated_by),
    verifier: value(p.verified_by_name, p.verified_by),
    verifiedAt: value(p.verified_at),
    reason: value(p.verification_reason, p.nguyennhan),
    notes: value(p.verification_notes, p.ghi_chu),
    longitude: numberOrNull(p.x),
    latitude: numberOrNull(p.y),
    coordinateSource: value(p.coordinate_source, 'Tâm hình học polygon (WGS84), không phải tọa độ hiện trường'),
    status: statusOf(p),
    rawStatus: value(p.detection_status),
    beforeImage: value(p.before_image_url),
    afterImage: value(p.after_image_url),
    forestPlots: Array.isArray(p.forest_plots) ? p.forest_plots : [],
  };
}

export function normalizeFeatures(features = []) {
  const seen = new Set();
  return features.map(normalizeFeature).filter(row => {
    // Deduplicate only identical record IDs. Do not merge spatially overlapping alerts.
    if (row.id === null) return true;
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
}

export const EMPTY_FILTERS = { from: '', to: '', commune: '', unit: '', village: '', compartment: '', status: '', origin: '', purpose: '', reason: '', query: '' };

export function filterRows(rows, filters) {
  return rows.filter(row => {
    const date = row.periodDate?.slice(0, 10);
    if (filters.from && (!date || date < filters.from)) return false;
    if (filters.to && (!date || date > filters.to)) return false;
    for (const field of ['commune', 'unit', 'village', 'compartment', 'status', 'origin', 'purpose', 'reason']) {
      if (field === 'status' && filters.status === 'unverified') {
        if (!['pending', 'processing'].includes(row.status)) return false;
        continue;
      }
      if (filters[field] && (field === 'reason' ? (row.reason || 'Chưa xác định nguyên nhân') : row[field]) !== filters[field]) return false;
    }
    const query = filters.query?.trim().toLocaleLowerCase('vi');
    return !query || [row.code, row.commune, row.village, row.owner, row.reason].some(v => String(v || '').toLocaleLowerCase('vi').includes(query));
  });
}

export const optionsFor = (rows, field) => [...new Set(rows.map(row => row[field]).filter(v => v !== null && v !== ''))].sort((a, b) => String(a).localeCompare(String(b), 'vi'));
export const sumArea = (rows, field = 'area') => rows.reduce((sum, row) => sum + (row[field] ?? 0), 0);
export const formatArea = area => area === null || area === undefined ? '—' : area.toLocaleString('vi-VN', { maximumFractionDigits: 3 });
export const formatDate = input => {
  if (!input) return '—';
  const date = new Date(input);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('vi-VN');
};

export function summarizeCommunes(rows) {
  const groups = new Map();
  rows.forEach(row => {
    const key = JSON.stringify([row.commune, row.unit]);
    if (!groups.has(key)) groups.set(key, { key, commune: row.commune, unit: row.unit, count: 0, area: 0, verified: 0, missingArea: 0 });
    const group = groups.get(key);
    group.count++;
    group.area += row.area ?? 0;
    if (row.area === null) group.missingArea++;
    if (row.status === 'verified') group.verified++;
  });
  return [...groups.values()].sort((a, b) => b.area - a.area);
}

export function monthlySeries(rows) {
  const groups = new Map();
  rows.forEach(row => {
    const month = row.periodDate?.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month || '')) return;
    if (!groups.has(month)) groups.set(month, { month, area: 0, verified: 0, pending: 0, processing: 0, unknown: 0 });
    const group = groups.get(month);
    group.area += row.area ?? 0;
    group[row.status]++;
  });
  return [...groups.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function monthRange(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const [year, m] = month.split('-').map(Number);
  const day = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return { from: `${month}-01`, to: `${month}-${day}` };
}

export function reportRows(rows, level, areaField) {
  if (level === 'commune') return rows.map(row => ({ key: row.id ?? row.code, commune: row.commune, code: row.code, reason: row.reason || 'Chưa xác định nguyên nhân', count: 1, area: row[areaField] }));
  const groups = new Map();
  rows.forEach(row => {
    const reason = row.reason || 'Chưa xác định nguyên nhân';
    const key = JSON.stringify([row.commune, reason]);
    if (!groups.has(key)) groups.set(key, { key, commune: row.commune, reason, count: 0, area: null });
    const group = groups.get(key);
    group.count++;
    if (row[areaField] !== null) group.area = (group.area ?? 0) + row[areaField];
  });
  return [...groups.values()].sort((a, b) => String(a.commune).localeCompare(String(b.commune), 'vi'));
}

export function isManager(user) {
  // Presentation only; the server remains responsible for data scope.
  const roles = [...(user?.roles || []), ...(user?.userRoles || []).map(r => r.role)].filter(Boolean);
  return roles.some(role => ['Admin', 'LanhDao', 'admin', 'super_admin'].includes(typeof role === 'string' ? role : role.name)) || user?.permission_level === 'admin' || user?.role === 'admin';
}
