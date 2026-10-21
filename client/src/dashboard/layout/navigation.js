import { FaHome, FaTree, FaSearch, FaChartBar, FaUsers, FaUserShield } from 'react-icons/fa';

export const navigationItems = [
  { path: '/dashboard', label: 'Tổng quan', icon: FaHome, pageKey: 'monitoring' },
  { path: '/dashboard/dubaomatrung', label: 'Giám sát mất rừng', icon: FaTree, pageKey: 'surveillance', children: [
    { path: '/dashboard/dubaomatrung', label: 'Dự báo tự động / Tùy chỉnh', pageKey: 'forecast' },
    { path: '/dashboard/phathienmatrung?tool=imagery', label: 'Xử lý ảnh viễn thám', pageKey: 'detection' },
  ] },
  { path: '/dashboard/quanlydulieu', label: 'Tra cứu dữ liệu', icon: FaSearch, pageKey: 'data_management' },
  { path: '/dashboard/baocao', label: 'Báo cáo & thống kê', icon: FaChartBar, pageKey: 'reports' },
  { path: '/dashboard/quanlynguoidung', label: 'Quản lý người dùng', icon: FaUsers, pageKey: 'user_management' },
  { path: '/dashboard/quanlyrole', label: 'Quản lý phân quyền', icon: FaUserShield, pageKey: 'role_management' },
];

export function canOpenPage(user, admin, key) {
  if(key==='surveillance')return canOpenPage(user,admin,'forecast')||canOpenPage(user,admin,'detection');
  if(key==='monitoring')return admin||(user?.permissions||[]).some(p=>['data_management.forecast_search','detection.view','*','admin.*'].includes(p));
  return admin || (user?.permissions || []).some(p => typeof p === 'string' && (p === key || p === '*' || p === 'admin.*' || p.startsWith(`${key}.`)));
}

export function isNavigationActive(item, pathname) {
  if(item.children)return item.children.some(child=>isNavigationActive(child,pathname));
  const path=item.path.split('?')[0];
  const current=pathname.replace(/\/+$/,'');
  return current===path||(path!=='/dashboard'&&current.startsWith(`${path}/`));
}

export function isWorkspacePage(pathname) {
  return ['/dashboard','/dashboard/baocao','/dashboard/quanlynguoidung','/dashboard/quanlyrole'].includes(pathname.replace(/\/+$/,''));
}
