const config = {
  API_URL: import.meta.env.VITE_API_URL || "http://localhost:3000"
};

// Log để debug
console.log("🔄 Đã load config với API_URL:", config.API_URL);
// 🔧 BƯỚC 4: Thêm vào client/src/config.js hoặc tạo file mới

// ✅ AUTO FIX TOKEN UTILITY
export const autoFixToken = async () => {
  const currentToken = localStorage.getItem('token');
  
  if (!currentToken) {
    console.log("❌ No token found");
    return { success: false, message: "No token to fix" };
  }

  try {
    console.log("🔧 Starting auto token fix...");
    
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

      console.log("✅ Token fixed successfully:", result.fix_info);
      
      return { 
        success: true, 
        message: "Token đã được fix thành công!",
        newToken: result.token,
        fixInfo: result.fix_info
      };
    } else {
      console.log("❌ Fix failed:", result.message);
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
        console.log("🚨 401 detected, attempting auto fix...");
        
        originalRequest._retry = true;
        isFixing = true;

        try {
          const fixResult = await autoFixToken();
          
          if (fixResult.success) {
            console.log("✅ Auto fix successful, retrying request...");
            
            // Update Authorization header with new token
            originalRequest.headers.Authorization = `Bearer ${fixResult.newToken}`;
            
            isFixing = false;
            return axiosInstance(originalRequest);
          } else {
            console.log("❌ Auto fix failed, redirecting to login...");
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
    console.log("🔧 Manual token fix triggered...");
    const result = await autoFixToken();
    
    if (result.success) {
      console.log("✅ Token fixed! Reloading page...");
      setTimeout(() => window.location.reload(), 1000);
    } else {
      console.log("❌ Fix failed:", result.message);
      console.log("💡 Try: localStorage.clear(); window.location.href = '/login';");
    }
    
    return result;
  };
  
  console.log("💡 Available commands:");
  console.log("• fixTokenNow() - Fix token và reload page");
}
export default config;