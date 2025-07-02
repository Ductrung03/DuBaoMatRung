// client/src/dashboard/components/sidebars/quanlydulieu/CapNhatDuLieu.jsx - SIMPLIFIED
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useGeoData } from "../../../contexts/GeoDataContext";
import config from "../../../../config";
import { toast } from "react-toastify";
import { ClipLoader } from 'react-spinners';
import RealTimeDataLoader from '../../RealTimeDataLoader';

const CapNhatDuLieu = () => {
  const [isOpen, setIsOpen] = useState(true);
  const { updateLayerData, setLayerLoading, mapLayers } = useGeoData();
  
  // Loading states
  const [currentLoadingLayer, setCurrentLoadingLayer] = useState(null);
  const [globalLoading, setGlobalLoading] = useState(false);
  
  // Server cache status
  const [serverCacheStatus, setServerCacheStatus] = useState(null);

  // Load server cache status on mount
  useEffect(() => {
    loadServerCacheStatus();
  }, []);

  const loadServerCacheStatus = async () => {
    try {
      const response = await axios.get(`${config.API_URL}/api/layer-data/server-cache/status`);
      setServerCacheStatus(response.data);
    } catch (error) {
      console.error("Error loading server cache status:", error);
    }
  };

  // Enhanced load layer function with real-time progress
  const handleLoadLayer = async (layerKey, layerName) => {
    try {
      const layer = mapLayers[layerKey];
      if (!layer) {
        console.error(`Layer ${layerKey} không tồn tại`);
        return;
      }

      setLayerLoading(layerKey, true);
      setCurrentLoadingLayer({ key: layerKey, name: layerName });
      
      const isServerCached = serverCacheStatus?.cached_layers?.includes(layerKey);
      const loadingMessage = isServerCached ? 
        `🚀 Tải instant từ server cache: ${layerName}...` : 
        `🔄 Tải lần đầu (sẽ cache cho lần sau): ${layerName}...`;
      
      toast.info(loadingMessage, { autoClose: 3000 });
      
      const startTime = Date.now();
      const url = `${config.API_URL}/api/layer-data/${layer.endpoint}`;
      
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        },
        params: {
          useServerCache: 'true',
          optimize: 'true'
        }
      });
      
      const loadTime = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (response.data && response.data.features) {
        const layerData = {
          ...response.data,
          layerType: layerKey,
          loadTime: parseFloat(loadTime),
          loadStrategy: response.data.metadata?.load_strategy || 'server_cache',
          loadTimestamp: new Date().toISOString(),
          serverCached: isServerCached,
          fromPersistentCache: response.data.metadata?.from_persistent_cache || false
        };
        
        updateLayerData(layerKey, layerData);
        
        // Success message
        let successMessage = `✅ ${layerName}: ${response.data.features.length.toLocaleString()} đối tượng (${loadTime}s)`;
        
        if (layerData.fromPersistentCache) {
          successMessage += ` 💾 Instant từ cache!`;
        } else {
          successMessage += ` 🎉 Đã lưu cache cho lần sau!`;
        }
        
        toast.success(successMessage);
        
        // Update cache status
        loadServerCacheStatus();
      } else {
        toast.warning(`⚠️ Không có dữ liệu cho ${layerName}`);
      }
    } catch (err) {
      console.error(`❌ Lỗi khi tải ${layerName}:`, err);
      let errorMessage = `❌ Không thể tải ${layerName}`;
      
      if (err.response?.status === 404) {
        errorMessage += ": Không tìm thấy dữ liệu";
      } else if (err.response?.status === 500) {
        errorMessage += ": Lỗi server";
      } else {
        errorMessage += `: ${err.response?.data?.error || err.message}`;
      }
      
      toast.error(errorMessage, { autoClose: 8000 });
    } finally {
      setLayerLoading(layerKey, false);
      setCurrentLoadingLayer(null);
    }
  };

  // Load all layers
  const handleLoadAllLayers = async () => {
    const layersToLoad = [
      { key: 'administrative', name: 'Ranh giới hành chính' },
      { key: 'forestManagement', name: 'Chủ quản lý rừng' },
      { key: 'terrain', name: 'Nền địa hình' },
      { key: 'deforestationAlerts', name: 'Dự báo mất rừng' },
      { key: 'forestTypes', name: 'Các loại rừng (LDLR)' }
    ];

    setGlobalLoading(true);

    try {
      toast.info(`🚀 Bắt đầu tải ${layersToLoad.length} lớp dữ liệu...`);

      for (let i = 0; i < layersToLoad.length; i++) {
        const layer = layersToLoad[i];
        
        toast.info(`📥 Đang tải lớp ${i + 1}/${layersToLoad.length}: ${layer.name}`, { autoClose: 2000 });
        
        await handleLoadLayer(layer.key, layer.name);
        
        // Pause between layers
        if (i < layersToLoad.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }

      toast.success(`🎉 Đã tải thành công ${layersToLoad.length} lớp dữ liệu!`);
      loadServerCacheStatus();
      
    } catch (error) {
      console.error('Lỗi khi tải tất cả layers:', error);
      toast.error('❌ Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setGlobalLoading(false);
    }
  };

  // Quick load cached layers
  const handleQuickLoadCached = async () => {
    if (!serverCacheStatus?.cached_layers?.length) {
      toast.info("Không có server cache để tải nhanh.");
      return;
    }

    const cachedLayers = serverCacheStatus.cached_layers
      .map(layerKey => ({
        key: layerKey,
        name: mapLayers[layerKey]?.name || layerKey
      }))
      .filter(layer => mapLayers[layer.key]);

    toast.success(`🚀 Tải instant ${cachedLayers.length} lớp từ server cache...`);
    
    for (const layer of cachedLayers) {
      await handleLoadLayer(layer.key, layer.name);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  // Clear server cache
  const handleClearServerCache = async () => {
    if (!window.confirm("Xóa TOÀN BỘ server cache? Lần tải tiếp theo sẽ chậm hơn.")) return;
    
    try {
      await axios.post(`${config.API_URL}/api/layer-data/server-cache/clear`);
      toast.success("🗑️ Đã xóa server cache!");
      loadServerCacheStatus();
    } catch (error) {
      toast.error("❌ Không thể xóa cache");
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

  // Get status indicator
  const getStatusIndicator = (layerKey) => {
    const layer = mapLayers[layerKey];
    const isServerCached = serverCacheStatus?.cached_layers?.includes(layerKey);
    
    if (layer.loading) return <span className="text-yellow-600">⏳ Đang tải...</span>;
    if (layer.data) return <span className="text-green-600">✅ Đã tải</span>;
    if (isServerCached) return <span className="text-blue-600">💾 Có cache</span>;
    return <span className="text-gray-500">➖ Chưa tải</span>;
  };

  return (
    <>
      {/* Real-time loading component */}
      {currentLoadingLayer && (
        <RealTimeDataLoader
          isLoading={true}
          layerKey={currentLoadingLayer.key}
          layerName={currentLoadingLayer.name}
          onComplete={() => setCurrentLoadingLayer(null)}
        />
      )}

      {/* Global loading for batch operations */}
      {globalLoading && !currentLoadingLayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 50001 }}>
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
            <ClipLoader color="#027e02" size={50} />
            <h3 className="text-lg font-bold mt-3 mb-2">Đang tải hàng loạt</h3>
            <p className="text-gray-600">Vui lòng đợi...</p>
          </div>
        </div>
      )}

      <div>
        <div
          className="bg-forest-green-primary text-white py-2 px-4 rounded-full text-sm font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer hover:bg-green-800 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center justify-between">
            <span>📊 Cập nhật dữ liệu</span>
            <span className="text-xs">{isOpen ? '▼' : '▶'}</span>
          </div>
        </div>

        {isOpen && (
          <div className="flex flex-col gap-3 px-1 pt-3">
            
            {/* Server Cache Status */}
            {serverCacheStatus && (
              <div className="mb-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                <h4 className="text-sm font-medium text-blue-800 mb-2">💾 Server Cache</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="font-medium">Cached:</span>
                    <br />
                    <span className="text-blue-600">{serverCacheStatus.cached_layers?.length || 0} lớp</span>
                  </div>
                  <div>
                    <span className="font-medium">Dung lượng:</span>
                    <br />
                    <span className="text-green-600">{formatBytes(serverCacheStatus.total_cache_size || 0)}</span>
                  </div>
                </div>
                
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleQuickLoadCached}
                    disabled={!serverCacheStatus.cached_layers?.length}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-2 rounded text-xs disabled:opacity-50 transition-colors"
                  >
                    ⚡ Tải instant
                  </button>
                  <button
                    onClick={handleClearServerCache}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-2 rounded text-xs transition-colors"
                  >
                    🗑️ Xóa cache
                  </button>
                </div>
              </div>
            )}

            {/* Bulk Actions */}
            <div className="mb-4 p-3 bg-green-50 rounded-md border border-green-200">
              <button 
                onClick={handleLoadAllLayers}
                disabled={globalLoading || currentLoadingLayer}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md text-center flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {globalLoading ? (
                  <>
                    <ClipLoader color="#ffffff" size={16} />
                    <span className="ml-2">Đang tải...</span>
                  </>
                ) : (
                  <>🚀 Tải TẤT CẢ - 5 lớp</>
                )}
              </button>
            </div>

            {/* Individual Layers - SIMPLIFIED */}
            <div className="border-t border-gray-200 pt-3">
              <h4 className="text-sm font-medium mb-3 text-gray-700">Hoặc tải từng lớp:</h4>
            </div>

            <div className="flex flex-col gap-2">
              {Object.entries(mapLayers).map(([layerKey, layer]) => (
                <div key={layerKey} className="flex items-center justify-between p-2 border rounded-md hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {layerKey === 'administrative' && '🏛️'} 
                      {layerKey === 'forestTypes' && '🌲'} 
                      {layerKey === 'forestManagement' && '🏢'} 
                      {layerKey === 'terrain' && '🏔️'} 
                      {layerKey === 'deforestationAlerts' && '⚠️'}
                      <span className="ml-2">{layer.name}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {getStatusIndicator(layerKey)}
                      {layer.data && (
                        <span className="ml-2">
                          ({layer.data.features?.length?.toLocaleString() || 0} đối tượng)
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleLoadLayer(layerKey, layer.name)}
                    disabled={layer.loading || globalLoading || currentLoadingLayer}
                    className="bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-3 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[60px]"
                  >
                    {layer.loading ? (
                      <ClipLoader color="#ffffff" size={12} />
                    ) : (
                      layer.data ? "Tải lại" : "Tải"
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Status Summary */}
            <div className="mt-4 p-3 bg-gray-50 rounded-md text-xs">
              <div className="text-gray-700 font-medium mb-2">📈 Tổng quan:</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span>Đã tải: </span>
                  <strong className="text-green-600">{Object.values(mapLayers).filter(layer => layer.data).length}/5</strong>
                </div>
                <div>
                  <span>Server cache: </span>
                  <strong className="text-blue-600">{serverCacheStatus?.cached_layers?.length || 0}/5</strong>
                </div>
              </div>
              
              <div className="mt-2 text-gray-600">
                💡 <strong>Lần đầu tải:</strong> Chậm, nhưng sẽ được cache<br/>
                💾 <strong>Lần sau tải:</strong> Instant từ server cache
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CapNhatDuLieu;