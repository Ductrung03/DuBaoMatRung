// src/contexts/GeoDataContext.jsx
import React, { createContext, useContext, useState } from "react";
// Thêm vào đầu file GeoDataContext.jsx
import L from "leaflet";
// Tạo context
const GeoDataContext = createContext();

// Hook tùy chỉnh để dùng context
export const useGeoData = () => useContext(GeoDataContext);

// Provider để bọc quanh App
export const GeoDataProvider = ({ children }) => {
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // State để quản lý các lớp bản đồ - Cập nhật với tất cả các lớp
  const [mapLayers, setMapLayers] = useState({
  administrative: { 
    data: null, 
    visible: true, 
    loading: false,
    name: "Ranh giới hành chính",
    endpoint: "administrative",
    bbox: null
  },
  forestTypes: { 
    data: null, 
    visible: true, 
    loading: false,
    name: "3 loại rừng",
    endpoint: "forest-types"
  },
  terrain: { 
    data: null, 
    visible: false, 
    loading: false,
    name: "Địa hình, thủy văn, giao thông",
    endpoint: "terrain"
  },
  forestManagement: { 
    data: null, 
    visible: true, // SỬA: Đặt visible = true mặc định
    loading: false,
    name: "Chủ quản lý rừng",
    endpoint: "forest-management"
  },
  forestStatus: { 
    data: null, 
    visible: false, 
    loading: false,
    name: "Hiện trạng rừng",
    endpoint: "forest-status"
  },
  deforestationAlerts: { 
    data: null, 
    visible: true, 
    loading: false,
    name: "Dự báo mất rừng mới nhất",
    endpoint: "deforestation-alerts"
  }
});


  // Hàm để cập nhật dữ liệu cho một lớp cụ thể
const updateLayerData = (layerName, data) => {
  console.log(`🔄 Cập nhật dữ liệu cho layer: ${layerName}`);
  console.log(`📊 Số features: ${data?.features?.length || 0}`);
  console.log(`🔍 Sample feature:`, data?.features?.[0]);
  
 if (layerName === 'forestManagement') {
    console.log(`🏢 Forest Management Data:`, {
      featureCount: data?.features?.length,
      sampleFeature: data?.features?.[0],
      sampleProperties: data?.features?.[0]?.properties
    });
    
    // Kiểm tra dữ liệu chủ quản lý
    if (data?.features?.length > 0) {
      const managementTypes = {};
      data.features.forEach(feature => {
        const chuQuanLy = feature.properties.chuquanly || "Không xác định";
        managementTypes[chuQuanLy] = (managementTypes[chuQuanLy] || 0) + 1;
      });
      console.log(`🏢 Thống kê chủ quản lý:`, managementTypes);
    }
  }

  setMapLayers(prev => ({
    ...prev,
    [layerName]: {
      ...prev[layerName],
      data: data,
      loading: false
    }
  }));
  
  // Debug zoom logic
  console.log(`🗺️ Checking zoom conditions:`);
  console.log(`- Data exists: ${!!data}`);
  console.log(`- Has features: ${!!(data?.features?.length > 0)}`);
  console.log(`- Window._leaflet_map exists: ${!!window._leaflet_map}`);
  
  // Tự động zoom khi tải layer
  if (data && data.features && data.features.length > 0) {
    console.log(`🔄 Attempting to zoom to ${layerName}...`);
    
    if (!window._leaflet_map) {
      console.error(`❌ window._leaflet_map không tồn tại!`);
      return;
    }
    
    setTimeout(() => {
      try {
        console.log(`🗺️ Creating GeoJSON layer for bounds calculation...`);
        
        // Import L nếu chưa có
        if (typeof L === 'undefined') {
          console.error(`❌ Leaflet (L) không tồn tại!`);
          return;
        }
        
        // Tạo layer tạm để tính bounds
        const tempLayer = L.geoJSON(data);
        const bounds = tempLayer.getBounds();
        
        console.log(`📍 Calculated bounds:`, bounds);
        console.log(`📍 Bounds details:`, {
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest()
        });
        
        // Kiểm tra bounds hợp lệ
        if (bounds.isValid()) {
          window._leaflet_map.fitBounds(bounds, { 
            padding: [20, 20],
            maxZoom: layerName === 'administrative' ? 9 : 12
          });
          
          console.log(`✅ Đã zoom vào vùng ${layerName} thành công!`);
        } else {
          console.error(`❌ Bounds không hợp lệ:`, bounds);
        }
        
      } catch (error) {
        console.error("❌ Lỗi khi zoom vào layer:", error);
        console.error("Stack trace:", error.stack);
      }
    }, 1000); // Tăng delay
  } else {
    console.log(`⚠️ Không thể zoom: thiếu dữ liệu hoặc map instance`);
  }
};
  // Hàm để bật/tắt hiển thị lớp
  const toggleLayerVisibility = (layerName) => {
    console.log(`👁️ Toggle visibility cho layer: ${layerName}`);
    setMapLayers(prev => ({
      ...prev,
      [layerName]: {
        ...prev[layerName],
        visible: !prev[layerName].visible
      }
    }));
  };

  // Hàm để đặt trạng thái loading cho lớp
  const setLayerLoading = (layerName, loading) => {
    console.log(`⏳ Set loading ${loading} cho layer: ${layerName}`);
    setMapLayers(prev => ({
      ...prev,
      [layerName]: {
        ...prev[layerName],
        loading: loading
      }
    }));
  };

  // Hàm để load tất cả các layer cơ bản
  const loadAllBaseLayers = async () => {
    console.log("🔄 Bắt đầu load tất cả các layer cơ bản...");
    const layersToLoad = ['administrative', 'forestTypes'];
    
    for (const layerKey of layersToLoad) {
      const layer = mapLayers[layerKey];
      if (layer && !layer.data && !layer.loading) {
        console.log(`📥 Loading layer: ${layer.name}`);
        // Sẽ được gọi từ component CapNhatDuLieu
      }
    }
  };

  // Hàm để clear tất cả dữ liệu
  const clearAllLayers = () => {
    console.log("🗑️ Clearing tất cả dữ liệu layer");
    setMapLayers(prev => {
      const newLayers = {};
      Object.keys(prev).forEach(key => {
        newLayers[key] = {
          ...prev[key],
          data: null,
          loading: false
        };
      });
      return newLayers;
    });
    setGeoData(null);
  };

  // Hàm để lấy thống kê về layers
  const getLayersStats = () => {
    const stats = {};
    Object.entries(mapLayers).forEach(([key, layer]) => {
      stats[key] = {
        name: layer.name,
        loaded: !!layer.data,
        visible: layer.visible,
        loading: layer.loading,
        featureCount: layer.data?.features?.length || 0
      };
    });
    return stats;
  };

  // Hàm helper để lấy layer theo endpoint
  const getLayerByEndpoint = (endpoint) => {
    return Object.entries(mapLayers).find(([key, layer]) => layer.endpoint === endpoint);
  };

  return (
    <GeoDataContext.Provider value={{ 
      // Dữ liệu chính
      geoData, 
      setGeoData, 
      loading, 
      setLoading,
      
      // Quản lý layers
      mapLayers,
      updateLayerData,
      toggleLayerVisibility,
      setLayerLoading,
      
      // Utility functions
      loadAllBaseLayers,
      clearAllLayers,
      getLayersStats,
      getLayerByEndpoint
    }}>
      {children}
    </GeoDataContext.Provider>
  );
};