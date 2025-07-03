import React, { useState, useEffect, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
  WMSTileLayer,
} from "react-leaflet";
import { useLocation } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Table from "./Table";
import { useGeoData } from "../contexts/GeoDataContext";
import { formatDate } from "../../utils/formatDate";
import { ClipLoader } from "react-spinners";
import { toast } from "react-toastify";

// Component hiển thị loading overlay
const LoadingOverlay = ({ message }) => (
  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
      <ClipLoader color="#027e02" size={50} />
      <p className="mt-4 text-forest-green-primary font-medium">{message}</p>
    </div>
  </div>
);

// Component MapUpdater để xử lý zoom đến vị trí của feature được chọn từ bảng
const MapUpdater = ({ selectedFeature }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedFeature && selectedFeature.geometry) {
      try {
        console.log("MapUpdater: Đang cố gắng zoom đến feature");
        // Tạo layer mới từ geometry của feature đã chọn
        const geojsonFeature = {
          type: "Feature",
          geometry: selectedFeature.geometry,
          properties: {},
        };

        // Tạo một layer tạm thời
        const tempLayer = L.geoJSON(geojsonFeature);
        const bounds = tempLayer.getBounds();

        if (bounds.isValid()) {
          console.log(
            "MapUpdater: Bounds hợp lệ, thực hiện flyToBounds:",
            bounds
          );

          // Sử dụng setTimeout để đảm bảo map đã render xong
          setTimeout(() => {
            map.flyToBounds(bounds, {
              padding: [50, 50],
              duration: 1.0,
              animate: true,
            });
          }, 200);
        } else {
          console.warn("MapUpdater: Bounds không hợp lệ, thử phương án khác");

          // Phương án dự phòng - zoom đến tọa độ trung tâm
          try {
            let centerCoords;
            if (selectedFeature.geometry.type === "MultiPolygon") {
              // Lấy tọa độ đầu tiên của polygon đầu tiên
              centerCoords = selectedFeature.geometry.coordinates[0][0][0];
              map.setView([centerCoords[1], centerCoords[0]], 16);
              console.log(
                "MapUpdater: Đã zoom đến tọa độ MultiPolygon:",
                centerCoords
              );
            } else if (selectedFeature.geometry.type === "Polygon") {
              centerCoords = selectedFeature.geometry.coordinates[0][0];
              map.setView([centerCoords[1], centerCoords[0]], 16);
              console.log(
                "MapUpdater: Đã zoom đến tọa độ Polygon:",
                centerCoords
              );
            }
          } catch (innerErr) {
            console.error(
              "MapUpdater: Lỗi khi dùng phương án dự phòng:",
              innerErr
            );
          }
        }
      } catch (err) {
        console.error("MapUpdater: Lỗi khi zoom đến feature:", err);
      }
    }
  }, [selectedFeature, map]);

  return null;
};

const getDefaultMatRungStyle = (feature, isSelected = false) => {
  const baseStyle = {
    fillColor: "#dc2626",        // ✅ MÀU ĐỎ CHỦ ĐẠO
    color: "#991b1b",            // ✅ Viền đỏ đậm
    weight: isSelected ? 3 : 2,
    opacity: 1,
    fillOpacity: 0.7,
    dashArray: null
  };

  // Nếu được chọn, làm nổi bật hơn
  if (isSelected) {
    return {
      ...baseStyle,
      fillColor: "#ef4444",      // ✅ Đỏ sáng hơn khi chọn
      color: "#ff7800",          // Viền cam khi chọn
      weight: 4,
      fillOpacity: 0.8
    };
  }

  return baseStyle;
};

