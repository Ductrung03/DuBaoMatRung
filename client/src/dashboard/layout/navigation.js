import { FaTree, FaSearch, FaChartBar, FaUsers, FaUserShield } from 'react-icons/fa';

export const navigationItems = [
  { path: '/dashboard/phathienmatrung', label: 'Giám sát mất rừng', icon: FaTree, pageKey: 'detection' },
  { path: '/dashboard/quanlydulieu', label: 'Tra cứu dữ liệu', icon: FaSearch, pageKey: 'data_management' },
  { path: '/dashboard/baocao', label: 'Báo cáo & thống kê', icon: FaChartBar, pageKey: 'reports' },
  { path: '/dashboard/quanlynguoidung', label: 'Quản lý người dùng', icon: FaUsers, pageKey: 'user_management' },
  { path: '/dashboard/quanlyrole', label: 'Quản lý phân quyền', icon: FaUserShield, pageKey: 'role_management' },
];

export function canOpenPage(user, admin, key) {
  return admin || (user?.permissions || []).some(p => typeof p === 'string' && (p === key || p === '*' || p === 'admin.*' || p.startsWith(`${key}.`)));
}
