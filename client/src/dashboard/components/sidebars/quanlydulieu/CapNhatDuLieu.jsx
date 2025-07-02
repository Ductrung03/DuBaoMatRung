// client/src/dashboard/components/sidebars/quanlydulieu/CapNhatDuLieu.jsx - WITH ENHANCED CACHE
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useGeoData } from "../../../contexts/GeoDataContext";
import config from "../../../../config";
import { toast } from "react-toastify";
import { ClipLoader } from 'react-spinners';
import RealTimeDataLoader from '../../RealTimeDataLoader';
import CacheStatusComponent from '../../CacheStatusComponent';

const CapNhatDuLieu = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [showCacheStatus, setShowCacheStatus] = useState(false);
  const { updateLayerData, setLayerLoading, mapLayers } = useGeoData();
  
  // Loading states
  const [currentLoadingLayer, setCurrentLoadingLayer] = useState(null);
  const [globalLoading, setGlobalLoading] = useState(false);

  // Enhanced load layer function with persistent cache support
  const handleLoadLayer = async (layerKey, layerName) => {
    try {
      const layer = mapLayers[layerKey];
      if (!layer) {
        console.error(`Layer ${layerKey} không tồn tại`);
        return;
      }

      setLayerLoading(layerKey, true);
      setCurrentLoadingLayer({ key: layerKey, name: layerName });
      
      toast.info(`🔄 Đang tải ${layerName}... (kiểm tra cache)`, { autoClose: 2000 });
      
      const startTime = Date.now();
      const url = `${config.API_URL}/api/layer-data/${layer.endpoint}`;
      
      // Enhanced request with cache headers
      const response = await axios.get(url, {
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'max-age=0' // Always check for fresh data but allow cache
        },
        params: {
          useServerCache: 'true',
          optimize: 'true'
        },
        timeout: 180000 // 3 minutes timeout for large datasets
      });
      
      const loadTime = ((Date.now() - startTime) / 1000).toFixed(1);
      const cacheStatus = response.headers['x-cache-status'] || 'UNKNOWN';
      
      if (response.data && response.data.features) {
        const layerData = {
          ...response.data,
          layerType: layerKey,
          loadTime: parseFloat(loadTime),
          loadStrategy: response.data.metadata?.load_strategy || 'persistent_cache',
          loadTimestamp: new Date().toISOString(),
          cacheStatus: cacheStatus,
          fromPersistentCache: response.data.metadata?.from_persistent_cache || false,
          fromMemoryCache: response.data.metadata?.from_memory_cache || false,
          cacheAgeMinutes: response.data.metadata?.cache_age_minutes || 0
        };
        
        updateLayerData(layerKey, layerData);
        
        // Enhanced success message with cache info
        let successMessage = `✅ ${layerName}: ${response.data.features.length.toLocaleString()} đối tượng (${loadTime}s)`;
        
        if (layerData.fromMemoryCache) {
          successMessage += ` 🚀 Instant từ memory cache!`;
        } else if (layerData.fromPersistentCache) {
          successMessage += ` 💾 Tải từ persistent cache (${layerData.cacheAgeMinutes}p cũ)`;
        } else {
          successMessage += ` 📥 Tải mới + đã cache cho lần sau!`;
        }
        
        toast.success(successMessage, { autoClose: 5000 });
        
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
      } else if (err.code === 'ECONNABORTED') {
        errorMessage += ": Timeout - dataset quá lớn";
      } else if (err.message.includes('CORS')) {
        errorMessage += ": Lỗi CORS - vui lòng thử lại";
      } else {
        errorMessage += `: ${err.response?.data?.error || err.message}`;
      }
      
      toast.error(errorMessage, { autoClose: 8000 });
    } finally {
      setLayerLoading(layerKey, false);
      setCurrentLoadingLayer(null);
    }
  };

  // Enhanced load all layers with better sequencing
  const handleLoadAllLayers = async () => {
    const layersToLoad = [
      { key: 'administrative', name: 'Ranh giới hành chính', priority: 1 },
      { key: 'forestManagement', name: 'Chủ quản lý rừng', priority: 2 },
      { key: 'terrain', name: 'Nền địa hình', priority: 3 },
      { key: 'deforestationAlerts', name: 'Dự báo mất rừng', priority: 4 },
      { key: 'forestTypes', name: 'Các loại rừng (LDLR)', priority: 5 } // Tải cuối vì lớn nhất
    ];

    setGlobalLoading(true);

    try {
      toast.info(`🚀 Bắt đầu tải ${layersToLoad.length} lớp dữ liệu với persistent cache...`);

      for (let i = 0; i < layersToLoad.length; i++) {
        const layer = layersToLoad[i];
        
        toast.info(`📥 Tải lớp ${i + 1}/${layersToLoad.length}: ${layer.name}`, { autoClose: 2000 });
        
        await handleLoadLayer(layer.key, layer.name);
        
        // Shorter pause for cached layers
        if (i < layersToLoad.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      toast.success(`🎉 Đã tải thành công ${layersToLoad.length} lớp dữ liệu!`, { autoClose: 5000 });
      
    } catch (error) {
      console.error('Lỗi khi tải tất cả layers:', error);
      toast.error('❌ Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setGlobalLoading(false);
    }
  };

  // Get enhanced status indicator
  const getStatusIndicator = (layerKey) => {
    const layer = mapLayers[layerKey];
    
    if (layer.loading) return <span className="text-yellow-600">⏳ Đang tải...</span>;
    if (layer.data) {
      let status = <span className="text-green-600">✅ Đã tải</span>;
      if (layer.data.fromMemoryCache) {
        status = <span className="text-blue-600">🚀 Memory cache</span>;
      } else if (layer.data.fromPersistentCache) {
        status = <span className="text-purple-600">💾 File cache</span>;
      }
      return status;
    }
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
            <p className="text-gray-600">Sử dụng persistent cache để tăng tốc...</p>
          </div>
        </div>
      )}

      <div>
        <div
          className="bg-forest-green-primary text-white py-2 px-4 rounded-full text-sm font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer hover:bg-green-800 transition-colors"
          onClick={() => setIsOpen(!isOpen)}
        >
          <div className="flex items-center justify-between">
            <span>📊 Cập nhật dữ liệu (Enhanced Cache)</span>
            <span className="text-xs">{isOpen ? '▼' : '▶'}</span>
          </div>
        </div>

        {isOpen && (
          <div className="flex flex-col gap-3 px-1 pt-3">
            
            {/* Enhanced Cache Status Component */}
            <CacheStatusComponent 
              isOpen={showCacheStatus} 
              onToggle={() => setShowCacheStatus(!showCacheStatus)}
            />

            {/* Enhanced Bulk Actions */}
            <div className="mb-4 p-3 bg-green-50 rounded-md border border-green-200">
              <button 
                onClick={handleLoadAllLayers}
                disabled={globalLoading || currentLoadingLayer}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md text-center flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {globalLoading ? (
                  <>
                    <ClipLoader color="#ffffff" size={16} />
                    <span className="ml-2">Đang tải với cache...</span>
                  </>
                ) : (
                  <>🚀 Tải TẤT CẢ - 5 lớp (Persistent Cache)</>
                )}
              </button>
             
             
            </div>

            {/* Individual Layers with enhanced info */}
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
                          {layer.data.loadTime && (
                            <span className="ml-1 text-blue-600">
                              - {layer.data.loadTime}s
                            </span>
                          )}
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

            {/* Enhanced Status Summary */}
            <div className="mt-4 p-3 bg-gray-50 rounded-md text-xs">
              <div className="text-gray-700 font-medium mb-2">📈 Tổng quan Enhanced Cache:</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span>Đã tải: </span>
                  <strong className="text-green-600">{Object.values(mapLayers).filter(layer => layer.data).length}/5</strong>
                </div>
                <div>
                  <span>Cache hits: </span>
                  <strong className="text-blue-600">
                    {Object.values(mapLayers).filter(layer => layer.data?.fromPersistentCache || layer.data?.fromMemoryCache).length}
                  </strong>
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