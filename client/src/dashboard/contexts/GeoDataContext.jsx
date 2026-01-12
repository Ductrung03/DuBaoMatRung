// client/src/dashboard/contexts/GeoDataContext.jsx - AUTO LOAD ALL LAYERS
import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../../services/api"; // ✅ FIX: Use authenticated api instead of raw axios
import config from "../../config";
import { toast } from "react-toastify";

const GeoDataContext = createContext();

export const useGeoData = () => useContext(GeoDataContext);

// ✅ MAPSERVER CONSTANTS - Sơn La 3 layers via WMS
export const MAPSERVER_LAYERS = {
  RANH_GIOI_XA: 'ranhgioixa',         // Ranh giới xã (75 xã)
  TIEU_KU_KHOANH: 'tieukukhoanh',     // Tiểu khu khoảnh lô (30k khoảnh)
  HIEN_TRANG_RUNG: 'hientrangrung'    // Hiện trạng rừng (280k khoảnh - PRIMARY)
};

// ✅ MapServer WMS qua API Gateway
export const WMS_BASE_URL = '/api/mapserver';

export const GeoDataProvider = ({ children }) => {
  const [geoData, setGeoData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Enhanced map layers config - SƠN LA 3 LAYERS
  const [mapLayers, setMapLayers] = useState({
    // ✅ SƠN LA 3 WMS LAYERS - Render qua MapServer

    // 1. Ranh Giới Xã (75 xã)
    ranhgioixa: {
      data: null,
      visible: true,
      loading: false,
      name: "Ranh Giới Xã",
      endpoint: "ranhgioixa",
      layerType: "wms",
      wmsLayer: MAPSERVER_LAYERS.RANH_GIOI_XA
    },

    // 2. Tiểu Khu Khoảnh Lô (30k khoảnh)
    tieukukhoanh: {
      data: null,
      visible: true,
      loading: false,
      name: "Tiểu Khu Khoảnh Lô",
      endpoint: "tieukukhoanh",
      layerType: "wms",
      wmsLayer: MAPSERVER_LAYERS.TIEU_KU_KHOANH
    },

    // 3. Hiện Trạng Rừng (280k khoảnh - PRIMARY LAYER)
    hientrangrung: {
      data: null,
      visible: true,
      loading: false,
      name: "Hiện Trạng Rừng",
      endpoint: "hientrangrung",
      layerType: "wms",
      wmsLayer: MAPSERVER_LAYERS.HIEN_TRANG_RUNG
    },

    // ✅ GEOJSON LAYERS - Load data từ API (optional)
    deforestationAlerts: {
      data: null,
      visible: true, // ✅ ENABLE: Hiển thị mặc định để có dữ liệu cho table
      loading: false,
      name: "Dự báo mất rừng mới nhất",
      endpoint: "deforestation-alerts",
      layerType: "geojson",
      useViewport: true
    }
  });

  // ✅ HÀM CẬP NHẬT: Auto load chỉ GeoJSON layers (WMS layers tự động hiển thị)
  const loadAllDefaultLayers = async () => {
    try {

      // Chỉ load các GeoJSON layers - WMS layers không cần load data
      const geojsonLayers = Object.entries(mapLayers)
        .filter(([key, layer]) => layer.layerType === 'geojson')
        .map(([key, layer]) => ({ key, name: layer.name }));

      // ✅ TRACK: Kiểm tra xem deforestationAlerts có load thành công không
      let deforestationAlertsLoaded = false;

      // Load từng GeoJSON layer
      for (const layer of geojsonLayers) {
        try {
          setLayerLoading(layer.key, true);

          // Use relative path to work with Vite proxy
          let endpoint = `/api/layer-data/${mapLayers[layer.key].endpoint}`;

          // ✅ SPECIAL: Cho deforestationAlerts, thêm param để chỉ lấy 3 tháng
          if (layer.key === 'deforestationAlerts') {
            endpoint += '?days=90'; // 3 tháng = 90 ngày
          }

          const response = await api.get(endpoint, {
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'max-age=0'
            },
            timeout: 300000 // 5 phút timeout
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
              // ✅ CHỈ SET NẾU CÓ DỮ LIỆU
              if (layerData.features && layerData.features.length > 0) {
                setGeoData(layerData);
                deforestationAlertsLoaded = true;
                // Log đã tắt để tránh spam console
              } else {
                console.warn('⚠️ deforestationAlerts loaded but has no features');
              }
            }

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

      // ✅ FIX: LUÔN LOAD DỮ LIỆU MẶC ĐỊNH NẾU deforestationAlerts KHÔNG CÓ DỮ LIỆU
      // Đảm bảo table luôn có dữ liệu để hiển thị
      if (!deforestationAlertsLoaded) {
        // Log đã tắt để tránh spam console
        await loadDefaultMatRungData();
      } else {
        // Log đã tắt để tránh spam console
      }


    } catch (error) {
      console.error("❌ Error in auto load all layers:", error);
    }
  };

  // ✅ HÀM CẬP NHẬT: Load dữ liệu mặc định từ bảng mat_rung - CHỈ 3 THÁNG
  const loadDefaultMatRungData = async () => {
    try {
      setLoading(true);

      // ✅ Gọi API /api/mat-rung - mặc định trả về 12 tháng, limit 1000
      const response = await api.get(`/mat-rung`, {
        params: {
          limit: 1000
        }
      });

      // ✅ API trả về: { success: true, data: { type: "FeatureCollection", features: [...] } }
      if (response.data && response.data.success && response.data.data) {
        const matRungData = response.data.data; // ✅ KEY LÀ 'data' KHÔNG PHẢI 'mat_rung'

        // Log đã tắt để tránh spam console

        // ✅ API đã tự động filter 12 tháng, không cần filter lại
        // Set vào geoData để hiển thị trong Map và Table
        setGeoData(matRungData);

      } else {
        console.warn('⚠️ No mat_rung data in response:', response.data);
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

    // Delay nhỏ để đảm bảo UI đã render
    const timer = setTimeout(() => {
      loadAllDefaultLayers();
    }, 1000);

    return () => clearTimeout(timer);
  }, []); // Chỉ chạy 1 lần khi mount

  // Enhanced layer data update với viewport metadata
  const updateLayerData = (layerName, data) => {

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
    setMapLayers(prev => ({
      ...prev,
      [layerName]: {
        ...prev[layerName],
        visible: !prev[layerName].visible
      }
    }));
  };

  const setLayerLoading = (layerName, loading) => {
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

        const response = await api.get(endpoint, {
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

      const response = await api.post(`/mat-rung/auto-forecast`, {
        year,
        month,
        period,
        fromDate,
        toDate
      }, {
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

      const response = await api.post(`/mat-rung/forecast-preview`, {
        year,
        month,
        period,
        fromDate,
        toDate
      }, {
        timeout: 180000 // 3 phút timeout cho preview
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
      setLoading(true);

      // Load lại dữ liệu mặc định (3 tháng gần nhất)
      await loadDefaultMatRungData();

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
      // ✅ FIX: Dùng dtich (tính từ geometry) thay vì area (có thể = 0)
      totalArea: features.reduce((sum, f) => sum + (f.properties.dtich || f.properties.area || 0), 0),
      totalAreaHa: Math.round((features.reduce((sum, f) => sum + (f.properties.dtich || f.properties.area || 0), 0) / 10000) * 100) / 100,
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
  );
};