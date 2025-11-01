// File: client/src/dashboard/components/DynamicLegendControl.jsx
// Component legend với chú thích màu đầy đủ cho các loại rừng LDLR và dự báo mất rừng

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

  // Hàm helper để lấy màu sắc cho loại rừng (giống trong Map.jsx)
  const getForestTypeColorForLegend = (forestFunction) => {
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
        max-width: 400px;
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

          <!-- Lớp các loại rừng với chú thích màu đầy đủ -->
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
    <span style="margin-left: 6px; font-weight: 500;">Các loại rừng (LDLR)</span>
    <span style="margin-left: 8px; font-size: 10px; color: #666; background: #d4edda; padding: 1px 4px; border-radius: 8px;">
      ${mapLayers.forestTypes.data.features?.length || 0}
    </span>
  </div>
  <!-- Chú thích màu đầy đủ cho tất cả loại rừng -->
  <div style="padding: 6px 12px 12px 28px; background: #f9fafb; font-size: 10px; max-height: 300px; overflow-y: auto;">
    
    <!-- Nhóm Rừng tự nhiên -->
    <div style="margin-bottom: 8px;">
      <div style="font-weight: bold; color: #065f46; margin-bottom: 3px; font-size: 11px;">🌳 Rừng tự nhiên</div>
      <div style="margin-bottom: 2px; display: flex; align-items: center;">
        <div style="width: 12px; height: 12px; background: #065f46; margin-right: 6px; border-radius: 2px; border: 1px solid #ccc;"></div>
        <span style="font-size: 10px;">Rừng tự nhiên giàu (RTG)</span>
      </div>
      <div style="margin-bottom: 2px; display: flex; align-items: center;">
        <div style="width: 12px; height: 12px; background: #047857; margin-right: 6px; border-radius: 2px; border: 1px solid #ccc;"></div>
        <span style="font-size: 10px;">Rừng tự nhiên nghèo (RTN)</span>
      </div>
      <div style="margin-bottom: 2px; display: flex; align-items: center;">
        <div style="width: 12px; height: 12px; background: #059669; margin-right: 6px; border-radius: 2px; border: 1px solid #ccc;"></div>
        <span style="font-size: 10px;">Rừng trồng tự nhiên (RTTN)</span>
      </div>
    </div>

    <!-- Nhóm Rừng trồng -->
    <div style="margin-bottom: 8px;">
      <div style="font-weight: bold; color: #10b981; margin-bottom: 3px; font-size: 11px;">🌱 Rừng trồng</div>
      <div style="margin-bottom: 2px; display: flex; align-items: center;">
        <div style="width: 12px; height: 12px; background: #10b981; margin-right: 6px; border-radius: 2px; border: 1px solid #ccc;"></div>
        <span style="font-size: 10px;">Rừng trồng khác (RTK)</span>
      </div>
      <div style="margin-bottom: 2px; display: flex; align-items: center;">
        <div style="width: 12px; height: 12px; background: #34d399; margin-right: 6px; border-radius: 2px; border: 1px solid #ccc;"></div>
        <span style="font-size: 10px;">Rừng trồng cây dược liệu (RTCD)</span>
      </div>
    </div>

    <!-- Nhóm Đất trồng cây lâm nghiệp -->
    <div style="margin-bottom: 8px;">
      <div style="font-weight: bold; color: #f97316; margin-bottom: 3px; font-size: 11px;">🌾 Đất trồng cây lâm nghiệp</div>
      <div style="margin-bottom: 2px; display: flex; align-items: center;">
        <div style="width: 12px; height: 12px; background: #fdba74; margin-right: 6px; border-radius: 2px; border: 1px solid #ccc;"></div>
        <span style="font-size: 10px;">Trồng xen nương (TXN)</span>
      </div>
      <div style="margin-bottom: 2px; display: flex; align-items: center;">
        <div style="width: 12px; height: 12px; background: #fb923c; margin-right: 6px; border-radius: 2px; border: 1px solid #ccc;"></div>
        <span style="font-size: 10px;">Trồng xen phụ (TXP)</span>
      </div>
      <div style="margin-bottom: 2px; display: flex; align-items: center;">
        <div style="width: 12px; height: 12px; background: #f97316; margin-right: 6px; border-radius: 2px; border: 1px solid #ccc;"></div>
        <span style="font-size: 10px;">Trồng xen khác (TXK)</span>
      </div>
      <div style="margin-bottom: 2px; display: flex; align-items: center;">
        <div style="width: 12px; height: 12px; background: #ea580c; margin-right: 6px; border-radius: 2px; border: 1px solid #ccc;"></div>
        <span style="font-size: 10px;">Trồng xen đặc nông (TXDN)</span>
      </div>
      <div style="margin-bottom: 2px; display: flex; align-items: center;">
        <div style="width: 12px; height: 12px; background: #dc2626; margin-right: 6px; border-radius: 2px; border: 1px solid #ccc;"></div>
        <span style="font-size: 10px;">Trồng nương khác (TNK)</span>
      </div>
    </div>

    <!-- Nhóm Đất trống -->
    <div style="margin-bottom: 8px;">
      <div style="font-weight: bold; color: #9ca3af; margin-bottom: 3px; font-size: 11px;">⬜ Đất trống</div>
      <div style="margin-bottom: 2px; display: flex; align-items: center;">
        <div style="width: 12px; height: 12px; background: #e5e7eb; margin-right: 6px; border-radius: 2px; border: 1px solid #ccc;"></div>
        <span style="font-size: 10px;">Đất trống loại 1 (DT1)</span>
      </div>
      <div style="margin-bottom: 2px; display: flex; align-items: center;">
        <div style="width: 12px; height: 12px; background: #d1d5db; margin-right: 6px; border-radius: 2px; border: 1px solid #ccc;"></div>
        <span style="font-size: 10px;">Đất trống loại 2 (DT2)</span>
      </div>
      <div style="margin-bottom: 2px; display: flex; align-items: center;">
        <div style="width: 12px; height: 12px; background: #9ca3af; margin-right: 6px; border-radius: 2px; border: 1px solid #ccc;"></div>
        <span style="font-size: 10px;">Đất trống rừng (DTR)</span>
      </div>
    </div>

    <!-- Nhóm khác -->
    <div style="margin-bottom: 8px;">
      <div style="font-weight: bold; color: #6b7280; margin-bottom: 3px; font-size: 11px;">🌾 Khác</div>
      <div style="margin-bottom: 2px; display: flex; align-items: center;">
        <div style="width: 12px; height: 12px; background: #fbbf24; margin-right: 6px; border-radius: 2px; border: 1px solid #ccc;"></div>
        <span style="font-size: 10px;">Đất nông nghiệp (DNN)</span>
      </div>
      <div style="margin-bottom: 2px; display: flex; align-items: center;">
        <div style="width: 12px; height: 12px; background: #a78bfa; margin-right: 6px; border-radius: 2px; border: 1px solid #ccc;"></div>
        <span style="font-size: 10px;">Hỗn giao loại 1 (HG1)</span>
      </div>
      <div style="margin-bottom: 2px; display: flex; align-items: center;">
        <div style="width: 12px; height: 12px; background: #8b5cf6; margin-right: 6px; border-radius: 2px; border: 1px solid #ccc;"></div>
        <span style="font-size: 10px;">Hỗn giao loại 2 (HG2)</span>
      </div>
    </div>
    
    <!-- Tổng số loại -->
    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e5e7eb; font-size: 9px; color: #666; text-align: center;">
      <strong>Ghi chú:</strong> Phân loại dựa trên mã LDLR
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

          <!-- Lớp dự báo mất rừng mới nhất với chú thích màu đầy đủ -->
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
            <!-- Chú thích màu chi tiết cho mức cảnh báo -->
            <div style="padding: 6px 12px 12px 28px; background: #fef2f2; font-size: 10px;">
              <div style="font-weight: bold; margin-bottom: 6px; color: #991b1b;">📊 Mức độ cảnh báo theo thời gian</div>
              
              <div style="margin-bottom: 3px; display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #991b1b; margin-right: 6px; border-radius: 2px; border: 1px solid #7f1d1d;"></div>
                <span style="font-weight: 500; color: #991b1b;">Nghiêm trọng (0-7 ngày)</span>
              </div>
              <div style="margin-bottom: 3px; display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #dc2626; margin-right: 6px; border-radius: 2px; border: 1px solid #b91c1c;"></div>
                <span style="font-weight: 500; color: #dc2626;">Cao (8-15 ngày)</span>
              </div>
              <div style="margin-bottom: 3px; display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #ea580c; margin-right: 6px; border-radius: 2px; border: 1px solid #c2410c;"></div>
                <span style="font-weight: 500; color: #ea580c;">Trung bình (16-30 ngày)</span>
              </div>
              <div style="margin-bottom: 6px; display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #f59e0b; margin-right: 6px; border-radius: 2px; border: 1px solid #d97706;"></div>
                <span style="font-weight: 500; color: #f59e0b;">Thấp (>30 ngày)</span>
              </div>
              
              <div style="font-size: 9px; color: #666; text-align: center; padding-top: 4px; border-top: 1px solid #fee2e2;">
                <strong>Lưu ý:</strong> Màu sắc dựa trên thời gian phát hiện gần nhất
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
            <!-- Hiển thị chú thích màu ngay cả khi chưa tải -->
            <div style="padding: 6px 12px 12px 28px; background: #fef2f2; font-size: 10px;">
              <div style="font-weight: bold; margin-bottom: 6px; color: #991b1b;">📊 Mức độ cảnh báo theo thời gian</div>
              
              <div style="margin-bottom: 3px; display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #991b1b; margin-right: 6px; border-radius: 2px; border: 1px solid #7f1d1d;"></div>
                <span style="font-weight: 500; color: #991b1b;">Nghiêm trọng (0-7 ngày)</span>
              </div>
              <div style="margin-bottom: 3px; display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #dc2626; margin-right: 6px; border-radius: 2px; border: 1px solid #b91c1c;"></div>
                <span style="font-weight: 500; color: #dc2626;">Cao (8-15 ngày)</span>
              </div>
              <div style="margin-bottom: 3px; display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #ea580c; margin-right: 6px; border-radius: 2px; border: 1px solid #c2410c;"></div>
                <span style="font-weight: 500; color: #ea580c;">Trung bình (16-30 ngày)</span>
              </div>
              <div style="margin-bottom: 6px; display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; background: #f59e0b; margin-right: 6px; border-radius: 2px; border: 1px solid #d97706;"></div>
                <span style="font-weight: 500; color: #f59e0b;">Thấp (>30 ngày)</span>
              </div>
              
              <div style="font-size: 9px; color: #666; text-align: center; padding-top: 4px; border-top: 1px solid #fee2e2;">
                <strong>Cần tải dữ liệu để xem trên bản đồ</strong>
              </div>
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