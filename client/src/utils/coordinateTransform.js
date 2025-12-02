
/**
 * Chuyển đổi tọa độ từ WGS84 (EPSG:4326) sang VN-2000 tỉnh Sơn La (EPSG:3405)
 *
 * Lưu ý: Đây là phép chuyển đổi gần đúng, cho mục đích hiển thị
 * Chuyển đổi chính xác hơn nên sử dụng thư viện như Proj4js hoặc thực hiện ở server
 *
 * @param {number} longitude - Kinh độ WGS84 (độ thập phân)
 * @param {number} latitude - Vĩ độ WGS84 (độ thập phân)
 * @returns {Object} - Tọa độ trong hệ VN-2000 tỉnh Sơn La {x, y}
 */
export const wgs84ToVN2000LaoCai = (longitude, latitude) => {
  // Tham số chuyển đổi gần đúng cho Sơn La
  // Tâm của hệ tọa độ VN-2000 Sơn La (EPSG:3405)
  const centralMeridian = 104.75; // Kinh tuyến trục
  const scaleFactor = 0.9999; // Hệ số tỷ lệ
  const falseEasting = 500000; // Lệch đông
  const falseNorthing = 0; // Lệch bắc
  
  // Các tham số ellipsoid WGS84
  const a = 6378137.0; // Bán trục lớn
  const f = 1/298.257223563; // Độ dẹt
  const e2 = 2*f - f*f; // Độ lệch tâm bình phương
  
  // Chuyển đổi từ độ sang radian
  const lon = longitude * Math.PI / 180;
  const lat = latitude * Math.PI / 180;
  const lon0 = centralMeridian * Math.PI / 180;
  
  // Tính các tham số
  const N = a / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat));
  const t = Math.tan(lat);
  const C = e2 * Math.cos(lat) * Math.cos(lat) / (1 - e2);
  const A = (lon - lon0) * Math.cos(lat);
  
  // Tính tọa độ
  const x = scaleFactor * N * (A + (1 - t*t + C) * Math.pow(A, 3)/6 + 
                             (5 - 18*t*t + t*t*t*t + 72*C - 58*e2) * Math.pow(A, 5)/120) + falseEasting;
  
  const M = a * ((1 - e2/4 - 3*e2*e2/64 - 5*e2*e2*e2/256) * lat -
                 (3*e2/8 + 3*e2*e2/32 + 45*e2*e2*e2/1024) * Math.sin(2*lat) +
                 (15*e2*e2/256 + 45*e2*e2*e2/1024) * Math.sin(4*lat) -
                 (35*e2*e2*e2/3072) * Math.sin(6*lat));
  
  const y = scaleFactor * (M + N * Math.tan(lat) * (A*A/2 + 
                          (5 - t*t + 9*C + 4*C*C) * Math.pow(A, 4)/24 +
                          (61 - 58*t*t + t*t*t*t + 600*C - 330*e2) * Math.pow(A, 6)/720)) + falseNorthing;
  
  // Làm tròn đến 2 chữ số thập phân
  return {
    x: Math.round(x * 100) / 100,
    y: Math.round(y * 100) / 100
  };
};

// Hàm để lấy tọa độ tâm từ đối tượng GeoJSON
export const getFeatureCenter = (feature) => {
  if (!feature || !feature.geometry) return null;
  
  // Nếu đối tượng là điểm
  if (feature.geometry.type === 'Point') {
    return {
      longitude: feature.geometry.coordinates[0],
      latitude: feature.geometry.coordinates[1]
    };
  }
  
  // Nếu đối tượng là polygon hoặc multipolygon
  // Tính tọa độ trung bình của tất cả các điểm
  let points = [];
  
  if (feature.geometry.type === 'Polygon') {
    points = feature.geometry.coordinates[0]; // Lấy ring ngoài cùng
  } else if (feature.geometry.type === 'MultiPolygon') {
    // Gộp tất cả các điểm từ mỗi polygon
    feature.geometry.coordinates.forEach(polygon => {
      points = [...points, ...polygon[0]];
    });
  }
  
  if (points.length === 0) return null;
  
  // Tính toán tọa độ trung bình
  let sumLon = 0;
  let sumLat = 0;
  
  points.forEach(point => {
    sumLon += point[0];
    sumLat += point[1];
  });
  
  return {
    longitude: sumLon / points.length,
    latitude: sumLat / points.length
  };
};
