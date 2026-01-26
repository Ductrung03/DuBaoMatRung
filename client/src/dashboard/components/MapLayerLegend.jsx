// client/src/dashboard/components/MapLayerLegend.jsx
import React, { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

const MapLayerLegend = ({ mapLayers, toggleLayerVisibility }) => {
  const map = useMap();
  const controlRef = useRef(null);
  // Start collapsed on mobile for better UX
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isExpanded, setIsExpanded] = useState(!isMobile);

  // Listen for window resize to detect mobile/desktop
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-collapse on mobile, auto-expand on desktop
      if (mobile && isExpanded) {
        setIsExpanded(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isExpanded]);

  // Main effect for Leaflet control
  useEffect(() => {
    // Remove existing control
    if (controlRef.current) {
      map.removeControl(controlRef.current);
    }

    const container = L.DomUtil.create("div");
    container.className = "leaflet-control leaflet-bar";

    // Prevent map drag when interacting with legend
    L.DomEvent.disableClickPropagation(container);
    L.DomEvent.disableScrollPropagation(container);

    // Responsive dimensions based on screen size
    const legendWidth = isMobile ? '180px' : '280px';
    const legendMaxWidth = isMobile ? '200px' : '320px';
    const legendPadding = isMobile ? '8px' : '12px';
    const fontSize = isMobile ? '11px' : '13px';
    const maxContentHeight = isMobile ? '250px' : '600px';

    // Create legend HTML
    const createLegendHTML = () => {
      return `
      <div class="map-layer-legend" style="
        background: white;
        border: 2px solid rgba(0,0,0,0.2);
        border-radius: 8px;
        box-shadow: 0 3px 14px rgba(0,0,0,0.4);
        padding: ${legendPadding};
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: ${fontSize};
        max-width: ${legendMaxWidth};
        min-width: ${legendWidth};
      ">
        <!-- Header -->
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 10px;
          border-bottom: 2px solid #e0e0e0;
          margin-bottom: 10px;
          cursor: pointer;
        " id="legend-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#333" style="flex-shrink: 0;">
              <rect x="3" y="3" width="7" height="7" rx="1" fill="#4CAF50" opacity="0.7"/>
              <rect x="14" y="3" width="7" height="7" rx="1" fill="#2196F3" opacity="0.7"/>
              <rect x="3" y="14" width="7" height="7" rx="1" fill="#FF9800" opacity="0.7"/>
              <rect x="14" y="14" width="7" height="7" rx="1" fill="#E91E63" opacity="0.7"/>
            </svg>
            <span style="font-weight: 700; color: #333; font-size: 14px;">Lớp bản đồ</span>
          </div>
          <svg id="toggle-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" style="
            transform: rotate(${isExpanded ? '0' : '-90'}deg);
            transition: transform 0.3s ease;
            flex-shrink: 0;
          ">
            <polyline points="6 9 12 15 18 9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </div>

        <!-- Content -->
        <div id="legend-content" style="
          display: ${isExpanded ? 'block' : 'none'};
          max-height: ${maxContentHeight};
          overflow-y: auto;
          overflow-x: hidden;
        ">
          ${createLayerSections()}
        </div>
      </div>
      `;
  };

  // Create layer sections based on MapServer layers (Sơn La - 3 layers)
  const createLayerSections = () => {
    const sections = [];

    // 1. Lớp Ranh Giới Xã (sonla_rgx)
    sections.push(`
        <div class="legend-layer" style="margin-bottom: 12px;">
          <div style="
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 8px;
            background: #f5f5f5;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.2s;
          " onmouseover="this.style.background='#e8f5e9'" onmouseout="this.style.background='#f5f5f5'">
            <input type="checkbox" id="layer-ranhgioixa" ${mapLayers?.ranhgioixa?.visible !== false ? 'checked' : ''}
              style="width: 16px; height: 16px; cursor: pointer; accent-color: #4CAF50;">
            <label for="layer-ranhgioixa" style="
              font-weight: 600;
              color: #333;
              font-size: 13px;
              cursor: pointer;
              user-select: none;
              flex: 1;
            ">
              🏘️ Ranh Giới Xã (75 xã)
            </label>
          </div>
          <div style="padding: 8px 12px 4px 28px; font-size: 11px; line-height: 1.8;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 24px; height: 14px; border: 2px solid #000; border-radius: 2px; background: rgba(240,240,240,0.2); flex-shrink: 0;"></div>
              <span style="color: #555;">Ranh giới xã Sơn La</span>
            </div>
          </div>
        </div>
      `);

    // 2. Lớp Tiểu Khu Khoảnh Lô (sonla_tkkl)
    sections.push(`
        <div class="legend-layer" style="margin-bottom: 12px;">
          <div style="
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 8px;
            background: #f5f5f5;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.2s;
          " onmouseover="this.style.background='#e3f2fd'" onmouseout="this.style.background='#f5f5f5'">
            <input type="checkbox" id="layer-tieukukhoanh" ${mapLayers?.tieukukhoanh?.visible !== false ? 'checked' : ''}
              style="width: 16px; height: 16px; cursor: pointer; accent-color: #2196F3;">
            <label for="layer-tieukukhoanh" style="
              font-weight: 600;
              color: #333;
              font-size: 13px;
              cursor: pointer;
              user-select: none;
              flex: 1;
            ">
              📐 Tiểu Khu Khoảnh Lô (30k khoảnh)
            </label>
          </div>
          <div style="padding: 8px 12px 4px 28px; font-size: 11px; line-height: 1.8;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 24px; height: 14px; border: 1px solid #646464; border-radius: 2px; background: rgba(220,220,220,0.15); flex-shrink: 0;"></div>
              <span style="color: #555;">Ranh giới tiểu khu khoảnh lô</span>
            </div>
          </div>
        </div>
      `);

    // 3. Lớp Hiện Trạng Rừng (sonla_hientrangrung - PRIMARY LAYER)
    sections.push(`
        <div class="legend-layer" style="margin-bottom: 12px;">
          <div style="
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 8px;
            background: #f5f5f5;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.2s;
          " onmouseover="this.style.background='#f1f8e9'" onmouseout="this.style.background='#f5f5f5'">
            <input type="checkbox" id="layer-hientrangrung" ${mapLayers?.hientrangrung?.visible !== false ? 'checked' : ''}
              style="width: 16px; height: 16px; cursor: pointer; accent-color: #8BC34A;">
            <label for="layer-hientrangrung" style="
              font-weight: 600;
              color: #333;
              font-size: 13px;
              cursor: pointer;
              user-select: none;
              flex: 1;
            ">
              🌳 Hiện Trạng Rừng (280k khoảnh)
            </label>
          </div>
          <div style="padding: 8px 12px 4px 28px; font-size: 10px; line-height: 1.6; max-height: 300px; overflow-y: auto;">
            <div style="font-weight: 700; color: #005000; margin-bottom: 6px; font-size: 11px; border-bottom: 2px solid #4CAF50; padding-bottom: 3px;">🌲 Rừng giàu</div>
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 3px; padding-left: 8px;">
              <div style="width: 18px; height: 13px; background: rgb(0, 130, 0); border: 1.5px solid rgb(0, 80, 0); border-radius: 2px; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>
              <span style="color: #444; font-size: 10px; font-weight: 500;">Rừng giàu 1 - HG1</span>
            </div>
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 3px; padding-left: 8px;">
              <div style="width: 18px; height: 13px; background: rgb(34, 170, 34); border: 1.5px solid rgb(20, 120, 20); border-radius: 2px; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>
              <span style="color: #444; font-size: 10px; font-weight: 500;">Rừng giàu 2 - HG2</span>
            </div>
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 6px; padding-left: 8px;">
              <div style="width: 18px; height: 13px; background: rgb(0, 150, 0); border: 1.5px solid rgb(0, 100, 0); border-radius: 2px; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>
              <span style="color: #444; font-size: 10px; font-weight: 500;">Rừng giàu đặc biệt - HGD</span>
            </div>

            <div style="font-weight: 700; color: #2e7d32; margin-bottom: 6px; margin-top: 6px; font-size: 11px; border-bottom: 2px solid #66BB6A; padding-bottom: 3px;">🌱 Rừng trồng</div>
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 3px; padding-left: 8px;">
              <div style="width: 18px; height: 13px; background: rgb(60, 220, 60); border: 1.5px solid rgb(40, 160, 40); border-radius: 2px; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>
              <span style="color: #444; font-size: 10px; font-weight: 500;">Rừng trồng giàu - RTG</span>
            </div>
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 3px; padding-left: 8px;">
              <div style="width: 18px; height: 13px; background: rgb(120, 160, 50); border: 1.5px solid rgb(90, 120, 40); border-radius: 2px; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>
              <span style="color: #444; font-size: 10px; font-weight: 500;">Rừng trồng nghèo - RTN</span>
            </div>
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 3px; padding-left: 8px;">
              <div style="width: 18px; height: 13px; background: rgb(140, 255, 50); border: 1.5px solid rgb(100, 200, 30); border-radius: 2px; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>
              <span style="color: #444; font-size: 10px; font-weight: 500;">Rừng trồng khác - RTK</span>
            </div>
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 3px; padding-left: 8px;">
              <div style="width: 18px; height: 13px; background: rgb(160, 250, 160); border: 1.5px solid rgb(80, 200, 120); border-radius: 2px; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>
              <span style="color: #444; font-size: 10px; font-weight: 500;">Trồng xen giàu - TXG</span>
            </div>
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 3px; padding-left: 8px;">
              <div style="width: 18px; height: 13px; background: rgb(160, 200, 160); border: 1.5px solid rgb(100, 140, 60); border-radius: 2px; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>
              <span style="color: #444; font-size: 10px; font-weight: 500;">Trồng xen nghèo - TXN</span>
            </div>
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 6px; padding-left: 8px;">
              <div style="width: 18px; height: 13px; background: rgb(170, 255, 170); border: 1.5px solid rgb(120, 180, 50); border-radius: 2px; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>
              <span style="color: #444; font-size: 10px; font-weight: 500;">Trồng xen khác - TXK</span>
            </div>

            <div style="font-weight: 700; color: #d84315; margin-bottom: 6px; margin-top: 6px; font-size: 11px; border-bottom: 2px solid #FF7043; padding-bottom: 3px;">🏜️ Đất trống</div>
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 3px; padding-left: 8px;">
              <div style="width: 18px; height: 13px; background: rgb(255, 180, 110); border: 1.5px solid rgb(230, 120, 50); border-radius: 2px; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>
              <span style="color: #444; font-size: 10px; font-weight: 500;">Đất trống loại 1 - DT1</span>
            </div>
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 3px; padding-left: 8px;">
              <div style="width: 18px; height: 13px; background: rgb(255, 240, 220); border: 1.5px solid rgb(230, 200, 160); border-radius: 2px; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>
              <span style="color: #444; font-size: 10px; font-weight: 500;">Đất trống loại 2 - DT2</span>
            </div>
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 3px; padding-left: 8px;">
              <div style="width: 18px; height: 13px; background: rgb(255, 230, 190); border: 1.5px solid rgb(240, 200, 150); border-radius: 2px; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>
              <span style="color: #444; font-size: 10px; font-weight: 500;">Đất trống rừng - DTR</span>
            </div>
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 6px; padding-left: 8px;">
              <div style="width: 18px; height: 13px; background: rgb(255, 252, 220); border: 1.5px solid rgb(210, 200, 130); border-radius: 2px; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>
              <span style="color: #444; font-size: 10px; font-weight: 500;">Đất nông nghiệp - DNN</span>
            </div>

            <div style="font-weight: 700; color: #f57c00; margin-bottom: 6px; margin-top: 6px; font-size: 11px; border-bottom: 2px solid #FFB74D; padding-bottom: 3px;">🌾 Lúa & Khác</div>
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 3px; padding-left: 8px;">
              <div style="width: 18px; height: 13px; background: rgb(210, 200, 130); border: 1.5px solid rgb(160, 150, 50); border-radius: 2px; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>
              <span style="color: #444; font-size: 10px; font-weight: 500;">Lúa khác giàu - LKG</span>
            </div>
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 3px; padding-left: 8px;">
              <div style="width: 18px; height: 13px; background: rgb(240, 180, 50); border: 1.5px solid rgb(200, 140, 20); border-radius: 2px; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>
              <span style="color: #444; font-size: 10px; font-weight: 500;">Lúa khác nghèo - LKN</span>
            </div>
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 3px; padding-left: 8px;">
              <div style="width: 18px; height: 13px; background: rgb(250, 245, 190); border: 1.5px solid rgb(210, 200, 130); border-radius: 2px; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>
              <span style="color: #444; font-size: 10px; font-weight: 500;">Lúa khác khác - LKK</span>
            </div>
            <div style="display: flex; align-items: center; gap: 7px; margin-bottom: 3px; padding-left: 8px;">
              <div style="width: 18px; height: 13px; background: rgb(240, 240, 240); border: 1.5px solid rgb(180, 180, 180); border-radius: 2px; flex-shrink: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.2);"></div>
              <span style="color: #444; font-size: 10px; font-weight: 500;">Đất khác - DKH</span>
            </div>
          </div>
        </div>
      `);

    return sections.join('');
  };

  // Update HTML
  container.innerHTML = createLegendHTML();

  // Setup event listeners
  const setupEventListeners = () => {
    // Header toggle
    const header = container.querySelector("#legend-header");
    const content = container.querySelector("#legend-content");
    const icon = container.querySelector("#toggle-icon");

    header.onclick = () => {
      const newState = !isExpanded;
      setIsExpanded(newState);
      content.style.display = newState ? "block" : "none";
      icon.style.transform = `rotate(${newState ? '0' : '-90'}deg)`;
    };

    // Layer checkboxes - Map checkbox IDs to layer keys (Sơn La 3 layers)
    const layerMapping = {
      'layer-ranhgioixa': 'ranhgioixa',
      'layer-tieukukhoanh': 'tieukukhoanh',
      'layer-hientrangrung': 'hientrangrung'
    };

    Object.entries(layerMapping).forEach(([checkboxId, layerKey]) => {
      const checkbox = container.querySelector(`#${checkboxId}`);
      if (checkbox) {
        checkbox.addEventListener("change", (e) => {
          e.stopPropagation();
          if (toggleLayerVisibility) {
            toggleLayerVisibility(layerKey);
          }
        });
      }
    });
  };

  setupEventListeners();

  // Create Leaflet control
  const CustomControl = L.Control.extend({
    onAdd: () => container,
    onRemove: () => { },
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
}, [map, mapLayers, toggleLayerVisibility, isExpanded, isMobile]);

return null;
};

export default MapLayerLegend;
