import axios from 'axios';
import config from '../config';

// Use config.API_BASE_URL for consistent API URL handling
const API_BASE_URL = config.API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // Tăng lên 60s cho production server
});

// Request interceptor để thêm token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor để xử lý lỗi
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if(axios.isCancel(error)||error?.code==='ERR_CANCELED')return Promise.reject(error);
    console.error('❌ API Error:', {
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
      errorData: error.response?.data,
      message: error.message
    });

    // Xử lý lỗi 401 Unauthorized
    if (error.response?.status === 401) {
      const errorCode = error.response?.data?.error?.code;
      const errorMessage = error.response?.data?.error?.message || error.response?.data?.message;

      console.error('🔐 Authentication failed:', {
        code: errorCode,
        message: errorMessage,
        url: error.config?.url
      });

      // Xóa token và redirect về login
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Chỉ redirect nếu không phải đang ở trang login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
