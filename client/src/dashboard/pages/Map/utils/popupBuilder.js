// client/src/dashboard/pages/Map/utils/popupBuilder.js
// 🎯 MỤC ĐÍCH: Xây dựng nội dung popup cho từng loại layer

import { formatDate } from "../../../../utils/formatDate";
import {
  BOUNDARY_LEVEL_NAMES,
  ALERT_LEVEL_NAMES,
  TERRAIN_TYPE_NAMES,
  LAYER_TYPE_NAMES,
  FIELD_LABELS,
  PRIORITY_FIELDS_BY_TYPE,
} from '../constants/mapConstants';

// ===================================
// LẤY TIÊU ĐỀ POPUP THEO LAYER TYPE
// ===================================
const getPopupTitle = (feature, layerType) => {
  const props = feature.properties;

  switch (layerType) {
    case "administrative":
      return BOUNDARY_LEVEL_NAMES[props.boundary_level] || "Ranh giới hành chính";

    case "forestTypes":
      const forestFunction = props.forest_function || "Không xác định";
      return "3 loại rừng - " + forestFunction;

    case "terrain":
      const layerTypeName = props.layer_type === "terrain_line" ? " (đường)" : " (vùng)";
      return (TERRAIN_TYPE_NAMES[props.feature_type] || "Địa hình - Thủy văn - Giao thông") + layerTypeName;

    case "forestManagement":
      return "Chủ quản lý rừng - " + (props.chuquanly || "Không xác định");

    case "deforestation":
    case "deforestationAlerts":
      const alertLevel = props.alert_level || "medium";
      return "Dự báo mất rừng - " + (ALERT_LEVEL_NAMES[alertLevel] || "Trung bình");

    default:
      return "Thông tin đối tượng";
  }
};

// ===================================
// XỬ LÝ GIÁ TRỊ TRƯỜNG ĐẶC BIỆT
// ===================================
const processFieldValue = (field, value, layerType) => {
  if (value === null || value === undefined) {
    return { value: "Không có", label: FIELD_LABELS[field] || field };
  }

  let processedValue = value;
  let label = FIELD_LABELS[field] || field;

  // Định dạng ngày tháng
  if (field === "start_dau" || field === "end_sau") {
    processedValue = formatDate(value);
  }

  // Định dạng diện tích
  if ((field === "area" || field === "area_ha") && value !== null) {
    if (field === "area") {
      processedValue = `${(parseFloat(value) / 10000).toFixed(2)} ha`;
    } else {
      processedValue = `${parseFloat(value).toFixed(2)} ha`;
    }
    label = "Diện tích";
  }

  if (field === "dtich" && value !== null) {
    processedValue = `${parseFloat(value).toFixed(2)} ha`;
    label = "Diện tích";
  }

  // Xử lý các trường đặc biệt
  if (field === "boundary_level") {
    const levelNames = {
      tinh: "Tỉnh",
      huyen: "Huyện",
      xa: "Xã",
      tieukhu: "Tiểu khu",
      khoanh: "Khoảnh",
    };
    processedValue = levelNames[value] || value;
  }

  if (field === "feature_type") {
    processedValue = TERRAIN_TYPE_NAMES[value] || value;
    label = "Loại đối tượng";
  }

  if (field === "layer_type") {
    processedValue = LAYER_TYPE_NAMES[value] || value;
    label = "Loại lớp";
  }

  if (field === "days_since") {
    processedValue = `${value} ngày trước`;
    label = "Thời gian phát hiện";
  }

  if (field === "alert_level") {
    processedValue = ALERT_LEVEL_NAMES[value] || value;
    label = "Mức cảnh báo";
  }

  if (field === "forest_function") {
    label = "3 loại rừng";
  }

  if (field === "malr3") {
    label = "Mã loại rừng";
  }

  if (field === "detection_status") {
    label = "Trạng thái xác minh";
  }

  return { value: processedValue, label };
};

