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

// Hàm xác định style cho từng loại layer với màu sắc được cải thiện
const getLayerStyle = (feature, layerType, isSelected = false) => {
  const baseStyle = {
    weight: 2,
    opacity: 1,
    fillOpacity: 0.6,
  };

  const selectedStyle = isSelected ? {
    weight: 4,
    color: "#ff7800",
    fillOpacity: 0.8,
  } : {};

  switch (layerType) {
    case 'administrative':
      // Phân biệt các cấp ranh giới dựa trên boundary_level với màu sắc rõ ràng hơn
      const boundaryLevel = feature.properties.boundary_level || 'huyen';
      
      const boundaryStyles = {
        'tinh': {
          color: '#000000',        // Đen đậm nhất - ranh giới tỉnh
          weight: 5,               // Đường dày nhất
          dashArray: null,         // Đường liền
          opacity: 1,
          fillColor: 'transparent'
        },
        'huyen': {
          color: '#1a365d',        // Xanh đậm - ranh giới huyện
          weight: 4,               // Đường dày
          dashArray: '15, 10',     // Nét đứt lớn
          opacity: 1,
          fillColor: 'transparent'
        },
        'xa': {
          color: '#2d3748',        // Xám đậm - ranh giới xã
          weight: 3,               // Đường vừa
          dashArray: '10, 6',      // Nét đứt vừa
          opacity: 0.9,
          fillColor: 'transparent'
        },
        'tieukhu': {
          color: '#4a5568',        // Xám vừa - ranh giới tiểu khu
          weight: 2,               // Đường nhỏ
          dashArray: '8, 5',       // Nét đứt nhỏ
          opacity: 0.8,
          fillColor: 'transparent'
        },
        'khoanh': {
          color: '#718096',        // Xám nhạt - ranh giới khoảnh
          weight: 1.5,             // Đường mảnh nhất
          dashArray: '5, 4',       // Nét đứt rất nhỏ
          opacity: 0.7,
          fillColor: 'transparent'
        }
      };
      
      const style = boundaryStyles[boundaryLevel] || boundaryStyles['huyen'];
      
      return {
        ...baseStyle,
        color: style.color,
        fillColor: style.fillColor,
        weight: style.weight,
        dashArray: style.dashArray,
        opacity: style.opacity,
        fillOpacity: 0,
        ...selectedStyle
      };

    case 'forestTypes':
      // 3 loại rừng với màu sắc rõ ràng và tương phản cao
      const forestType = feature.properties.forest_function || feature.properties.malr3;
      let forestColor = '#38a169'; // xanh lá mặc định
      let borderColor = '#2f855a';
      
      if (forestType === 'Rừng đặc dụng' || forestType === 1) {
        forestColor = '#e53e3e'; // đỏ tươi - rừng đặc dụng
        borderColor = '#c53030';
      } else if (forestType === 'Rừng phòng hộ' || forestType === 2) {
        forestColor = '#dd6b20'; // cam đậm - rừng phòng hộ
        borderColor = '#c05621';
      } else if (forestType === 'Rừng sản xuất' || forestType === 3) {
        forestColor = '#38a169'; // xanh lá - rừng sản xuất
        borderColor = '#2f855a';
      }
      
      return {
        ...baseStyle,
        color: borderColor,
        fillColor: forestColor,
        weight: 2,
        fillOpacity: 0.5,
        ...selectedStyle
      };

    case 'terrain':
      // Địa hình, thủy văn, giao thông với màu sắc phân biệt rõ ràng
      const terrainType = feature.properties.feature_type;
      let terrainColor = '#4a5568'; // xám cho địa hình
      let terrainWeight = 2;
      let terrainOpacity = 0.7;
      
      if (terrainType === 'waterway') {
        terrainColor = '#3182ce'; // xanh dương đậm - sông suối
        terrainWeight = 3;
        terrainOpacity = 0.8;
      } else if (terrainType === 'water_transport') {
        terrainColor = '#0987a0'; // xanh ngọc - thủy vận
        terrainWeight = 2;
        terrainOpacity = 0.7;
      } else if (terrainType === 'road') {
        terrainColor = '#b7791f'; // nâu vàng - giao thông
        terrainWeight = 4;
        terrainOpacity = 0.9;
      }
      
      return {
        ...baseStyle,
        color: terrainColor,
        fillColor: terrainType === 'waterway' ? terrainColor : 'transparent',
        weight: terrainWeight,
        opacity: terrainOpacity,
        fillOpacity: terrainType === 'waterway' ? 0.4 : 0,
        ...selectedStyle
      };

    case 'forestManagement':
      // Chủ quản lý rừng với palette màu phân biệt
      const managementColors = [
        '#9f1239', // đỏ đậm
        '#7c2d12', // nâu đỏ
        '#365314', // xanh lá đậm
        '#1e3a8a', // xanh dương đậm
        '#581c87', // tím đậm
        '#be123c', // hồng đậm
        '#166534', // xanh lục đậm
        '#92400e'  // cam đậm
      ];
      const colorIndex = (feature.properties.gid || 0) % managementColors.length;
      const managementColor = managementColors[colorIndex];
      
      return {
        ...baseStyle,
        color: managementColor,
        fillColor: managementColor,
        weight: 2,
        fillOpacity: 0.4,
        opacity: 0.8,
        ...selectedStyle
      };

    case 'forestStatus':
      // Hiện trạng rừng với màu xanh lục đậm
      return {
        ...baseStyle,
        color: '#166534',
        fillColor: '#22c55e',
        weight: 2,
        fillOpacity: 0.3,
        opacity: 0.8,
        ...selectedStyle
      };

    case 'deforestation':
      // Dự báo mất rừng với màu cảnh báo rõ ràng
      const alertLevel = feature.properties.alert_level;
      let alertColor = '#dc2626'; // đỏ mặc định
      let alertOpacity = 0.8;
      
      if (alertLevel === 'critical') {
        alertColor = '#7f1d1d'; // đỏ thẫm - nghiêm trọng
        alertOpacity = 0.9;
      } else if (alertLevel === 'high') {
        alertColor = '#dc2626'; // đỏ - cao
        alertOpacity = 0.8;
      } else if (alertLevel === 'medium') {
        alertColor = '#ea580c'; // cam đỏ - trung bình
        alertOpacity = 0.7;
      }
      
      return {
        fillColor: alertColor,
        weight: isSelected ? 4 : 2,
        opacity: 1,
        color: isSelected ? "#ff7800" : "#ffffff",
        fillOpacity: alertOpacity,
      };

    default:
      // Style mặc định với màu sắc cải thiện
      return {
        fillColor: getColorByStatus(feature.properties),
        weight: isSelected ? 3 : 2,
        opacity: 1,
        color: isSelected ? "#ff7800" : "#2d3748",
        fillOpacity: 0.7,
      };
  }
};

