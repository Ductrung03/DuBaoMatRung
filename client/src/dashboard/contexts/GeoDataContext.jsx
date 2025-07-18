// client/src/dashboard/contexts/GeoDataContext.jsx - AUTO LOAD ALL LAYERS
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
      visible: false, // ẨN MẶC ĐỊNH - KHÔNG AUTO LOAD
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

  // ✅ HÀM MỚI: Auto load tất cả layers khi khởi động (trừ forestTypes)
  const loadAllDefaultLayers = async () => {
    try {
      console.log("🚀 Auto loading all default layers...");
      
      // Danh sách layers cần auto load (KHÔNG BAO GỒM forestTypes)
      const layersToLoad = [
        { key: 'administrative', name: 'Ranh giới hành chính', priority: 1 },
        { key: 'forestManagement', name: 'Chủ quản lý rừng', priority: 2 },
        { key: 'terrain', name: 'Nền địa hình', priority: 3 },
        { key: 'deforestationAlerts', name: 'Dự báo mất rừng (3 tháng)', priority: 4 }
      ];

      // Load từng layer một cách tuần tự
      for (const layer of layersToLoad) {
        try {
          console.log(`📥 Auto loading ${layer.name}...`);
          setLayerLoading(layer.key, true);
          
          let endpoint = `${config.API_URL}/api/layer-data/${mapLayers[layer.key].endpoint}`;
          
          // ✅ SPECIAL: Cho deforestationAlerts, thêm param để chỉ lấy 3 tháng
          if (layer.key === 'deforestationAlerts') {
            endpoint += '?days=90'; // 3 tháng = 90 ngày
          }
          
          const response = await axios.get(endpoint, {
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'max-age=0'
            },
            timeout: 120000 // 2 phút timeout
          });
          
          if (response.data && response.data.features) {
            const layerData = {
              ...response.data,
              layerType: layer.key,
              loadTime: 0,
              loadStrategy: 'auto_load_default',
              loadTimestamp: new Date().toISOString(),
              autoLoaded: true
            };
            
            updateLayerData(layer.key, layerData);
            console.log(`✅ Auto loaded ${layer.name}: ${response.data.features.length} features`);
          }
          
        } catch (error) {
          console.error(`❌ Error auto loading ${layer.name}:`, error);
          // Không toast error để tránh spam, chỉ log
        } finally {
          setLayerLoading(layer.key, false);
        }
        
        // Delay ngắn giữa các layer để tránh overload
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // ✅ LOAD DỮ LIỆU MẶC ĐỊNH CHO BẢNG (mat_rung 3 tháng gần nhất)
      await loadDefaultMatRungData();
      
      console.log("🎉 Auto load all default layers completed!");
      
    } catch (error) {
      console.error("❌ Error in auto load all layers:", error);
    }
  };

  // ✅ HÀM CẬP NHẬT: Load dữ liệu mặc định từ bảng mat_rung - CHỈ 3 THÁNG
  const loadDefaultMatRungData = async () => {
    try {
      console.log("🔄 Loading mặc định dữ liệu từ bảng mat_rung (3 tháng gần nhất)...");
      setLoading(true);

      // Gọi API để lấy dữ liệu mat_rung 3 tháng gần nhất
      const response = await axios.get(`${config.API_URL}/api/mat-rung`, {
        params: {
          // Không truyền fromDate, toDate để lấy dữ liệu mặc định
          // Backend sẽ tự động lấy dữ liệu với limit mặc định
          limit: 1000 // Giới hạn 1000 records
        }
      });

      if (response.data && response.data.mat_rung) {
        const matRungData = response.data.mat_rung;
        
        // Lọc chỉ lấy 3 tháng gần nhất
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        const filteredFeatures = matRungData.features.filter(feature => {
          const endDate = new Date(feature.properties.end_sau);
          return endDate >= threeMonthsAgo;
        });
        
        const filteredData = {
          ...matRungData,
          features: filteredFeatures
        };
        
        console.log(`✅ Loaded ${filteredData.features?.length || 0} mat_rung features (3 tháng gần nhất)`);
        
        // Set vào geoData để hiển thị trong Map và Table
        setGeoData(filteredData);
        
      } else {
        console.log("⚠️ Không có dữ liệu mat_rung");
      }
    } catch (error) {
      console.error("❌ Lỗi khi load dữ liệu mat_rung mặc định:", error);
      // Không toast error để tránh spam khi auto load
    } finally {
      setLoading(false);
    }
  };

  // ✅ AUTO LOAD KHI COMPONENT MOUNT
  useEffect(() => {
    console.log("🚀 GeoDataProvider mounted - starting auto load...");
    
    // Delay nhỏ để đảm bảo UI đã render
    const timer = setTimeout(() => {
      loadAllDefaultLayers();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []); // Chỉ chạy 1 lần khi mount

  // Enhanced layer data update với viewport metadata
  const updateLayerData = (layerName, data) => {
    console.log(`🔄 Cập nhật dữ liệu cho layer: ${layerName}`);
    
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
        lastUpdate: layer.lastUpdate,
        autoLoaded: layer.data?.autoLoaded || false
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
    loadAllDefaultLayers();
  };

  // ✅ HÀM MỚI: Load layer riêng lẻ (cho các nút tải lên)
  const loadSingleLayer = async (layerKey) => {
    try {
      const layer = mapLayers[layerKey];
      if (!layer) {
        console.error(`Layer ${layerKey} không tồn tại`);
        return;
      }

      setLayerLoading(layerKey, true);
      
      toast.info(`🔄 Đang tải ${layer.name}...`, { autoClose: 2000 });
      
      const startTime = Date.now();
      let endpoint = `${config.API_URL}/api/layer-data/${layer.endpoint}`;
      
      // Special handling cho deforestationAlerts
      if (layerKey === 'deforestationAlerts') {
        endpoint += '?days=365'; // 1 năm cho load riêng lẻ
      }
      
      const response = await axios.get(endpoint, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'max-age=0'
        },
        timeout: 180000 // 3 minutes timeout
      });
      
      const loadTime = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (response.data && response.data.features) {
        const layerData = {
          ...response.data,
          layerType: layerKey,
          loadTime: parseFloat(loadTime),
          loadStrategy: 'manual_load',
          loadTimestamp: new Date().toISOString(),
          autoLoaded: false
        };
        
        updateLayerData(layerKey, layerData);
        
        toast.success(`✅ ${layer.name}: ${response.data.features.length.toLocaleString()} đối tượng (${loadTime}s)`, { autoClose: 4000 });
        
      } else {
        toast.warning(`⚠️ Không có dữ liệu cho ${layer.name}`);
      }
    } catch (err) {
      console.error(`❌ Lỗi khi tải ${layerKey}:`, err);
      toast.error(`❌ Không thể tải ${mapLayers[layerKey]?.name || layerKey}`, { autoClose: 5000 });
    } finally {
      setLayerLoading(layerKey, false);
    }
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
      loadDefaultMatRungData,
      refreshDefaultData,
      loadSingleLayer,        // ✅ Export cho các nút tải riêng lẻ
      loadAllDefaultLayers    // ✅ Export cho refresh toàn bộ
    }}>
      {children}
    </GeoDataContext.Provider>
  );
};