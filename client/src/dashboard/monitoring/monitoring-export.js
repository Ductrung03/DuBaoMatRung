import { STATUS, formatArea, formatDate } from './monitoring-data';

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportGeoJSON(rows) {
  downloadBlob(new Blob([JSON.stringify({ type: 'FeatureCollection', features: rows.map(row => row.feature) })], { type: 'application/geo+json' }), 'lo-mat-rung-da-loc.geojson');
}

export function detailCells(row) {
  return [row.code, row.commune, row.compartment, row.subcompartment, row.longitude, row.latitude, STATUS[row.status].label, formatArea(row.verifiedArea), row.reason, row.verifier, formatDate(row.verifiedAt), row.notes].map(v => v ?? '—');
}

export const DETAIL_HEADERS = ['Mã lô', 'Xã', 'Tiểu khu', 'Khoảnh', 'Longitude (X)', 'Latitude (Y)', 'Trạng thái xác minh', 'Diện tích xác minh (ha)', 'Nguyên nhân', 'Người xác minh', 'Ngày xác minh', 'Ghi chú'];

export async function exportExcel(headers, cells) {
  const XLSX = await import('xlsx');
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...cells]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Du lieu');
  XLSX.writeFile(workbook, 'giam-sat-mat-rung.xlsx');
}
