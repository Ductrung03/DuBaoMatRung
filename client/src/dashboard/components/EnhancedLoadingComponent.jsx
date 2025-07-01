// client/src/dashboard/components/EnhancedLoadingComponent.jsx
import React, { useState, useEffect } from 'react';
import { ClipLoader } from 'react-spinners';

const EnhancedLoadingComponent = ({ isLoading, loadingStage, totalLayers, loadedLayers }) => {
  const [dots, setDots] = useState('');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  if (!isLoading) return null;

  const progress = totalLayers > 0 ? Math.round((loadedLayers / totalLayers) * 100) : 0;

  const stageMessages = {
    'counting': 'Đang đếm số lượng dữ liệu',
    'loading': 'Đang tải dữ liệu từ database', 
    'processing': 'Đang xử lý và chuyển đổi dữ liệu',
    'rendering': 'Đang hiển thị trên bản đồ',
    'complete': 'Hoàn thành!'
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
        <div className="text-center">
          <ClipLoader color="#027e02" size={60} />
          
          <h3 className="text-xl font-bold text-gray-800 mt-4 mb-2">
            Đang tải dữ liệu bản đồ
          </h3>
          
          <p className="text-gray-600 mb-4">
            {stageMessages[loadingStage] || 'Đang xử lý'}{dots}
          </p>
          
          {totalLayers > 0 && (
            <div className="mb-4">
              <div className="bg-gray-200 rounded-full h-3 mb-2">
                <div 
                  className="bg-green-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                {loadedLayers}/{totalLayers} lớp đã tải ({progress}%)
              </p>
            </div>
          )}
          
          <div className="text-xs text-gray-500 mt-4">
            <p>💡 <strong>Mẹo:</strong> Hệ thống đang tải toàn bộ dữ liệu để hiển thị chi tiết nhất</p>
            <p>⏱️ Quá trình này có thể mất 30-60 giây tùy thuộc vào kết nối mạng</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedLoadingComponent;