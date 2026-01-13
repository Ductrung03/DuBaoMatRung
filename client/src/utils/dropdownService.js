// client/src/utils/dropdownService.js - ✅ FIX: Use api instance for authenticated requests
import api from '../services/api';

const API_URL = '/dropdown'; // ✅ FIX: Remove /api prefix - api instance already has baseURL=/api

/**
 * Fetches a list of districts (huyện).
 * @returns {Promise<Array<{label: string, value: string}>>}
 */
export const getDistricts = async () => {
  try {
    const response = await api.get(`${API_URL}/huyen`);
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching districts:', error);
    throw error;
  }
};

/**
 * Fetches a list of communes (xã) for a given district.
 * @param {string} districtName - The name of the district.
 * @returns {Promise<Array<{label: string, value: string}>>}
 */
export const getCommunes = async (districtName) => {
  if (!districtName) return [];
  try {
    const response = await api.get(`${API_URL}/xa`, { params: { huyen: districtName } });
    return response.data.data || [];
  } catch (error) {
    console.error(`Error fetching communes for district ${districtName}:`, error);
    throw error;
  }
};

/**
 * Fetches a list of plots (khoảnh) for a given commune.
 * @param {string} districtName
 * @param {string} communeName
 * @returns {Promise<Array<{label: string, value: string}>>}
 */
export const getPlots = async (districtName, communeName) => {
  if (!districtName || !communeName) return [];
  try {
    const response = await api.get(`${API_URL}/khoanh`, { params: { huyen: districtName, xa: communeName } });
    return response.data.data || [];
  } catch (error) {
    console.error(`Error fetching plots for commune ${communeName}:`, error);
    throw error;
  }
};

/**
 * Fetches a list of sub-zones (tiểu khu) for a given plot.
 * @param {string} districtName
 * @param {string} communeName
 * @param {string} plotName
 * @returns {Promise<Array<{label: string, value: string}>>}
 */
export const getSubZones = async (districtName, communeName, plotName) => {
  if (!districtName || !communeName || !plotName) return [];
  try {
    const response = await api.get(`${API_URL}/tieukhu`, { params: { huyen: districtName, xa: communeName, khoanh: plotName } });
    return response.data.data || [];
  } catch (error) {
    console.error(`Error fetching sub-zones for plot ${plotName}:`, error);
    throw error;
  }
};

/**
 * Fetches a list of forest functions (chức năng rừng).
 * @returns {Promise<Array<{label: string, value: string}>>}
 */
export const getChucNangRung = async () => {
  try {
    const response = await api.get(`${API_URL}/chucnangrung`);
    return response.data || [];
  } catch (error) {
    console.error('Error fetching forest functions:', error);
    throw error;
  }
};

/**
 * Fetches a list of forest owners (chủ rừng).
 * @returns {Promise<Array<{label: string, value: string}>>}
 */
export const getChuRung = async () => {
  try {
    const response = await api.get(`${API_URL}/churung`);
    return response.data || [];
  } catch (error) {
    console.error('Error fetching forest owners:', error);
    throw error;
  }
};

/**
 * Fetches a list of verification statuses (trạng thái xác minh).
 * @returns {Promise<Array<{label: string, value: string}>>}
 */
export const getTrangThaiXacMinh = async () => {
  try {
    const response = await api.get(`${API_URL}/trangthaixacminh`);
    return response.data || [];
  } catch (error) {
    console.error('Error fetching verification statuses:', error);
    throw error;
  }
};

/**
 * Fetches a list of causes (nguyên nhân).
 * @returns {Promise<Array<{label: string, value: string}>>}
 */
export const getNguyenNhan = async () => {
  try {
    const response = await api.get(`${API_URL}/nguyennhan`);
    return response.data || [];
  } catch (error) {
    console.error('Error fetching causes:', error);
    throw error;
  }
};

/**
 * Fetches a list of communes from Sơn La (xã).
 * @returns {Promise<Array<{label: string, value: string}>>}
 */
export const getSonLaXa = async () => {
  try {
    const response = await api.get(`${API_URL}/sonla/xa`);
    return response.data.data || [];
  } catch (error) {
    console.error('Error fetching Sơn La communes:', error);
    throw error;
  }
};

/**
 * Fetches a list of sub-zones (tiểu khu) from Sơn La for a given commune.
 * @param {string} communeName - The name of the commune.
 * @returns {Promise<Array<{label: string, value: string}>>}
 */
export const getSonLaTieuKhu = async (communeName) => {
  if (!communeName) return [];
  try {
    const response = await api.get(`${API_URL}/sonla/tieukhu`, { params: { xa: communeName } });
    return response.data.data || [];
  } catch (error) {
    console.error(`Error fetching Sơn La sub-zones for commune ${communeName}:`, error);
    throw error;
  }
};

/**
 * Fetches a list of plots (khoảnh) from Sơn La for a given commune and sub-zone.
 * @param {string} communeName - The name of the commune.
 * @param {string} subZoneName - The name of the sub-zone (tiểu khu).
 * @returns {Promise<Array<{label: string, value: string}>>}
 */
export const getSonLaKhoanh = async (communeName, subZoneName) => {
  if (!communeName) return [];
  try {
    const params = { xa: communeName };
    if (subZoneName) {
      params.tieukhu = subZoneName;
    }
    const response = await api.get(`${API_URL}/sonla/khoanh`, { params });
    return response.data.data || [];
  } catch (error) {
    console.error(`Error fetching Sơn La plots:`, error);
    throw error;
  }
};