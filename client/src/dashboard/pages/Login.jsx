// client/src/dashboard/pages/Login.jsx - WITH PASSWORD TOGGLE
import React, { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { ClipLoader } from "react-spinners";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // ✅ NEW: Password visibility
  const { user, login, loading } = useAuth();

  // Nếu đã đăng nhập thì redirect về dashboard
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(username, password);
  };

  // ✅ NEW: Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center px-4 py-8 sm:py-12">
      <div className="max-w-md w-full space-y-6 sm:space-y-8">
        {/* Header - Responsive */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 sm:h-20 sm:w-20 bg-green-600 rounded-full flex items-center justify-center mb-3 sm:mb-4">
            <div className="grid grid-cols-2 grid-rows-2 gap-1">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-sm"></div>
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-sm"></div>
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-sm"></div>
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-sm"></div>
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Đăng nhập hệ thống
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-gray-600">
            Hệ thống phát hiện sớm mất rừng tỉnh Sơn La
          </p>
        </div>

        {/* Form - Responsive */}
        <form className="mt-6 sm:mt-8 space-y-5 sm:space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Username - Responsive */}
            <div>
              <label htmlFor="username" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Tên đăng nhập
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaUser className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-9 sm:pl-10 pr-3 py-3 sm:py-3 min-h-[48px] border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base text-gray-900"
                  placeholder="Nhập tên đăng nhập"
                />
              </div>
            </div>

            {/* Password with toggle - Responsive */}
            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaLock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 sm:pl-10 pr-12 py-3 sm:py-3 min-h-[48px] border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm sm:text-base text-gray-900"
                  placeholder="Nhập mật khẩu"
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 min-w-[44px] min-h-[44px]"
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                >
                  {showPassword ? <FaEyeSlash className="h-4 w-4 sm:h-5 sm:w-5" /> : <FaEye className="h-4 w-4 sm:h-5 sm:w-5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Submit Button - Responsive with proper touch target */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 min-h-[48px] border border-transparent text-sm sm:text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <ClipLoader color="#ffffff" size={20} className="mr-2" />
                  <span className="text-sm sm:text-base">Đang đăng nhập...</span>
                </div>
              ) : (
                "Đăng nhập"
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default Login;