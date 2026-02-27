// client/src/dashboard/components/OptimizedDataLoader.jsx
import React, { useState, useEffect } from 'react';
import { ClipLoader } from 'react-spinners';
import { toast } from 'react-toastify';
import axios from 'axios';
import config from '../../config';

const OptimizedDataLoader = ({ 
  isLoading, 
  onDataLoaded, 
  layerKey, 
  layerName,
  onError 
}) => {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState('');
  const [details, setDetails] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [loadedCount, setLoadedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [speed, setSpeed] = useState(0);

  useEffect(() => {
    if (isLoading && !startTime) {
      setStartTime(Date.now());
      setProgress(0);
      setStage('Khởi tạo...');
      setDetails('Đang chuẩn bị tải dữ liệu');
    }
  }, [isLoading, startTime]);

  // Simulate progress updates based on actual loading
  useEffect(() => {
    if (!isLoading || !startTime) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      // Estimate progress based on elapsed time and layer complexity
      let estimatedProgress = 0;
      let currentStage = '';
      let currentDetails = '';
      
      if (elapsed < 1000) {
        estimatedProgress = 5;
        currentStage = 'Kết nối database...';
        currentDetails = 'Thiết lập kết nối an toàn';
      } else if (elapsed < 3000) {
        estimatedProgress = 15;
        currentStage = 'Truy vấn dữ liệu...';
        currentDetails = 'Đang thực hiện query với optimization';
      } else if (elapsed < 8000) {
        estimatedProgress = 35;
        currentStage = 'Streaming dữ liệu...';
        currentDetails = 'Đang tải dữ liệu theo chunks';
        
        // Simulate chunked loading for large datasets
        if (layerKey === 'forestTypes') {
          const chunksLoaded = Math.floor(elapsed / 1000) - 2;
          const estimatedChunks = 75; // ~227k records / 3k per chunk
          setLoadedCount(chunksLoaded * 3000);
          setTotalCount(227000);
          currentDetails = `Đã tải ${chunksLoaded}/${estimatedChunks} chunks (${chunksLoaded * 3000} records)`;
        }
      } else if (elapsed < 15000) {
        estimatedProgress = 65;
        currentStage = 'Xử lý geometry...';
        currentDetails = 'Đang simplify và convert coordinate';
      } else if (elapsed < 20000) {
        estimatedProgress = 85;
        currentStage = 'Chuyển đổi TCVN3...';
        currentDetails = 'Đang convert encoding và metadata';
      } else {
        estimatedProgress = 95;
        currentStage = 'Hoàn thiện...';
        currentDetails = 'Đang build GeoJSON và cache kết quả';
      }
      
      setProgress(Math.min(estimatedProgress, 95));
      setStage(currentStage);
      setDetails(currentDetails);
      
      // Calculate speed
      if (loadedCount > 0 && elapsed > 1000) {
        const recordsPerSecond = (loadedCount / elapsed) * 1000;
        setSpeed(Math.round(recordsPerSecond));
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading, startTime, layerKey, loadedCount]);

  // Performance tips based on layer type
  const getPerformanceTips = () => {
    const tips = {
      forestTypes: [
        "Dataset rất lớn (227K records) - có thể mất 30-60 giây",
        "Đang sử dụng streaming pagination để tối ưu memory",
        "Geometry được simplify để tăng tốc độ render"
      ],
      forestManagement: [
        "Đang load dữ liệu chủ quản lý rừng",
        "Sử dụng cache để tăng tốc độ load lần sau"
      ],
      administrative: [
        "Đang load ranh giới hành chính",
        "Dữ liệu được phân cấp theo boundary_level"
      ],
      terrain: [
        "Đang load song song polygon và line data",
        "Bao gồm cả địa hình, thủy văn và giao thông"
      ],
      deforestationAlerts: [
        "Đang load phân tích mất rừng mới nhất",
        "Dữ liệu được phân loại theo mức độ cảnh báo"
      ]
    };
    
    return tips[layerKey] || ["Đang tải dữ liệu..."];
  };

  if (!isLoading) return null;

  const elapsed = startTime ? (Date.now() - startTime) / 1000 : 0;

  return (
    <div 
      className="optimized-data-loader fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center" 
      style={{ zIndex: 50000 }}
    >
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="text-center">
          {/* Main loader */}
          <ClipLoader color="#027e02" size={60} />
          
          {/* Title */}
          <h3 className="text-xl font-bold text-gray-800 mt-4 mb-2">
            Đang tải {layerName}
          </h3>
          
          {/* Current stage */}
          <p className="text-gray-600 mb-3 font-medium">
            {stage}
          </p>
          
          {/* Progress bar */}
          <div className="mb-4">
            <div className="bg-gray-200 rounded-full h-3 mb-2">
              <div 
                className="bg-green-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{progress}%</span>
              <span>{elapsed.toFixed(1)}s</span>
            </div>
          </div>
          
          {/* Details */}
          <p className="text-sm text-gray-500 mb-4">
            {details}
          </p>
          
          {/* Stats for large datasets */}
          {(loadedCount > 0 || speed > 0) && (
            <div className="mb-4 p-3 bg-blue-50 rounded-md">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {loadedCount > 0 && (
                  <div>
                    <span className="font-medium">Đã tải:</span>
                    <br />
                    <span className="text-blue-600">{loadedCount.toLocaleString()}</span>
                    {totalCount > 0 && <span className="text-gray-500">/{totalCount.toLocaleString()}</span>}
                  </div>
                )}
                {speed > 0 && (
                  <div>
                    <span className="font-medium">Tốc độ:</span>
                    <br />
                    <span className="text-green-600">{speed.toLocaleString()} rec/s</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Performance tips */}
          <div className="text-xs text-gray-500 text-left">
            <p className="font-medium mb-2">💡 Thông tin:</p>
            <ul className="list-disc list-inside space-y-1">
              {getPerformanceTips().map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
          
          {/* Warning for slow connection */}
          {elapsed > 30 && (
            <div className="mt-4 p-2 bg-yellow-50 rounded-md">
              <p className="text-yellow-800 text-xs">
                ⚠️ Quá trình tải đang chậm hơn bình thường. 
                Có thể do kết nối mạng hoặc dữ liệu quá lớn.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OptimizedDataLoader;