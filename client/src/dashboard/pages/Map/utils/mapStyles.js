// client/src/dashboard/pages/Map/utils/mapStyles.js
// 🎯 MỤC ĐÍCH: Chứa tất cả logic style cho các layer trên bản đồ

import {
  FOREST_TYPE_COLORS,
  FOREST_MANAGEMENT_COLORS,
  ALERT_LEVEL_COLORS,
  DEFAULT_LAYER_STYLES,
  BOUNDARY_STYLES,
  TERRAIN_COLORS,
  STATUS_COLORS,
} from '../constants/mapConstants';

// ===================================
// STYLE CHO DỮ LIỆU MẤT RỪNG MẶC ĐỊNH
// ===================================
export const getDefaultMatRungStyle = (feature, isSelected = false) => {
  const baseStyle = { ...DEFAULT_LAYER_STYLES.matRung };

  if (isSelected) {
    return {
      ...baseStyle,
      ...DEFAULT_LAYER_STYLES.matRungSelected,
    };
  }

  return baseStyle;
};

// ===================================
// LẤY MÀU CHO LOẠI RỪNG
// ===================================
export const getForestTypeColor = (forestFunction) => {
  if (FOREST_TYPE_COLORS[forestFunction]) {
    return FOREST_TYPE_COLORS[forestFunction];
  }

  // Tạo màu động cho các loại không xác định trước
  const hashCode = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash;
  };

  const hash = hashCode(forestFunction || "unknown");
  const hue = Math.abs(hash) % 360;
  const saturation = 60 + (Math.abs(hash) % 30);
  const lightness = 40 + (Math.abs(hash) % 20);

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// ===================================
// LẤY MÀU CHO CHỦ QUẢN LÝ RỪNG
// ===================================
export const getForestManagementColor = (chuQuanLy) => {
  const chuQuanLyLower = (chuQuanLy || "").toLowerCase();

  if (
    chuQuanLyLower.includes("nhà nước") ||
    chuQuanLyLower.includes("ubnd") ||
    chuQuanLyLower.includes("chi cục")
  ) {
    return FOREST_MANAGEMENT_COLORS.state;
  } else if (
    chuQuanLyLower.includes("công ty") ||
    chuQuanLyLower.includes("doanh nghiệp")
  ) {
    return FOREST_MANAGEMENT_COLORS.enterprise;
  } else if (
    chuQuanLyLower.includes("hợp tác xã") ||
    chuQuanLyLower.includes("htx")
  ) {
    return FOREST_MANAGEMENT_COLORS.cooperative;
  } else if (
    chuQuanLyLower.includes("cá nhân") ||
    chuQuanLyLower.includes("hộ gia đình")
  ) {
    return FOREST_MANAGEMENT_COLORS.individual;
  } else if (
    chuQuanLyLower.includes("cộng đồng") ||
    chuQuanLyLower.includes("thôn")
  ) {
    return FOREST_MANAGEMENT_COLORS.community;
  }

  return FOREST_MANAGEMENT_COLORS.other;
};

// ===================================
// LẤY MÀU CHO MỨC ĐỘ CẢNH BÁO
// ===================================
export const getDeforestationAlertColor = (alertLevel, daysSince) => {
  // Ưu tiên theo alert_level trước
  if (alertLevel && ALERT_LEVEL_COLORS[alertLevel]) {
    return ALERT_LEVEL_COLORS[alertLevel];
  }

  // Fallback theo số ngày nếu không có alert_level
  if (daysSince !== undefined && daysSince !== null) {
    if (daysSince <= 7) return ALERT_LEVEL_COLORS.critical;
    if (daysSince <= 15) return ALERT_LEVEL_COLORS.high;
    if (daysSince <= 30) return ALERT_LEVEL_COLORS.medium;
    return ALERT_LEVEL_COLORS.low;
  }

  return ALERT_LEVEL_COLORS.default;
};

// ===================================
// LẤY MÀU THEO TRẠNG THÁI (LEGACY)
// ===================================
export const getColorByStatus = (properties) => {
  // Nếu có trạng thái xác minh
  if (properties.detection_status && STATUS_COLORS[properties.detection_status]) {
    return STATUS_COLORS[properties.detection_status];
  }

  // Phân loại theo thời gian nếu không có trạng thái
  const today = new Date();
  if (properties.end_sau) {
    const endDate = new Date(properties.end_sau);
    const daysDiff = Math.floor((today - endDate) / (1000 * 60 * 60 * 24));

    if (daysDiff < 30) return "#ff0000"; // Đỏ - mới nhất (trong 30 ngày)
    else if (daysDiff < 90) return "#ff7f00"; // Cam - trong 90 ngày
    else if (daysDiff < 180) return "#ffff00"; // Vàng - trong 180 ngày
    else return "#808080"; // Xám - cũ hơn 180 ngày
  }

  return STATUS_COLORS.default;
};