// Hàm xây dựng popup content dựa trên loại layer
const buildPopupContent = (feature, layerType) => {
  const props = feature.properties;
  
  let popupContent = `
    <div class="custom-popup">
      <h4 class="popup-title">`;

  switch (layerType) {
    case 'administrative':
      const boundaryLevelNames = {
        'tinh': 'Ranh giới tỉnh',
        'huyen': 'Ranh giới huyện', 
        'xa': 'Ranh giới xã',
        'tieukhu': 'Ranh giới tiểu khu',
        'khoanh': 'Ranh giới khoảnh'
      };
      popupContent += boundaryLevelNames[props.boundary_level] || 'Ranh giới hành chính';
      break;
    case 'forestTypes':
      popupContent += '3 loại rừng - ' + (props.forest_function || 'Không xác định');
      break;
    case 'terrain':
      const terrainTypeNames = {
        'waterway': 'Đường sông nước',
        'water_transport': 'Thủy vận',
        'road': 'Giao thông',
        'terrain': 'Địa hình'
      };
      popupContent += terrainTypeNames[props.feature_type] || 'Địa hình - Thủy văn - Giao thông';
      break;
    case 'forestManagement':
      popupContent += 'Chủ quản lý rừng';
      break;
    case 'forestStatus':
      popupContent += 'Hiện trạng rừng';
      break;
    case 'deforestation':
      popupContent += 'Dự báo mất rừng - ' + (props.alert_level === 'critical' ? 'Nghiêm trọng' : 
                                              props.alert_level === 'high' ? 'Cao' : 'Trung bình');
      break;
    default:
      popupContent += 'Thông tin đối tượng';
  }

  popupContent += `</h4><table class="popup-table">`;

  const priorityFieldsByType = {
    administrative: ['boundary_level', 'huyen', 'xa', 'tieukhu', 'khoanh'],
    forestTypes: ['xa', 'tk', 'khoanh', 'lo', 'dtich', 'ldlr', 'forest_function', 'churung'], 
    terrain: ['ten', 'ma', 'feature_type'],
    forestManagement: ['chuquanly', 'tt'],
    forestStatus: ['huyen', 'xa', 'tk', 'khoanh', 'churung', 'area_ha'],
    deforestation: ['area_ha', 'start_dau', 'end_sau', 'alert_level', 'days_since'],
    default: ['huyen', 'xa', 'area', 'start_dau', 'end_sau', 'tk', 'khoanh', 'churung', 'mahuyen']
  };

  const priorityFields = priorityFieldsByType[layerType] || priorityFieldsByType.default;

  priorityFields.forEach((field) => {
    if (props[field] !== undefined && props[field] !== null) {
      let value = props[field];
      let label = field;

      if (field === "start_dau" || field === "end_sau") {
        value = formatDate(value);
        label = field === "start_dau" ? "Từ ngày" : "Đến ngày";
      }

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

      if (field === "boundary_level") {
        const levelNames = {
          'tinh': 'Tỉnh',
          'huyen': 'Huyện', 
          'xa': 'Xã',
          'tieukhu': 'Tiểu khu',
          'khoanh': 'Khoảnh'
        };
        value = levelNames[value] || value;
      }

      if (field === "days_since") {
        value = `${value} ngày trước`;
        label = "Thời gian phát hiện";
      }

      const fieldLabels = {
        huyen: "Huyện", xa: "Xã", tk: "Tiểu khu", khoanh: "Khoảnh",
        churung: "Chủ rừng", mahuyen: "Mã huyện", chuquanly: "Chủ quản lý",
        ten: "Tên", ma: "Mã", tt: "Thứ tự", tieukhu: "Tiểu khu",
        lo: "Lô", dtich: "Diện tích", ldlr: "Loại đất lâm nghiệp",
        forest_function: "Chức năng rừng", feature_type: "Loại đối tượng",
        alert_level: "Mức cảnh báo", area_ha: "Diện tích",
        boundary_level: "Cấp ranh giới"
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

  Object.entries(props).forEach(([key, value]) => {
    if (
      !priorityFields.includes(key) &&
      !key.includes("geom") &&
      !key.startsWith("_") &&
      !["x", "y", "x_vn2000", "y_vn2000", "gid", "layer_type"].includes(key) &&
      value !== null && value !== undefined
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

// Component hiển thị loading overlay
const LoadingOverlay = ({ message }) => (
  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
      <ClipLoader color="#027e02" size={50} />
      <p className="mt-4 text-forest-green-primary font-medium">{message}</p>
    </div>
  </div>
);

// Control để chọn loại bản đồ và quản lý lớp dữ liệu với legend được cải thiện
const CustomMapControl = ({ setMapType, mapLayers, toggleLayerVisibility }) => {
  const map = useMap();

  useEffect(() => {
    const container = L.DomUtil.create("div");

    container.innerHTML = `
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
                flex: 1;
                padding: 4px 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background: white;
                cursor: pointer;
                font-size: 11px;
                transition: all 0.2s;
              ">🗺️ Bản đồ thường</button>
              <button class="map-type-btn active" data-type="satellite" style="
                flex: 1;
                padding: 4px 8px;
                border: 1px solid #007bff;
                border-radius: 4px;
                background: #e3f2fd;
                cursor: pointer;
                font-size: 11px;
                transition: all 0.2s;
              ">🛰️ Bản đồ vệ tinh</button>
            </div>
          </div>

          <!-- Lớp ranh giới hành chính -->
          <div class="legend-section">
            <div class="section-header" style="
              padding: 8px 12px;
              cursor: pointer;
              display: flex;
              align-items: center;
              border-bottom: 1px solid #eee;
              background: #f8f9fa;
            " data-section="administrative">
              <input type="checkbox" id="administrative-checkbox" ${mapLayers.administrative?.visible ? 'checked' : ''} style="margin-right: 8px;">
              <span style="color: #1a365d;">🏛️</span>
              <span style="margin-left: 6px; font-weight: 500;">Lớp ranh giới hành chính</span>
              <svg class="section-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-left: auto; transform: rotate(0deg); transition: transform 0.3s;">
                <polyline points="6,9 12,15 18,9"></polyline>
              </svg>
            </div>
            <div class="section-content" style="padding: 6px 12px; padding-left: 32px;">
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <div style="width: 24px; height: 4px; background: #000000; margin-right: 8px; border: none;"></div>
                <span style="font-size: 11px; font-weight: 500;">Ranh giới tỉnh</span>
              </div>
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <svg width="24" height="4" style="margin-right: 8px;">
                  <line x1="0" y1="2" x2="24" y2="2" stroke="#1a365d" stroke-width="3" stroke-dasharray="6,3"/>
                </svg>
                <span style="font-size: 11px; font-weight: 500;">Ranh giới huyện</span>
              </div>
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <svg width="24" height="4" style="margin-right: 8px;">
                  <line x1="0" y1="2" x2="24" y2="2" stroke="#2d3748" stroke-width="2" stroke-dasharray="4,2"/>
                </svg>
                <span style="font-size: 11px;">Ranh giới xã</span>
              </div>
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <svg width="24" height="4" style="margin-right: 8px;">
                  <line x1="0" y1="2" x2="24" y2="2" stroke="#4a5568" stroke-width="1.5" stroke-dasharray="3,2"/>
                </svg>
                <span style="font-size: 11px;">Ranh giới tiểu khu</span>
              </div>
              <div style="display: flex; align-items: center; margin-bottom: 3px;">
                <svg width="24" height="4" style="margin-right: 8px;">
                  <line x1="0" y1="2" x2="24" y2="2" stroke="#718096" stroke-width="1" stroke-dasharray="2,2"/>
                </svg>
                <span style="font-size: 11px;">Ranh giới khoảnh</span>
              </div>
            </div>
          </div>

          <!-- Lớp 3 loại rừng -->
          <div class="legend-section">
            <div class="section-header" style="
              padding: 8px 12px;
              cursor: pointer;
              display: flex;
              align-items: center;
              border-bottom: 1px solid #eee;
            " data-section="forest-types">
              <input type="checkbox" id="forest-types-checkbox" ${mapLayers.forestTypes?.visible ? 'checked' : ''} style="margin-right: 8px;">
              <span style="color: #38a169;">🌲</span>
              <span style="margin-left: 6px; font-weight: 500;">Lớp 3 loại rừng</span>
              <svg class="section-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-left: auto; transform: rotate(-90deg); transition: transform 0.3s;">
                <polyline points="6,9 12,15 18,9"></polyline>
              </svg>
            </div>
            <div class="section-content" style="padding: 6px 12px; padding-left: 32px; display: none;">
              <div style="display: flex; align-items: center; margin-bottom: 3px;">
                <div style="width: 16px; height: 16px; background: #e53e3e; margin-right: 8px; border-radius: 2px; border: 1px solid #c53030;"></div>
                <span style="font-weight: 500;">Rừng đặc dụng</span>
              </div>
              <div style="display: flex; align-items: center; margin-bottom: 3px;">
                <div style="width: 16px; height: 16px; background: #dd6b20; margin-right: 8px; border-radius: 2px; border: 1px solid #c05621;"></div>
                <span style="font-weight: 500;">Rừng phòng hộ</span>
              </div>
              <div style="display: flex; align-items: center; margin-bottom: 3px;">
                <div style="width: 16px; height: 16px; background: #38a169; margin-right: 8px; border-radius: 2px; border: 1px solid #2f855a;"></div>
                <span style="font-weight: 500;">Rừng sản xuất</span>
              </div>
            </div>
          </div>

          <!-- Lớp địa hình, thủy văn, giao thông -->
          <div class="legend-section">
            <div class="section-header" style="
              padding: 8px 12px;
              cursor: pointer;
              display: flex;
              align-items: center;
              border-bottom: 1px solid #eee;
            " data-section="terrain">
              <input type="checkbox" id="terrain-checkbox" ${mapLayers.terrain?.visible ? 'checked' : ''} style="margin-right: 8px;">
              <span style="color: #3182ce;">🏔️</span>
              <span style="margin-left: 6px; font-weight: 500;">Lớp địa hình, thủy văn, giao thông</span>
              <svg class="section-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-left: auto; transform: rotate(-90deg); transition: transform 0.3s;">
                <polyline points="6,9 12,15 18,9"></polyline>
              </svg>
            </div>
            <div class="section-content" style="padding: 6px 12px; padding-left: 32px; display: none;">
              <div style="display: flex; align-items: center; margin-bottom: 3px;">
                <div style="width: 20px; height: 3px; background: #3182ce; margin-right: 8px;"></div>
                <span style="font-weight: 500;">Đường sông nước</span>
              </div>
              <div style="display: flex; align-items: center; margin-bottom: 3px;">
                <div style="width: 20px; height: 2px; background: #0987a0; margin-right: 8px;"></div>
                <span>Thủy vận</span>
              </div>
              <div style="display: flex; align-items: center; margin-bottom: 3px;">
                <div style="width: 20px; height: 4px; background: #b7791f; margin-right: 8px;"></div>
                <span style="font-weight: 500;">Giao thông</span>
              </div>
            </div>
          </div>

          <!-- Lớp chủ quản lý rừng -->
          <div class="legend-section">
            <div class="section-header" style="
              padding: 8px 12px;
              cursor: pointer;
              display: flex;
              align-items: center;
              border-bottom: 1px solid #eee;
            " data-section="forest-management">
              <input type="checkbox" id="forest-management-checkbox" ${mapLayers.forestManagement?.visible ? 'checked' : ''} style="margin-right: 8px;">
              <span style="color: #9f1239;">🏢</span>
              <span style="margin-left: 6px; font-weight: 500;">Lớp chủ quản lý rừng</span>
            </div>
          </div>

          <!-- Lớp hiện trạng rừng -->
          <div class="legend-section">
            <div class="section-header" style="
              padding: 8px 12px;
              cursor: pointer;
              display: flex;
              align-items: center;
              border-bottom: 1px solid #eee;
            " data-section="forest-status">
              <input type="checkbox" id="forest-status-checkbox" ${mapLayers.forestStatus?.visible ? 'checked' : ''} style="margin-right: 8px;">
              <span style="color: #166534;">🌿</span>
              <span style="margin-left: 6px; font-weight: 500;">Lớp hiện trạng rừng</span>
            </div>
          </div>

          <!-- Lớp dự báo mất rừng -->
          <div class="legend-section">
            <div class="section-header" style="
              padding: 8px 12px;
              cursor: pointer;
              display: flex;
              align-items: center;
            " data-section="deforestation">
              <input type="checkbox" checked style="margin-right: 8px;">
              <span style="color: #dc2626;">⚠️</span>
              <span style="margin-left: 6px; font-weight: 500;">Lớp dự báo mất rừng mới nhất</span>
              <svg class="section-arrow" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-left: auto; transform: rotate(-90deg); transition: transform 0.3s;">
                <polyline points="6,9 12,15 18,9"></polyline>
              </svg>
            </div>
            <div class="section-content" style="padding: 6px 12px; padding-left: 32px; display: none;">
              <div style="display: flex; align-items: center; margin-bottom: 3px;">
                <div style="width: 16px; height: 16px; background: #7f1d1d; margin-right: 8px; border-radius: 2px; border: 1px solid #7f1d1d;"></div>
                <span style="color: #7f1d1d; font-weight: 600;">Nghiêm trọng (< 7 ngày)</span>
              </div>
              <div style="display: flex; align-items: center; margin-bottom: 3px;">
                <div style="width: 16px; height: 16px; background: #dc2626; margin-right: 8px; border-radius: 2px; border: 1px solid #dc2626;"></div>
                <span style="color: #dc2626; font-weight: 600;">Cao (< 30 ngày)</span>
              </div>
              <div style="display: flex; align-items: center; margin-bottom: 3px;">
                <div style="width: 16px; height: 16px; background: #ea580c; margin-right: 8px; border-radius: 2px; border: 1px solid #ea580c;"></div>
                <span style="color: #ea580c; font-weight: 600;">Trung bình (> 30 ngày)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    container.className = "leaflet-control leaflet-bar";

    // Event handlers
    const legendHeader = container.querySelector("#legend-header");
    const legendContent = container.querySelector("#legend-content");
    const toggleArrow = container.querySelector("#toggle-arrow");
    let isExpanded = true;

    // Toggle legend visibility
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

    // Map type selection
    container.querySelectorAll(".map-type-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const type = btn.getAttribute("data-type");
        
        // Update button styles
        container.querySelectorAll(".map-type-btn").forEach(b => {
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

    // Section toggle functionality
    container.querySelectorAll(".section-header").forEach((header) => {
      const arrow = header.querySelector(".section-arrow");
      if (arrow) {
        header.addEventListener("click", (e) => {
          e.preventDefault();
          const content = header.nextElementSibling;
          const isVisible = content.style.display !== "none";
          
          if (isVisible) {
            content.style.display = "none";
            arrow.style.transform = "rotate(-90deg)";
          } else {
            content.style.display = "block";
            arrow.style.transform = "rotate(0deg)";
          }
        });
      }
    });

    // Checkbox functionality - Layer visibility toggle
    const layerCheckboxes = {
      'administrative-checkbox': 'administrative',
      'forest-types-checkbox': 'forestTypes',
      'terrain-checkbox': 'terrain',
      'forest-management-checkbox': 'forestManagement',
      'forest-status-checkbox': 'forestStatus'
    };

    Object.entries(layerCheckboxes).forEach(([checkboxId, layerKey]) => {
      const checkbox = container.querySelector(`#${checkboxId}`);
      if (checkbox) {
        checkbox.addEventListener("change", (e) => {
          e.stopPropagation();
          console.log(`Toggle layer: ${layerKey}, checked: ${checkbox.checked}`);
          toggleLayerVisibility(layerKey);
        });
      }
    });

    const CustomControl = L.Control.extend({
      onAdd: () => container,
      onRemove: () => {},
    });

    const control = new CustomControl({ position: "topright" });
    map.addControl(control);

    return () => {
      map.removeControl(control);
    };
  }, [map, setMapType, mapLayers, toggleLayerVisibility]);

  return null;
};

// Helper function để lấy query param từ URL
const getQueryParam = (search, key) => {
  const params = new URLSearchParams(search);
  return params.get(key);
};

// Hàm xác định màu cho feature dựa theo trạng thái
const getColorByStatus = (properties) => {
  // Nếu có trạng thái xác minh
  if (properties.detection_status) {
    switch (properties.detection_status) {
      case "Chưa xác minh": return "#ff7f00"; // Cam
      case "Đang xác minh": return "#ffff00"; // Vàng
      case "Đã xác minh": return "#ff0000"; // Đỏ
      case "Không xác minh được": return "#808080"; // Xám
      default: return "#3388ff"; // Xanh mặc định
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

// Component chính
const Map = () => {
  const { geoData, loading, mapLayers, toggleLayerVisibility } = useGeoData();
  const [mapType, setMapType] = useState("satellite");
  const [mapReady, setMapReady] = useState(false);
  const location = useLocation();
  const isDataPage = location.pathname === "/dashboard/quanlydulieu";
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

  const layerName = getQueryParam(location.search, "layer");

  // Xử lý cho mỗi feature trên bản đồ
  const onEachFeature = (feature, layer, layerType) => {
    if (feature.properties) {
      const popupContent = buildPopupContent(feature, layerType);
      layer.bindPopup(popupContent, { maxWidth: 300, className: "custom-popup-container" });
    }

    layer.on("mouseover", function () {
      const currentStyle = getLayerStyle(this.feature, layerType, false);
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

  return (
    <div className="p-2 md:p-5 font-sans relative">
      <h2 className="text-center text-lg md:text-xl font-bold mb-2 md:mb-5">
        Bản đồ khu vực
      </h2>

      <div className={`flex justify-center items-center ${isDataPage ? "mb-2 md:mb-5" : ""} relative`}>
        {/* Loading overlay for map */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
            <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center">
              <ClipLoader color="#027e02" size={40} />
              <p className="mt-2 text-forest-green-primary">Đang tải dữ liệu bản đồ...</p>
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
              {/* Hiển thị các layer theo thứ tự từ dưới lên trên - để ranh giới hành chính hiển thị rõ nhất */}
              
              {/* Layer hiện trạng rừng (dưới cùng) */}
              {mapLayers.forestStatus?.data && mapLayers.forestStatus.visible && (
                <GeoJSON
                  key={`forest-status-${Date.now()}`}
                  data={mapLayers.forestStatus.data}
                  onEachFeature={(feature, layer) => onEachFeature(feature, layer, 'forestStatus')}
                  style={(feature) => getLayerStyle(feature, 'forestStatus', selectedFeature === feature)}
                />
              )}

              {/* Layer chủ quản lý rừng */}
              {mapLayers.forestManagement?.data && mapLayers.forestManagement.visible && (
                <GeoJSON
                  key={`forest-management-${Date.now()}`}
                  data={mapLayers.forestManagement.data}
                  onEachFeature={(feature, layer) => onEachFeature(feature, layer, 'forestManagement')}
                  style={(feature) => getLayerStyle(feature, 'forestManagement', selectedFeature === feature)}
                />
              )}

              {/* Layer 3 loại rừng */}
              {mapLayers.forestTypes?.data && mapLayers.forestTypes.visible && (
                <GeoJSON
                  key={`forest-types-${Date.now()}`}
                  data={mapLayers.forestTypes.data}
                  onEachFeature={(feature, layer) => onEachFeature(feature, layer, 'forestTypes')}
                  style={(feature) => getLayerStyle(feature, 'forestTypes', selectedFeature === feature)}
                />
              )}

              {/* Layer địa hình */}
              {mapLayers.terrain?.data && mapLayers.terrain.visible && (
                <GeoJSON
                  key={`terrain-${Date.now()}`}
                  data={mapLayers.terrain.data}
                  onEachFeature={(feature, layer) => onEachFeature(feature, layer, 'terrain')}
                  style={(feature) => getLayerStyle(feature, 'terrain', selectedFeature === feature)}
                />
              )}

              {/* Layer dự báo mất rừng */}
              {geoData?.type === "FeatureCollection" && geoData.features?.length > 0 && (
                <GeoJSON
                  key={`deforestation-${Date.now()}`}
                  data={geoData}
                  onEachFeature={(feature, layer) => onEachFeature(feature, layer, 'deforestation')}
                  style={(feature) => getLayerStyle(feature, 'deforestation', selectedFeature === feature)}
                />
              )}

              {/* Layer ranh giới hành chính (TRÊN CÙNG để hiển thị rõ nhất) */}
              {mapLayers.administrative?.data && mapLayers.administrative.visible && (
                <GeoJSON
                  key={`administrative-${Date.now()}`}
                  data={mapLayers.administrative.data}
                  onEachFeature={(feature, layer) => onEachFeature(feature, layer, 'administrative')}
                  style={(feature) => getLayerStyle(feature, 'administrative', selectedFeature === feature)}
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
              {loadingDetails && (
                <LoadingOverlay message={loadingMessage} />
              )}
              
              <Table
                data={geoData.features.map((f) => f.properties)}
                onRowClick={() => {}}
              />
            </div>
          )
        ))}

      {/* Debugging display */}
      {!loading &&
        (!geoData || !geoData.features || geoData.features.length === 0) && 
        Object.values(mapLayers).every(layer => !layer.data) && (
          <div className="text-center text-amber-700 font-semibold p-3 bg-amber-50 rounded-md mt-2">
            ⚠️ Chưa có dữ liệu hiển thị. Hãy sử dụng chức năng "Cập nhật dữ liệu" để tải các lớp bản đồ.
          </div>
        )}
    </div>
  );
};

export default Map;