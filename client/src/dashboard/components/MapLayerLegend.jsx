// client/src/dashboard/components/MapLayerLegend.jsx
import React, { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

const MapLayerLegend = ({ mapLayers, toggleLayerVisibility }) => {
  const map = useMap();
  const controlRef = useRef(null);
  const [isExpanded, setIsExpanded] = useState(true);

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

    // Create legend HTML
    const createLegendHTML = () => {
      return `
      <div class="map-layer-legend" style="
        background: white;
        border: 2px solid rgba(0,0,0,0.2);
        border-radius: 8px;
        box-shadow: 0 3px 14px rgba(0,0,0,0.4);
        padding: 12px;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 13px;
        max-width: 320px;
        min-width: 280px;
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
          max-height: 600px;
          overflow-y: auto;
          overflow-x: hidden;
        ">
          ${createLayerSections()}
        </div>
      </div>
      `;
    };

    // Create layer sections based on MapServer layers
    const createLayerSections = () => {
      const sections = [];

      // 1. Lớp ranh giới hành chính
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
            <input type="checkbox" id="layer-ranhgioihc" ${mapLayers?.administrative?.visible !== false ? 'checked' : ''}
              style="width: 16px; height: 16px; cursor: pointer; accent-color: #4CAF50;">
            <label for="layer-ranhgioihc" style="
              font-weight: 600;
              color: #333;
              font-size: 13px;
              cursor: pointer;
              user-select: none;
              flex: 1;
            ">
              👁️ Lớp ranh giới hành chính
            </label>
          </div>
          <div style="padding: 8px 12px 4px 28px; font-size: 11px; line-height: 1.8;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <svg width="30" height="2" style="flex-shrink: 0;">
                <line x1="0" y1="1" x2="30" y2="1" stroke="#000" stroke-width="2"/>
              </svg>
              <span style="color: #555;">Ranh giới tỉnh</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <svg width="30" height="2" style="flex-shrink: 0;">
                <line x1="0" y1="1" x2="30" y2="1" stroke="#000" stroke-width="2" stroke-dasharray="6,3"/>
              </svg>
              <span style="color: #555;">Ranh giới huyện</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <svg width="30" height="2" style="flex-shrink: 0;">
                <line x1="0" y1="1" x2="30" y2="1" stroke="#333" stroke-width="1.5" stroke-dasharray="3,2"/>
              </svg>
              <span style="color: #555;">Ranh giới xã</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <svg width="30" height="2" style="flex-shrink: 0;">
                <line x1="0" y1="1" x2="30" y2="1" stroke="#555" stroke-width="1" stroke-dasharray="5,1,1,1"/>
              </svg>
              <span style="color: #555;">Ranh giới tiểu khu</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <svg width="30" height="2" style="flex-shrink: 0;">
                <line x1="0" y1="1" x2="30" y2="1" stroke="#777" stroke-width="0.8" stroke-dasharray="2,1"/>
              </svg>
              <span style="color: #555;">Ranh giới khoảnh</span>
            </div>
          </div>
        </div>
      `);

      // 2. Lớp ranh giới 3 loại rừng
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
            <input type="checkbox" id="layer-rg3lr" ${mapLayers?.forestTypes?.visible !== false ? 'checked' : ''}
              style="width: 16px; height: 16px; cursor: pointer; accent-color: #4CAF50;">
            <label for="layer-rg3lr" style="
              font-weight: 600;
              color: #333;
              font-size: 13px;
              cursor: pointer;
              user-select: none;
              flex: 1;
            ">
              🌲 Lớp ranh giới 3 loại rừng
            </label>
          </div>
          <div style="padding: 8px 12px 4px 28px; font-size: 11px; line-height: 1.8;">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <div style="width: 20px; height: 14px; background: rgba(0, 100, 0, 0.8); border: 1px solid rgba(0, 70, 0, 0.9); border-radius: 2px; flex-shrink: 0;"></div>
              <span style="color: #555;">Rừng đặc dụng (46k)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <div style="width: 20px; height: 14px; background: rgba(255, 140, 0, 0.8); border: 1px solid rgba(200, 100, 0, 0.9); border-radius: 2px; flex-shrink: 0;"></div>
              <span style="color: #555;">Rừng phòng hộ (8k)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
              <div style="width: 20px; height: 14px; background: rgba(152, 251, 152, 0.8); border: 1px solid rgba(100, 200, 100, 0.9); border-radius: 2px; flex-shrink: 0;"></div>
              <span style="color: #555;">Rừng sản xuất (154k)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 20px; height: 14px; background: rgba(245, 222, 179, 0.6); border: 1px solid rgba(210, 180, 140, 0.7); border-radius: 2px; flex-shrink: 0;"></div>
              <span style="color: #555;">Đất chưa có rừng (25k)</span>
            </div>
          </div>
        </div>
      `);

      // 3. Lớp địa hình, thủy văn, giao thông
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
            <input type="checkbox" id="layer-nendiahinh-line" ${mapLayers?.terrainLine?.visible !== false ? 'checked' : ''}
              style="width: 16px; height: 16px; cursor: pointer; accent-color: #2196F3;">
            <label for="layer-nendiahinh-line" style="
              font-weight: 600;
              color: #333;
              font-size: 13px;
              cursor: pointer;
              user-select: none;
              flex: 1;
            ">
              🏔️ Lớp địa hình, thủy văn, giao thông
            </label>
          </div>
          <div style="padding: 8px 12px 4px 28px; font-size: 11px; line-height: 1.8;">
            <div style="font-weight: 600; color: #8B4513; margin-bottom: 3px;">Đường đồng mức</div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; padding-left: 8px;">
              <svg width="24" height="2" style="flex-shrink: 0;">
                <line x1="0" y1="1" x2="24" y2="1" stroke="#8B4513" stroke-width="0.5"/>
              </svg>
              <span style="color: #666; font-size: 10px;">Đường đồng mức</span>
            </div>

            <div style="font-weight: 600; color: #0070C0; margin-bottom: 3px; margin-top: 6px;">Thủy văn</div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px; padding-left: 8px;">
              <svg width="24" height="3" style="flex-shrink: 0;">
                <line x1="0" y1="1.5" x2="24" y2="1.5" stroke="#0070C0" stroke-width="3"/>
              </svg>
              <span style="color: #666; font-size: 10px;">Sông suối lớn</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; padding-left: 8px;">
              <svg width="24" height="2" style="flex-shrink: 0;">
                <line x1="0" y1="1" x2="24" y2="1" stroke="#40A4DF" stroke-width="1.5"/>
              </svg>
              <span style="color: #666; font-size: 10px;">Suối nhỏ</span>
            </div>

            <div style="font-weight: 600; color: #666; margin-bottom: 3px; margin-top: 6px;">Giao thông</div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px; padding-left: 8px;">
              <svg width="24" height="3" style="flex-shrink: 0;">
                <line x1="0" y1="1.5" x2="24" y2="1.5" stroke="#FF0000" stroke-width="3"/>
              </svg>
              <span style="color: #666; font-size: 10px;">Đường quốc lộ</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px; padding-left: 8px;">
              <svg width="24" height="2.5" style="flex-shrink: 0;">
                <line x1="0" y1="1.25" x2="24" y2="1.25" stroke="#FF8C00" stroke-width="2.5"/>
              </svg>
              <span style="color: #666; font-size: 10px;">Đường tỉnh lộ</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px; padding-left: 8px;">
              <svg width="24" height="2" style="flex-shrink: 0;">
                <line x1="0" y1="1" x2="24" y2="1" stroke="#000" stroke-width="2" stroke-dasharray="5,2"/>
              </svg>
              <span style="color: #666; font-size: 10px;">Đường sắt</span>
            </div>
          </div>
        </div>
      `);

      // 4. Lớp ranh giới chủ quản lý rừng
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
          " onmouseover="this.style.background='#e1f5fe'" onmouseout="this.style.background='#f5f5f5'">
            <input type="checkbox" id="layer-chuquanly" ${mapLayers?.forestManagement?.visible !== false ? 'checked' : ''}
              style="width: 16px; height: 16px; cursor: pointer; accent-color: #2196F3;">
            <label for="layer-chuquanly" style="
              font-weight: 600;
              color: #333;
              font-size: 13px;
              cursor: pointer;
              user-select: none;
              flex: 1;
            ">
              🏢 Lớp ranh giới chủ quản lý rừng
            </label>
          </div>
          <div style="padding: 8px 12px 4px 28px; font-size: 11px; line-height: 1.8;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 20px; height: 14px; background: rgba(173, 216, 230, 0.6); border: 2px solid rgba(30, 144, 255, 0.85); border-radius: 2px; flex-shrink: 0;"></div>
              <span style="color: #555;">Đơn vị quản lý rừng</span>
            </div>
          </div>
        </div>
      `);

      // 5. Lớp hiện trạng rừng
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
            <input type="checkbox" id="layer-hientrangrung" ${mapLayers?.forestStatus?.visible !== false ? 'checked' : ''}
              style="width: 16px; height: 16px; cursor: pointer; accent-color: #8BC34A;">
            <label for="layer-hientrangrung" style="
              font-weight: 600;
              color: #333;
              font-size: 13px;
              cursor: pointer;
              user-select: none;
              flex: 1;
            ">
              🌳 Lớp hiện trạng rừng
            </label>
          </div>
          <div style="padding: 8px 12px 4px 28px; font-size: 10px; line-height: 1.6; max-height: 300px; overflow-y: auto;">
            <div style="font-weight: 600; color: #2e7d32; margin-bottom: 4px;">🌲 Rừng trồng</div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px; padding-left: 8px;">
              <div style="width: 16px; height: 12px; background: rgba(34, 139, 34, 0.75); border: 1px solid rgba(0, 100, 0, 0.85); border-radius: 2px; flex-shrink: 0;"></div>
              <span style="color: #666; font-size: 9px;">Rừng trồng giàu - RTG (94k)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px; padding-left: 8px;">
              <div style="width: 16px; height: 12px; background: rgba(107, 142, 35, 0.75); border: 1px solid rgba(85, 107, 47, 0.85); border-radius: 2px; flex-shrink: 0;"></div>
              <span style="color: #666; font-size: 9px;">Trồng xen nghèo - TXN (31k)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px; padding-left: 8px;">
              <div style="width: 16px; height: 12px; background: rgba(124, 252, 0, 0.7); border: 1px solid rgba(85, 180, 0, 0.8); border-radius: 2px; flex-shrink: 0;"></div>
              <span style="color: #666; font-size: 9px;">Rừng trồng khác - RTK (14k)</span>
            </div>

            <div style="font-weight: 600; color: #d84315; margin-bottom: 4px; margin-top: 6px;">🏜️ Đất trống</div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px; padding-left: 8px;">
              <div style="width: 16px; height: 12px; background: rgba(244, 164, 96, 0.65); border: 1px solid rgba(210, 105, 30, 0.75); border-radius: 2px; flex-shrink: 0;"></div>
              <span style="color: #666; font-size: 9px;">Đất trống loại 1 - DT1 (27k)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px; padding-left: 8px;">
              <div style="width: 16px; height: 12px; background: rgba(255, 222, 173, 0.65); border: 1px solid rgba(222, 184, 135, 0.75); border-radius: 2px; flex-shrink: 0;"></div>
              <span style="color: #666; font-size: 9px;">Đất trống rừng - DTR (21k)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px; padding-left: 8px;">
              <div style="width: 16px; height: 12px; background: rgba(250, 235, 215, 0.6); border: 1px solid rgba(210, 180, 140, 0.7); border-radius: 2px; flex-shrink: 0;"></div>
              <span style="color: #666; font-size: 9px;">Đất trống loại 2 - DT2 (8k)</span>
            </div>

            <div style="font-weight: 600; color: #f57c00; margin-bottom: 4px; margin-top: 6px;">🌾 Khác</div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px; padding-left: 8px;">
              <div style="width: 16px; height: 12px; background: rgba(255, 250, 205, 0.6); border: 1px solid rgba(189, 183, 107, 0.7); border-radius: 2px; flex-shrink: 0;"></div>
              <span style="color: #666; font-size: 9px;">Đất nông nghiệp - DNN (9k)</span>
            </div>
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 3px; padding-left: 8px;">
              <div style="width: 16px; height: 12px; background: rgba(143, 188, 143, 0.7); border: 1px solid rgba(85, 107, 47, 0.8); border-radius: 2px; flex-shrink: 0;"></div>
              <span style="color: #666; font-size: 9px;">Trồng xen khác - TXK (8k)</span>
            </div>
          </div>
        </div>
      `);

      // 6. Lớp dự báo mất rừng mới nhất
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
          " onmouseover="this.style.background='#ffebee'" onmouseout="this.style.background='#f5f5f5'">
            <input type="checkbox" id="layer-deforestation" ${mapLayers?.deforestationAlerts?.visible !== false ? 'checked' : ''}
              style="width: 16px; height: 16px; cursor: pointer; accent-color: #F44336;">
            <label for="layer-deforestation" style="
              font-weight: 600;
              color: #333;
              font-size: 13px;
              cursor: pointer;
              user-select: none;
              flex: 1;
            ">
              ⚠️ Lớp dự báo mất rừng mới nhất
            </label>
          </div>
          <div style="padding: 8px 12px 4px 28px; font-size: 11px; line-height: 1.8;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <div style="width: 20px; height: 14px; background: #DC143C; border-radius: 2px; flex-shrink: 0;"></div>
              <span style="color: #555; font-weight: 500;">Lô có khả năng mất rừng</span>
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

      // Layer checkboxes - Map checkbox IDs to GeoDataContext layer keys
      const layerMapping = {
        'layer-ranhgioihc': 'administrative',
        'layer-rg3lr': 'forestTypes',
        'layer-nendiahinh-line': 'terrainLine',
        'layer-chuquanly': 'forestManagement',
        'layer-hientrangrung': 'forestStatus',
        'layer-deforestation': 'deforestationAlerts'
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
  }, [map, mapLayers, toggleLayerVisibility, isExpanded]);

  return null;
};

export default MapLayerLegend;
