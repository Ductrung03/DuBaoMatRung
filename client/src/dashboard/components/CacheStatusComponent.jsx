// client/src/dashboard/components/CacheStatusComponent.jsx - Real Cache Status Display
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import config from '../../config';
import { toast } from 'react-toastify';
import { ClipLoader } from 'react-spinners';

const CacheStatusComponent = ({ isOpen = false, onToggle }) => {
  const [cacheStatus, setCacheStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadCacheStatus();
    }
  }, [isOpen]);

  const loadCacheStatus = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/layer-data/server-cache/status`);
      setCacheStatus(response.data);
      setLastRefresh(new Date());
      console.log("📊 Cache status loaded:", response.data);
    } catch (error) {
      console.error("Error loading cache status:", error);
      toast.error("Không thể tải trạng thái cache");
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    if (!window.confirm("Xóa TOÀN BỘ persistent cache? Lần tải tiếp theo sẽ chậm hơn.")) return;
    
    try {
      setLoading(true);
      await axios.post(`/api/layer-data/server-cache/clear`);
      toast.success("🗑️ Đã xóa toàn bộ cache!");
      await loadCacheStatus();
    } catch (error) {
      console.error("Error clearing cache:", error);
      toast.error("❌ Không thể xóa cache");
    } finally {
      setLoading(false);
    }
  };

  const rebuildCache = async () => {
    if (!window.confirm("Rebuild cache? Sẽ xóa cache hiện tại và tải lại từ đầu.")) return;
    
    try {
      setLoading(true);
      await axios.post(`/api/layer-data/server-cache/rebuild`);
      toast.success("🔄 Đã khởi động rebuild cache!");
      await loadCacheStatus();
    } catch (error) {
      console.error("Error rebuilding cache:", error);
      toast.error("❌ Không thể rebuild cache");
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const getCacheHealthColor = (ageHours) => {
    if (ageHours < 1) return 'text-green-600'; // Fresh
    if (ageHours < 24) return 'text-blue-600'; // Recent  
    if (ageHours < 72) return 'text-yellow-600'; // Getting old
    return 'text-red-600'; // Old
  };

  const getCacheHealthStatus = (ageHours) => {
    if (ageHours < 1) return '🟢 Mới';
    if (ageHours < 24) return '🔵 Tươi';
    if (ageHours < 72) return '🟡 Cũ';
    return '🔴 Rất cũ';
  };

  if (!isOpen) {
    return (
      <div className="mb-3">
        <button
          onClick={onToggle}
          className="w-full bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md py-2 px-3 text-left transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">
              💾 Trạng thái Cache
            </span>
            <span className="text-xs text-blue-600">▶</span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-3 bg-blue-50 border border-blue-200 rounded-md">
      {/* Header */}
      <div 
        className="p-3 cursor-pointer border-b border-blue-200"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-800">
            💾 Trạng thái Cache Server
          </span>
          <span className="text-xs text-blue-600">▼</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <ClipLoader color="#2563eb" size={24} />
            <span className="ml-2 text-sm text-blue-600">Đang tải...</span>
          </div>
        ) : cacheStatus ? (
          <div className="space-y-3">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-2 rounded border">
                <div className="font-medium text-gray-700">Lớp đã cache:</div>
                <div className="text-lg font-bold text-green-600">
                  {cacheStatus.cached_layers?.length || 0}/5
                </div>
              </div>
              <div className="bg-white p-2 rounded border">
                <div className="font-medium text-gray-700">Tổng dung lượng:</div>
                <div className="text-lg font-bold text-blue-600">
                  {formatBytes(cacheStatus.total_cache_size || 0)}
                </div>
              </div>
            </div>

            {/* Cache Details */}
            {cacheStatus.cache_details && Object.keys(cacheStatus.cache_details).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-gray-700">Chi tiết cache:</h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {Object.entries(cacheStatus.cache_details).map(([layerKey, details]) => (
                    <div key={layerKey} className="bg-white p-2 rounded border text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-800">
                          {layerKey === 'administrative' && '🏛️ Ranh giới'}
                          {layerKey === 'forestTypes' && '🌲 Loại rừng'}
                          {layerKey === 'forestManagement' && '🏢 Chủ quản lý'}
                          {layerKey === 'terrain' && '🏔️ Địa hình'}
                          {layerKey.includes('deforestation') && '⚠️ Mất rừng'}
                          {!['administrative', 'forestTypes', 'forestManagement', 'terrain'].includes(layerKey) && !layerKey.includes('deforestation') && layerKey}
                        </span>
                        <span className={`font-bold ${getCacheHealthColor(details.age_hours)}`}>
                          {details.size_mb} MB
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">
                          {formatDate(details.created)}
                        </span>
                        <span className={`font-medium ${getCacheHealthColor(details.age_hours)}`}>
                          {getCacheHealthStatus(details.age_hours)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <button
                onClick={loadCacheStatus}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-2 rounded text-xs disabled:opacity-50 transition-colors"
              >
                🔄 Refresh
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={clearCache}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium py-1 px-2 rounded text-xs disabled:opacity-50 transition-colors"
                >
                  🗑️ Xóa cache
                </button>
                <button
                  onClick={rebuildCache}
                  disabled={loading}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-medium py-1 px-2 rounded text-xs disabled:opacity-50 transition-colors"
                >
                  🔄 Rebuild
                </button>
              </div>
            </div>

            {/* Cache Health Info */}
            <div className="bg-white p-2 rounded border text-xs">
              <div className="font-medium text-gray-700 mb-1">💡 Thông tin:</div>
              <div className="text-gray-600 space-y-1">
                <div>• Cache lưu trong file trên server</div>
                <div>• Tự động tải lại sau 7 ngày</div>
                <div>• Memory cache tăng tốc độ truy cập</div>
                {lastRefresh && (
                  <div>• Cập nhật lần cuối: {formatDate(lastRefresh)}</div>
                )}
              </div>
            </div>

            {/* Performance Tips */}
            {cacheStatus.cached_layers?.length < 3 && (
              <div className="bg-yellow-50 border border-yellow-200 p-2 rounded text-xs">
                <div className="font-medium text-yellow-800 mb-1">⚡ Gợi ý:</div>
                <div className="text-yellow-700">
                  Tải thêm các lớp để tăng tốc độ truy cập lần sau!
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <div className="text-sm text-gray-600 mb-2">Chưa có dữ liệu cache</div>
            <button
              onClick={loadCacheStatus}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-3 rounded text-xs transition-colors"
            >
              Tải trạng thái
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CacheStatusComponent;