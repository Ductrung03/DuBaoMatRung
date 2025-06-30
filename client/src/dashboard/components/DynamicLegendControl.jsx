// File: client/src/dashboard/components/DynamicLegendControl.jsx
// Component legend tự động cập nhật khi mapLayers thay đổi - VỚI HIỂN THỊ ĐẦY ĐỦ LOẠI RỪNG

import React, { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

const DynamicLegendControl = ({
  setMapType,
  mapLayers,
  toggleLayerVisibility,
}) => {
  const map = useMap();
  const controlRef = useRef(null);
  const isExpandedRef = useRef(true);

  // Hàm helper để lấy màu sắc cho loại rừng
  const getForestTypeColorForLegend = (forestFunction) => {
    const colorMap = {
      // 3 loại rừng chính (theo MALR3)
      "Rừng đặc dụng": "#dc2626", // Đỏ
      "Rừng phòng hộ": "#ea580c", // Cam
      "Rừng sản xuất": "#16a34a", // Xanh lá

      // Các loại rừng khác (theo LDLR)
      "Rừng đặc dụng (LDLR)": "#b91c1c", // Đỏ đậm hơn
      "Rừng phòng hộ (LDLR)": "#c2410c", // Cam đậm hơn
      "Rừng sản xuất (LDLR)": "#15803d", // Xanh đậm hơn
      "Rừng tự nhiên": "#22c55e", // Xanh lá sáng
      "Rừng trồng": "#84cc16", // Xanh lime
      "Đất lâm nghiệp khác": "#64748b", // Xám xanh
      "Đất không rừng": "#94a3b8", // Xám nhạt
      "Không xác định": "#a3a3a3", // Xám
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

  useEffect(() => {
    // Nếu đã có control, remove trước khi tạo mới
    if (controlRef.current) {
      map.removeControl(controlRef.current);
    }

    const container = L.DomUtil.create("div");
    container.className = "leaflet-control leaflet-bar";

    // Tạo HTML cho legend
    const createLegendHTML = () => {
      const hasLoadedLayers = Object.values(mapLayers).some(
        (layer) => layer.data
      );

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
          <svg id="toggle-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" style="margin-left: auto; transform: rotate(${
            isExpandedRef.current ? "0" : "-90"
          }deg); transition: transform 0.3s;">
            <polyline points="6,9 12,15 18,9"></polyline>
          </svg>
        </div>

        <!-- Content -->
        <div id="legend-content" style="max-height: 700px; overflow-y: auto; display: ${
          isExpandedRef.current ? "block" : "none"
        };">
          
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

          <!-- Lớp ranh giới hành chính -->
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

          <!-- Lớp 3 loại rừng với đầy đủ các loại -->
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
  <!-- Chú thích màu động cho tất cả loại rừng có trong dữ liệu -->
  <div style="padding: 6px 12px 12px 28px; background: #f9fafb; font-size: 10px; max-height: 200px; overflow-y: auto;">
    ${(() => {
      // Lấy danh sách các loại rừng từ dữ liệu thực tế
      if (!mapLayers.forestTypes.data.forestTypes) {
        // Nếu không có metadata, tạo từ features
        const forestTypeCounts = {};
        mapLayers.forestTypes.data.features.forEach((feature) => {
          const forestFunction =
            feature.properties.forest_function || "Không xác định";
          forestTypeCounts[forestFunction] =
            (forestTypeCounts[forestFunction] || 0) + 1;
        });

        return Object.entries(forestTypeCounts)
          .sort((a, b) => b[1] - a[1]) // Sắp xếp theo số lượng giảm dần
          .map(([forestType, count]) => {
            const color = getForestTypeColorForLegend(forestType);
            return `
              <div style="margin-bottom: 3px; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center;">
                  <div style="width: 12px; height: 12px; background: ${color}; margin-right: 6px; border-radius: 2px; border: 1px solid #ccc;"></div>
                  <span style="font-size: 10px;">${forestType}</span>
                </div>
                <span style="font-size: 9px; color: #666; margin-left: 4px;">(${count})</span>
              </div>
            `;
          })
          .join("");
      } else {
        // Sử dụng metadata có sẵn
        return mapLayers.forestTypes.data.forestTypes
          .map((type) => {
            const color = getForestTypeColorForLegend(type.name);
            return `
              <div style="margin-bottom: 3px; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center;">
                  <div style="width: 12px; height: 12px; background: ${color}; margin-right: 6px; border-radius: 2px; border: 1px solid #ccc;"></div>
                  <span style="font-size: 10px;">${type.name}</span>
                </div>
                <span style="font-size: 9px; color: #666; margin-left: 4px;">(${type.count})</span>
              </div>
            `;
          })
          .join("");
      }
    })()}
    
    <!-- Tổng số loại -->
    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e5e7eb; font-size: 9px; color: #666; text-align: center;">
      <strong>Tổng: ${(() => {
        if (mapLayers.forestTypes.data.forestTypes) {
          return mapLayers.forestTypes.data.forestTypes.length;
        } else {
          const uniqueTypes = new Set();
          mapLayers.forestTypes.data.features.forEach((feature) => {
            uniqueTypes.add(
              feature.properties.forest_function || "Không xác định"
            );
          });
          return uniqueTypes.size;
        }
      })()} loại rừng</strong>
    </div>
  </div>
</div>
`
    : ""
}

          <!-- Lớp chủ quản lý rừng -->
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
            <!-- Chú thích màu cho chủ quản lý -->
            <div style="padding: 6px 12px 12px 28px; background: #f9fafb; font-size: 10px;">
              <div style="margin-bottom: 3px; display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #dc2626; margin-right: 6px; border-radius: 2px;"></div>
                <span>Nhà nước</span>
              </div>
              <div style="margin-bottom: 3px; display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #ea580c; margin-right: 6px; border-radius: 2px;"></div>
                <span>Doanh nghiệp</span>
              </div>
              <div style="margin-bottom: 3px; display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #d97706; margin-right: 6px; border-radius: 2px;"></div>
                <span>Hợp tác xã</span>
              </div>
              <div style="margin-bottom: 3px; display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #059669; margin-right: 6px; border-radius: 2px;"></div>
                <span>Cá nhân/Hộ gia đình</span>
              </div>
              <div style="margin-bottom: 3px; display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #0891b2; margin-right: 6px; border-radius: 2px;"></div>
                <span>Cộng đồng</span>
              </div>
              <div style="display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #7c3aed; margin-right: 6px; border-radius: 2px;"></div>
                <span>Khác</span>
              </div>
            </div>
          </div>
          `
              : ""
          }

          <!-- Lớp nền địa hình -->
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
            <!-- Chú thích màu cho địa hình -->
            <div style="padding: 6px 12px 12px 28px; background: #f9fafb; font-size: 10px;">
              <div style="margin-bottom: 3px; display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #3182ce; margin-right: 6px; border-radius: 2px;"></div>
                <span>Sông, suối</span>
              </div>
              <div style="margin-bottom: 3px; display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #0987a0; margin-right: 6px; border-radius: 2px;"></div>
                <span>Thủy vận</span>
              </div>
              <div style="margin-bottom: 3px; display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #b7791f; margin-right: 6px; border-radius: 2px;"></div>
                <span>Giao thông</span>
              </div>
              <div style="display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #6b7280; margin-right: 6px; border-radius: 2px;"></div>
                <span>Địa hình khác</span>
              </div>
            </div>
          </div>
          `
              : ""
          }

          <!-- Lớp dự báo mất rừng mới nhất -->
          ${
            mapLayers.deforestationAlerts?.data
              ? `
          <div class="legend-section" style="border-top: 2px solid #fef2f2;">
            <div class="section-header" style="
              padding: 8px 12px; cursor: pointer; display: flex; align-items: center;
              background: #fef2f2;
            " data-section="deforestation-alerts">
              <input type="checkbox" id="deforestation-alerts-checkbox" ${
                mapLayers.deforestationAlerts?.visible ? "checked" : ""
              } style="margin-right: 8px;">
              <span style="color: #dc2626;">⚠️</span>
              <span style="margin-left: 6px; font-weight: 500;">Dự báo mất rừng mới nhất</span>
              <span style="margin-left: 8px; font-size: 10px; color: #dc2626; background: #fecaca; padding: 1px 4px; border-radius: 8px;">
                ${mapLayers.deforestationAlerts.data.features?.length || 0}
              </span>
            </div>
            <!-- Chú thích màu cho mức cảnh báo -->
            <div style="padding: 6px 12px 12px 28px; background: #fef2f2; font-size: 10px;">
              <div style="margin-bottom: 3px; display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #7f1d1d; margin-right: 6px; border-radius: 2px;"></div>
                <span>Nghiêm trọng (0-7 ngày)</span>
              </div>
              <div style="margin-bottom: 3px; display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #dc2626; margin-right: 6px; border-radius: 2px;"></div>
                <span>Cao (8-15 ngày)</span>
              </div>
              <div style="margin-bottom: 3px; display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #ea580c; margin-right: 6px; border-radius: 2px;"></div>
                <span>Trung bình (16-30 ngày)</span>
              </div>
              <div style="display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #f59e0b; margin-right: 6px; border-radius: 2px;"></div>
                <span>Thấp (>30 ngày)</span>
              </div>
            </div>
          </div>
          `
              : `
          <!-- Lớp dự báo mất rừng - LUÔN HIỂN THỊ TRONG LEGEND -->
          <div class="legend-section" style="border-top: 2px solid #fef2f2;">
            <div class="section-header" style="
              padding: 8px 12px; display: flex; align-items: center;
              background: #fef2f2;
            ">
              <span style="color: #dc2626;">⚠️</span>
              <span style="margin-left: 6px; font-weight: 500;">Dự báo mất rừng</span>
              <span style="margin-left: 8px; font-size: 10px; color: #dc2626; background: #fecaca; padding: 1px 4px; border-radius: 8px;">
                Chưa tải
              </span>
            </div>
          </div>
          `
          }

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
              Object.values(mapLayers).filter((layer) => layer.data).length
            } lớp |
            Hiển thị: ${
              Object.values(mapLayers).filter(
                (layer) => layer.data && layer.visible
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
        "deforestation-alerts-checkbox": "deforestationAlerts",
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