// ===================================
// STYLE CHO RANH GIỚI HÀNH CHÍNH
// ===================================
export const getAdministrativeStyle = (feature, isSelected = false) => {
  const boundaryLevel = feature.properties.boundary_level || "unknown";
  const style = BOUNDARY_STYLES[boundaryLevel] || BOUNDARY_STYLES.unknown;



  return {
    ...DEFAULT_LAYER_STYLES.base,
    color: style.color,
    fillColor: style.fillColor,
    weight: style.weight,
    dashArray: style.dashArray,
    opacity: style.opacity,
    fillOpacity: 0,
    ...(isSelected ? DEFAULT_LAYER_STYLES.selected : {}),
  };
};

// ===================================
// STYLE CHO LOẠI RỪNG
// ===================================
export const getForestTypesStyle = (feature, isSelected = false) => {
  const forestFunction = feature.properties.forest_function;
  const forestColor = getForestTypeColor(forestFunction);



  return {
    ...DEFAULT_LAYER_STYLES.base,
    color: isSelected ? "#ff7800" : "#2d3748",
    fillColor: forestColor,
    weight: isSelected ? 3 : 2,
    opacity: 1,
    fillOpacity: 0.6,
    ...(isSelected ? DEFAULT_LAYER_STYLES.selected : {}),
  };
};

// ===================================
// STYLE CHO CHỦ QUẢN LÝ RỪNG
// ===================================
export const getForestManagementStyle = (feature, isSelected = false) => {
  const chuQuanLy = feature.properties.chuquanly || "";
  const managementColor = getForestManagementColor(chuQuanLy);


  return {
    ...DEFAULT_LAYER_STYLES.base,
    color: isSelected ? "#ff7800" : "#2d3748",
    fillColor: managementColor,
    weight: isSelected ? 3 : 2,
    opacity: 1,
    fillOpacity: 0.6,
    ...(isSelected ? DEFAULT_LAYER_STYLES.selected : {}),
  };
};

// ===================================
// STYLE CHO ĐỊA HÌNH
// ===================================
export const getTerrainStyle = (feature, isSelected = false) => {
  const featureType = feature.properties.feature_type;
  const terrainLayerType = feature.properties.layer_type;
  const terrainColor = TERRAIN_COLORS[featureType] || TERRAIN_COLORS.terrain;

  // Xử lý khác nhau cho polygon và line
  if (terrainLayerType === "terrain_line") {
    return {
      color: terrainColor,
      weight: featureType === "road" ? 4 : 3,
      opacity: 1,
      fillOpacity: 0,
      dashArray: featureType === "waterway" ? "5, 5" : null,
      ...(isSelected ? DEFAULT_LAYER_STYLES.selected : {}),
    };
  } else {
    return {
      ...DEFAULT_LAYER_STYLES.base,
      color: isSelected ? "#ff7800" : terrainColor,
      fillColor: terrainColor,
      weight: isSelected ? 3 : 2,
      opacity: 1,
      fillOpacity: featureType === "waterway" ? 0.8 : 0.5,
      ...(isSelected ? DEFAULT_LAYER_STYLES.selected : {}),
    };
  }
};

// ===================================
// STYLE CHO DỰ BÁO MẤT RỪNG
// ===================================
export const getDeforestationStyle = (feature, isSelected = false) => {
  const alertLevel = feature.properties.alert_level;
  const daysSince = feature.properties.days_since;
  const deforestationColor = getDeforestationAlertColor(alertLevel, daysSince);

  return {
    ...DEFAULT_LAYER_STYLES.base,
    color: isSelected ? "#ff7800" : "#1f2937",
    fillColor: deforestationColor,
    weight: isSelected ? 3 : 2,
    opacity: 1,
    fillOpacity: 0.8,
    ...(isSelected ? DEFAULT_LAYER_STYLES.selected : {}),
  };
};

// ===================================
// HÀM CHÍNH: LẤY STYLE CHO LAYER
// ===================================
export const getLayerStyle = (feature, layerType, isSelected = false) => {

  switch (layerType) {
    case "administrative":
      return getAdministrativeStyle(feature, isSelected);

    case "forestTypes":
      return getForestTypesStyle(feature, isSelected);

    case "forestManagement":
      return getForestManagementStyle(feature, isSelected);

    case "terrain":
      return getTerrainStyle(feature, isSelected);

    case "deforestation":
    case "deforestationAlerts":
      return getDeforestationStyle(feature, isSelected);

    case "mat_rung_default":
      return getDefaultMatRungStyle(feature, isSelected);

    default:
      // Mặc định dùng style màu đỏ cho dữ liệu mat_rung
      return getDefaultMatRungStyle(feature, isSelected);
  }
};