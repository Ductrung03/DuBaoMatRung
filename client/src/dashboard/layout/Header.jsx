import React from "react";
import { Link, useLocation } from "react-router-dom";

const Header = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path) => currentPath === path;

  return (
    <header className="bg-gradient-to-r from-forest-green-primary from-30% to-forest-green-secondary text-white w-full flex items-center h-16 px-4 shadow-md">
      {/* Logo và icon */}
      <div className="flex items-center gap-2">
        <Link to="/dashboard">
          <a>
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
          </a>
        </Link>
        {/* Tiêu đề */}
        <div>
          <h1 className="text-xl font-bold uppercase">
            Phần mềm dự báo mất rừng tỉnh Lào Cai
          </h1>
          <div className="flex gap-8 mt-1">
            <Link to="/dashboard/dubaomatrung">
              <a
                className={`text-base font-semibold hover:underline ${
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
                className={`text-base font-semibold hover:underline ${
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
                className={`text-base font-semibold hover:underline ${
                  isActive("/dashboard/baocao") ? "text-red-600" : "text-white"
                }`}
              >
                Báo cáo
              </a>
            </Link>
            <Link to="/dashboard/phathienmatrung">
              <a
                className={`text-base font-semibold hover:underline ${
                  isActive("/dashboard/phathienmatrung")
                    ? "text-red-600"
                    : "text-white"
                }`}
              >
                Phát hiện mất rừng
              </a>
            </Link>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="ml-auto flex items-center">
        <div className="w-10 h-10 rounded-full bg-red-100 border-2 border-white overflow-hidden">
          <img
            src="/avatar-placeholder.png"
            alt="User profile"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </header>
  );
};

export default Header;
