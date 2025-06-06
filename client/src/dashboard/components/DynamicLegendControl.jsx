// File: client/src/dashboard/components/DynamicLegendControl.jsx
// Component legend tự động cập nhật khi mapLayers thay đổi

import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

const DynamicLegendControl = ({ setMapType, mapLayers, toggleLayerVisibility }) => {
  const map = useMap();
  const controlRef = useRef(null);
  const isExpandedRef = useRef(true);

  useEffect(() => {
    // Nếu đã có control, remove trước khi tạo mới
    if (controlRef.current) {
      map.removeControl(controlRef.current);
    }

    const container = L.DomUtil.create("div");
    container.className = "leaflet-control leaflet-bar";

    // Tạo HTML cho legend
    const createLegendHTML = () => {
      const hasLoadedLayers = Object.values(mapLayers).some(layer => layer.data);
      
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
          <svg id="toggle-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-left: auto; transform: rotate(${isExpandedRef.current ? '0' : '-90'}deg); transition: transform 0.3s;">
            <polyline points="6,9 12,15 18,9"></polyline>
          </svg>
        </div>

        <!-- Content -->
        <div id="legend-content" style="max-height: 500px; overflow-y: auto; display: ${isExpandedRef.current ? 'block' : 'none'};">
          
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

          ${hasLoadedLayers ? `
          <!-- Lớp đã được tải -->
          <div style="padding: 8px 12px; border-bottom: 1px solid #eee;">
            <div style="font-weight: bold; margin-bottom: 6px; color: #555;">Lớp dữ liệu đã tải</div>
          </div>
          ` : ''}

          <!-- Lớp ranh giới hành chính -->
          ${mapLayers.administrative?.data ? `
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
          ` : ''}

          <!-- Lớp 3 loại rừng -->
          ${mapLayers.forestTypes?.data ? `
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
          ` : ''}

          <!-- Lớp địa hình -->
          ${mapLayers.terrain?.data ? `
          <div class="legend-section">
            <div class="section-header" style="
              padding: 8px 12px; cursor: pointer; display: flex; align-items: center;
              border-bottom: 1px solid #eee;
            " data-section="terrain">
              <input type="checkbox" id="terrain-checkbox" ${
                mapLayers.terrain?.visible ? "checked" : ""
              } style="margin-right: 8px;">
              <span style="color: #3182ce;">🏔️</span>
              <span style="margin-left: 6px; font-weight: 500;">Địa hình, thủy văn</span>
              <span style="margin-left: 8px; font-size: 10px; color: #666; background: #cce7ff; padding: 1px 4px; border-radius: 8px;">
                ${mapLayers.terrain.data.features?.length || 0}
              </span>
            </div>
          </div>
          ` : ''}

          <!-- Lớp chủ quản lý rừng -->
          ${mapLayers.forestManagement?.data ? `
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
          ` : ''}

          <!-- Lớp hiện trạng rừng -->
          ${mapLayers.forestStatus?.data ? `
          <div class="legend-section">
            <div class="section-header" style="
              padding: 8px 12px; cursor: pointer; display: flex; align-items: center;
              border-bottom: 1px solid #eee;
            " data-section="forest-status">
              <input type="checkbox" id="forest-status-checkbox" ${
                mapLayers.forestStatus?.visible ? "checked" : ""
              } style="margin-right: 8px;">
              <span style="color: #166534;">🌿</span>
              <span style="margin-left: 6px; font-weight: 500;">Hiện trạng rừng</span>
              <span style="margin-left: 8px; font-size: 10px; color: #666; background: #dcfce7; padding: 1px 4px; border-radius: 8px;">
                ${mapLayers.forestStatus.data.features?.length || 0}
              </span>
            </div>
          </div>
          ` : ''}

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
          ${!hasLoadedLayers ? `
          <div style="padding: 20px 12px; text-align: center; color: #666; font-style: italic;">
            <div style="margin-bottom: 8px; font-size: 14px;">📂</div>
            <div style="margin-bottom: 4px; font-weight: 500;">Chưa có lớp dữ liệu nào</div>
            <div style="font-size: 10px; color: #999;">
              Sử dụng menu "Cập nhật dữ liệu"<br/>
              bên trái để tải các lớp
            </div>
          </div>
          ` : ''}

          <!-- Footer thống kê -->
          ${hasLoadedLayers ? `
          <div style="padding: 6px 12px; background: #f8f9fa; border-top: 1px solid #eee; font-size: 10px; color: #666;">
            Đã tải: ${Object.values(mapLayers).filter(layer => layer.data).length} lớp |
            Hiển thị: ${Object.values(mapLayers).filter(layer => layer.data && layer.visible).length} lớp
          </div>
          ` : ''}
        </div>
      </div>
    `;
    };

    // Cập nhật HTML
    container.innerHTML = createLegendHTML();

    // Setup event listeners
    const setupEventListeners = () => {
      // Toggle legend
      const legendHeader = container.querySelector("#legend-header");
      const legendContent = container.querySelector("#legend-content");
      const toggleArrow = container.querySelector("#toggle-arrow");

      if (legendHeader) {
        legendHeader.onclick = (e) => {
          e.preventDefault();
          isExpandedRef.current = !isExpandedRef.current;
          if (isExpandedRef.current) {
            legendContent.style.display = "block";
            toggleArrow.style.transform = "rotate(0deg)";
          } else {
            legendContent.style.display = "none";
            toggleArrow.style.transform = "rotate(-90deg)";
          }
        };
      }

      // Map type buttons
      container.querySelectorAll(".map-type-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          const type = btn.getAttribute("data-type");

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

      // Layer checkboxes
      const layerCheckboxes = {
        "administrative-checkbox": "administrative",
        "forest-types-checkbox": "forestTypes",
        "terrain-checkbox": "terrain",
        "forest-management-checkbox": "forestManagement",
        "forest-status-checkbox": "forestStatus",
      };

      Object.entries(layerCheckboxes).forEach(([checkboxId, layerKey]) => {
        const checkbox = container.querySelector(`#${checkboxId}`);
        if (checkbox) {
          checkbox.addEventListener("change", (e) => {
            e.stopPropagation();
            console.log(`🔄 Toggle layer: ${layerKey}, visible: ${checkbox.checked}`);
            toggleLayerVisibility(layerKey);
          });
        }
      });
    };

    setupEventListeners();

    // Tạo Leaflet control
    const CustomControl = L.Control.extend({
      onAdd: () => container,
      onRemove: () => {},
    });

    const control = new CustomControl({ position: "topright" });
    map.addControl(control);
    controlRef.current = control;

    return () => {
      if (controlRef.current) {
        map.removeControl(controlRef.current);
        controlRef.current = null;
      }
    };
  }, [map, setMapType, mapLayers, toggleLayerVisibility]); // Dependencies để re-render khi mapLayers thay đổi

  return null;
};

export default DynamicLegendControl;