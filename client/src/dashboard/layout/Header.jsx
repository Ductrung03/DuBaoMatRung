import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FaUser, FaSignOutAlt, FaUserCog, FaKey } from "react-icons/fa";
import ChangePasswordModal from "../components/ChangePasswordModal";

const Header = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const { user, logout, isAdmin } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const userMenuRef = useRef(null);

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const isActive = (path) => currentPath === path;

  return (
    <header className="bg-gradient-to-r from-forest-green-primary from-30% to-forest-green-secondary text-white w-full flex items-center h-16 px-4 shadow-md relative z-40">
      {/* Logo và icon */}
      <div className="flex items-center gap-2">
        <Link to="/dashboard">
          <div className="w-10 h-10 bg-white rounded-md flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-green-700 rounded flex items-center justify-center">
              <div className="grid grid-cols-2 grid-rows-2 gap-0.5">
                <div className="w-2 h-2 bg-green-700 rounded-sm"></div>
                <div className="w-2 h-2 bg-green-700 rounded-sm"></div>
                <div className="w-2 h-2 bg-green-700 rounded-sm"></div>
                <div className="w-2 h-2 bg-green-700 rounded-sm"></div>
              </div>
            </div>
          </div>
        </Link>
        {/* Tiêu đề */}
        <div>
          <h1 className="text-xl font-bold uppercase">
            Hệ thống phát hiện sớm mất rừng tỉnh Lào Cai
          </h1>
          <div className="flex gap-8 mt-1">
            <Link to="/dashboard/dubaomatrung">
              <a
                className={`text-base font-semibold hover:underline transition-colors ${
                  isActive("/dashboard/dubaomatrung")
                    ? "text-red-600"
                    : "text-white"
                }`}
              >
                Dự báo mất rừng
              </a>
            </Link>
            <Link to="/dashboard/quanlydulieu">
              <a
                className={`text-base font-semibold hover:underline transition-colors ${
                  isActive("/dashboard/quanlydulieu")
                    ? "text-red-600"
                    : "text-white"
                }`}
              >
                Quản lý dữ liệu
              </a>
            </Link>
            <Link to="/dashboard/baocao">
              <a
                className={`text-base font-semibold hover:underline transition-colors ${
                  isActive("/dashboard/baocao") ? "text-red-600" : "text-white"
                }`}
              >
                Báo cáo
              </a>
            </Link>
            {isAdmin() && (<Link to="/dashboard/phathienmatrung">
              <a
                className={`text-base font-semibold hover:underline transition-colors ${
                  isActive("/dashboard/phathienmatrung")
                    ? "text-red-600"
                    : "text-white"
                }`}
              >
                Phát hiện mất rừng
              </a>
            </Link>)}
            
            {isAdmin() && (
              <Link to="/dashboard/quanlynguoidung">
                <a
                  className={`text-base font-semibold hover:underline transition-colors ${
                    isActive("/dashboard/quanlynguoidung")
                      ? "text-red-600"
                      : "text-white"
                  }`}
                >
                  Quản lý người dùng
                </a>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="ml-auto relative" ref={userMenuRef}>
        <div
          className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
          onClick={() => setShowUserMenu(!showUserMenu)}
        >
          <div className="w-10 h-10 rounded-full bg-red-100 border-2 border-white overflow-hidden flex items-center justify-center">
            <FaUser className="text-gray-600 text-lg" />
          </div>
          {user && (
            <div className="ml-2 text-sm">
              <div className="font-semibold">{user.full_name}</div>
              <div className="text-xs opacity-80">
                {user.role === "admin" ? "Quản trị viên" : "Người dùng"}
              </div>
            </div>
          )}
        </div>

        {/* User Menu với z-index cực cao */}
        {showUserMenu && (
          <div 
            className="user-menu-dropdown absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1"
            style={{ 
              zIndex: 99998,
              position: 'absolute',
              top: '100%',
              right: 0,
              backgroundColor: 'white',
              borderRadius: '0.375rem',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              border: '1px solid #e5e7eb'
            }}
          >
            <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
              Đăng nhập với{" "}
              <span className="font-semibold">{user?.username}</span>
            </div>

            {isAdmin() && (
              <Link
                to="/dashboard/quanlynguoidung"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
                onClick={() => setShowUserMenu(false)}
              >
                <FaUserCog className="mr-2" />
                Quản lý người dùng
              </Link>
            )}

            <button
              onClick={() => {
                setShowUserMenu(false);
                setShowPasswordModal(true);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center transition-colors"
            >
              <FaKey className="mr-2" />
              Đổi mật khẩu
            </button>

            <button
              onClick={logout}
              className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 flex items-center transition-colors"
            >
              <FaSignOutAlt className="mr-2" />
              Đăng xuất
            </button>
          </div>
        )}
      </div>

      {/* Modal đổi mật khẩu với z-index cực cao */}
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        style={{ zIndex: 100000 }}
      />
    </header>
  );
};

export default Header;