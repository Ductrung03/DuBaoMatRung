import React, { createContext, useContext, useState } from "react";

const GeoDataContext = createContext();

export const useGeoData = () => useContext(GeoDataContext);

export const GeoDataProvider = ({ children }) => {
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Enhanced map layers config với viewport support
  const [mapLayers, setMapLayers] = useState({
    administrative: { 
      data: null, 
      visible: true, 
      loading: false,
      name: "Ranh giới hành chính",
      endpoint: "administrative",
      useViewport: true // Enable viewport loading
    },
    forestManagement: { 
      data: null, 
      visible: true,
      loading: false,
      name: "Chủ quản lý rừng",
      endpoint: "forest-management",
      useViewport: true
    },
    terrain: { 
      data: null, 
      visible: false, 
      loading: false,
      name: "Nền địa hình, thủy văn, giao thông",
      endpoint: "terrain",
      useViewport: true
    },
    forestTypes: { 
      data: null, 
      visible: true, 
      loading: false,
      name: "Các loại rừng (phân loại LDLR)",
      endpoint: "forest-types",
      useViewport: true
    },
    deforestationAlerts: { 
      data: null, 
      visible: true, 
      loading: false,
      name: "Dự báo mất rừng mới nhất",
      endpoint: "deforestation-alerts",
      useViewport: true
    }
  });

  // Enhanced layer data update với viewport metadata
  const updateLayerData = (layerName, data) => {
    console.log(`🔄 Cập nhật dữ liệu cho layer: ${layerName}`);
    console.log(`📊 Metadata:`, data?.metadata);
    
    setMapLayers(prev => ({
      ...prev,
      [layerName]: {
        ...prev[layerName],
        data: data,
        loading: false,
        lastUpdate: new Date().toISOString(),
        metadata: data?.metadata
      }
    }));
  };

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

  // Enhanced stats với viewport info
  const getLayersStats = () => {
    const stats = {};
    Object.entries(mapLayers).forEach(([key, layer]) => {
      stats[key] = {
        name: layer.name,
        loaded: !!layer.data,
        visible: layer.visible,
        loading: layer.loading,
        featureCount: layer.data?.features?.length || 0,
        useViewport: layer.useViewport,
        loadStrategy: layer.metadata?.load_strategy,
        dataType: layer.metadata?.data_type,
        lastUpdate: layer.lastUpdate
      };
    });
    return stats;
  };

  const clearAllLayers = () => {
    console.log("🗑️ Clearing tất cả dữ liệu layer");
    setMapLayers(prev => {
      const newLayers = {};
      Object.keys(prev).forEach(key => {
        newLayers[key] = {
          ...prev[key],
          data: null,
          loading: false,
          lastUpdate: null,
          metadata: null
        };
      });
      return newLayers;
    });
    setGeoData(null);
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
      setLayerLoading,
      clearAllLayers,
      getLayersStats
    }}>
      {children}
    </GeoDataContext.Provider>
  );
};
