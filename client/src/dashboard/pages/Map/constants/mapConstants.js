// client/src/dashboard/pages/Map/constants/mapConstants.js
// 🎯 MỤC ĐÍCH: Chứa tất cả constants, color mappings, và cấu hình cố định

// ===================================
// MÀU SẮC CHO CÁC LOẠI RỪNG (LDLR)
// ===================================
export const FOREST_TYPE_COLORS = {
  // Rừng tự nhiên (màu xanh các sắc độ)
  "Rừng tự nhiên giàu": "#065f46", // Xanh đậm
  "Rừng tự nhiên nghèo": "#047857", // Xanh vừa
  "Rừng trồng tự nhiên": "#059669", // Xanh lá

  // Rừng trồng (màu xanh lá các sắc độ)
  "Rừng trồng khác": "#10b981", // Xanh lime
  "Rừng trồng cây dược liệu": "#34d399", // Xanh mint

  // Đất trồng cây lâm nghiệp (màu cam các sắc độ)
  "Trồng xen nương": "#fdba74", // Cam nhạt
  "Trồng xen phụ": "#fb923c", // Cam
  "Trồng xen khác": "#f97316", // Cam đậm
  "Trồng xen đặc nông": "#ea580c", // Cam đỏ
  "Trồng nương khác": "#dc2626", // Đỏ cam

  // Đất trống (màu xám các sắc độ)
  "Đất trống loại 1": "#e5e7eb", // Xám rất nhạt
  "Đất trống loại 2": "#d1d5db", // Xám nhạt
  "Đất trống rừng": "#9ca3af", // Xám vừa

  // Đất nông nghiệp (màu vàng)
  "Đất nông nghiệp": "#fbbf24", // Vàng

  // Hỗn giao (màu tím)
  "Hỗn giao loại 1": "#a78bfa", // Tím nhạt
  "Hỗn giao loại 2": "#8b5cf6", // Tím đậm

  // Fallback
  "Không xác định": "#6b7280", // Xám
};

// ===================================
// MÀU SẮC CHO CHỦ QUẢN LÝ RỪNG
// ===================================
export const FOREST_MANAGEMENT_COLORS = {
  state: "#dc2626", // Đỏ - Nhà nước
  enterprise: "#ea580c", // Cam - Doanh nghiệp
  cooperative: "#d97706", // Vàng cam - Hợp tác xã
  individual: "#059669", // Xanh lá - Cá nhân/Hộ gia đình
  community: "#0891b2", // Xanh dương - Cộng đồng
  other: "#7c3aed", // Tím - Khác
};

// ===================================
// MÀU SẮC CHO MỨC ĐỘ CẢNH BÁO
// ===================================
export const ALERT_LEVEL_COLORS = {
  critical: "#991b1b", // Đỏ đậm - Nghiêm trọng (0-7 ngày)
  high: "#dc2626", // Đỏ - Cao (8-15 ngày)
  medium: "#ea580c", // Cam - Trung bình (16-30 ngày)
  low: "#f59e0b", // Vàng - Thấp (>30 ngày)
  default: "#ea580c", // Cam mặc định
};

// ===================================
// STYLE MẶC ĐỊNH CHO CÁC LAYER
// ===================================
export const DEFAULT_LAYER_STYLES = {
  base: {
    weight: 2,
    opacity: 1,
    fillOpacity: 0,
  },
  selected: {
    weight: 4,
    color: "#ff7800",
    fillOpacity: 0.3,
  },
  matRung: {
    fillColor: "#dc2626",
    color: "#991b1b",
    weight: 2,
    opacity: 1,
    fillOpacity: 0.7,
    dashArray: null,
  },
  matRungSelected: {
    fillColor: "#ef4444",
    color: "#ff7800",
    weight: 4,
    fillOpacity: 0.8,
  },
};

// ===================================
// CẤU HÌNH RANH GIỚI HÀNH CHÍNH
// ===================================
export const BOUNDARY_STYLES = {
  unknown: {
    color: "#ff0000", // ĐỎ để dễ thấy khi debug
    weight: 3,
    dashArray: null,
    opacity: 1,
    fillColor: "transparent",
  },
  huyen: {
    color: "#000000", // Đen đậm - ranh giới huyện
    weight: 4,
    dashArray: "15, 10",
    opacity: 1,
    fillColor: "transparent",
  },
  xa: {
    color: "#333333", // Xám đậm - ranh giới xã
    weight: 3,
    dashArray: "10, 6",
    opacity: 1,
    fillColor: "transparent",
  },
  tieukhu: {
    color: "#666666", // Xám vừa - ranh giới tiểu khu
    weight: 2,
    dashArray: "8, 5",
    opacity: 1,
    fillColor: "transparent",
  },
  khoanh: {
    color: "#999999", // Xám nhạt - ranh giới khoảnh
    weight: 1.5,
    dashArray: "5, 4",
    opacity: 0.8,
    fillColor: "transparent",
  },
};

