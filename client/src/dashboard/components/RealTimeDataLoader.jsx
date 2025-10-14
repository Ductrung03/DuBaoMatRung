// client/src/dashboard/components/RealTimeDataLoader.jsx
import React, { useState, useEffect } from 'react';
import { ClipLoader } from 'react-spinners';
import axios from 'axios';
import config from '../../config';

const RealTimeDataLoader = ({ 
  isLoading, 
  layerKey, 
  layerName,
  onComplete 
}) => {
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    percentage: 0,
    stage: 'initializing',
    timestamp: Date.now()
  });
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Poll progress from server
  useEffect(() => {
    if (!isLoading || !layerKey) return;

    setStartTime(Date.now());
    
    const pollProgress = async () => {
      try {
        const response = await axios.get(`/api/layer-data/progress/${layerKey}`);
        const progressData = response.data;
        
        setProgress(progressData);
        
        // Log cho debug
        console.log(`📊 Progress update for ${layerKey}:`, progressData);
        
      } catch (error) {
        console.warn(`⚠️ Error polling progress for ${layerKey}:`, error);
      }
    };

    // Initial poll
    pollProgress();
    
    // Poll every 500ms for real-time updates
    const interval = setInterval(pollProgress, 500);

    return () => clearInterval(interval);
  }, [isLoading, layerKey]);

  // Update elapsed time
  useEffect(() => {
    if (!startTime) return;

    const timer = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    return () => clearInterval(timer);
  }, [startTime]);

  // Auto-close when completed
  useEffect(() => {
    if (progress.stage === 'completed' || progress.stage === 'cache_loaded') {
      const timeout = setTimeout(() => {
        if (onComplete) onComplete();
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [progress.stage, onComplete]);

  if (!isLoading) return null;

  // Stage translations
  const stageMessages = {
    'initializing': 'Khởi tạo kết nối...',
    'checking_cache': 'Kiểm tra server cache...',
    'cache_loaded': 'Tải instant từ cache!',
    'counting': 'Đang đếm tổng số dữ liệu...',
    'database_loading': 'Kết nối database...',
    'streaming': 'Đang tải dữ liệu...',
    'processing': 'Xử lý dữ liệu...',
    'saving_cache': 'Lưu vào server cache...',
    'completing': 'Hoàn thiện...',
    'completed': 'Hoàn thành!',
    'error': 'Có lỗi xảy ra'
  };

  // Calculate speed
  const speed = progress.current > 0 && elapsedTime > 1000 ? 
    Math.round((progress.current / elapsedTime) * 1000) : 0;

  // Get estimated time remaining
  const getETA = () => {
    if (progress.total === 0 || progress.current === 0 || speed === 0) return null;
    const remaining = progress.total - progress.current;
    const etaSeconds = Math.round(remaining / speed);
    
    if (etaSeconds < 60) return `${etaSeconds}s`;
    const minutes = Math.floor(etaSeconds / 60);
    const seconds = etaSeconds % 60;
    return `${minutes}m ${seconds}s`;
  };

  // Special handling for instant cache loads
  if (progress.stage === 'cache_loaded') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 50000 }}>
        <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">🚀</span>
            </div>
            
            <h3 className="text-xl font-bold text-green-800 mb-2">
              Tải Instant!
            </h3>
            
            <p className="text-green-600 mb-4">
              {layerName} đã được tải từ server cache
            </p>
            
            {progress.current > 0 && (
              <p className="text-sm text-gray-600">
                📊 {progress.current.toLocaleString()} đối tượng
              </p>
            )}
            
            <div className="mt-4 text-xs text-gray-500">
              ⚡ Cache hit - không cần streaming
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" style={{ zIndex: 50000 }}>
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="text-center">
          <ClipLoader color="#027e02" size={60} />
          
          <h3 className="text-xl font-bold text-gray-800 mt-4 mb-2">
            Đang tải {layerName}
          </h3>
          
          <p className="text-gray-600 mb-3 font-medium">
            {stageMessages[progress.stage] || 'Đang xử lý...'}
          </p>
          
          {/* Progress bar - only show if we have total count */}
          {progress.total > 0 && (
            <div className="mb-4">
              <div className="bg-gray-200 rounded-full h-3 mb-2">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{progress.percentage}%</span>
                <span>{(elapsedTime / 1000).toFixed(1)}s</span>
              </div>
            </div>
          )}
          
          {/* Detailed stats for large datasets */}
          {progress.current > 0 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-md">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="font-medium">Đã tải:</span>
                  <br />
                  <span className="text-blue-600 font-mono">
                    {progress.current.toLocaleString()}
                    {progress.total > 0 && (
                      <span className="text-gray-500">/{progress.total.toLocaleString()}</span>
                    )}
                  </span>
                </div>
                {speed > 0 && (
                  <div>
                    <span className="font-medium">Tốc độ:</span>
                    <br />
                    <span className="text-green-600 font-mono">{speed.toLocaleString()} rec/s</span>
                  </div>
                )}
              </div>
              
              {getETA() && (
                <div className="mt-2 text-center">
                  <span className="text-orange-600 font-medium">
                    ⏱️ Còn lại: {getETA()}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {/* Layer-specific info */}
          <div className="text-xs text-gray-500 text-left">
            <p className="font-medium mb-2">💡 Thông tin:</p>
            {layerKey === 'forestTypes' && (
              <div className="space-y-1">
                <div>🌲 Dataset lớn nhất (~227K records)</div>
                <div>📦 Streaming với chunks 3000 records</div>
                <div>💾 Lần sau sẽ instant từ server cache</div>
              </div>
            )}
            {layerKey === 'administrative' && (
              <div className="space-y-1">
                <div>🏛️ Ranh giới hành chính các cấp</div>
                <div>🗺️ Từ tỉnh đến khoảnh</div>
              </div>
            )}
            {layerKey === 'forestManagement' && (
              <div className="space-y-1">
                <div>🏢 Dữ liệu chủ quản lý rừng</div>
                <div>🏭 Nhà nước, doanh nghiệp, cá nhân...</div>
              </div>
            )}
            {layerKey === 'terrain' && (
              <div className="space-y-1">
                <div>🏔️ Địa hình, thủy văn, giao thông</div>
                <div>🔗 Parallel loading polygon + line</div>
              </div>
            )}
            {layerKey === 'deforestationAlerts' && (
              <div className="space-y-1">
                <div>⚠️ Dự báo mất rừng mới nhất</div>
                <div>📅 Phân loại theo mức cảnh báo</div>
              </div>
            )}
          </div>
          
          {/* Warning for slow progress */}
          {elapsedTime > 30000 && progress.stage === 'streaming' && (
            <div className="mt-4 p-2 bg-yellow-50 rounded-md">
              <p className="text-yellow-800 text-xs">
                ⚠️ Tải chậm hơn bình thường. Dataset có thể rất lớn.
              </p>
            </div>
          )}
          
          {/* Error state */}
          {progress.stage === 'error' && (
            <div className="mt-4 p-2 bg-red-50 rounded-md">
              <p className="text-red-800 text-xs">
                ❌ Có lỗi xảy ra. Vui lòng thử lại.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealTimeDataLoader;