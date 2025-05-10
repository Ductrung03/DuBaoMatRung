import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import config from "../../config";

// Tạo context
const AuthContext = createContext();

// Hook tùy chỉnh để sử dụng context
export const useAuth = () => useContext(AuthContext);

// Provider để bọc quanh app
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Log API URL for debugging
  console.log("🔍 API URL từ config:", config.API_URL);

  // Thiết lập axios defaults khi token thay đổi
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      localStorage.setItem("token", token);
    } else {
      delete axios.defaults.headers.common["Authorization"];
      localStorage.removeItem("token");
    }
  }, [token]);

  // Kiểm tra xem người dùng đã đăng nhập chưa khi component mount
  useEffect(() => {
    const checkLoggedIn = async () => {
      if (token) {
        try {
          const res = await axios.get(`${config.API_URL}/api/auth/me`);
          setUser(res.data.user);
        } catch (err) {
          console.error("Token không hợp lệ hoặc đã hết hạn:", err);
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkLoggedIn();
  }, [token]);

  // Đăng nhập
  const login = async (username, password) => {
    try {
      setLoading(true);
      
      // Log thông tin request để debug
      console.log(`🔄 Đang gửi request đến: ${config.API_URL}/api/auth/login`);
      console.log("📦 Dữ liệu gửi đi:", { username, password: "***" });
      
      const res = await axios.post(`${config.API_URL}/api/auth/login`, {
        username,
        password,
      });

      console.log("✅ Kết quả đăng nhập:", res.data);
      
      setToken(res.data.token);
      setUser(res.data.user);
      toast.success("Đăng nhập thành công!");
      navigate("/dashboard");
      return true;
    } catch (err) {
      console.error("❌ Lỗi đăng nhập:", err);
      
      // Log chi tiết hơn về lỗi
      if (err.response) {
        console.log("📡 Phản hồi từ server:", {
          status: err.response.status,
          data: err.response.data
        });
      }
      
      const errorMessage = err.response?.data?.message || "Tên đăng nhập hoặc mật khẩu không đúng";
      toast.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Đăng xuất
  const logout = async () => {
    try {
      await axios.post(`${config.API_URL}/api/auth/logout`);
    } catch (err) {
      console.error("Lỗi đăng xuất:", err);
    } finally {
      setToken(null);
      setUser(null);
      navigate("/login");
      toast.info("Đã đăng xuất khỏi hệ thống");
    }
  };

  // Kiểm tra vai trò
  const isAdmin = () => user && user.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};