const getForestTypeColor = (forestFunction) => {
  const colorMap = {
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

  if (colorMap[forestFunction]) {
    return colorMap[forestFunction];
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


const getDeforestationAlertColor = (alertLevel, daysSince) => {
  // Ưu tiên theo alert_level trước
  if (alertLevel) {
    switch (alertLevel) {
      case "critical":
        return "#991b1b"; // Đỏ đậm - Nghiêm trọng (0-7 ngày)
      case "high":
        return "#dc2626"; // Đỏ - Cao (8-15 ngày)
      case "medium":
        return "#ea580c"; // Cam - Trung bình (16-30 ngày)
      case "low":
        return "#f59e0b"; // Vàng - Thấp (>30 ngày)
      default:
        return "#ea580c"; // Cam mặc định
    }
  }

  // Fallback theo số ngày nếu không có alert_level
  if (daysSince !== undefined && daysSince !== null) {
    if (daysSince <= 7) return "#991b1b"; // Đỏ đậm
    if (daysSince <= 15) return "#dc2626"; // Đỏ
    if (daysSince <= 30) return "#ea580c"; // Cam
    return "#f59e0b"; // Vàng
  }

  return "#ea580c"; // Cam mặc định
};
// Hàm lấy style cho các layer - CẬP NHẬT VỚI LDLR VÀ MỨC CẢNH BÁO
const getLayerStyle = (feature, layerType, isSelected = false) => {
  console.log(`🎨 Getting style for:`, {
    layerType,
    feature: feature?.properties,
  });

  const baseStyle = {
    weight: 2,
    opacity: 1,
    fillOpacity: 0,
  };

  const selectedStyle = isSelected
    ? {
        weight: 4,
        color: "#ff7800",
        fillOpacity: 0.3,
      }
    : {};

  switch (layerType) {
    case "administrative":
      const boundaryLevel = feature.properties.boundary_level || "unknown";
      console.log(`🔍 Boundary level: ${boundaryLevel}`);

      const boundaryStyles = {
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

      const style = boundaryStyles[boundaryLevel] || boundaryStyles["unknown"];

      console.log(`🎨 Applied administrative style:`, style);

      return {
        ...baseStyle,
        color: style.color,
        fillColor: style.fillColor,
        weight: style.weight,
        dashArray: style.dashArray,
        opacity: style.opacity,
        fillOpacity: 0,
        ...selectedStyle,
      };

    case "forestTypes":
      // Màu cho các loại rừng dựa trên forest_function (từ LDLR)
      const forestFunction = feature.properties.forest_function;
      const forestColor = getForestTypeColor(forestFunction);

      console.log(`🌲 Forest function: "${forestFunction}"`);
      console.log(`🌲 Applied forest color: ${forestColor} for function: ${forestFunction}`);

      return {
        ...baseStyle,
        color: isSelected ? "#ff7800" : "#2d3748",
        fillColor: forestColor,
        weight: isSelected ? 3 : 2,
        opacity: 1,
        fillOpacity: 0.6,
        ...selectedStyle,
      };

    case "forestManagement":
      console.log(`🏢 Forest Management feature:`, feature.properties);

      // Màu sắc theo từng loại chủ quản lý - sử dụng màu rõ ràng hơn
      const chuQuanLy = feature.properties.chuquanly || "";
      let managementColor = "#7c3aed"; // Tím mặc định

      // Phân loại màu theo chủ quản lý
      if (
        chuQuanLy.includes("Nhà nước") ||
        chuQuanLy.includes("UBND") ||
        chuQuanLy.includes("Chi cục")
      ) {
        managementColor = "#dc2626"; // Đỏ - Nhà nước
      } else if (
        chuQuanLy.includes("Công ty") ||
        chuQuanLy.includes("Doanh nghiệp")
      ) {
        managementColor = "#ea580c"; // Cam - Doanh nghiệp
      } else if (
        chuQuanLy.includes("Hợp tác xã") ||
        chuQuanLy.includes("HTX")
      ) {
        managementColor = "#d97706"; // Vàng cam - Hợp tác xã
      } else if (
        chuQuanLy.includes("Cá nhân") ||
        chuQuanLy.includes("Hộ gia đình")
      ) {
        managementColor = "#059669"; // Xanh lá - Cá nhân/Hộ gia đình
      } else if (
        chuQuanLy.includes("Cộng đồng") ||
        chuQuanLy.includes("Thôn")
      ) {
        managementColor = "#0891b2"; // Xanh dương - Cộng đồng
      } else {
        managementColor = "#7c3aed"; // Tím - Khác
      }

      return {
        ...baseStyle,
        color: isSelected ? "#ff7800" : "#2d3748",
        fillColor: managementColor,
        weight: isSelected ? 3 : 2,
        opacity: 1,
        fillOpacity: 0.6,
        ...selectedStyle,
      };

    case "terrain":
      // Style cho địa hình, thủy văn, giao thông - XỬ LÝ CẢ POLYGON VÀ LINE
      const featureType = feature.properties.feature_type;
      const terrainLayerType = feature.properties.layer_type; // 'terrain_polygon' hoặc 'terrain_line'
      let terrainColor = "#6b7280"; // Xám mặc định

      switch (featureType) {
        case "waterway":
          terrainColor = "#3182ce"; // Xanh dương cho sông nước
          break;
        case "water_transport":
          terrainColor = "#0987a0"; // Xanh dương đậm cho thủy vận
          break;
        case "road":
          terrainColor = "#b7791f"; // Nâu cho giao thông
          break;
        default:
          terrainColor = "#6b7280"; // Xám cho địa hình
      }

      // Xử lý khác nhau cho polygon và line
      if (terrainLayerType === "terrain_line") {
        // Style cho đường line
        return {
          color: terrainColor,
          weight: featureType === "road" ? 4 : 3,
          opacity: 1,
          fillOpacity: 0, // Line không có fill
          dashArray: featureType === "waterway" ? "5, 5" : null,
          ...selectedStyle,
        };
      } else {
        // Style cho polygon
        return {
          ...baseStyle,
          color: isSelected ? "#ff7800" : terrainColor,
          fillColor: terrainColor,
          weight: isSelected ? 3 : 2,
          opacity: 1,
          fillOpacity: featureType === "waterway" ? 0.8 : 0.5,
          ...selectedStyle,
        };
      }

    case "deforestation":
    case "deforestationAlerts":
      // Style cho dự báo mất rừng theo mức độ cảnh báo MỚI
      const alertLevel = feature.properties.alert_level;
      const daysSince = feature.properties.days_since;
      let deforestationColor = "#ea580c"; // Cam mặc định

      console.log(`⚠️ Alert level: "${alertLevel}", Days since: ${daysSince}`);

      // Ưu tiên theo alert_level trước
      if (alertLevel) {
        switch (alertLevel) {
          case "critical":
            deforestationColor = "#991b1b"; // Đỏ đậm - Nghiêm trọng (0-7 ngày)
            break;
          case "high":
            deforestationColor = "#dc2626"; // Đỏ - Cao (8-15 ngày)
            break;
          case "medium":
            deforestationColor = "#ea580c"; // Cam - Trung bình (16-30 ngày)
            break;
          case "low":
            deforestationColor = "#f59e0b"; // Vàng - Thấp (>30 ngày)
            break;
          default:
            deforestationColor = "#ea580c"; // Cam mặc định
            break;
        }
      } else if (daysSince !== undefined && daysSince !== null) {
        // Fallback theo số ngày nếu không có alert_level
        if (daysSince <= 7) {
          deforestationColor = "#991b1b"; // Đỏ đậm
        } else if (daysSince <= 15) {
          deforestationColor = "#dc2626"; // Đỏ
        } else if (daysSince <= 30) {
          deforestationColor = "#ea580c"; // Cam
        } else {
          deforestationColor = "#f59e0b"; // Vàng
        }
      }

      console.log(
        `⚠️ Applied deforestation color: ${deforestationColor} for level: ${alertLevel}, days: ${daysSince}`
      );

      return {
        ...baseStyle,
        color: isSelected ? "#ff7800" : "#1f2937",
        fillColor: deforestationColor,
        weight: isSelected ? 3 : 2,
        opacity: 1,
        fillOpacity: 0.8,
        ...selectedStyle,
      };

    case "mat_rung_default":
      return getDefaultMatRungStyle(feature, isSelected);

    default:
      // ✅ Mặc định cũng dùng màu đỏ cho dữ liệu mat_rung
      return getDefaultMatRungStyle(feature, isSelected);
  }
};




// Hàm xây dựng popup content dựa trên loại layer - CẬP NHẬT CHO 5 LỚP
const buildPopupContent = (feature, layerType) => {
  const props = feature.properties;

  let popupContent = `
    <div class="custom-popup">
      <h4 class="popup-title">`;

  switch (layerType) {
    case "administrative":
      const boundaryLevelNames = {
        tinh: "Ranh giới tỉnh",
        huyen: "Ranh giới huyện",
        xa: "Ranh giới xã",
        tieukhu: "Ranh giới tiểu khu",
        khoanh: "Ranh giới khoảnh",
      };
      popupContent +=
        boundaryLevelNames[props.boundary_level] || "Ranh giới hành chính";
      break;

    case "forestTypes":
      const forestFunction = props.forest_function || "Không xác định";
      popupContent += "3 loại rừng - " + forestFunction;
      break;

    case "terrain":
      const terrainTypeNames = {
        waterway: "Đường sông nước",
        water_transport: "Thủy vận",
        road: "Giao thông",
        terrain: "Địa hình",
      };
      const layerTypeName =
        props.layer_type === "terrain_line" ? " (đường)" : " (vùng)";
      popupContent +=
        (terrainTypeNames[props.feature_type] ||
          "Địa hình - Thủy văn - Giao thông") + layerTypeName;
      break;

    case "forestManagement":
      popupContent +=
        "Chủ quản lý rừng - " + (props.chuquanly || "Không xác định");
      break;

    case "deforestation":
    case "deforestationAlerts":
      const alertLevelNames = {
        critical: "Nghiêm trọng",
        high: "Cao",
        medium: "Trung bình",
        low: "Thấp",
      };
      const alertLevel = props.alert_level || "medium";
      popupContent +=
        "Dự báo mất rừng - " + (alertLevelNames[alertLevel] || "Trung bình");
      break;

    default:
      popupContent += "Thông tin đối tượng";
  }

  popupContent += `</h4><table class="popup-table">`;

  // Định nghĩa các trường ưu tiên cho từng loại layer
  const priorityFieldsByType = {
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
      "mahuyen",
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
      "mahuyen",
    ],
  };

  const priorityFields =
    priorityFieldsByType[layerType] || priorityFieldsByType.default;

  // Xử lý các trường ưu tiên
  priorityFields.forEach((field) => {
    if (props[field] !== undefined && props[field] !== null) {
      let value = props[field];
      let label = field;

      // Định dạng ngày tháng
      if (field === "start_dau" || field === "end_sau") {
        value = formatDate(value);
        label = field === "start_dau" ? "Từ ngày" : "Đến ngày";
      }

      // Định dạng diện tích
      if ((field === "area" || field === "area_ha") && value !== null) {
        if (field === "area") {
          value = `${(parseFloat(value) / 10000).toFixed(2)} ha`;
        } else {
          value = `${parseFloat(value).toFixed(2)} ha`;
        }
        label = "Diện tích";
      }

      if (field === "dtich" && value !== null) {
        value = `${parseFloat(value).toFixed(2)} ha`;
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
        value = levelNames[value] || value;
      }

      if (field === "feature_type") {
        const typeNames = {
          waterway: "Đường sông nước",
          water_transport: "Thủy vận",
          road: "Giao thông",
          terrain: "Địa hình",
        };
        value = typeNames[value] || value;
        label = "Loại đối tượng";
      }

      if (field === "layer_type") {
        const layerNames = {
          terrain_polygon: "Vùng địa hình",
          terrain_line: "Đường địa hình",
          administrative_boundary: "Ranh giới hành chính",
          forest_management: "Chủ quản lý rừng",
          forest_land_types: "Loại đất lâm nghiệp",
          deforestation_alert: "Dự báo mất rừng",
        };
        value = layerNames[value] || value;
        label = "Loại lớp";
      }

      if (field === "days_since") {
        value = `${value} ngày trước`;
        label = "Thời gian phát hiện";
      }

      if (field === "alert_level") {
        const levelNames = {
          critical: "Nghiêm trọng",
          high: "Cao",
          medium: "Trung bình",
          low: "Thấp",
        };
        value = levelNames[value] || value;
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

      // Mapping tên trường hiển thị
      const fieldLabels = {
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
      };

      label = fieldLabels[field] || label;

      popupContent += `
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
      popupContent += `
        <tr>
          <th>${key}</th>
          <td>${value}</td>
        </tr>
      `;
    }
  });

  popupContent += `</table></div>`;
  return popupContent;
};

// Control để chọn loại bản đồ và hiển thị legend
// Cập nhật component CustomMapControl trong Map.jsx để chỉ hiển thị 4 lớp

// Control để chọn loại bản đồ và hiển thị legend - CẬP NHẬT CHO 4 LỚP
const CustomMapControl = ({ setMapType, mapLayers, toggleLayerVisibility }) => {
  const map = useMap();

  useEffect(() => {
    const container = L.DomUtil.create("div");

    // Hàm tạo HTML động cho legend dựa trên trạng thái các layer - CHỈ 4 LỚP
    const createLegendHTML = () => {
      const hasLoadedLayers = Object.values(mapLayers).some(
        (layer) =>
          layer.data &&
          [
            "administrative",
            "forestTypes",
            "terrain",
            "forestManagement",
          ].includes(
            Object.keys(mapLayers).find((key) => mapLayers[key] === layer)
          )
      );

      return `
      <div class="map-legend-control" style="
        position: relative;
        z-index: 1000;
        background: white;
        border: 2px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        max-width: 300px;
        font-family: Arial, sans-serif;
        font-size: 12px;
      ">
        <!-- Header -->
        <div style="
          background: #f8f9fa;
          padding: 8px 12px;
          border-bottom: 1px solid #ddd;
          border-radius: 6px 6px 0 0;
          display: flex;
          align-items: center;
          cursor: pointer;
        " id="legend-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 8px;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V6.618a1 1 0 01.553-.894L9 3l6 3 6-3v13l-6 3-6-3z" />
          </svg>
          <span style="font-weight: bold; color: #333;">Lớp bản đồ</span>
          <svg id="toggle-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-left: auto; transform: rotate(0deg); transition: transform 0.3s;">
            <polyline points="6,9 12,15 18,9"></polyline>
          </svg>
        </div>

        <!-- Content -->
        <div id="legend-content" style="max-height: 500px; overflow-y: auto;">
          
          <!-- Chọn loại bản đồ nền -->
          <div class="legend-section" style="padding: 8px 12px; border-bottom: 1px solid #eee;">
            <div style="font-weight: bold; margin-bottom: 6px; color: #555;">Bản đồ nền</div>
            <div style="display: flex; gap: 8px;">
              <button class="map-type-btn" data-type="normal" style="
                flex: 1; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px;
                background: white; cursor: pointer; font-size: 11px; transition: all 0.2s;
              ">🗺️ Bản đồ thường</button>
              <button class="map-type-btn active" data-type="satellite" style="
                flex: 1; padding: 4px 8px; border: 1px solid #007bff; border-radius: 4px;
                background: #e3f2fd; cursor: pointer; font-size: 11px; transition: all 0.2s;
              ">🛰️ Bản đồ vệ tinh</button>
            </div>
          </div>

          ${
            hasLoadedLayers
              ? `
          <!-- Lớp đã được tải -->
          <div style="padding: 8px 12px; border-bottom: 1px solid #eee;">
            <div style="font-weight: bold; margin-bottom: 6px; color: #555;">Lớp dữ liệu đã tải</div>
          </div>
          `
              : ""
          }

          <!-- 1. Lớp ranh giới hành chính -->
          ${
            mapLayers.administrative?.data
              ? `
          <div class="legend-section">
            <div class="section-header" style="
              padding: 8px 12px; cursor: pointer; display: flex; align-items: center;
              border-bottom: 1px solid #eee; background: #f8f9fa;
            " data-section="administrative">
              <input type="checkbox" id="administrative-checkbox" ${
                mapLayers.administrative?.visible ? "checked" : ""
              } style="margin-right: 8px;">
              <span style="color: #1a365d;">🏛️</span>
              <span style="margin-left: 6px; font-weight: 500;">Ranh giới hành chính</span>
              <span style="margin-left: 8px; font-size: 10px; color: #666; background: #e2e8f0; padding: 1px 4px; border-radius: 8px;">
                ${mapLayers.administrative.data.features?.length || 0}
              </span>
            </div>
          </div>
          `
              : ""
          }

          <!-- 2. Lớp 3 loại rừng -->
          ${
            mapLayers.forestTypes?.data
              ? `
          <div class="legend-section">
            <div class="section-header" style="
              padding: 8px 12px; cursor: pointer; display: flex; align-items: center;
              border-bottom: 1px solid #eee;
            " data-section="forest-types">
              <input type="checkbox" id="forest-types-checkbox" ${
                mapLayers.forestTypes?.visible ? "checked" : ""
              } style="margin-right: 8px;">
              <span style="color: #38a169;">🌲</span>
              <span style="margin-left: 6px; font-weight: 500;">3 loại rừng</span>
              <span style="margin-left: 8px; font-size: 10px; color: #666; background: #d4edda; padding: 1px 4px; border-radius: 8px;">
                ${mapLayers.forestTypes.data.features?.length || 0}
              </span>
            </div>
          </div>
          `
              : ""
          }

          <!-- 3. Lớp chủ quản lý rừng -->
          ${
            mapLayers.forestManagement?.data
              ? `
          <div class="legend-section">
            <div class="section-header" style="
              padding: 8px 12px; cursor: pointer; display: flex; align-items: center;
              border-bottom: 1px solid #eee;
            " data-section="forest-management">
              <input type="checkbox" id="forest-management-checkbox" ${
                mapLayers.forestManagement?.visible ? "checked" : ""
              } style="margin-right: 8px;">
              <span style="color: #7c3aed;">🏢</span>
              <span style="margin-left: 6px; font-weight: 500;">Chủ quản lý rừng</span>
              <span style="margin-left: 8px; font-size: 10px; color: #666; background: #e9d5ff; padding: 1px 4px; border-radius: 8px;">
                ${mapLayers.forestManagement.data.features?.length || 0}
              </span>
            </div>
          </div>
          `
              : ""
          }

          <!-- 4. Lớp nền địa hình -->
          ${
            mapLayers.terrain?.data
              ? `
          <div class="legend-section">
            <div class="section-header" style="
              padding: 8px 12px; cursor: pointer; display: flex; align-items: center;
              border-bottom: 1px solid #eee;
            " data-section="terrain">
              <input type="checkbox" id="terrain-checkbox" ${
                mapLayers.terrain?.visible ? "checked" : ""
              } style="margin-right: 8px;">
              <span style="color: #3182ce;">🏔️</span>
              <span style="margin-left: 6px; font-weight: 500;">Nền địa hình, thủy văn</span>
              <span style="margin-left: 8px; font-size: 10px; color: #666; background: #cce7ff; padding: 1px 4px; border-radius: 8px;">
                ${mapLayers.terrain.data.features?.length || 0}
              </span>
            </div>
          </div>
          `
              : ""
          }

          <!-- Lớp dự báo mất rừng - LUÔN HIỂN THỊ -->
          <div class="legend-section" style="border-top: 2px solid #fef2f2;">
            <div class="section-header" style="
              padding: 8px 12px; cursor: pointer; display: flex; align-items: center;
              background: #fef2f2;
            " data-section="deforestation">
              <input type="checkbox" checked style="margin-right: 8px;" disabled>
              <span style="color: #dc2626;">⚠️</span>
              <span style="margin-left: 6px; font-weight: 500;">Dự báo mất rừng</span>
              <span style="margin-left: 8px; font-size: 10px; color: #dc2626; background: #fecaca; padding: 1px 4px; border-radius: 8px;">
                Tự động
              </span>
            </div>
          </div>

          <!-- Thông báo nếu chưa có layer nào -->
          ${
            !hasLoadedLayers
              ? `
          <div style="padding: 20px 12px; text-align: center; color: #666; font-style: italic;">
            <div style="margin-bottom: 8px; font-size: 14px;">📂</div>
            <div style="margin-bottom: 4px; font-weight: 500;">Chưa có lớp dữ liệu nào</div>
            <div style="font-size: 10px; color: #999;">
              Sử dụng menu "Cập nhật dữ liệu"<br/>
              bên trái để tải các lớp
            </div>
          </div>
          `
              : ""
          }

          <!-- Footer thống kê -->
          ${
            hasLoadedLayers
              ? `
          <div style="padding: 6px 12px; background: #f8f9fa; border-top: 1px solid #eee; font-size: 10px; color: #666;">
            Đã tải: ${
              Object.values(mapLayers).filter(
                (layer) =>
                  layer.data &&
                  [
                    "administrative",
                    "forestTypes",
                    "terrain",
                    "forestManagement",
                  ].includes(
                    Object.keys(mapLayers).find(
                      (key) => mapLayers[key] === layer
                    )
                  )
              ).length
            } lớp |
            Hiển thị: ${
              Object.values(mapLayers).filter(
                (layer) =>
                  layer.data &&
                  layer.visible &&
                  [
                    "administrative",
                    "forestTypes",
                    "terrain",
                    "forestManagement",
                  ].includes(
                    Object.keys(mapLayers).find(
                      (key) => mapLayers[key] === layer
                    )
                  )
              ).length
            } lớp
          </div>
          `
              : ""
          }
        </div>
      </div>
    `;
    };

    // Tạo HTML ban đầu
    container.innerHTML = createLegendHTML();
    container.className = "leaflet-control leaflet-bar";

    // Hàm cập nhật lại legend khi mapLayers thay đổi
    const updateLegend = () => {
      container.innerHTML = createLegendHTML();
      setupEventListeners();
    };

    // Hàm setup event listeners
    const setupEventListeners = () => {
      const legendHeader = container.querySelector("#legend-header");
      const legendContent = container.querySelector("#legend-content");
      const toggleArrow = container.querySelector("#toggle-arrow");
      let isExpanded = true;

      // Toggle legend visibility
      if (legendHeader) {
        legendHeader.onclick = (e) => {
          e.preventDefault();
          isExpanded = !isExpanded;
          if (isExpanded) {
            legendContent.style.display = "block";
            toggleArrow.style.transform = "rotate(0deg)";
          } else {
            legendContent.style.display = "none";
            toggleArrow.style.transform = "rotate(-90deg)";
          }
        };
      }

      // Map type selection
      container.querySelectorAll(".map-type-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          const type = btn.getAttribute("data-type");

          // Update button styles
          container.querySelectorAll(".map-type-btn").forEach((b) => {
            b.style.border = "1px solid #ddd";
            b.style.background = "white";
            b.classList.remove("active");
          });

          btn.style.border = "1px solid #007bff";
          btn.style.background = "#e3f2fd";
          btn.classList.add("active");

          setMapType(type);
        });
      });

      // Checkbox functionality - Layer visibility toggle - CHỈ 4 LỚP
      const layerCheckboxes = {
        "administrative-checkbox": "administrative",
        "forest-types-checkbox": "forestTypes",
        "terrain-checkbox": "terrain",
        "forest-management-checkbox": "forestManagement",
      };

      Object.entries(layerCheckboxes).forEach(([checkboxId, layerKey]) => {
        const checkbox = container.querySelector(`#${checkboxId}`);
        if (checkbox) {
          checkbox.addEventListener("change", (e) => {
            e.stopPropagation();
            console.log(
              `🔄 Toggle layer: ${layerKey}, visible: ${checkbox.checked}`
            );
            toggleLayerVisibility(layerKey);
          });
        }
      });
    };

    // Setup event listeners lần đầu
    setupEventListeners();

    // Tạo Leaflet control
    const CustomControl = L.Control.extend({
      onAdd: () => container,
      onRemove: () => {},
    });

    const control = new CustomControl({ position: "topright" });
    map.addControl(control);

    return () => {
      map.removeControl(control);
    };
  }, [map, setMapType, mapLayers, toggleLayerVisibility]); // Dependencies để re-render khi mapLayers thay đổi

  return null;
};

// Helper function để lấy query param từ URL
const getQueryParam = (search, key) => {
  const params = new URLSearchParams(search);
  return params.get(key);
};

// Hàm xác định màu cho feature dựa theo trạng thái (cho dữ liệu mất rừng từ geoData)
const getColorByStatus = (properties) => {
  // Nếu có trạng thái xác minh
  if (properties.detection_status) {
    switch (properties.detection_status) {
      case "Chưa xác minh":
        return "#ff7f00"; // Cam
      case "Đang xác minh":
        return "#ffff00"; // Vàng
      case "Đã xác minh":
        return "#ff0000"; // Đỏ
      case "Không xác minh được":
        return "#808080"; // Xám
      default:
        return "#3388ff"; // Xanh mặc định
    }
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

  return "#3388ff"; // Xanh mặc định
};

// Hàm chuyển đổi diện tích thành số
const parseArea = (areaValue) => {
  if (areaValue === null || areaValue === undefined) return null;

  // Nếu là chuỗi có chứa "ha"
  if (typeof areaValue === "string" && areaValue.includes("ha")) {
    return parseFloat(areaValue.replace(/[^0-9.,]/g, "").replace(",", "."));
  }

  // Nếu là số hoặc chuỗi số
  return parseFloat(String(areaValue).replace(",", "."));
};

// Component chính
const Map = () => {
  const { geoData, loading, mapLayers, toggleLayerVisibility } = useGeoData();
  const [mapType, setMapType] = useState("satellite");
  const [mapReady, setMapReady] = useState(false);
  const location = useLocation();
  const isDataPage = location.pathname === "/dashboard/quanlydulieu";
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [selectedRowFeature, setSelectedRowFeature] = useState(null);
  const [highlightedLayerRef, setHighlightedLayerRef] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const geoJsonLayerRef = useRef(null);

  const layerName = getQueryParam(location.search, "layer");

  // Debug geoData để kiểm tra nó nhận được gì từ backend
  useEffect(() => {
    if (geoData) {
      console.log("Dữ liệu GeoJSON nhận được:", geoData);
      console.log("Số lượng features:", geoData.features?.length || 0);
      if (geoData.features && geoData.features.length > 0) {
        console.log("Feature đầu tiên:", geoData.features[0]);
      }
    }
  }, [geoData]);

useEffect(() => {
    if (geoData && geoData.features && geoData.features.length > 0) {
      console.log(`🎉 Hiển thị ${geoData.features.length} khu vực mất rừng trên bản đồ`);
    }
  }, [geoData]);


  // Hàm tối ưu để xử lý khi click vào một hàng trong bảng
  const handleRowClick = (row) => {
    setLoadingDetails(true);
    setLoadingMessage("Đang tìm vị trí trên bản đồ...");

    console.log("Đã click vào hàng:", row);
    console.log("Chi tiết dòng đã chọn:", JSON.stringify(row, null, 2));

    // Kiểm tra dữ liệu GeoJSON
    if (!geoData || !geoData.features || geoData.features.length === 0) {
      console.error("Không có dữ liệu GeoJSON hoặc dữ liệu rỗng");
      setLoadingDetails(false);
      return;
    }

    console.log("Tổng số features:", geoData.features.length);

    try {
      // Chuẩn bị các giá trị để so sánh
      const rowArea = parseArea(row.area);
      const rowTk = row.tk;
      const rowKhoanh = row.khoanh;
      const rowMahuyen = row.mahuyen;
      const rowXa = row.xa;
      const rowStartDau = row.start_dau;
      const rowEndSau = row.end_sau;

      console.log(
        `Tìm feature với: TK=${rowTk}, Khoảnh=${rowKhoanh}, Diện tích=${rowArea}, Mã huyện=${rowMahuyen}, Từ=${rowStartDau}, Đến=${rowEndSau}`
      );

      // Tạo ID ảo để phân biệt các feature
      const createVirtualId = (props) => {
        return `${props.tk || ""}|${props.khoanh || ""}|${props.area || ""}|${
          props.start_dau || ""
        }|${props.end_sau || ""}`;
      };

      const rowVirtualId = createVirtualId(row);
      console.log("ID ảo của dòng:", rowVirtualId);

      // Tìm feature khớp chính xác nhất
      let matchedFeature = null;
      let bestMatchScore = -1;

      // Giả lập quá trình tìm kiếm để hiển thị loading
      setTimeout(() => {
        setLoadingMessage("Phân tích dữ liệu...");
      }, 300);

      setTimeout(() => {
        setLoadingMessage("Đang xác định vị trí...");
      }, 600);

      // Duyệt qua từng feature để tìm khớp nhất
      for (let i = 0; i < geoData.features.length; i++) {
        const feature = geoData.features[i];
        const props = feature.properties;
        const featureArea = parseArea(props.area);

        // Tính điểm khớp cho feature này
        let matchScore = 0;

        // Khớp theo tiểu khu (trọng số cao)
        if (rowTk && props.tk && rowTk === props.tk) {
          matchScore += 5;
        }

        // Khớp theo khoảnh (trọng số cao)
        if (rowKhoanh && props.khoanh && rowKhoanh === props.khoanh) {
          matchScore += 5;
        }

        // Khớp theo diện tích (với độ chính xác cao)
        if (rowArea && featureArea && Math.abs(rowArea - featureArea) < 0.05) {
          matchScore += 10 - Math.abs(rowArea - featureArea) * 100; // Điểm cao hơn cho khớp chính xác hơn
        }

        // Khớp theo mã huyện
        if (rowMahuyen && props.mahuyen && rowMahuyen === props.mahuyen) {
          matchScore += 3;
        }

        // Khớp theo xã
        if (rowXa && props.xa && rowXa === props.xa) {
          matchScore += 3;
        }

        // Khớp theo thời gian
        if (rowStartDau && props.start_dau && rowStartDau === props.start_dau) {
          matchScore += 2;
        }

        if (rowEndSau && props.end_sau && rowEndSau === props.end_sau) {
          matchScore += 2;
        }

        // So sánh ID ảo (trọng số rất cao)
        const featureVirtualId = createVirtualId(props);
        if (rowVirtualId === featureVirtualId) {
          matchScore += 20;
        }

        // Kiểm tra nếu feature này khớp tốt hơn
        if (matchScore > bestMatchScore) {
          bestMatchScore = matchScore;
          matchedFeature = feature;
          console.log(
            `Feature #${i} có điểm khớp: ${matchScore}, hiện là feature tốt nhất`
          );
        }
      }

      setTimeout(() => {
        if (matchedFeature) {
          console.log(
            "Tìm thấy feature khớp tốt nhất với điểm:",
            bestMatchScore
          );
          console.log("Feature:", matchedFeature);

          // Đánh dấu feature được chọn
          setSelectedFeature(matchedFeature);
          setSelectedRowFeature(matchedFeature);

          // Thực hiện zoom đến feature
          if (window._leaflet_map) {
            try {
              // Reset style cho feature được highlight trước đó
              if (highlightedLayerRef && geoJsonLayerRef.current) {
                geoJsonLayerRef.current.resetStyle(highlightedLayerRef);
              }

              // Highlight feature mới trên bản đồ
              if (geoJsonLayerRef.current) {
                let newHighlightedLayer = null;

                geoJsonLayerRef.current.eachLayer((layer) => {
                  if (layer.feature === matchedFeature) {
                    // ✅ Sử dụng style màu đỏ cho feature được chọn
                    layer.setStyle(getDefaultMatRungStyle(matchedFeature, true));
                    layer.bringToFront();
                    newHighlightedLayer = layer;

                    // Mở popup nếu có
                    if (layer.getPopup) {
                      layer.openPopup();
                    }
                  }
                });

                setHighlightedLayerRef(newHighlightedLayer);
              }

              // Hoàn thành quá trình tìm kiếm
              setLoadingDetails(false);
            } catch (error) {
              console.error("Lỗi khi zoom:", error);
              setLoadingDetails(false);
            }
          } else {
            console.error("Map chưa được khởi tạo");
            setLoadingDetails(false);
          }
        } else {
          console.error("Không tìm thấy feature tương ứng");
          toast.error(
            "Không thể tìm thấy vị trí chính xác trên bản đồ. Vui lòng thử lại hoặc chọn mục khác."
          );
          setLoadingDetails(false);
        }
      }, 1000); // Đợi 1 giây để giả lập quá trình tìm kiếm
    } catch (error) {
      console.error("Lỗi xử lý sự kiện click bảng:", error);
      setLoadingDetails(false);
    }
  };

  // Xử lý cho mỗi feature trên bản đồ
  const onEachFeature = (feature, layer, layerType) => {
    if (feature.properties) {
      const popupContent = buildPopupContent(feature, layerType);
      layer.bindPopup(popupContent, {
        maxWidth: 300,
        className: "custom-popup-container",
      });
    }

    layer.on("mouseover", function () {
      const currentStyle = layerType === "default" || !layerType 
        ? getDefaultMatRungStyle(this.feature, false)
        : getLayerStyle(this.feature, layerType, false);
      this.setStyle({
        ...currentStyle,
        weight: currentStyle.weight + 1,
        color: "#ff7800",
        fillOpacity: Math.min(currentStyle.fillOpacity + 0.2, 1),
      });
      this.bringToFront();
    });

    layer.on("mouseout", function () {
      if (!selectedFeature || this.feature !== selectedFeature) {
        const originalStyle = getLayerStyle(this.feature, layerType, false);
        this.setStyle(originalStyle);
      }
    });

    layer.on("click", () => {
      setSelectedFeature(feature);
    });
  };

  // Zoom tới feature khi map và data sẵn sàng
  useEffect(() => {
    if (mapReady && geoData?.features?.length > 0 && window._leaflet_map) {
      try {
        console.log("Cố gắng zoom đến dữ liệu...");
        const geoJsonLayer = L.geoJSON(geoData);
        const bounds = geoJsonLayer.getBounds();

        if (bounds.isValid()) {
          console.log("Bounds hợp lệ:", bounds);
          window._leaflet_map.fitBounds(bounds, { padding: [20, 20] });
        } else {
          console.log("Bounds không hợp lệ từ GeoJSON");
        }
      } catch (err) {
        console.error("Lỗi khi zoom đến dữ liệu:", err);
      }
    }
  }, [mapReady, geoData]);

  return (
    <div className="p-2 md:p-5 font-sans relative">
      <h2 className="text-center text-lg md:text-xl font-bold mb-2 md:mb-5">
        Bản đồ khu vực
      </h2>

      <div
        className={`flex justify-center items-center ${
          isDataPage ? "mb-2 md:mb-5" : ""
        } relative`}
      >
        {/* Loading overlay for map */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
            <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center">
              <ClipLoader color="#027e02" size={40} />
              <p className="mt-2 text-forest-green-primary">
                Đang tải dữ liệu bản đồ...
              </p>
            </div>
          </div>
        )}

        <MapContainer
          center={[22.1702, 104.1225]} // Center tỉnh Lào Cai
          zoom={8}
          className={`w-full rounded-xl shadow-lg ${
            isDataPage
              ? "h-[40vh] md:h-[50vh]"
              : "h-[50vh] md:h-[calc(100vh-150px)]"
          }`}
          whenCreated={(mapInstance) => {
            console.log("Map đã được khởi tạo");
            window._leaflet_map = mapInstance;
            setTimeout(() => {
              setMapReady(true);
              console.log("Map đã sẵn sàng");
            }, 500);
          }}
        >
          {mapType === "normal" ? (
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          ) : (
            <>
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
              <TileLayer url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />
            </>
          )}
          {/* Component để xử lý việc bay đến feature được chọn từ bảng */}
          <MapUpdater selectedFeature={selectedRowFeature} />
          
          {layerName ? (
            <WMSTileLayer
              url="http://localhost:8080/geoserver/rung/wms"
              layers={layerName}
              format="image/png"
              transparent={true}
              version="1.1.0"
              attribution="GeoServer"
            />
          ) : (
            <>
            {/* ✅ HIỂN THỊ DỮ LIỆU MẶC ĐỊNH TỪ BẢNG MAT_RUNG VỚI MÀU ĐỎ */}
              {geoData?.type === "FeatureCollection" &&
                geoData.features?.length > 0 && (
                  <>
                    {console.log(
                      "🔴 Rendering dữ liệu mat_rung mặc định với",
                      geoData.features.length,
                      "features - MÀU ĐỎ"
                    )}
                    <GeoJSON
                      key={`mat-rung-default-${Date.now()}`}
                      data={geoData}
                      onEachFeature={(feature, layer) => {
                        // ✅ Popup cho dữ liệu mat_rung
                        if (feature.properties) {
                          let popupContent = `
                            <div class="custom-popup">
                              <h4 class="popup-title">🔴 Khu vực mất rừng</h4>
                              <table class="popup-table">
                          `;

                          // Các trường quan trọng hiển thị đầu tiên
                          const priorityFields = [
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

                          // Xử lý các trường ưu tiên trước
                          priorityFields.forEach((field) => {
                            if (feature.properties[field] !== undefined) {
                              let value = feature.properties[field];
                              let label = field;

                              // Định dạng ngày tháng
                              if (
                                field === "start_dau" ||
                                field === "end_sau"
                              ) {
                                value = formatDate(value);
                                label =
                                  field === "start_dau"
                                    ? "Từ ngày"
                                    : "Đến ngày";
                              }

                              // Định dạng diện tích
                              if (field === "area" && value !== null) {
                                value = `${(parseFloat(value) / 10000).toFixed(
                                  2
                                )} ha`;
                                label = "Diện tích";
                              }

                              // Đổi tên hiển thị các trường
                              const fieldLabels = {
                                huyen: "Huyện",
                                xa: "Xã",
                                tk: "Tiểu khu",
                                khoanh: "Khoảnh",
                                churung: "Chủ rừng",
                                mahuyen: "Mã huyện",
                              };

                              label = fieldLabels[field] || label;

                              popupContent += `
                                <tr>
                                  <th>${label}</th>
                                  <td>${value !== null ? value : "Không có"}</td>
                                </tr>
                              `;
                            }
                          });

                          popupContent += `</table></div>`;

                          layer.bindPopup(popupContent, {
                            maxWidth: 300,
                            className: "custom-popup-container",
                          });
                        }

                        // Hover effects
                        layer.on("mouseover", function () {
                          this.setStyle(getDefaultMatRungStyle(this.feature, true));
                          this.bringToFront();
                        });

                        layer.on("mouseout", function () {
                          if (!selectedFeature || this.feature !== selectedFeature) {
                            this.setStyle(getDefaultMatRungStyle(this.feature, false));
                          }
                        });

                        // Click event
                        layer.on("click", () => {
                          setSelectedFeature(feature);
                          setHighlightedLayerRef(layer);
                        });
                      }}
                      style={(feature) => {
                        // ✅ Sử dụng style màu đỏ mặc định
                        const style = getDefaultMatRungStyle(feature, selectedFeature === feature);
                        console.log("🔴 Default mat_rung style applied:", style);
                        return style;
                      }}
                      ref={(layerRef) => {
                        if (layerRef) {
                          geoJsonLayerRef.current = layerRef;

                          if (mapReady) {
                            const bounds = layerRef.getBounds();
                            if (bounds.isValid()) {
                              window._leaflet_map.fitBounds(bounds, {
                                padding: [20, 20],
                              });
                              console.log("✅ Đã zoom đến dữ liệu GeoJSON màu đỏ");
                            }
                          }
                        }
                      }}
                    />
                  </>
                )}
              {/* DEBUG: Log trạng thái deforestation alerts */}
              {console.log("🔍 DEBUG - Deforestation Alerts Status:", {
                hasData: !!mapLayers.deforestationAlerts?.data,
                isVisible: mapLayers.deforestationAlerts?.visible,
                featureCount:
                  mapLayers.deforestationAlerts?.data?.features?.length,
                layerData: mapLayers.deforestationAlerts,
              })}

              {/* Hiển thị các layer theo thứ tự từ dưới lên trên */}

              {/* 1. Layer nền địa hình (dưới cùng) */}
              {mapLayers.terrain?.data && mapLayers.terrain.visible && (
                <GeoJSON
                  key={`terrain-${Date.now()}`}
                  data={mapLayers.terrain.data}
                  onEachFeature={(feature, layer) =>
                    onEachFeature(feature, layer, "terrain")
                  }
                  style={(feature) =>
                    getLayerStyle(
                      feature,
                      "terrain",
                      selectedFeature === feature
                    )
                  }
                />
              )}

              {/* 2. Layer chủ quản lý rừng */}
              {mapLayers.forestManagement?.data &&
                mapLayers.forestManagement.visible && (
                  <GeoJSON
                    key={`forest-management-${Date.now()}`}
                    data={mapLayers.forestManagement.data}
                    onEachFeature={(feature, layer) =>
                      onEachFeature(feature, layer, "forestManagement")
                    }
                    style={(feature) =>
                      getLayerStyle(
                        feature,
                        "forestManagement",
                        selectedFeature === feature
                      )
                    }
                  />
                )}

              {/* 3. Layer 3 loại rừng */}
              {mapLayers.forestTypes?.data && mapLayers.forestTypes.visible && (
                <GeoJSON
                  key={`forest-types-${Date.now()}`}
                  data={mapLayers.forestTypes.data}
                  onEachFeature={(feature, layer) =>
                    onEachFeature(feature, layer, "forestTypes")
                  }
                  style={(feature) =>
                    getLayerStyle(
                      feature,
                      "forestTypes",
                      selectedFeature === feature
                    )
                  }
                />
              )}

              {/* 4. Layer dự báo mất rừng từ mapLayers - CÁCH 1 */}
              {mapLayers.deforestationAlerts?.data &&
                mapLayers.deforestationAlerts.visible && (
                  <>
                    {console.log(
                      "✅ Rendering deforestation alerts layer with data:",
                      mapLayers.deforestationAlerts.data.features?.length,
                      "features"
                    )}
                    <GeoJSON
                      key={`deforestation-alerts-${Date.now()}`}
                      data={mapLayers.deforestationAlerts.data}
                      onEachFeature={(feature, layer) => {
                        if (feature.properties) {
                          // Xây dựng HTML popup cho dự báo mất rừng mới nhất
                          let popupContent = `
                <div class="custom-popup">
                  <h4 class="popup-title">Dự báo mất rừng mới nhất</h4>
                  <table class="popup-table">
              `;

                          // Các trường quan trọng hiển thị đầu tiên
                          const priorityFields = [
                            "area_ha",
                            "start_dau",
                            "end_sau",
                            "alert_level",
                            "days_since",
                            "detection_status",
                            "mahuyen",
                          ];

                          // Xử lý các trường ưu tiên trước
                          priorityFields.forEach((field) => {
                            if (
                              feature.properties[field] !== undefined &&
                              feature.properties[field] !== null
                            ) {
                              let value = feature.properties[field];
                              let label = field;

                              // Định dạng các trường đặc biệt
                              if (
                                field === "start_dau" ||
                                field === "end_sau"
                              ) {
                                value = formatDate(value);
                                label =
                                  field === "start_dau"
                                    ? "Từ ngày"
                                    : "Đến ngày";
                              }

                              if (field === "area_ha") {
                                label = "Diện tích";
                                value = `${value} ha`;
                              }

                              if (field === "alert_level") {
                                label = "Mức cảnh báo";
                                const levelNames = {
                                  critical: "Nghiêm trọng",
                                  high: "Cao",
                                  medium: "Trung bình",
                                  low: "Thấp",
                                };
                                value = levelNames[value] || value;
                              }

                              if (field === "days_since") {
                                label = "Số ngày trước";
                                value = `${value} ngày`;
                              }

                              if (field === "detection_status") {
                                label = "Trạng thái xác minh";
                              }

                              if (field === "mahuyen") {
                                label = "Mã huyện";
                              }

                              popupContent += `
                    <tr>
                      <th>${label}</th>
                      <td>${value}</td>
                    </tr>
                  `;
                            }
                          });

                          popupContent += `</table></div>`;

                          layer.bindPopup(popupContent, {
                            maxWidth: 300,
                            className: "custom-popup-container",
                          });
                        }

                        // Sự kiện mouseover/mouseout để highlight đối tượng
                        layer.on("mouseover", function () {
                          this.setStyle({
                            weight: 4,
                            color: "#ff7800",
                            dashArray: "",
                            fillOpacity: 0.9,
                          });
                          this.bringToFront();
                        });

                        layer.on("mouseout", function () {
                          // Chỉ reset style nếu không phải đối tượng được chọn
                          if (
                            !selectedFeature ||
                            this.feature !== selectedFeature
                          ) {
                            const originalStyle = getLayerStyle(
                              this.feature,
                              "deforestationAlerts",
                              false
                            );
                            this.setStyle(originalStyle);
                          }
                        });

                        // Sự kiện click cho layer
                        layer.on("click", () => {
                          setSelectedFeature(feature);
                          setHighlightedLayerRef(layer);
                        });
                      }}
                      style={(feature) => {
                        const style = getLayerStyle(
                          feature,
                          "deforestationAlerts",
                          selectedFeature === feature
                        );
                        console.log(
                          "🎨 Deforestation style for feature:",
                          style
                        );
                        return style;
                      }}
                    />
                  </>
                )}

              {/* 5. Layer dự báo mất rừng từ geoData - FALLBACK NẾU KHÔNG CÓ TRONG mapLayers */}
              {!mapLayers.deforestationAlerts?.data &&
                geoData?.type === "FeatureCollection" &&
                geoData.features?.length > 0 && (
                  <>
                    {console.log(
                      "📋 Using fallback geoData for deforestation with",
                      geoData.features.length,
                      "features"
                    )}
                    <GeoJSON
                      key={`deforestation-fallback-${Date.now()}`}
                      data={geoData}
                      onEachFeature={(feature, layer) => {
                        if (feature.properties) {
                          // Xây dựng HTML popup cho dự báo mất rừng từ geoData
                          let popupContent = `
                <div class="custom-popup">
                  <h4 class="popup-title">Thông tin đối tượng</h4>
                  <table class="popup-table">
              `;

                          // Các trường quan trọng hiển thị đầu tiên
                          const priorityFields = [
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

                          // Xử lý các trường ưu tiên trước
                          priorityFields.forEach((field) => {
                            if (feature.properties[field] !== undefined) {
                              let value = feature.properties[field];
                              let label = field;

                              // Định dạng ngày tháng
                              if (
                                field === "start_dau" ||
                                field === "end_sau"
                              ) {
                                value = formatDate(value);
                                label =
                                  field === "start_dau"
                                    ? "Từ ngày"
                                    : "Đến ngày";
                              }

                              // Định dạng diện tích
                              if (field === "area" && value !== null) {
                                value = `${(parseFloat(value) / 10000).toFixed(
                                  2
                                )} ha`;
                                label = "Diện tích";
                              }

                              // Đổi tên hiển thị các trường
                              const fieldLabels = {
                                huyen: "Huyện",
                                xa: "Xã",
                                tk: "Tiểu khu",
                                khoanh: "Khoảnh",
                                churung: "Chủ rừng",
                                mahuyen: "Mã huyện",
                              };

                              label = fieldLabels[field] || label;

                              popupContent += `
                    <tr>
                      <th>${label}</th>
                      <td>${value !== null ? value : "Không có"}</td>
                    </tr>
                  `;
                            }
                          });

                          // Trạng thái xác minh nếu có
                          if (feature.properties.detection_status) {
                            popupContent += `
                  <tr>
                    <th>Trạng thái</th>
                    <td>${feature.properties.detection_status}</td>
                  </tr>
                `;
                          }

                          popupContent += `</table></div>`;

                          layer.bindPopup(popupContent, {
                            maxWidth: 300,
                            className: "custom-popup-container",
                          });
                        }

                        // Sự kiện mouseover/mouseout để highlight đối tượng
                        layer.on("mouseover", function () {
                          this.setStyle({
                            weight: 3,
                            color: "#ff7800",
                            dashArray: "",
                            fillOpacity: 0.7,
                          });
                          this.bringToFront();
                        });

                        layer.on("mouseout", function () {
                          // Chỉ reset style nếu không phải đối tượng được chọn
                          if (
                            !selectedFeature ||
                            this.feature !== selectedFeature
                          ) {
                            geoJsonLayerRef.current.resetStyle(this);
                          }
                        });

                        // Sự kiện click cho layer
                        layer.on("click", () => {
                          // Đặt style cho tất cả các layer
                          if (geoJsonLayerRef.current) {
                            geoJsonLayerRef.current.eachLayer((l) => {
                              l.setStyle({
                                weight: l === layer ? 3 : 1,
                                color: l === layer ? "#ff7800" : "#3388ff",
                                fillOpacity: l === layer ? 0.7 : 0.2,
                              });

                              if (l === layer) {
                                l.bringToFront();
                              }
                            });
                          }

                          setSelectedFeature(feature);
                          setHighlightedLayerRef(layer);
                        });
                      }}
                      style={(feature) => ({
                        fillColor: getColorByStatus(feature.properties),
                        weight:
                          selectedFeature && feature === selectedFeature
                            ? 3
                            : 1,
                        opacity: 1,
                        color:
                          selectedFeature && feature === selectedFeature
                            ? "#ff7800"
                            : "#ffffff",
                        fillOpacity: 0.7,
                      })}
                      ref={(layerRef) => {
                        if (layerRef) {
                          geoJsonLayerRef.current = layerRef;

                          if (mapReady) {
                            const bounds = layerRef.getBounds();
                            if (bounds.isValid()) {
                              window._leaflet_map.fitBounds(bounds, {
                                padding: [20, 20],
                              });
                              console.log("✅ Đã zoom đến dữ liệu GeoJSON");
                            }
                          }
                        }
                      }}
                    />
                  </>
                )}

              {/* 6. Layer ranh giới hành chính (TRÊN CÙNG để hiển thị rõ nhất) */}
              {mapLayers.administrative?.data &&
                mapLayers.administrative.visible && (
                  <GeoJSON
                    key={`administrative-${Date.now()}`}
                    data={{
                      type: "FeatureCollection",
                      features: mapLayers.administrative.data.features || [],
                    }}
                    onEachFeature={(feature, layer) => {
                      console.log(
                        `🔗 Adding administrative feature to map:`,
                        feature.properties
                      );
                      onEachFeature(feature, layer, "administrative");
                    }}
                    style={(feature) => {
                      const style = getLayerStyle(
                        feature,
                        "administrative",
                        selectedFeature === feature
                      );
                      console.log(`🎨 Administrative feature style:`, style);
                      return style;
                    }}
                  />
                )}
            </>
          )}
          <CustomMapControl
            setMapType={setMapType}
            mapLayers={mapLayers}
            toggleLayerVisibility={toggleLayerVisibility}
          />
        </MapContainer>
      </div>

       {/* ✅ HIỂN THỊ BẢNG DỮ LIỆU MẶC ĐỊNH */}
      {!layerName &&
        isDataPage &&
        (loading ? (
          <div className="text-center text-green-700 font-semibold p-3 bg-white rounded-md shadow">
            <div className="animate-spin inline-block w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full mr-2"></div>
            Đang tải dữ liệu... Vui lòng đợi trong giây lát
          </div>
        ) : (
          geoData?.features?.length > 0 && (
            <div className="relative">
              {/* Loading overlay cho bảng dữ liệu */}
              {loadingDetails && <LoadingOverlay message={loadingMessage} />}

              <Table
                data={geoData.features.map((f) => f.properties)}
                onRowClick={handleRowClick}
              />
            </div>
          )
        ))}

      {/* Debugging display */}
      {!loading &&
        (!geoData || !geoData.features || geoData.features.length === 0) &&
        Object.values(mapLayers).every((layer) => !layer.data) && (
          <div className="text-center text-amber-700 font-semibold p-3 bg-amber-50 rounded-md mt-2">
            ⚠️ Chưa có dữ liệu hiển thị. Hãy sử dụng chức năng "Cập nhật dữ
            liệu" để tải các lớp bản đồ.
          </div>
        )}
    </div>
  );
};



export default Map;
