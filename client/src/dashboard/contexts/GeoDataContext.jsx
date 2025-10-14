// client/src/dashboard/contexts/GeoDataContext.jsx - AUTO LOAD ALL LAYERS
import React, { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import config from "../../config";
import { toast } from "react-toastify";

const GeoDataContext = createContext();

export const useGeoData = () => useContext(GeoDataContext);

// ✅ MAPSERVER CONSTANTS - Static layers via WMS
export const MAPSERVER_LAYERS = {
  ADMINISTRATIVE: 'ranhgioihc',      // Ranh giới hành chính
  FOREST_TYPES: 'rg3lr',              // 3 Loại rừng (231K records!)
  TERRAIN: 'nendiahinh',              // Nền địa hình
  MANAGEMENT: 'chuquanly',            // Chủ quản lý rừng
  DISTRICT: 'huyen'                   // Ranh giới huyện
};

// ✅ MapServer WMS qua API Gateway
export const WMS_BASE_URL = '/api/mapserver';

export const GeoDataProvider = ({ children }) => {
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Enhanced map layers config - Phân biệt WMS và GeoJSON layers
  const [mapLayers, setMapLayers] = useState({
    // ✅ WMS LAYERS - Render qua MapServer, không cần load GeoJSON data
    administrative: {
      data: null,
      visible: true,
      loading: false,
      name: "Ranh giới hành chính",
      endpoint: "administrative",
      layerType: "wms", // WMS layer
      wmsLayer: MAPSERVER_LAYERS.ADMINISTRATIVE
    },
    forestManagement: {
      data: null,
      visible: true,
      loading: false,
      name: "Chủ quản lý rừng",
      endpoint: "forest-management",
      layerType: "wms", // WMS layer
      wmsLayer: MAPSERVER_LAYERS.MANAGEMENT
    },
    terrain: {
      data: null,
      visible: false,
      loading: false,
      name: "Nền địa hình",
      endpoint: "terrain",
      layerType: "wms", // WMS layer
      wmsLayer: MAPSERVER_LAYERS.TERRAIN
    },
    terrainLine: {
      data: null,
      visible: true,
      loading: false,
      name: "Địa hình, thủy văn, giao thông",
      endpoint: "terrain-line",
      layerType: "wms", // WMS layer (line features)
      wmsLayer: "nendiahinh_line"
    },
    forestTypes: {
      data: null,
      visible: false,
      loading: false,
      name: "Các loại rừng (phân loại LDLR)",
      endpoint: "forest-types",
      layerType: "wms", // WMS layer - 231K records!
      wmsLayer: MAPSERVER_LAYERS.FOREST_TYPES
    },
    forestStatus: {
      data: null,
      visible: true,
      loading: false,
      name: "Hiện trạng rừng",
      endpoint: "forest-status",
      layerType: "wms", // WMS layer
      wmsLayer: "hientrangrung"
    },

    // ✅ GEOJSON LAYERS - Load data từ API
    deforestationAlerts: {
      data: null,
      visible: true,
      loading: false,
      name: "Dự báo mất rừng mới nhất",
      endpoint: "deforestation-alerts",
      layerType: "geojson", // GeoJSON layer - cần load data
      useViewport: true
    }
  });

  // ✅ HÀM CẬP NHẬT: Auto load chỉ GeoJSON layers (WMS layers tự động hiển thị)
  const loadAllDefaultLayers = async () => {
    try {
      console.log("🚀 Auto loading GeoJSON layers...");

      // Chỉ load các GeoJSON layers - WMS layers không cần load data
      const geojsonLayers = Object.entries(mapLayers)
        .filter(([key, layer]) => layer.layerType === 'geojson')
        .map(([key, layer]) => ({ key, name: layer.name }));

      console.log(`📊 Found ${geojsonLayers.length} GeoJSON layers to load`);

      // Load từng GeoJSON layer
      for (const layer of geojsonLayers) {
        try {
          console.log(`📥 Auto loading ${layer.name}...`);
          setLayerLoading(layer.key, true);

          // Use relative path to work with Vite proxy
          let endpoint = `/api/layer-data/${mapLayers[layer.key].endpoint}`;

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

          // ✅ API returns { success, data: { type, features } }
          if (response.data && response.data.data && response.data.data.features) {
            const layerData = {
              ...response.data.data, // Use nested data object
              layerType: layer.key,
              loadTime: 0,
              loadStrategy: 'auto_load_default',
              loadTimestamp: new Date().toISOString(),
              autoLoaded: true
            };

            updateLayerData(layer.key, layerData);

            // ✅ CẬP NHẬT: Nếu là deforestationAlerts, cũng cập nhật vào geoData để hiển thị trong table
            if (layer.key === 'deforestationAlerts') {
              console.log('📊 Auto-load: Updating geoData for table display');
              setGeoData(layerData);
            }

            console.log(`✅ Auto loaded ${layer.name}: ${response.data.data.features.length} features`);
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

      // ✅ WMS layers tự động visible - không cần load data
      console.log("🗺️ WMS layers (hành chính, địa hình, loại rừng) sẽ tự động hiển thị qua MapServer");

      // ✅ LOAD DỮ LIỆU MẶC ĐỊNH CHO BẢNG: Chỉ load mat_rung nếu KHÔNG có deforestationAlerts
      // (vì deforestationAlerts ưu tiên cao hơn và đã bao gồm dữ liệu cần thiết)
      const hasDeforestationAlerts = geojsonLayers.some(l => l.key === 'deforestationAlerts');
      if (!hasDeforestationAlerts) {
        console.log("📊 Loading default mat_rung data (no deforestationAlerts)");
        await loadDefaultMatRungData();
      } else {
        console.log("✅ Skipping mat_rung load - using deforestationAlerts data instead");
      }

      console.log("🎉 Auto load completed! WMS layers visible, GeoJSON layers loaded.");

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
      const response = await axios.get(`/api/mat-rung`, {
       
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

  // ✅ HÀM CẬP NHẬT: Load layer riêng lẻ - xử lý đúng WMS vs GeoJSON
  const loadSingleLayer = async (layerKey) => {
    try {
      const layer = mapLayers[layerKey];
      if (!layer) {
        console.error(`Layer ${layerKey} không tồn tại`);
        return;
      }

      // ✅ WMS LAYER → Chỉ toggle visibility, không load data
      if (layer.layerType === 'wms') {
        const newVisibility = !layer.visible;
        toggleLayerVisibility(layerKey);

        toast.success(
          `${newVisibility ? '👁️ Hiển thị' : '🙈 Ẩn'} ${layer.name} (WMS)`,
          { autoClose: 2000 }
        );

        console.log(`✅ WMS Layer ${layer.name} ${newVisibility ? 'shown' : 'hidden'}`);
        return;
      }

      // ✅ GEOJSON LAYER → Load data từ API
      if (layer.layerType === 'geojson') {
        setLayerLoading(layerKey, true);

        toast.info(`🔄 Đang tải ${layer.name}...`, { autoClose: 2000 });

        const startTime = Date.now();
        let endpoint = `/api/layer-data/${layer.endpoint}`;

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

        // ✅ API returns { success, data: { type, features } }
        if (response.data && response.data.data && response.data.data.features) {
          const layerData = {
            ...response.data.data, // Use nested data object
            layerType: layerKey,
            loadTime: parseFloat(loadTime),
            loadStrategy: 'manual_load',
            loadTimestamp: new Date().toISOString(),
            autoLoaded: false
          };

          updateLayerData(layerKey, layerData);

          // ✅ CẬP NHẬT: Nếu là deforestationAlerts, cũng cập nhật vào geoData để hiển thị trong table
          if (layerKey === 'deforestationAlerts') {
            console.log('📊 Updating geoData for table display');
            setGeoData(layerData);
          }

          toast.success(`✅ ${layer.name}: ${response.data.data.features.length.toLocaleString()} đối tượng (${loadTime}s)`, { autoClose: 4000 });

        } else {
          console.error('❌ Invalid API response structure:', response.data);
          toast.warning(`⚠️ Không có dữ liệu cho ${layer.name}`);
        }
      }
    } catch (err) {
      console.error(`❌ Lỗi khi tải ${layerKey}:`, err);
      toast.error(`❌ Không thể tải ${mapLayers[layerKey]?.name || layerKey}`, { autoClose: 5000 });
    } finally {
      setLayerLoading(layerKey, false);
    }
  };
// Thêm vào client/src/dashboard/contexts/GeoDataContext.jsx - AUTO FORECAST FUNCTIONS

// ✅ HÀM MỚI: Load dữ liệu dự báo tự động
const loadAutoForecastData = async (year, month, period) => {
  try {
    console.log(`🔮 Loading auto forecast data: ${period} tháng ${month}/${year}`);
    setLoading(true);

    // Tính toán khoảng thời gian (logic tương tự component)
    const calculateDateRange = (year, month, period) => {
      const yearInt = parseInt(year);
      const monthInt = parseInt(month);
      
      if (period === "Trước ngày 15") {
        let fromMonth = monthInt - 1;
        let fromYear = yearInt;
        
        if (fromMonth === 0) {
          fromMonth = 12;
          fromYear = yearInt - 1;
        }
        
        const fromDate = `${fromYear}-${fromMonth.toString().padStart(2, '0')}-15`;
        const toDate = `${yearInt}-${month.padStart(2, '0')}-15`;
        
        return { fromDate, toDate };
      } else {
        const fromDate = `${yearInt}-${month.padStart(2, '0')}-01`;
        const lastDay = new Date(yearInt, monthInt, 0).getDate();
        const toDate = `${yearInt}-${month.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
        
        return { fromDate, toDate };
      }
    };

    const { fromDate, toDate } = calculateDateRange(year, month, period);

    const response = await axios.post(`/api/mat-rung/auto-forecast`, {
      year,
      month,
      period,
      fromDate,
      toDate
    }, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      timeout: 60000 // 1 phút timeout
    });

    if (response.data.success && response.data.data) {
      const forecastData = {
        ...response.data.data,
        loadType: 'auto_forecast',
        loadTimestamp: new Date().toISOString(),
        forecastMetadata: response.data.metadata || {}
      };

      // Set dữ liệu vào context
      setGeoData(forecastData);
      
      console.log(`✅ Auto forecast loaded: ${forecastData.features?.length || 0} features`);
      
      return {
        success: true,
        data: forecastData,
        summary: response.data.summary || {}
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Không có dữ liệu trong khoảng thời gian này'
      };
    }

  } catch (error) {
    console.error(`❌ Error loading auto forecast:`, error);
    return {
      success: false,
      message: error.message || 'Lỗi khi tải dữ liệu dự báo tự động'
    };
  } finally {
    setLoading(false);
  }
};

// ✅ HÀM MỚI: Lấy preview thống kê trước khi load
const getAutoForecastPreview = async (year, month, period) => {
  try {
    const calculateDateRange = (year, month, period) => {
      const yearInt = parseInt(year);
      const monthInt = parseInt(month);
      
      if (period === "Trước ngày 15") {
        let fromMonth = monthInt - 1;
        let fromYear = yearInt;
        
        if (fromMonth === 0) {
          fromMonth = 12;
          fromYear = yearInt - 1;
        }
        
        const fromDate = `${fromYear}-${fromMonth.toString().padStart(2, '0')}-15`;
        const toDate = `${yearInt}-${month.padStart(2, '0')}-15`;
        
        return { fromDate, toDate };
      } else {
        const fromDate = `${yearInt}-${month.padStart(2, '0')}-01`;
        const lastDay = new Date(yearInt, monthInt, 0).getDate();
        const toDate = `${yearInt}-${month.padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
        
        return { fromDate, toDate };
      }
    };

    const { fromDate, toDate } = calculateDateRange(year, month, period);

    const response = await axios.post(`/api/mat-rung/forecast-preview`, {
      year,
      month,
      period,
      fromDate,
      toDate
    }, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      timeout: 30000 // 30 giây timeout cho preview
    });

    return response.data;

  } catch (error) {
    console.error(`❌ Error getting forecast preview:`, error);
    return {
      success: false,
      message: error.message || 'Lỗi khi lấy thông tin preview'
    };
  }
};

// ✅ HÀM MỚI: Clear dữ liệu và reset về mặc định
const resetToDefaultData = async () => {
  try {
    console.log("🔄 Resetting to default data...");
    setLoading(true);
    
    // Load lại dữ liệu mặc định (3 tháng gần nhất)
    await loadDefaultMatRungData();
    
    console.log("✅ Reset to default completed");
    return { success: true };
    
  } catch (error) {
    console.error("❌ Error resetting to default:", error);
    return { success: false, message: error.message };
  } finally {
    setLoading(false);
  }
};

// ✅ HÀM MỚI: Get current data info
const getCurrentDataInfo = () => {
  if (!geoData || !geoData.features) {
    return null;
  }

  const features = geoData.features;
  const metadata = geoData.metadata || geoData.forecastMetadata || {};
  
  return {
    type: geoData.loadType || 'unknown',
    totalFeatures: features.length,
    totalArea: features.reduce((sum, f) => sum + (f.properties.area || 0), 0),
    totalAreaHa: Math.round((features.reduce((sum, f) => sum + (f.properties.area || 0), 0) / 10000) * 100) / 100,
    loadTimestamp: geoData.loadTimestamp,
    isAutoForecast: geoData.loadType === 'auto_forecast',
    forecastInfo: metadata.forecast_info || null,
    dateRange: {
      earliest: features.length > 0 ? Math.min(...features.map(f => new Date(f.properties.end_sau).getTime())) : null,
      latest: features.length > 0 ? Math.max(...features.map(f => new Date(f.properties.end_sau).getTime())) : null
    }
  };
};

// ✅ EXPORT CÁC HÀM MỚI trong GeoDataContext.Provider value
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
    loadSingleLayer,
    loadAllDefaultLayers,
    
    // ✅ NEW AUTO FORECAST FUNCTIONS
    loadAutoForecastData,
    getAutoForecastPreview,  
    resetToDefaultData,
    getCurrentDataInfo
  }}>
    {children}
  </GeoDataContext.Provider>
);};