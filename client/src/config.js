const config = {
  // Gateway URL - Always use production server since we're deployed
  API_URL: "http://103.56.160.66:3000",

  // API Base URL (for axios calls) - All requests go through Gateway
  API_BASE_URL: "http://103.56.160.66:3000/api",

  // MapServer URL - Direct to MapServer service
  MAPSERVER_URL: "http://103.56.160.66:3007/wms"
};

// Log để debug
// 🔧 BƯỚC 4: Thêm vào client/src/config.js hoặc tạo file mới

// ✅ AUTO FIX TOKEN UTILITY
export const autoFixToken = async () => {
  const currentToken = localStorage.getItem('token');
  
  if (!currentToken) {
    return { success: false, message: "No token to fix" };
  }

  try {
    // Gọi emergency fix endpoint
    const response = await fetch('/api/emergency/fix-token', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Content-Type': 'application/json'
      }
    });

    const result = await response.json();

    if (response.ok && result.success) {
      // Lưu token mới
      localStorage.setItem('token', result.token);
      
      // Cập nhật user info nếu có
      if (result.user) {
        localStorage.setItem('user', JSON.stringify(result.user));
      }

      return { 
        success: true, 
        message: "Token đã được fix thành công!",
        newToken: result.token,
        fixInfo: result.fix_info
      };
    } else {
      return { 
        success: false, 
        message: result.message || "Fix token thất bại"
      };
    }
  } catch (error) {
    console.error("❌ Auto fix error:", error);
    return { 
      success: false, 
      message: "Lỗi khi fix token: " + error.message
    };
  }
};

// ✅ AXIOS INTERCEPTOR để tự động fix token khi gặp 401
export const setupTokenAutoFix = (axiosInstance) => {
  let isFixing = false;

  axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      
      // Nếu lỗi 401 và chưa thử fix
      if (error.response?.status === 401 && !originalRequest._retry && !isFixing) {
        
        originalRequest._retry = true;
        isFixing = true;

        try {
          const fixResult = await autoFixToken();
          
          if (fixResult.success) {
            
            // Update Authorization header with new token
            originalRequest.headers.Authorization = `Bearer ${fixResult.newToken}`;
            
            isFixing = false;
            return axiosInstance(originalRequest);
          } else {
            isFixing = false;
            
            // Clear tokens và redirect
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            
            return Promise.reject(error);
          }
        } catch (fixError) {
          console.error("❌ Auto fix error:", fixError);
          isFixing = false;
          return Promise.reject(error);
        }
      }
      
      return Promise.reject(error);
    }
  );
};

// ✅ REACT HOOK để dùng trong component
import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';

export const useTokenFix = () => {
  const [isFixing, setIsFixing] = useState(false);

  const fixToken = useCallback(async () => {
    if (isFixing) return;
    
    setIsFixing(true);
    toast.info("🔧 Đang fix token...");

    try {
      const result = await autoFixToken();
      
      if (result.success) {
        toast.success("✅ Token đã được fix thành công!");
        
        // Reload page để apply token mới
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
        return true;
      } else {
        toast.error("❌ " + result.message);
        return false;
      }
    // eslint-disable-next-line no-unused-vars
    } catch (error) {
      toast.error("❌ Lỗi khi fix token");
      return false;
    } finally {
      setIsFixing(false);
    }
  }, [isFixing]);

  return { fixToken, isFixing };
};

// ✅ BROWSER CONSOLE HELPER
if (typeof window !== 'undefined') {
  window.fixTokenNow = async () => {
    const result = await autoFixToken();
    
    if (result.success) {
      setTimeout(() => window.location.reload(), 1000);
    } else {
    }
    
    return result;
  };
  
}
// Thêm vào cuối file config.js

// ✅ DEBUG: Check current auth status
if (typeof window !== 'undefined') {
  window.checkAuthStatus = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    
    if (token) {
      // Try to decode JWT manually (without verification)
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
      } catch (e) {
      }
    }
    
    return { token, user: user ? JSON.parse(user) : null };
  };
  
}
export default config;