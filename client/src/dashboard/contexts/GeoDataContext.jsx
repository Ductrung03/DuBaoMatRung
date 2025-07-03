import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import config from "../../config";
import { toast } from "react-toastify";

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
      useViewport: true
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

  // ✅ HÀM MỚI: Load dữ liệu mặc định từ bảng mat_rung
  const loadDefaultMatRungData = async () => {
    try {
      console.log("🔄 Loading mặc định dữ liệu từ bảng mat_rung...");
      setLoading(true);

      // Gọi API để lấy toàn bộ dữ liệu mat_rung (không có filter)
      const response = await axios.get(`${config.API_URL}/api/mat-rung`, {
        params: {
          fromDate: '2020-01-01', // Lấy từ 2020 để có nhiều dữ liệu
          toDate: '2030-12-31'     // Đến 2030 để bao gồm tất cả
        }
      });

      if (response.data && response.data.mat_rung) {
        const matRungData = response.data.mat_rung;
        
        console.log(`✅ Loaded ${matRungData.features?.length || 0} mat_rung features mặc định`);
        
        // Set vào geoData để hiển thị trong Map và Table
        setGeoData(matRungData);
        
        // Cũng có thể set vào deforestationAlerts layer
        updateLayerData('deforestationAlerts', matRungData);
        
        
      } else {
        console.log("⚠️ Không có dữ liệu mat_rung");
        toast.info("Không có dữ liệu mất rừng");
      }
    } catch (error) {
      console.error("❌ Lỗi khi load dữ liệu mat_rung mặc định:", error);
      toast.error("Lỗi khi tải dữ liệu mất rừng: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Load dữ liệu mặc định khi component mount
  useEffect(() => {
    console.log("🚀 GeoDataProvider mounted - loading default data...");
    loadDefaultMatRungData();
  }, []); // Chỉ chạy 1 lần khi mount

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

  // ✅ HÀM MỚI: Refresh dữ liệu mặc định
  const refreshDefaultData = () => {
    loadDefaultMatRungData();
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
      getLayersStats,
      loadDefaultMatRungData,     // ✅ Export hàm load mặc định
      refreshDefaultData          // ✅ Export hàm refresh
    }}>
      {children}
    </GeoDataContext.Provider>
  );
};