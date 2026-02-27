// client/src/dashboard/components/MapLegendControl.jsx
// Component chú thích và control cho bản đồ - Đã sửa lỗi không cuộn được

import React, { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

const MapLegendControl = ({ setMapType, mapLayers, toggleLayerVisibility }) => {
  const map = useMap();

  useEffect(() => {
    const container = L.DomUtil.create("div");

    // Hàm tạo HTML cho legend theo thiết kế mẫu
    const createLegendHTML = () => {
      return `
      <div class="map-legend-control" style="
        position: relative;
        z-index: 1000;
        background: white;
        border: 2px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        max-width: 350px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        max-height: 70vh;
        display: flex;
        flex-direction: column;
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
          flex-shrink: 0;
        " id="legend-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 8px;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V6.618a1 1 0 01.553-.894L9 3l6 3 6-3v13l-6 3-6-3z" />
          </svg>
          <span style="font-weight: bold; color: #333;">Lớp bản đồ</span>
          <svg id="toggle-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-left: auto; transform: rotate(0deg); transition: transform 0.3s;">
            <polyline points="6,9 12,15 18,9"></polyline>
          </svg>
        </div>

        <!-- Content - Đã sửa để có thể cuộn -->
        <div id="legend-content" style="
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 12px;
          max-height: calc(70vh - 60px);
          scrollbar-width: thin;
          scrollbar-color: #ccc #f1f1f1;
        ">
          
          <!-- 1. Lớp ranh giới hành chính -->
          <div class="legend-layer" style="margin-bottom: 12px;">
            <div class="layer-header" style="display: flex; align-items: center; margin-bottom: 6px;">
              <button class="eye-toggle" data-layer="administrative" style="
                background: none; border: none; cursor: pointer; margin-right: 8px;
                color: ${mapLayers.administrative?.visible !== false ? '#4ade80' : '#9ca3af'};
                font-size: 16px; width: 20px; text-align: center;
              ">👁</button>
              <span style="color: #4ade80; margin-right: 6px;">🟢</span>
              <span style="font-weight: 500; color: #333;">Lớp ranh giới hành chính</span>
            </div>
            <div style="margin-left: 34px; font-size: 11px; color: #666;">
              <div style="margin-bottom: 2px; display: flex; align-items: center;">
                <div style="width: 30px; height: 2px; background: #000; margin-right: 8px;"></div>
                <span>Ranh giới tỉnh</span>
              </div>
              <div style="margin-bottom: 2px; display: flex; align-items: center;">
                <div style="width: 30px; height: 2px; background: #333; margin-right: 8px; 
                           background-image: repeating-linear-gradient(to right, #333 0px, #333 8px, transparent 8px, transparent 16px);"></div>
                <span>Ranh giới huyện</span>
              </div>
              <div style="margin-bottom: 2px; display: flex; align-items: center;">
                <div style="width: 30px; height: 2px; background: #666; margin-right: 8px;
                           background-image: repeating-linear-gradient(to right, #666 0px, #666 4px, transparent 4px, transparent 8px);"></div>
                <span>Ranh giới xã</span>
              </div>
              <div style="margin-bottom: 2px; display: flex; align-items: center;">
                <div style="width: 30px; height: 2px; background: #999; margin-right: 8px;
                           background-image: repeating-linear-gradient(to right, #999 0px, #999 6px, transparent 6px, transparent 10px);"></div>
                <span>Ranh giới tiểu khu</span>
              </div>
              <div style="display: flex; align-items: center;">
                <div style="width: 30px; height: 2px; background: #ccc; margin-right: 8px;
                           background-image: repeating-linear-gradient(to right, #ccc 0px, #ccc 2px, transparent 2px, transparent 6px);"></div>
                <span>Ranh giới khoảnh</span>
              </div>
            </div>
          </div>

          <!-- 2. Lớp ranh giới 3 loại rừng -->
          <div class="legend-layer" style="margin-bottom: 12px;">
            <div class="layer-header" style="display: flex; align-items: center;">
              <button class="eye-toggle" data-layer="forestTypes" style="
                background: none; border: none; cursor: pointer; margin-right: 8px;
                color: ${mapLayers.forestTypes?.visible !== false ? '#4ade80' : '#9ca3af'};
                font-size: 16px; width: 20px; text-align: center;
              ">👁</button>
              <span style="color: #4ade80; margin-right: 6px;">🟢</span>
              <span style="font-weight: 500; color: #333;">Lớp ranh giới 3 loại rừng</span>
            </div>
          </div>

          <!-- 3. Lớp địa hình, thủy văn, giao thông -->
          <div class="legend-layer" style="margin-bottom: 12px;">
            <div class="layer-header" style="display: flex; align-items: center; margin-bottom: 6px;">
              <button class="eye-toggle" data-layer="terrain" style="
                background: none; border: none; cursor: pointer; margin-right: 8px;
                color: ${mapLayers.terrain?.visible !== false ? '#4ade80' : '#9ca3af'};
                font-size: 16px; width: 20px; text-align: center;
              ">👁</button>
              <span style="color: #4ade80; margin-right: 6px;">🟢</span>
              <span style="font-weight: 500; color: #333;">Lớp địa hình, thủy văn, giao thông</span>
            </div>
            <div style="margin-left: 34px; font-size: 11px; color: #666;">
              <div style="margin-bottom: 2px; display: flex; align-items: center;">
                <div style="width: 30px; height: 2px; background: #3182ce; margin-right: 8px;"></div>
                <span>Đường sông nước</span>
              </div>
              <div style="margin-bottom: 2px; display: flex; align-items: center;">
                <div style="width: 30px; height: 2px; background: #0987a0; margin-right: 8px;"></div>
                <span>Thủy vận</span>
              </div>
              <div style="display: flex; align-items: center;">
                <div style="width: 30px; height: 2px; background: #b7791f; margin-right: 8px;"></div>
                <span>Giao thông</span>
              </div>
            </div>
          </div>

          <!-- 4. Lớp ranh giới chủ quản lý rừng -->
          <div class="legend-layer" style="margin-bottom: 12px;">
            <div class="layer-header" style="display: flex; align-items: center;">
              <button class="eye-toggle" data-layer="forestManagement" style="
                background: none; border: none; cursor: pointer; margin-right: 8px;
                color: ${mapLayers.forestManagement?.visible !== false ? '#4ade80' : '#9ca3af'};
                font-size: 16px; width: 20px; text-align: center;
              ">👁</button>
              <span style="color: #4ade80; margin-right: 6px;">🟢</span>
              <span style="font-weight: 500; color: #333;">Lớp ranh giới chủ quản lý rừng</span>
            </div>
          </div>

          <!-- 5. Lớp hiển thị rừng -->
          <div class="legend-layer" style="margin-bottom: 12px;">
            <div class="layer-header" style="display: flex; align-items: center;">
              <button class="eye-toggle" data-layer="forestDisplay" style="
                background: none; border: none; cursor: pointer; margin-right: 8px;
                color: #9ca3af; font-size: 16px; width: 20px; text-align: center;
              ">👁</button>
              <span style="color: #4ade80; margin-right: 6px;">🟢</span>
              <span style="font-weight: 500; color: #333;">Lớp hiển thị rừng</span>
            </div>
          </div>

          <!-- 6. Lớp phân tích mất rừng mới nhất -->
          <div class="legend-layer" style="margin-bottom: 12px;">
            <div class="layer-header" style="display: flex; align-items: center; margin-bottom: 6px;">
              <button class="eye-toggle" data-layer="deforestationAlerts" style="
                background: none; border: none; cursor: pointer; margin-right: 8px;
                color: ${mapLayers.deforestationAlerts?.visible !== false ? '#4ade80' : '#9ca3af'};
                font-size: 16px; width: 20px; text-align: center;
              ">👁</button>
              <span style="color: #4ade80; margin-right: 6px;">🟢</span>
              <span style="font-weight: 500; color: #333;">Lớp phân tích mất rừng mới nhất</span>
            </div>
            <div style="margin-left: 34px; font-size: 11px; color: #666;">
              <div style="display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: linear-gradient(45deg, #ff6b35, #ff8c42); 
                           margin-right: 8px; border-radius: 2px;"></div>
                <span>Lớp có khả năng mất rừng</span>
              </div>
            </div>
          </div>

          <!-- Chọn loại bản đồ nền -->
          <div style="
            border-top: 1px solid #eee; 
            padding-top: 12px; 
            margin-top: 12px;
            position: sticky;
            bottom: 0;
            background: white;
            margin-left: -12px;
            margin-right: -12px;
            margin-bottom: -12px;
            padding-left: 12px;
            padding-right: 12px;
            padding-bottom: 12px;
          ">
            <div style="font-weight: bold; margin-bottom: 8px; color: #555; font-size: 11px;">BẢN ĐỒ NỀN</div>
            <div style="display: flex; gap: 6px;">
              <button class="map-type-btn" data-type="normal" style="
                flex: 1; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px;
                background: white; cursor: pointer; font-size: 10px; transition: all 0.2s;
              ">🗺️ Thường</button>
              <button class="map-type-btn active" data-type="satellite" style="
                flex: 1; padding: 6px 8px; border: 1px solid #007bff; border-radius: 4px;
                background: #e3f2fd; cursor: pointer; font-size: 10px; transition: all 0.2s;
              ">🛰️ Vệ tinh</button>
            </div>
          </div>

        </div>
      </div>

      <style>
        /* Custom scrollbar styles */
        .map-legend-control #legend-content::-webkit-scrollbar {
          width: 6px;
        }
        .map-legend-control #legend-content::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 3px;
        }
        .map-legend-control #legend-content::-webkit-scrollbar-thumb {
          background: #ccc;
          border-radius: 3px;
        }
        .map-legend-control #legend-content::-webkit-scrollbar-thumb:hover {
          background: #bbb;
        }
      </style>
    `;
    };

    // Tạo HTML ban đầu
    container.innerHTML = createLegendHTML();
    container.className = "leaflet-control leaflet-bar";

    // Prevent map events from bubbling when interacting with the legend
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

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

      // Eye toggle functionality - Bật/tắt hiển thị layer
      container.querySelectorAll(".eye-toggle").forEach((eyeBtn) => {
        eyeBtn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          const layerKey = eyeBtn.getAttribute("data-layer");
          
          // Toggle layer visibility
          toggleLayerVisibility(layerKey);
          
          // Update eye icon color immediately
          const currentVisible = mapLayers[layerKey]?.visible !== false;
          eyeBtn.style.color = !currentVisible ? '#4ade80' : '#9ca3af';
          
          // Update legend after a short delay to reflect new state
          setTimeout(() => {
            updateLegend();
          }, 100);
        });
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
  }, [map, setMapType, mapLayers, toggleLayerVisibility]);

  return null;
};

export default MapLegendControl;