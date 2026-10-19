import { createElement, useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaUser, FaSignOutAlt, FaKey, FaBars } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { navigationItems, canOpenPage } from './navigation';

export default function Header({ onMenuClick }) {
  const { pathname } = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const userMenuRef = useRef(null);
  useEffect(() => {
    const close = event => {
      if (!userMenuRef.current?.contains(event.target) || event.key === 'Escape') setShowUserMenu(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, []);
  useEffect(() => { setShowUserMenu(false); }, [pathname]);
  const roles = (user?.roles || []).map(r => typeof r === 'string' ? r : r.name).filter(Boolean).join(', ');
  const items = navigationItems.map(item => item.pageKey === 'detection' && !canOpenPage(user, isAdmin(), 'detection') && canOpenPage(user, isAdmin(), 'forecast') ? { ...item, path: '/dashboard/dubaomatrung', pageKey: 'forecast' } : item).filter(item => canOpenPage(user, isAdmin(), item.pageKey));
  const avatar = user?.avatar_url || user?.avatar;
  return <header className="vfis-header">
    <div className="vfis-brand-row">
      {onMenuClick && <button className="lg:hidden" onClick={onMenuClick} aria-label="Mở chức năng trang hiện tại"><FaBars /></button>}
      <Link to="/dashboard" className="vfis-brand" aria-label="VFIS · Trang chủ"><img src="/brand/fis-logo.jpeg" alt="Logo FIS" /><strong>VFIS</strong></Link>
      <h1>HỆ THỐNG GIÁM SÁT MẤT RỪNG</h1>
      <div className="vfis-account" ref={userMenuRef}>
        <div className="vfis-organization">CHI CỤC KIỂM LÂM TỈNH SƠN LA</div>
        <button className="vfis-account-button" aria-label="Menu tài khoản" aria-expanded={showUserMenu} onClick={() => setShowUserMenu(open => !open)}>
          <span><b>{user?.username || user?.full_name || 'Tài khoản'}</b>{roles && <small>{roles}</small>}</span>
          <span className="vfis-avatar">{avatar && !avatarFailed ? <img src={avatar} onError={() => setAvatarFailed(true)} alt="Ảnh đại diện tài khoản" /> : <FaUser />}</span>
        </button>
        {showUserMenu && <div className="vfis-account-menu">
          <p>Đăng nhập với <b>{user?.username}</b></p>
          <button onClick={() => { setShowUserMenu(false); setShowPasswordModal(true); }}><FaKey /> Đổi mật khẩu</button>
          <button onClick={logout}><FaSignOutAlt /> Đăng xuất</button>
        </div>}
      </div>
    </div>
    <nav aria-label="Menu chính" className="vfis-navigation">{items.map(({ path, label, icon }) => {
      const active = pathname.startsWith(path) || (path.endsWith('/phathienmatrung') && pathname.startsWith('/dashboard/dubaomatrung'));
      return <Link key={path} to={path} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined}>{createElement(icon)}<span>{label}</span></Link>;
    })}</nav>
    <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
  </header>;
}