// ===================================
// XÂY DỰNG BẢNG THÔNG TIN
// ===================================
const buildInfoTable = (feature, layerType) => {
  const props = feature.properties;
  const priorityFields = PRIORITY_FIELDS_BY_TYPE[layerType] || PRIORITY_FIELDS_BY_TYPE.default;
  
  let tableRows = "";

  // Xử lý các trường ưu tiên trước
  priorityFields.forEach((field) => {
    if (props[field] !== undefined && props[field] !== null) {
      const { value, label } = processFieldValue(field, props[field], layerType);

      tableRows += `
        <tr>
          <th>${label}</th>
          <td>${value}</td>
        </tr>
      `;
    }
  });

  // Hiển thị các trường còn lại (bỏ qua các trường đã xử lý và trường kỹ thuật)
  Object.entries(props).forEach(([key, value]) => {
    if (
      !priorityFields.includes(key) &&
      !key.includes("geom") &&
      !key.startsWith("_") &&
      !["x", "y", "x_vn2000", "y_vn2000", "gid", "layer_type"].includes(key) &&
      value !== null &&
      value !== undefined &&
      String(value).trim() !== ""
    ) {
      const { value: processedValue, label } = processFieldValue(key, value, layerType);

      tableRows += `
        <tr>
          <th>${label}</th>
          <td>${processedValue}</td>
        </tr>
      `;
    }
  });

  return `<table class="popup-table">${tableRows}</table>`;
};

// ===================================
// HÀM CHÍNH: XÂY DỰNG POPUP CONTENT
// ===================================
export const buildPopupContent = (feature, layerType) => {
  const title = getPopupTitle(feature, layerType);
  const infoTable = buildInfoTable(feature, layerType);

  return `
    <div class="custom-popup">
      <h4 class="popup-title">${title}</h4>
      ${infoTable}
    </div>
  `;
};

// ===================================
// POPUP CHO DỮ LIỆU MẤT RỪNG MẶC ĐỊNH
// ===================================
export const buildMatRungPopup = (feature) => {
  const props = feature.properties;
  
  let popupContent = `
    <div class="custom-popup">
      <h4 class="popup-title">🔴 Khu vực mất rừng</h4>
      <table class="popup-table">
  `;

  // Các trường quan trọng cho dữ liệu mất rừng
  const matRungFields = [
    "huyen",
    "xa",
    "area",
    "start_dau",
    "end_sau",
    "tk",
    "khoanh",
    "churung",
    "mahuyen",
  ];

  matRungFields.forEach((field) => {
    if (props[field] !== undefined) {
      const { value, label } = processFieldValue(field, props[field], "mat_rung");

      popupContent += `
        <tr>
          <th>${label}</th>
          <td>${value}</td>
        </tr>
      `;
    }
  });

  // Thêm trạng thái xác minh nếu có
  if (props.detection_status) {
    popupContent += `
      <tr>
        <th>Trạng thái xác minh</th>
        <td>${props.detection_status}</td>
      </tr>
    `;
  }

  popupContent += `</table></div>`;

  return popupContent;
};

// ===================================
// POPUP CHO DỰ BÁO MẤT RỪNG TỪ LAYER
// ===================================
export const buildDeforestationAlertsPopup = (feature) => {
  const props = feature.properties;
  
  let popupContent = `
    <div class="custom-popup">
      <h4 class="popup-title">Phân tích mất rừng mới nhất</h4>
      <table class="popup-table">
  `;

  // Các trường quan trọng cho dự báo mất rừng
  const alertFields = [
    "area_ha",
    "start_dau",
    "end_sau",
    "alert_level",
    "days_since",
    "detection_status",
    "mahuyen",
  ];

  alertFields.forEach((field) => {
    if (props[field] !== undefined && props[field] !== null) {
      const { value, label } = processFieldValue(field, props[field], "deforestationAlerts");

      popupContent += `
        <tr>
          <th>${label}</th>
          <td>${value}</td>
        </tr>
      `;
    }
  });

  popupContent += `</table></div>`;

  return popupContent;
};