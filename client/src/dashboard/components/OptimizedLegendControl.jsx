// client/src/dashboard/components/OptimizedLegendControl.jsx
import React, { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

const OptimizedLegendControl = ({
  setMapType,
  mapLayers,
  toggleLayerVisibility,
}) => {
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

    // Tạo HTML cho legend với performance info
    const createLegendHTML = () => {
      const hasLoadedLayers = Object.values(mapLayers).some(
        (layer) => layer.data
      );

      // Calculate performance stats
      const loadedLayersCount = Object.values(mapLayers).filter(layer => layer.data).length;
      const totalFeatures = Object.values(mapLayers).reduce((total, layer) => 
        total + (layer.data?.features?.length || 0), 0
      );
      const averageLoadTime = Object.values(mapLayers)
        .filter(layer => layer.data?.loadTime)
        .reduce((sum, layer, _, arr) => sum + layer.data.loadTime / arr.length, 0);

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
      ">
        <!-- Header với performance info -->
        <div style="
          background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          padding: 8px 12px;
          border-bottom: 1px solid #ddd;
          border-radius: 6px 6px 0 0;
          display: flex;
          align-items: center;
          cursor: pointer;
        " id="legend-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-right: 8px;">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <div style="flex: 1;">
            <div style="font-weight: bold; color: #333; font-size: 13px;">Lớp bản đồ tối ưu</div>
            ${averageLoadTime > 0 ? `
            <div style="font-size: 10px; color: #666;">
              ⚡ ${Math.round(averageLoadTime)}ms avg • ${totalFeatures} đối tượng
            </div>
            ` : ''}
          </div>
          <svg id="toggle-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="transform: rotate(${
            isExpandedRef.current ? "0" : "-90"
          }deg); transition: transform 0.3s;">
            <polyline points="6,9 12,15 18,9"></polyline>
          </svg>
        </div>

        <!-- Content -->
        <div id="legend-content" style="max-height: 600px; overflow-y: auto; display: ${
          isExpandedRef.current ? "block" : "none"
        };">
          
          <!-- Performance Dashboard -->
          ${hasLoadedLayers ? `
          <div style="padding: 8px 12px; background: #f0f9ff; border-bottom: 1px solid #e0f2fe;">
            <div style="font-weight: bold; margin-bottom: 4px; color: #0369a1; font-size: 11px;">📊 Hiệu suất tải</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 10px;">
              <div>
                <span style="color: #64748b;">Lớp đã tải:</span>
                <strong style="color: #059669; margin-left: 4px;">${loadedLayersCount}</strong>
              </div>
              <div>
                <span style="color: #64748b;">Đối tượng:</span>
                <strong style="color: #059669; margin-left: 4px;">${totalFeatures.toLocaleString()}</strong>
              </div>
              ${averageLoadTime > 0 ? `
              <div style="grid-column: 1 / -1;">
                <span style="color: #64748b;">Tốc độ TB:</span>
                <strong style="color: ${averageLoadTime < 1000 ? '#059669' : averageLoadTime < 3000 ? '#d97706' : '#dc2626'}; margin-left: 4px;">
                  ${Math.round(averageLoadTime)}ms
                </strong>
                ${averageLoadTime < 1000 ? ' 🚀' : averageLoadTime < 3000 ? ' ⚡' : ' 🐌'}
              </div>
              ` : ''}
            </div>
          </div>
          ` : ''}

          <!-- Chọn loại bản đồ nền -->
          <div class="legend-section" style="padding: 8px 12px; border-bottom: 1px solid #eee;">
            <div style="font-weight: bold; margin-bottom: 6px; color: #555; font-size: 11px;">🗺️ Bản đồ nền</div>
            <div style="display: flex; gap: 6px;">
              <button class="map-type-btn" data-type="normal" style="
                flex: 1; padding: 4px 8px; border: 1px solid #ddd; border-radius: 4px;
                background: white; cursor: pointer; font-size: 10px; transition: all 0.2s;
              ">🗺️ Thường</button>
              <button class="map-type-btn active" data-type="satellite" style="
                flex: 1; padding: 4px 8px; border: 1px solid #007bff; border-radius: 4px;
                background: #e3f2fd; cursor: pointer; font-size: 10px; transition: all 0.2s;
              ">🛰️ Vệ tinh</button>
            </div>
          </div>

          <!-- Dynamic layer sections -->
          ${Object.entries(mapLayers)
            .filter(([key, layer]) => layer.data)
            .map(([key, layer]) => {
              const icons = {
                administrative: '🏛️',
                forestTypes: '🌲', 
                forestManagement: '🏢',
                terrain: '🏔️',
                deforestationAlerts: '⚠️'
              };
              
              const loadStrategy = layer.data?.loadStrategy || 'unknown';
              const loadTime = layer.data?.loadTime || 0;
              const viewport = layer.data?.viewport;
              
              let strategyBadge = '';
              let strategyColor = '#6b7280';
              
              if (loadStrategy === 'viewport') {
                strategyBadge = 'Viewport';
                strategyColor = '#059669';
              } else if (loadStrategy === 'smart') {
                strategyBadge = 'Smart';
                strategyColor = '#0ea5e9';
              } else if (loadStrategy === 'full') {
                strategyBadge = 'Full';
                strategyColor = '#dc2626';
              }

              return `
              <div class="legend-section">
                <div class="section-header" style="
                  padding: 8px 12px; cursor: pointer; display: flex; align-items: center;
                  border-bottom: 1px solid #eee; background: ${layer.visible ? '#f8f9fa' : '#f3f4f6'};
                " data-section="${key}">
                  <input type="checkbox" id="${key}-checkbox" ${
                    layer.visible ? "checked" : ""
                  } style="margin-right: 8px; accent-color: #059669;">
                  <span style="margin-right: 6px;">${icons[key] || '📄'}</span>
                  <div style="flex: 1;">
                    <div style="font-weight: 500; font-size: 11px; color: #374151;">
                      ${layer.name}
                    </div>
                    <div style="font-size: 9px; color: #6b7280; margin-top: 1px;">
                      ${layer.data.features?.length || 0} đối tượng
                      ${loadTime > 0 ? ` • ${loadTime}ms` : ''}
                      ${viewport ? ` • zoom ${viewport.zoom}` : ''}
                    </div>
                  </div>
                  ${strategyBadge ? `
                  <span style="
                    background: ${strategyColor}; 
                    color: white; 
                    padding: 1px 4px; 
                    border-radius: 8px; 
                    font-size: 8px; 
                    font-weight: bold;
                    margin-left: 8px;
                  ">${strategyBadge}</span>
                  ` : ''}
                </div>
                ${getLayerLegendContent(key, layer)}
              </div>
              `;
            })
            .join('')}

          <!-- Thông báo nếu chưa có layer nào -->
          ${!hasLoadedLayers ? `
          <div style="padding: 20px 12px; text-align: center; color: #666; font-style: italic;">
            <div style="margin-bottom: 8px; font-size: 24px;">⚡</div>
            <div style="margin-bottom: 4px; font-weight: 500;">Chưa có lớp dữ liệu nào</div>
            <div style="font-size: 10px; color: #999;">
              Sử dụng "Tải dữ liệu tối ưu"<br/>
              để tải các lớp nhanh hơn
            </div>
          </div>
          ` : ''}

          <!-- Footer với tips -->
          <div style="padding: 8px 12px; background: #fef3c7; border-top: 1px solid #fbbf24; font-size: 10px; color: #92400e;">
            <div style="font-weight: bold; margin-bottom: 4px;">💡 Tips tối ưu:</div>
            <div>• Dùng "Viewport" cho tốc độ tối đa</div>
            <div>• Dùng "Smart" cho trải nghiệm tự động</div>
            <div>• Di chuyển bản đồ sẽ tự động tải thêm dữ liệu</div>
          </div>
        </div>
      </div>
    `;
    };

    // Helper function để tạo legend content cho từng layer
    function getLayerLegendContent(layerKey, layer) {
      if (!layer.visible) return '';
      
      switch (layerKey) {
        case 'forestTypes':
          return `
          <div style="padding: 6px 12px 12px 28px; background: #f9fafb; font-size: 9px; max-height: 200px; overflow-y: auto;">
            <div style="font-weight: bold; margin-bottom: 4px; color: #065f46;">🌲 Các loại rừng (LDLR)</div>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 6px; align-items: center;">
              <div style="width: 10px; height: 10px; background: #065f46; border-radius: 2px;"></div>
              <span>Rừng tự nhiên giàu</span>
              <div style="width: 10px; height: 10px; background: #047857; border-radius: 2px;"></div>
              <span>Rừng tự nhiên nghèo</span>
              <div style="width: 10px; height: 10px; background: #10b981; border-radius: 2px;"></div>
              <span>Rừng trồng khác</span>
              <div style="width: 10px; height: 10px; background: #f97316; border-radius: 2px;"></div>
              <span>Đất trồng cây lâm nghiệp</span>
              <div style="width: 10px; height: 10px; background: #6b7280; border-radius: 2px;"></div>
              <span>Khác...</span>
            </div>
          </div>
          `;
        
        case 'deforestationAlerts':
          return `
          <div style="padding: 6px 12px 12px 28px; background: #fef2f2; font-size: 9px;">
            <div style="font-weight: bold; margin-bottom: 4px; color: #991b1b;">⚠️ Mức cảnh báo</div>
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 6px; align-items: center;">
              <div style="width: 10px; height: 10px; background: #991b1b; border-radius: 2px;"></div>
              <span style="color: #991b1b; font-weight: 500;">Nghiêm trọng (0-7 ngày)</span>
              <div style="width: 10px; height: 10px; background: #dc2626; border-radius: 2px;"></div>
              <span style="color: #dc2626; font-weight: 500;">Cao (8-15 ngày)</span>
              <div style="width: 10px; height: 10px; background: #ea580c; border-radius: 2px;"></div>
              <span style="color: #ea580c; font-weight: 500;">Trung bình (16-30 ngày)</span>
              <div style="width: 10px; height: 10px; background: #f59e0b; border-radius: 2px;"></div>
              <span style="color: #f59e0b; font-weight: 500;">Thấp (>30 ngày)</span>
            </div>
          </div>
          `;
        
        case 'forestManagement':
          const isClustered = layer.data?.features?.[0]?.properties?.layer_type === 'forest_management_clustered';
          return `
          <div style="padding: 6px 12px 12px 28px; background: #f9fafb; font-size: 9px;">
            <div style="font-weight: bold; margin-bottom: 4px; color: #7c3aed;">🏢 Chủ quản lý rừng</div>
            ${isClustered ? `
            <div style="color: #0ea5e9; font-weight: 500; margin-bottom: 4px;">📊 Dữ liệu được gom nhóm</div>
            ` : ''}
            <div style="display: grid; grid-template-columns: auto 1fr; gap: 2px 6px; align-items: center;">
              <div style="width: 10px; height: 10px; background: #dc2626; border-radius: 2px;"></div>
              <span>Nhà nước</span>
              <div style="width: 10px; height: 10px; background: #ea580c; border-radius: 2px;"></div>
              <span>Doanh nghiệp</span>
              <div style="width: 10px; height: 10px; background: #059669; border-radius: 2px;"></div>
              <span>Cá nhân/Hộ gia đình</span>
              <div style="width: 10px; height: 10px; background: #7c3aed; border-radius: 2px;"></div>
              <span>Khác</span>
            </div>
          </div>
          `;
        
        default:
          return '';
      }
    }

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
      const layerCheckboxes = Object.keys(mapLayers).reduce((acc, key) => {
        acc[`${key}-checkbox`] = key;
        return acc;
      }, {});

      Object.entries(layerCheckboxes).forEach(([checkboxId, layerKey]) => {
        const checkbox = container.querySelector(`#${checkboxId}`);
        if (checkbox) {
          checkbox.addEventListener("change", (e) => {
            e.stopPropagation();
              `🔄 Toggle layer: ${layerKey}, visible: ${checkbox.checked}`
            );
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
  }, [map, setMapType, mapLayers, toggleLayerVisibility]);

  return null;
};

export default OptimizedLegendControl;