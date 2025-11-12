import axios from 'axios';

// Use relative path for production, absolute URL for development
const API_BASE_URL = import.meta.env.PROD
  ? '/api'  // Production: use relative path to go through Nginx proxy
  : 'http://localhost:3000/api';  // Development: direct to gateway

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
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
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
