import React, { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import config from '../../../config';


const SmartMapLayer = ({ layerKey, layerConfig, visible, onError }) => {
  const map = useMap();
  const [currentData, setCurrentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Refs để track map layers
  const layerGroupRef = useRef(null);
  const lastViewportRef = useRef(null);
  const abortControllerRef = useRef(null);

  // Initialize layer group
  useEffect(() => {
    if (!layerGroupRef.current) {
      layerGroupRef.current = L.layerGroup();
    }

    return () => {
      // Cleanup khi component unmount
      if (layerGroupRef.current && map.hasLayer(layerGroupRef.current)) {
        map.removeLayer(layerGroupRef.current);
      }
      
      // Cancel ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [map]);

  // Hàm tải dữ liệu viewport với optimization
  const loadViewportData = async () => {
    if (!visible || loading) return;

    const bounds = map.getBounds();
    const zoom = map.getZoom();
    const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;
    
    // Tạo viewport key để check cache
    const viewportKey = `${bbox}_${zoom}`;
    if (lastViewportRef.current === viewportKey) {
      console.log(`🔄 Viewport unchanged for ${layerKey}, skipping load`);
      return;
    }
    
    // Cancel previous request nếu có
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Tạo AbortController mới
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    
    try {
      console.log(`📍 Loading ${layerKey} data for zoom ${zoom}, bbox: ${bbox}`);
      
      const startTime = Date.now();
      
      // Gọi viewport API tối ưu
      const response = await axios.get(
        `/api/layer-data/${layerConfig.endpoint}-viewport`,
        {
          params: { bbox, zoom },
          headers: {
            'Cache-Control': 'max-age=3600' // Cache 1 giờ
          },
          signal: abortControllerRef.current.signal,
          timeout: 30000 // 30 giây timeout
        }
      );
      
      const loadTime = Date.now() - startTime;
      const data = response.data;
      
      // Validate data
      if (!data || !data.features) {
        throw new Error('Invalid response format');
      }
      
      setCurrentData(data);
      lastViewportRef.current = viewportKey;
      
      console.log(`✅ ${layerKey} loaded: ${data.features.length} features in ${loadTime}ms (zoom ${zoom})`);
      
      // Log performance metrics
      if (data.metadata) {
        console.log(`📊 ${layerKey} metadata:`, {
          strategy: data.metadata.load_strategy,
          dataType: data.metadata.data_type,
          queryTime: data.metadata.query_time_ms,
          cacheStatus: data.metadata.cache_ttl ? 'cached' : 'fresh'
        });
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`🚫 Request aborted for ${layerKey}`);
        return;
      }
      
      console.error(`❌ Error loading ${layerKey}:`, error);
      setError(error.message);
      
      if (onError) {
        onError(layerKey, error);
      }
      
    } finally {
      setLoading(false);
    }
  };

  // Render dữ liệu lên map với optimization
  useEffect(() => {
    if (!currentData || !visible) {
      // Clear layer khi không hiển thị
      if (layerGroupRef.current && map.hasLayer(layerGroupRef.current)) {
        layerGroupRef.current.clearLayers();
        map.removeLayer(layerGroupRef.current);
      }
      return;
    }

    const zoom = map.getZoom();
    const featureCount = currentData.features.length;
    
    console.log(`🗺️ Rendering ${featureCount} features for ${layerKey} at zoom ${zoom}`);
    
    // Clear existing layers
    if (layerGroupRef.current && map.hasLayer(layerGroupRef.current)) {
      layerGroupRef.current.clearLayers();
      map.removeLayer(layerGroupRef.current);
    }

    // Tạo GeoJSON layer với style
    const geoJsonLayer = L.geoJSON(currentData, {
      style: (feature) => getLayerStyle(feature, layerKey, zoom),
      onEachFeature: (feature, layer) => {
        // Popup
        const popupContent = buildPopupContent(feature, layerKey);
        layer.bindPopup(popupContent, {
          maxWidth: 300,
          className: 'custom-popup-container'
        });

        // Hover effects với debounce
        let hoverTimeout;
        
        layer.on('mouseover', function() {
          clearTimeout(hoverTimeout);
          hoverTimeout = setTimeout(() => {
            const currentStyle = getLayerStyle(feature, layerKey, zoom);
            this.setStyle({
              ...currentStyle,
              weight: currentStyle.weight + 1,
              fillOpacity: Math.min(currentStyle.fillOpacity + 0.2, 1)
            });
            this.bringToFront();
          }, 50);
        });

        layer.on('mouseout', function() {
          clearTimeout(hoverTimeout);
          hoverTimeout = setTimeout(() => {
            const originalStyle = getLayerStyle(feature, layerKey, zoom);
            this.setStyle(originalStyle);
          }, 50);
        });
      },
      // Performance optimization cho large datasets
      chunkLoading: featureCount > 1000,
      chunkProgress: featureCount > 1000 ? (processed, total) => {
        if (processed % 500 === 0 || processed === total) {
          console.log(`🔄 ${layerKey} chunk progress: ${processed}/${total}`);
        }
      } : undefined
    });
    
    // Add to map
    layerGroupRef.current.addLayer(geoJsonLayer);
    map.addLayer(layerGroupRef.current);
    
    console.log(`✅ ${layerKey} rendered successfully`);

  }, [currentData, visible, map, layerKey]);

  // Lắng nghe map events với debounce
  useEffect(() => {
    // Debounce để tránh tải quá nhiều khi user drag map
    let debounceTimeout;
    const debouncedLoad = () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(loadViewportData, 300);
    };
    
    map.on('moveend', debouncedLoad);
    map.on('zoomend', debouncedLoad);
    
    // Load initial data
    loadViewportData();
    
    return () => {
      clearTimeout(debounceTimeout);
      map.off('moveend', debouncedLoad);
      map.off('zoomend', debouncedLoad);
    };
  }, [visible, layerKey]);

  // Render loading indicator
  if (loading) {
    return (
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
          <span className="text-sm text-gray-700">
            Đang tải {layerConfig.name}...
          </span>
        </div>
      </div>
    );
  }

  // Render error
  if (error && visible) {
    return (
      <div className="absolute top-4 right-4 bg-red-50 border border-red-200 rounded-lg shadow-lg p-3 z-[1000]">
        <div className="flex items-center space-x-2">
          <span className="text-red-600">⚠️</span>
          <span className="text-sm text-red-700">
            Lỗi tải {layerConfig.name}: {error}
          </span>
        </div>
      </div>
    );
  }

  return null;
};

// Helper functions
function getLayerStyle(feature, layerType, zoom) {
  const baseStyle = {
    weight: zoom > 12 ? 2 : 1,
    opacity: 0.8,
    fillOpacity: 0.6
  };

  switch (layerType) {
    case 'forestTypes':
      return {
        ...baseStyle,
        fillColor: getForestTypeColor(feature.properties.forest_function),
        color: '#2d3748'
      };
      
    case 'deforestationAlerts':
      return {
        ...baseStyle,
        fillColor: getDeforestationColor(feature.properties.alert_level),
        color: '#1f2937',
        fillOpacity: 0.8
      };
      
    case 'forestManagement':
      return {
        ...baseStyle,
        fillColor: getManagementColor(feature.properties.chuquanly),
        color: '#2d3748'
      };
      
    case 'administrative':
      const level = feature.properties.boundary_level;
      return {
        ...baseStyle,
        color: getAdminBorderColor(level),
        fillColor: 'transparent',
        weight: getAdminBorderWeight(level, zoom),
        dashArray: getAdminDashArray(level),
        fillOpacity: 0
      };
      
    case 'terrain':
      return {
        ...baseStyle,
        fillColor: getTerrainColor(feature.properties.feature_type),
        color: '#2d3748',
        weight: feature.properties.layer_type === 'terrain_line' ? 3 : 1
      };
      
    default:
      return {
        ...baseStyle,
        fillColor: '#3388ff',
        color: '#2d3748'
      };
  }
}

function getForestTypeColor(forestFunction) {
  const colorMap = {
    'Rừng tự nhiên giàu': '#065f46',
    'Rừng tự nhiên nghèo': '#047857', 
    'Rừng trồng tự nhiên': '#059669',
    'Rừng trồng khác': '#10b981',
    'Rừng trồng cây dược liệu': '#34d399',
    'Trồng xen nương': '#fdba74',
    'Trồng xen phụ': '#fb923c',
    'Trồng xen khác': '#f97316',
    'Trồng xen đặc nông': '#ea580c',
    'Trồng nương khác': '#dc2626',
    'Đất trống loại 1': '#e5e7eb',
    'Đất trống loại 2': '#d1d5db',
    'Đất trống rừng': '#9ca3af',
    'Đất nông nghiệp': '#fbbf24',
    'Hỗn giao loại 1': '#a78bfa',
    'Hỗn giao loại 2': '#8b5cf6'
  };
  return colorMap[forestFunction] || '#6b7280';
}

function getDeforestationColor(alertLevel) {
  const colorMap = {
    'critical': '#991b1b',
    'high': '#dc2626', 
    'medium': '#ea580c',
    'low': '#f59e0b',
    'summary': '#f97316'
  };
  return colorMap[alertLevel] || '#ea580c';
}

function getManagementColor(chuQuanLy) {
  if (!chuQuanLy) return '#7c3aed';
  
  const name = chuQuanLy.toLowerCase();
  if (name.includes('nhà nước') || name.includes('ubnd')) return '#dc2626';
  if (name.includes('công ty') || name.includes('doanh nghiệp')) return '#ea580c';
  if (name.includes('hợp tác xã')) return '#d97706';
  if (name.includes('cá nhân') || name.includes('hộ gia đình')) return '#059669';
  if (name.includes('cộng đồng')) return '#0891b2';
  return '#7c3aed';
}

function getAdminBorderColor(level) {
  const colorMap = {
    'huyen': '#000000',
    'xa': '#333333', 
    'tieukhu': '#666666',
    'khoanh': '#999999'
  };
  return colorMap[level] || '#ff0000';
}

function getAdminBorderWeight(level, zoom) {
  const weights = {
    'huyen': zoom > 10 ? 4 : 3,
    'xa': zoom > 12 ? 3 : 2,
    'tieukhu': zoom > 14 ? 2 : 1,
    'khoanh': 1
  };
  return weights[level] || 2;
}

function getAdminDashArray(level) {
  const dashArrays = {
    'huyen': '15, 10',
    'xa': '10, 6',
    'tieukhu': '8, 5', 
    'khoanh': '5, 4'
  };
  return dashArrays[level] || null;
}

function getTerrainColor(featureType) {
  const colorMap = {
    'waterway': '#3182ce',
    'water_transport': '#0987a0',
    'road': '#b7791f',
    'terrain': '#6b7280'
  };
  return colorMap[featureType] || '#6b7280';
}

function buildPopupContent(feature, layerType) {
  const props = feature.properties;
  
  let title = 'Thông tin đối tượng';
  switch (layerType) {
    case 'forestTypes':
      title = `🌲 ${props.forest_function || 'Loại rừng'}`;
      break;
    case 'deforestationAlerts':
      title = `⚠️ Dự báo mất rừng - ${props.alert_level || 'Trung bình'}`;
      break;
    case 'forestManagement':
      title = `🏢 ${props.chuquanly || 'Chủ quản lý rừng'}`;
      break;
    case 'administrative':
      title = `🏛️ Ranh giới ${props.boundary_level || 'hành chính'}`;
      break;
    case 'terrain':
      title = `🏔️ ${props.ten || 'Địa hình'}`;
      break;
  }

  let content = `
    <div class="custom-popup">
      <h4 class="popup-title">${title}</h4>
      <table class="popup-table">
  `;

  // Hiển thị các trường quan trọng
  const importantFields = getImportantFields(layerType);
  importantFields.forEach(field => {
    if (props[field] !== undefined && props[field] !== null && props[field] !== '') {
      const label = getFieldLabel(field);
      const value = formatFieldValue(field, props[field]);
      content += `
        <tr>
          <th>${label}</th>
          <td>${value}</td>
        </tr>
      `;
    }
  });

  content += `</table></div>`;
  return content;
}

function getImportantFields(layerType) {
  const fieldsMap = {
    'forestTypes': ['forest_function', 'dtich', 'huyen', 'xa', 'tk', 'khoanh'],
    'deforestationAlerts': ['alert_level', 'area_ha', 'start_dau', 'end_sau', 'days_since'],
    'forestManagement': ['chuquanly', 'feature_count'],
    'administrative': ['boundary_level', 'huyen', 'xa', 'tieukhu', 'khoanh'],
    'terrain': ['ten', 'feature_type', 'layer_type']
  };
  return fieldsMap[layerType] || Object.keys(props).slice(0, 5);
}

function getFieldLabel(field) {
  const labelMap = {
    'forest_function': 'Loại rừng',
    'dtich': 'Diện tích',
    'area_ha': 'Diện tích',
    'huyen': 'Huyện',
    'xa': 'Xã',
    'tk': 'Tiểu khu',
    'khoanh': 'Khoảnh',
    'alert_level': 'Mức cảnh báo',
    'start_dau': 'Từ ngày',
    'end_sau': 'Đến ngày',
    'days_since': 'Số ngày trước',
    'chuquanly': 'Chủ quản lý',
    'feature_count': 'Số đối tượng',
    'boundary_level': 'Cấp ranh giới',
    'tieukhu': 'Tiểu khu',
    'ten': 'Tên',
    'feature_type': 'Loại đối tượng',
    'layer_type': 'Loại layer'
  };
  return labelMap[field] || field;
}

function formatFieldValue(field, value) {
  if (['start_dau', 'end_sau'].includes(field) && value) {
    return new Date(value).toLocaleDateString('vi-VN');
  }
  if (['dtich', 'area_ha'].includes(field) && value) {
    return `${parseFloat(value).toFixed(2)} ha`;
  }
  if (field === 'days_since' && value !== null) {
    return `${value} ngày`;
  }
  if (field === 'alert_level') {
    const levelNames = {
      'critical': 'Nghiêm trọng',
      'high': 'Cao', 
      'medium': 'Trung bình',
      'low': 'Thấp',
      'summary': 'Tổng hợp'
    };
    return levelNames[value] || value;
  }
  return value;
}

export default SmartMapLayer;

