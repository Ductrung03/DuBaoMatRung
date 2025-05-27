// src/contexts/GeoDataContext.jsx
import React, { createContext, useContext, useState } from "react";

// Tạo context
const GeoDataContext = createContext();

// Hook tùy chỉnh để dùng context
export const useGeoData = () => useContext(GeoDataContext);

// Provider để bọc quanh App
export const GeoDataProvider = ({ children }) => {
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // State để quản lý các lớp bản đồ
  const [mapLayers, setMapLayers] = useState({
    administrative: { data: null, visible: true, loading: false },
    forestTypes: { data: null, visible: true, loading: false },
    terrain: { data: null, visible: false, loading: false },
    forestManagement: { data: null, visible: false, loading: false },
    forestStatus: { data: null, visible: false, loading: false }
  });

  // Hàm để cập nhật dữ liệu cho một lớp cụ thể
  const updateLayerData = (layerName, data) => {
    setMapLayers(prev => ({
      ...prev,
      [layerName]: {
        ...prev[layerName],
        data: data,
        loading: false
      }
    }));
  };

  // Hàm để bật/tắt hiển thị lớp
  const toggleLayerVisibility = (layerName) => {
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
    setMapLayers(prev => ({
      ...prev,
      [layerName]: {
        ...prev[layerName],
        loading: loading
      }
    }));
  };

  return (
    <GeoDataContext.Provider value={{ 
      geoData, 
      setGeoData, 
      loading, 
      setLoading,
      mapLayers,
      updateLayerData,
      toggleLayerVisibility,
      setLayerLoading
    }}>
      {children}
    </GeoDataContext.Provider>
  );
};