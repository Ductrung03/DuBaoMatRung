import axios from 'axios';

const API_URL = '/api/dropdown';

/**
 * Fetches a list of districts (huyện).
 * @returns {Promise<Array<{label: string, value: string}>>}
 */
export const getDistricts = async () => {
  try {
    const response = await axios.get(`${API_URL}/huyen`);
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
    const response = await axios.get(`${API_URL}/xa`, { params: { huyen: districtName } });
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
    const response = await axios.get(`${API_URL}/khoanh`, { params: { huyen: districtName, xa: communeName } });
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
    const response = await axios.get(`${API_URL}/tieukhu`, { params: { huyen: districtName, xa: communeName, khoanh: plotName } });
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
    const response = await axios.get(`${API_URL}/chucnangrung`);
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
    const response = await axios.get(`${API_URL}/churung`);
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
    const response = await axios.get(`${API_URL}/trangthaixacminh`);
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
    const response = await axios.get(`${API_URL}/nguyennhan`);
    return response.data || [];
  } catch (error) {
    console.error('Error fetching causes:', error);
    throw error;
  }
};