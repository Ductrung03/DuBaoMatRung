import { createElement, useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaUser, FaSignOutAlt, FaKey, FaBars } from 'react-icons/fa';
import { useAuth } from '../contexts/AuthContext';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { navigationItems, canOpenPage, isNavigationActive } from './navigation';

export default function Header({ onMenuClick }) {
  const { pathname } = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const userMenuRef = useRef(null);
  const navigationRef = useRef(null);
  useEffect(() => {
    const close = event => {
      if (!userMenuRef.current?.contains(event.target) || event.key === 'Escape') setShowUserMenu(false);
      if(!navigationRef.current?.contains(event.target)||event.key==='Escape')navigationRef.current?.querySelectorAll('details[open]').forEach(el=>el.removeAttribute('open'));
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, []);
  useEffect(() => { setShowUserMenu(false); navigationRef.current?.querySelectorAll('details[open]').forEach(el=>el.removeAttribute('open')); }, [pathname]);
  const roles = (user?.roles || []).map(r => typeof r === 'string' ? r : r.name).filter(Boolean).join(', ');
  const items = navigationItems.filter(item => canOpenPage(user, isAdmin(), item.pageKey));
  const avatar = user?.avatar_url || user?.avatar;
  return <header className="vfis-header">
    <div className="vfis-brand-row">
      {onMenuClick && <button className="lg:hidden" onClick={onMenuClick} aria-label="Mở chức năng trang hiện tại"><FaBars /></button>}
      <Link to="/dashboard" className="vfis-brand" aria-label="VFIS · Trang chủ"><img src="/brand/fis-logo-transparent.png" alt="Logo FIS" /><strong>VFIS</strong></Link>
      <h1>HỆ THỐNG GIÁM SÁT MẤT RỪNG</h1>
      <div className="vfis-account" ref={userMenuRef}>
        <div className="vfis-organization">{user?.organization || 'Chưa cấu hình đơn vị'}</div>
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
    <nav ref={navigationRef} aria-label="Menu chính" className="vfis-navigation">{items.map(item => {
      const {path,label,icon,children}=item;
      const active = isNavigationActive(item,pathname);
      if(children)return <details key={label} className={`vfis-navigation-group ${active?'is-active':''}`}><summary>{createElement(icon)}<span>{label}</span><span aria-hidden="true">▾</span></summary><div className="vfis-subnavigation">{children.filter(child=>canOpenPage(user,isAdmin(),child.pageKey)).map(child=><Link key={child.path} to={child.path} className={isNavigationActive(child,pathname)?'is-active':''} aria-current={isNavigationActive(child,pathname)?'page':undefined}>{child.label}</Link>)}</div></details>;
      return <Link key={path} to={path} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined}>{createElement(icon)}<span>{label}</span></Link>;
    })}</nav>
    <ChangePasswordModal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
  </header>;
}
