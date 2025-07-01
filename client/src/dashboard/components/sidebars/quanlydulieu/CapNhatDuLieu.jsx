// client/src/dashboard/components/sidebars/quanlydulieu/CapNhatDuLieu.jsx - NO TIMEOUT VERSION
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useGeoData } from "../../../contexts/GeoDataContext";
import config from "../../../../config";
import { toast } from "react-toastify";
import { ClipLoader } from 'react-spinners';
import OptimizedDataLoader from '../../OptimizedDataLoader';

const CapNhatDuLieu = () => {
  const [isForecastOpen, setIsForecastOpen] = useState(true);
  const { updateLayerData, setLayerLoading, mapLayers } = useGeoData();
  
  // Enhanced loading states with optimization
  const [currentLoadingLayer, setCurrentLoadingLayer] = useState(null);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [loadedLayers, setLoadedLayers] = useState(0);
  const [totalLayers, setTotalLayers] = useState(0);
  
  // Cache management states
  const [cacheStatus, setCacheStatus] = useState(null);
  const [showCacheInfo, setShowCacheInfo] = useState(false);
  const [serverCacheStatus, setServerCacheStatus] = useState(null);
  
  // Performance monitoring
  const [performanceStats, setPerformanceStats] = useState({
    totalLoadTime: 0,
    averageLoadTime: 0,
    fastestLoad: null,
    slowestLoad: null,
    totalFeatures: 0
  });

  // Load cache status on component mount
  useEffect(() => {
    loadCacheStatus();
    loadServerCacheStatus();
    updatePerformanceStats();
  }, [mapLayers]);

  // Check server cache status
  const loadServerCacheStatus = async () => {
    try {
      const response = await axios.get(`${config.API_URL}/api/layer-data/server-cache/status`);
      setServerCacheStatus(response.data);
      console.log("📊 Server cache status:", response.data);
    } catch (error) {
      console.error("Error loading server cache status:", error);
    }
  };

  // Update performance statistics
  const updatePerformanceStats = () => {
    const layersWithData = Object.values(mapLayers).filter(layer => layer.data);
    const layersWithTime = layersWithData.filter(layer => layer.data.loadTime);
    
    if (layersWithTime.length === 0) return;
    
    const totalTime = layersWithTime.reduce((sum, layer) => sum + layer.data.loadTime, 0);
    const avgTime = totalTime / layersWithTime.length;
    const fastest = layersWithTime.reduce((min, layer) => 
      !min || layer.data.loadTime < min.loadTime ? { name: layer.name, loadTime: layer.data.loadTime } : min, null);
    const slowest = layersWithTime.reduce((max, layer) => 
      !max || layer.data.loadTime > max.loadTime ? { name: layer.name, loadTime: layer.data.loadTime } : max, null);
    const totalFeatures = layersWithData.reduce((sum, layer) => sum + (layer.data.features?.length || 0), 0);
    
    setPerformanceStats({
      totalLoadTime: totalTime,
      averageLoadTime: avgTime,
      fastestLoad: fastest,
      slowestLoad: slowest,
      totalFeatures
    });
  };

  // Load cache status
  const loadCacheStatus = async () => {
    try {
      const response = await axios.get(`${config.API_URL}/api/layer-data/cache/status`);
      setCacheStatus(response.data);
    } catch (error) {
      console.error("Error loading cache status:", error);
    }
  };

  // Clear all caches
  const handleClearAllCache = async () => {
    try {
      const confirmClear = window.confirm("Bạn có chắc chắn muốn xóa TOÀN BỘ cache (bao gồm cả server cache)? Điều này sẽ làm chậm lần tải tiếp theo.");
      if (!confirmClear) return;
      
      // Clear memory cache
      await axios.post(`${config.API_URL}/api/layer-data/cache/clear`);
      
      // Clear server persistent cache
      await axios.post(`${config.API_URL}/api/layer-data/server-cache/clear`);
      
      toast.success("🗑️ Đã xóa toàn bộ cache (memory + server)!");
      loadCacheStatus();
      loadServerCacheStatus();
    } catch (error) {
      console.error("Error clearing cache:", error);
      toast.error("❌ Không thể xóa cache");
    }
  };

  // Force rebuild server cache
  const handleRebuildServerCache = async () => {
    try {
      const confirmRebuild = window.confirm("Rebuild server cache? Quá trình này có thể mất 5-10 phút cho dataset lớn.");
      if (!confirmRebuild) return;
      
      toast.info("🔄 Bắt đầu rebuild server cache...", { autoClose: false });
      
      await axios.post(`${config.API_URL}/api/layer-data/server-cache/rebuild`);
      
      toast.dismiss();
      toast.success("🎉 Rebuild server cache thành công!");
      loadServerCacheStatus();
    } catch (error) {
      console.error("Error rebuilding server cache:", error);
      toast.error("❌ Không thể rebuild cache");
    }
  };

  // Enhanced load layer function - NO TIMEOUT
  const handleLoadLayer = async (layerKey, layerName, retryCount = 0) => {
    const maxRetries = 3; // Tăng số lần retry
    
    try {
      const layer = mapLayers[layerKey];
      if (!layer) {
        console.error(`Layer ${layerKey} không tồn tại`);
        return;
      }

      setLayerLoading(layerKey, true);
      setCurrentLoadingLayer({ key: layerKey, name: layerName });
      setLoadingStage('connecting');
      
      console.log(`🔄 Đang tải dữ liệu (NO TIMEOUT) cho layer: ${layerName} (attempt ${retryCount + 1})`);
      
      const url = `${config.API_URL}/api/layer-data/${layer.endpoint}`;
      console.log(`📡 No-timeout request URL: ${url}`);
      
      // Check server cache first
      const serverCached = serverCacheStatus?.cached_layers?.includes(layerKey);
      const loadingMessage = serverCached ? 
        `🚀 Tải ${layerName} (từ server cache - instant)...` : 
        `🔄 Tải ${layerName} (streaming - có thể mất vài phút)...`;
      toast.info(loadingMessage, { autoClose: 3000 });
      
      setLoadingStage('loading');
      const startTime = Date.now();
      
      // ===== BỎ TIMEOUT HOÀN TOÀN =====
      const response = await axios.get(url, {
        // timeout: 0, // No timeout
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        // Add query params for optimization
        params: {
          useServerCache: 'true',
          optimize: 'true',
          ...(layerKey === 'forestTypes' ? { pageSize: 3000 } : {})
        },
        // Listen to progress if possible
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.lengthComputable) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`📥 Download progress: ${percentCompleted}%`);
          }
        }
      });
      
      const loadTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`📊 Response status: ${response.status} (${loadTime}s)`);
      
      if (response.data && response.data.features) {
        setLoadingStage('processing');
        
        const layerData = {
          ...response.data,
          layerType: layerKey,
          loadTime: parseFloat(loadTime),
          loadStrategy: response.data.metadata?.load_strategy || 'no_timeout',
          loadTimestamp: new Date().toISOString(),
          serverCached: serverCached,
          fromPersistentCache: response.data.metadata?.from_persistent_cache || false
        };
        
        console.log(`✅ No-timeout layer data structure:`, {
          type: layerData.type,
          featuresCount: layerData.features.length,
          loadStrategy: layerData.loadStrategy,
          loadTime: `${loadTime}s`,
          serverCached: layerData.serverCached,
          fromPersistentCache: layerData.fromPersistentCache,
          metadata: layerData.metadata
        });
        
        setLoadingStage('rendering');
        updateLayerData(layerKey, layerData);
        
        // Success message with cache info
        let successMessage = `✅ Đã tải thành công ${layerName}!\n📊 ${response.data.features.length.toLocaleString()} đối tượng trong ${loadTime}s`;
        
        // Add cache info
        if (layerData.fromPersistentCache) {
          successMessage += ` 💾 (từ server cache - instant!)`;
        } else if (layerData.serverCached) {
          successMessage += ` 🚀 (từ cache)`;
        } else {
          successMessage += ` 🔄 (streaming mới)`;
        }
        
        // Add specific info based on metadata
        if (response.data.metadata) {
          const meta = response.data.metadata;
          if (meta.load_strategy) {
            successMessage += `\n🚀 Chiến lược: ${meta.load_strategy}`;
          }
          if (meta.build_time) {
            successMessage += `\n⚡ Build time: ${meta.build_time}s`;
          }
          if (meta.cache_saved) {
            successMessage += `\n💾 Đã lưu cache cho lần sau`;
          }
        }
        
        // Layer-specific success messages
        if (layerKey === 'forestTypes') {
          if (response.data.forestTypes) {
            successMessage += `\n🌲 ${response.data.forestTypes.length} loại rừng khác nhau`;
          }
          if (response.data.forestCategories) {
            successMessage += `\n📂 ${response.data.forestCategories.length} nhóm LDLR`;
          }
          if (!layerData.fromPersistentCache) {
            successMessage += `\n🎉 Lần sau sẽ load instant từ server cache!`;
          }
        }
        
        toast.success(successMessage);
        console.log(`✅ Đã tải no-timeout ${response.data.features.length} features cho ${layerName} trong ${loadTime}s`);
        
        // Update cache status
        loadCacheStatus();
        loadServerCacheStatus();
        updatePerformanceStats();
        
        // Auto-zoom notification
        toast.info(`🗺️ Đang zoom đến vùng hiển thị ${layerName}...`, { autoClose: 1500 });
      } else {
        console.warn(`⚠️ Không có dữ liệu features trong response cho ${layerName}`);
        toast.warning(`⚠️ Không có dữ liệu cho ${layerName}`);
      }
    } catch (err) {
      console.error(`❌ Lỗi khi tải ${layerName}:`, err);
      
      // Retry logic for network errors (không retry cho timeout vì đã bỏ timeout)
      if (retryCount < maxRetries && (
        err.code === 'ECONNRESET' || 
        err.code === 'ENOTFOUND' || 
        err.response?.status >= 500
      )) {
        console.log(`🔄 Retrying load for ${layerName} (attempt ${retryCount + 2}/${maxRetries + 1})`);
        toast.warning(`⚠️ Lỗi kết nối, đang thử lại... (${retryCount + 2}/${maxRetries + 1})`, { autoClose: 3000 });
        
        // Exponential backoff
        const delay = Math.min(3000 * Math.pow(2, retryCount), 15000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return handleLoadLayer(layerKey, layerName, retryCount + 1);
      }
      
      // Error handling with detailed messages
      let errorMessage = `❌ Không thể tải ${layerName}`;
      if (err.response?.status === 404) {
        errorMessage += ": Không tìm thấy dữ liệu";
      } else if (err.response?.status === 500) {
        errorMessage += ": Lỗi server - dataset có thể quá lớn";
      } else if (err.code === 'ECONNRESET') {
        errorMessage += ": Kết nối bị ngắt - thử lại";
      } else if (err.code === 'ENOTFOUND') {
        errorMessage += ": Không thể kết nối đến server";
      } else {
        errorMessage += `: ${err.response?.data?.error || err.message}`;
      }
      
      if (layerKey === 'forestTypes') {
        errorMessage += "\n💡 Dataset 227K records - vui lòng kiên nhẫn hoặc dùng server cache";
      }
      
      toast.error(errorMessage, { autoClose: 8000 });
      setLayerLoading(layerKey, false);
    } finally {
      setCurrentLoadingLayer(null);
      setLoadingStage('');
    }
  };

  // Enhanced load all layers function
  const handleLoadAllLayers = async () => {
    const layersToLoad = [
      { key: 'administrative', name: 'Ranh giới hành chính', priority: 1 },
      { key: 'forestManagement', name: 'Chủ quản lý rừng', priority: 2 },
      { key: 'terrain', name: 'Nền địa hình', priority: 3 },
      { key: 'deforestationAlerts', name: 'Dự báo mất rừng mới nhất', priority: 4 },
      { key: 'forestTypes', name: 'Các loại rừng (LDLR)', priority: 5 } // Load cuối cùng vì lớn nhất
    ];

    setGlobalLoading(true);
    setTotalLayers(layersToLoad.length);
    setLoadedLayers(0);
    setLoadingStage('preparing');

    const startTime = Date.now();

    try {
      toast.info(`🚀 Bắt đầu tải NO TIMEOUT ${layersToLoad.length} lớp dữ liệu theo thứ tự ưu tiên...`);

      // Load layers sequentially to avoid overwhelming the database
      for (let i = 0; i < layersToLoad.length; i++) {
        const layer = layersToLoad[i];
        setLoadingStage(`loading_${layer.key}`);
        
        console.log(`📥 Loading layer ${i + 1}/${layersToLoad.length}: ${layer.name} (priority ${layer.priority})`);
        
        // Show progress notification
        toast.info(`📥 Đang tải lớp ${i + 1}/${layersToLoad.length}: ${layer.name}`, { autoClose: 2000 });
        
        await handleLoadLayer(layer.key, layer.name);
        
        setLoadedLayers(i + 1);
        
        // Adaptive pause between layers
        if (i < layersToLoad.length - 1) {
          const pauseTime = layer.key === 'forestTypes' ? 5000 : 2000; // Longer pause after large dataset
          await new Promise(resolve => setTimeout(resolve, pauseTime));
        }
      }

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
      setLoadingStage('complete');
      
      const successMessage = `🎉 Đã tải thành công ${layersToLoad.length} lớp dữ liệu (NO TIMEOUT)!\n⏱️ Tổng thời gian: ${totalTime}s`;
      toast.success(successMessage);
      
      // Update cache status
      loadCacheStatus();
      loadServerCacheStatus();
      updatePerformanceStats();
      
    } catch (error) {
      console.error('Lỗi khi tải tất cả layers:', error);
      toast.error('❌ Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setTimeout(() => {
        setGlobalLoading(false);
        setLoadingStage('');
        setLoadedLayers(0);
        setTotalLayers(0);
      }, 2000);
    }
  };

  // Quick load for cached layers
  const handleQuickLoadCached = async () => {
    if (!serverCacheStatus?.cached_layers?.length) {
      toast.info("Không có server cache để tải nhanh. Hãy tải dữ liệu lần đầu.");
      return;
    }

    const cachedLayers = serverCacheStatus.cached_layers
      .map(layerKey => ({
        key: layerKey,
        name: mapLayers[layerKey]?.name || layerKey
      }))
      .filter(layer => mapLayers[layer.key]);

    if (cachedLayers.length === 0) {
      toast.warning("Không có cache layer hợp lệ để tải nhanh.");
      return;
    }

    toast.success(`🚀 Tải nhanh ${cachedLayers.length} lớp từ server cache...`);
    
    for (const layer of cachedLayers) {
      await handleLoadLayer(layer.key, layer.name);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Short pause
    }
  };

  // Format file size
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Get layer loading recommendation
  const getLayerRecommendation = (layerKey) => {
    const isServerCached = serverCacheStatus?.cached_layers?.includes(layerKey);
    
    const recommendations = {
      forestTypes: {
        warning: isServerCached ? "✅ Server cached - instant load" : "⚠️ Dataset rất lớn (227K records)",
        tip: isServerCached ? "Load từ server cache trong vài giây" : "Lần đầu có thể mất 5-10 phút, sau đó instant",
        tech: isServerCached ? "Server persistent cache" : "Streaming pagination + auto cache"
      },
      terrain: {
        tip: isServerCached ? "Load instant từ cache" : "Polygon + line data",
        tech: isServerCached ? "Server cached" : "Parallel loading"
      },
      forestManagement: {
        tip: isServerCached ? "Load instant từ cache" : "Dữ liệu chủ quản lý rừng",
        tech: isServerCached ? "Server cached" : "Memory + server cache"
      },
      administrative: {
        tip: isServerCached ? "Load instant từ cache" : "Ranh giới hành chính các cấp",
        tech: isServerCached ? "Server cached" : "Boundary classification"
      },
      deforestationAlerts: {
        tip: isServerCached ? "Load instant từ cache" : "Dự báo mất rừng theo mức cảnh báo",
        tech: isServerCached ? "Server cached" : "Time-based filtering"
      }
    };
    
    return recommendations[layerKey] || { 
      tip: isServerCached ? "Load instant từ cache" : "Layer dữ liệu", 
      tech: isServerCached ? "Server cached" : "Standard loading"
    };
  };

  return (
    <>
      {/* Optimized Loading Component */}
      {currentLoadingLayer && (
        <OptimizedDataLoader
          isLoading={true}
          layerKey={currentLoadingLayer.key}
          layerName={currentLoadingLayer.name}
          onDataLoaded={() => setCurrentLoadingLayer(null)}
          onError={() => setCurrentLoadingLayer(null)}
        />
      )}

      {/* Global Loading for multiple layers */}
      {globalLoading && !currentLoadingLayer && (
        <div 
          className="loading-modal fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          style={{ zIndex: 50001 }}
        >
          <div 
            className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center"
            style={{ zIndex: 50002 }}
          >
            <ClipLoader color="#027e02" size={50} />
            <h3 className="text-lg font-bold mt-3 mb-2">Đang tải hàng loạt (NO TIMEOUT)</h3>
            <p className="text-gray-600 mb-3">
              Lớp {loadedLayers + 1}/{totalLayers}: {loadingStage.replace('loading_', '').toUpperCase()}
            </p>
            {totalLayers > 0 && (
              <div className="mb-3">
                <div className="bg-gray-200 rounded-full h-3 mb-2">
                  <div 
                    className="bg-green-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(loadedLayers / totalLayers) * 100}%` }}
                  ></div>
                </div>
                <div className="text-sm text-gray-600">
                  {loadedLayers}/{totalLayers} hoàn thành ({Math.round((loadedLayers / totalLayers) * 100)}%)
                </div>
              </div>
            )}
            <p className="text-xs text-gray-500">
              💡 Không có timeout - sẽ chờ đến khi hoàn thành
            </p>
          </div>
        </div>
      )}

      <div>
        <div
          className="bg-forest-green-primary text-white py-0.2 px-4 rounded-full text-sm font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer hover:bg-green-800 transition-colors"
          onClick={() => setIsForecastOpen(!isForecastOpen)}
        >
          <div className="flex items-center justify-between">
            <span>Cập nhật dữ liệu (NO TIMEOUT)</span>
            <span className="text-xs">
              {isForecastOpen ? '▼' : '▶'}
            </span>
          </div>
        </div>

        {isForecastOpen && (
          <div className="flex flex-col gap-2 px-1 pt-3">
            
            {/* Server Cache Status */}
            {serverCacheStatus && (
              <div className="mb-3 p-3 bg-green-50 rounded-md border border-green-200">
                <h4 className="text-sm font-medium text-green-800 mb-2">💾 Server Cache Status</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-medium">Cached layers:</span>
                    <br />
                    <span className="text-green-600">{serverCacheStatus.cached_layers?.length || 0}</span>
                  </div>
                  <div>
                    <span className="font-medium">Cache size:</span>
                    <br />
                    <span className="text-blue-600">{formatBytes(serverCacheStatus.total_cache_size || 0)}</span>
                  </div>
                </div>
                {serverCacheStatus.cached_layers?.length > 0 && (
                  <div className="mt-2 text-xs">
                    <strong>Cached:</strong> {serverCacheStatus.cached_layers.join(', ')}
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleQuickLoadCached}
                    disabled={!serverCacheStatus.cached_layers?.length}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-2 rounded text-xs disabled:opacity-50 transition-colors"
                  >
                    ⚡ Load từ cache
                  </button>
                  <button
                    onClick={handleRebuildServerCache}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-2 rounded text-xs transition-colors"
                  >
                    🔄 Rebuild cache
                  </button>
                </div>
              </div>
            )}

            {/* Performance Dashboard */}
            {performanceStats.totalFeatures > 0 && (
              <div className="mb-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                <h4 className="text-sm font-medium text-blue-800 mb-2">📊 Performance Dashboard</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-medium">Tổng features:</span>
                    <br />
                    <span className="text-green-600">{performanceStats.totalFeatures.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="font-medium">Tốc độ TB:</span>
                    <br />
                    <span className="text-blue-600">{performanceStats.averageLoadTime.toFixed(1)}s</span>
                  </div>
                </div>
              </div>
            )}

           

            {/* Bulk actions */}
            <div className="mb-4 p-3 bg-green-50 rounded-md border border-green-200">
              <button 
                onClick={handleLoadAllLayers}
                disabled={globalLoading || currentLoadingLayer || Object.values(mapLayers).some(layer => layer.loading)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md text-center flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-2"
              >
                {globalLoading ? (
                  <>
                    <ClipLoader color="#ffffff" size={16} />
                    <span className="ml-2">Đang tải (NO TIMEOUT)...</span>
                  </>
                ) : (
                  <>
                    🚀 Tải TẤT CẢ (NO TIMEOUT) - 5 lớp
                  </>
                )}
              </button>
              
              <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                <div className="text-green-700">✅ No timeout</div>
                <div className="text-green-700">✅ Server persistent cache</div>
                <div className="text-green-700">✅ Auto retry logic</div>
                <div className="text-green-700">✅ Instant reload sau lần đầu</div>
              </div>
              
           
            </div>

            <div className="border-t border-gray-200 pt-3">
              <h4 className="text-sm font-medium mb-3 text-gray-700">Hoặc tải từng lớp riêng biệt:</h4>
            </div>

            {/* Individual layer buttons with cache status */}
            <div className="flex flex-col gap-3">
              {Object.entries(mapLayers).map(([layerKey, layer]) => {
                const recommendation = getLayerRecommendation(layerKey);
                const isLargeDataset = layerKey === 'forestTypes';
                const isServerCached = serverCacheStatus?.cached_layers?.includes(layerKey);

                return (
                  <div key={layerKey} className="flex items-center gap-1">
                    <label className="text-sm font-medium w-full">
                      <div className="flex items-center gap-2">
                        <span>
                          {layerKey === 'administrative' && '🏛️'}
                          {layerKey === 'forestTypes' && '🌲'}
                          {layerKey === 'forestManagement' && '🏢'}
                          {layerKey === 'terrain' && '🏔️'}
                          {layerKey === 'deforestationAlerts' && '⚠️'}
                        </span>
                        <span>{layer.name}</span>
                        {isLargeDataset && !isServerCached && <span className="text-red-600 font-bold text-xs">⚠️ LARGE</span>}
                        {isServerCached && <span className="text-green-600 text-xs">💾 CACHED</span>}
                      </div>
                      
                      <div className="text-xs text-gray-500 mt-1">
                        {layer.data ? (
                          <div className="space-y-1">
                            <div>✅ Đã tải ({layer.data.features?.length?.toLocaleString() || 0} đối tượng)</div>
                            {layer.data.loadTime && (
                              <div>⏱️ {layer.data.loadTime}s</div>
                            )}
                            {layer.data.fromPersistentCache && (
                              <div className="text-green-600">💾 Từ server cache</div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {recommendation.warning && (
                              <div className={isServerCached ? "text-green-600" : "text-red-600"}>{recommendation.warning}</div>
                            )}
                            <div>{recommendation.tip}</div>
                            <div className="text-blue-600">{recommendation.tech}</div>
                          </div>
                        )}
                      </div>
                    </label>
                    
                    <button 
                      onClick={() => handleLoadLayer(layerKey, layer.name)}
                      disabled={layer.loading || globalLoading || currentLoadingLayer}
                      className={`w-20 whitespace-nowrap font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                        isServerCached
                          ? 'bg-green-100 hover:bg-green-200 text-green-800'
                          : isLargeDataset 
                          ? 'bg-orange-100 hover:bg-orange-200 text-orange-800' 
                          : layerKey === 'deforestationAlerts'
                          ? 'bg-red-100 hover:bg-red-200 text-red-800'
                          : 'bg-forest-green-gray hover:bg-green-200 text-black-800'
                      }`}
                    >
                      {layer.loading ? (
                        <>
                          <ClipLoader 
                            color={isServerCached ? "#166534" : isLargeDataset ? "#ea580c" : layerKey === 'deforestationAlerts' ? "#dc2626" : "#333"} 
                            size={14} 
                          />
                          <span className="ml-1 text-xs">
                            {isServerCached ? 'Cache...' : isLargeDataset ? 'Stream...' : 'Tải...'}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs">
                          {layer.data ? "Tải lại" : isServerCached ? "⚡ Instant" : "🔄 Tải"}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Enhanced Performance Status */}
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium mb-2">📊 Trạng thái performance (NO TIMEOUT):</h4>
              <div className="grid grid-cols-1 gap-2 text-xs">
                {Object.entries(mapLayers).map(([key, layer]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div 
                      className={`w-3 h-3 rounded-full ${
                        layer.loading ? 'bg-yellow-500 animate-pulse' : 
                        layer.data ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    ></div>
                    <span className={`${layer.visible ? 'font-medium' : 'opacity-60'} flex-1`}>
                      {layer.name}
                    </span>
                    <div className="text-right">
                      {layer.data && (
                        <>
                          <div className="text-gray-500">
                            {layer.data.features?.length?.toLocaleString() || 0} obj
                          </div>
                          {layer.data.loadTime && (
                            <div className={`text-xs ${
                              layer.data.fromPersistentCache ? 'text-green-600' :
                              layer.data.loadTime < 5 ? 'text-green-600' : 
                              layer.data.loadTime < 15 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {layer.data.fromPersistentCache ? '💾 cache' : `${layer.data.loadTime}s`}
                            </div>
                          )}
                        </>
                      )}
                      {layer.loading && (
                        <span className="text-yellow-600 text-xs animate-pulse">No timeout...</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Thống kê tổng hợp */}
              <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <strong>Đã tải:</strong> {Object.values(mapLayers).filter(layer => layer.data).length} lớp
                  </div>
                  <div>
                    <strong>Server cached:</strong> {serverCacheStatus?.cached_layers?.length || 0} lớp
                  </div>
                  <div>
                    <strong>Tổng đối tượng:</strong> {Object.values(mapLayers).reduce((total, layer) => total + (layer.data?.features?.length || 0), 0).toLocaleString()}
                  </div>
                  <div>
                    <strong>Cache size:</strong> {formatBytes(serverCacheStatus?.total_cache_size || 0)}
                  </div>
                </div>
              </div>

              {/* Performance tips */}
              <div className="mt-3 p-2 bg-green-50 rounded text-xs">
                <p className="text-green-800 font-medium mb-1">
                  ⚡ NO TIMEOUT Optimizations:
                </p>
                <div className="space-y-1 text-green-700">
                  <div>🚫 Đã bỏ timeout - không giới hạn thời gian</div>
                  <div>💾 Server persistent cache - instant load sau lần đầu</div>
                  <div>🔄 Auto retry với exponential backoff</div>
                  <div>📊 Progress tracking cho dataset lớn</div>
                  <div>⚡ Cache-first loading strategy</div>
                  <div>🎯 Smart layer prioritization</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CapNhatDuLieu;