// ===================================
// MAPPING TÊN HIỂN THỊ
// ===================================
export const BOUNDARY_LEVEL_NAMES = {
  tinh: "Ranh giới tỉnh",
  huyen: "Ranh giới huyện",
  xa: "Ranh giới xã",
  tieukhu: "Ranh giới tiểu khu",
  khoanh: "Ranh giới khoảnh",
};

export const ALERT_LEVEL_NAMES = {
  critical: "Nghiêm trọng",
  high: "Cao",
  medium: "Trung bình",
  low: "Thấp",
};

export const TERRAIN_TYPE_NAMES = {
  waterway: "Đường sông nước",
  water_transport: "Thủy vận",
  road: "Giao thông",
  terrain: "Địa hình",
};

export const LAYER_TYPE_NAMES = {
  terrain_polygon: "Vùng địa hình",
  terrain_line: "Đường địa hình",
  administrative_boundary: "Ranh giới hành chính",
  forest_management: "Chủ quản lý rừng",
  forest_land_types: "Loại đất lâm nghiệp",
  deforestation_alert: "Dự báo mất rừng",
};

// ===================================
// FIELD LABELS MAPPING
// ===================================
export const FIELD_LABELS = {
  huyen: "Huyện",
  xa: "Xã",
  tk: "Tiểu khu",
  khoanh: "Khoảnh",
  churung: "Chủ rừng",
  mahuyen: "Mã huyện",
  chuquanly: "Chủ quản lý",
  ten: "Tên",
  ma: "Mã",
  id: "ID",
  tt: "Thứ tự",
  gid: "ID",
  tieukhu: "Tiểu khu",
  lo: "Lô",
  dtich: "Diện tích",
  ldlr: "Loại đất lâm nghiệp (mã)",
  malr3: "Mã loại rừng",
  forest_function: "3 loại rừng",
  tinh: "Tỉnh",
  start_dau: "Từ ngày",
  end_sau: "Đến ngày",
  area: "Diện tích",
  area_ha: "Diện tích",
  alert_level: "Mức cảnh báo",
  days_since: "Thời gian phát hiện",
  detection_status: "Trạng thái xác minh",
};

// ===================================
// PRIORITY FIELDS CHO POPUP
// ===================================
export const PRIORITY_FIELDS_BY_TYPE = {
  administrative: ["boundary_level", "huyen", "xa", "tieukhu", "khoanh"],
  forestTypes: [
    "forest_function",
    "malr3",
    "xa",
    "tk",
    "khoanh",
    "lo",
    "dtich",
    "churung",
    "huyen",
    "tinh",
  ],
  terrain: ["ten", "ma", "id", "feature_type", "layer_type"],
  forestManagement: ["chuquanly", "tt", "gid"],
  deforestation: [
    "area_ha",
    "start_dau",
    "end_sau",
    "alert_level",
    "days_since",
    "detection_status",
  ],
  deforestationAlerts: [
    "area_ha",
    "start_dau",
    "end_sau",
    "alert_level",
    "days_since",
    "detection_status",
  ],
  default: [
    "huyen",
    "xa",
    "area",
    "start_dau",
    "end_sau",
    "tk",
    "khoanh",
    "churung",
  ],
};

// ===================================
// CẤU HÌNH BẢN ĐỒ
// ===================================
export const MAP_CONFIG = {
  center: [21.3276, 103.9144], // Tọa độ trung tâm tỉnh Sơn La
  defaultZoom: 8,
  maxZoom: 18,
  minZoom: 6,
  zoomAnimationDuration: 1000,
  flyToBoundsPadding: [20, 20],
  flyToFeaturePadding: [50, 50],
};

// ===================================
// TERRAIN COLORS
// ===================================
export const TERRAIN_COLORS = {
  waterway: "#3182ce", // Xanh dương cho sông nước
  water_transport: "#0987a0", // Xanh dương đậm cho thủy vận
  road: "#b7791f", // Nâu cho giao thông
  terrain: "#6b7280", // Xám cho địa hình
};

// ===================================
// STATUS COLORS (LEGACY - CHO COMPATIBILITY)
// ===================================
export const STATUS_COLORS = {
  "Chưa xác minh": "#ff7f00", // Cam
  "Đang xác minh": "#ffff00", // Vàng
  "Đã xác minh": "#ff0000", // Đỏ
  "Không xác minh được": "#808080", // Xám
  default: "#3388ff", // Xanh mặc định
};