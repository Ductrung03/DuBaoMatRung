import axios from 'axios';

// Base URL của MapServer, đi qua API Gateway
const MAPSERVER_URL = '/api/mapserver';

/**
 * Hàm gốc để thực hiện một yêu cầu GetFeature tới WFS
 * @param {string} typeName - Tên của layer (vd: 'districts', 'communes')
 * @param {string} propertyName - Các thuộc tính cần lấy, phân tách bằng dấu phẩy
 * @param {string} [cql_filter] - Điều kiện lọc CQL (vd: "huyen='Bắc Hà'")
 * @returns {Promise<Array<Object>>} - Một mảng các đối tượng features
 */
const getWfsFeatures = async (typeName, propertyName, cql_filter = null) => {
  const params = {
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeName: typeName,
    outputFormat: 'geojson',
    propertyName: propertyName,
  };

  if (cql_filter) {
    params.cql_filter = cql_filter;
  }

  try {
    const response = await axios.get(MAPSERVER_URL, { params });
    return response.data?.features || [];
  } catch (error) {
    console.error(`Lỗi khi fetch WFS layer ${typeName}:`, error);
    // Ném lỗi để component có thể xử lý
    throw error;
  }
};

/**
 * Lấy danh sách các huyện
 * @returns {Promise<Array<{label: string, value: string}>>} - Mảng chứa tên các huyện
 */
export const getDistricts = async () => {
  const features = await getWfsFeatures('districts', 'huyen');
  const districts = features.map(f => ({ 
    label: f.properties.huyen, 
    value: f.properties.huyen 
  }));
  return districts.sort((a, b) => a.label.localeCompare(b.label));
};

/**
 * Lấy danh sách các xã thuộc một huyện
 * @param {string} districtName - Tên huyện
 * @returns {Promise<Array<{label: string, value: string}>>} - Mảng chứa tên các xã
 */
export const getCommunes = async (districtName) => {
  if (!districtName) return [];
  const features = await getWfsFeatures('communes', 'xa', `huyen='${districtName}'`);
  const communes = features.map(f => ({ 
    label: f.properties.xa, 
    value: f.properties.xa 
  }));
  return communes.sort((a, b) => a.label.localeCompare(b.label));
};

/**
 * Lấy danh sách các khoảnh thuộc một xã
 * @param {string} districtName - Tên huyện
 * @param {string} communeName - Tên xã
 * @returns {Promise<Array<{label: string, value: string}>>} - Mảng chứa tên các khoảnh
 */
export const getPlots = async (districtName, communeName) => {
  if (!districtName || !communeName) return [];
  const features = await getWfsFeatures('plots', 'khoanh', `huyen='${districtName}' AND xa='${communeName}'`);
  const plots = features.map(f => ({ 
    label: f.properties.khoanh, 
    value: f.properties.khoanh 
  }));
  return plots.sort((a, b) => a.label.localeCompare(b.label));
};

/**
 * Lấy danh sách các tiểu khu thuộc một khoảnh
 * @param {string} districtName - Tên huyện
 * @param {string} communeName - Tên xã
 * @param {string} plotName - Tên khoảnh
 * @returns {Promise<Array<{label: string, value: string}>>} - Mảng chứa tên các tiểu khu
 */
export const getSubZones = async (districtName, communeName, plotName) => {
  if (!districtName || !communeName || !plotName) return [];
  const features = await getWfsFeatures('sub_zones', 'tieukhu', `huyen='${districtName}' AND xa='${communeName}' AND khoanh='${plotName}'`);
  const subzones = features.map(f => ({ 
    label: f.properties.tieukhu, 
    value: f.properties.tieukhu 
  }));
  return subzones.sort((a, b) => a.label.localeCompare(b.label));
};