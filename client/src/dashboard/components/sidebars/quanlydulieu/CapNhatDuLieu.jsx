// client/src/dashboard/components/sidebars/quanlydulieu/CapNhatDuLieu.jsx
import React, { useState } from "react";
import axios from "axios";
import { useGeoData } from "../../../contexts/GeoDataContext";
import config from "../../../../config";
import { toast } from "react-toastify";
import { ClipLoader } from 'react-spinners';
import EnhancedLoadingComponent from '../../EnhancedLoadingComponent';

const CapNhatDuLieu = () => {
  const [isForecastOpen, setIsForecastOpen] = useState(true);
  const { updateLayerData, setLayerLoading, mapLayers } = useGeoData();
  
  // Enhanced loading states
  const [globalLoading, setGlobalLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState('');
  const [loadedLayers, setLoadedLayers] = useState(0);
  const [totalLayers, setTotalLayers] = useState(0);

  // Hàm load dữ liệu cho từng layer với enhanced loading
  const handleLoadLayer = async (layerKey, layerName) => {
    try {
      const layer = mapLayers[layerKey];
      if (!layer) {
        console.error(`Layer ${layerKey} không tồn tại`);
        return;
      }

      setLayerLoading(layerKey, true);
      setLoadingStage('counting');
      console.log(`🔄 Đang tải TOÀN BỘ dữ liệu cho layer: ${layerName}`);
      
      const url = `${config.API_URL}/api/layer-data/${layer.endpoint}`;
      console.log(`📡 Request URL: ${url}`);
      
      // Hiển thị thông báo bắt đầu tải
      toast.info(`🔄 Bắt đầu tải toàn bộ dữ liệu ${layerName}...`, { autoClose: 2000 });
      
      setLoadingStage('loading');
      const startTime = Date.now();
      
      const response = await axios.get(url);
      
      const loadTime = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`📊 Response status: ${response.status} (${loadTime}s)`);
      console.log(`📊 Response data:`, response.data);
      
      if (response.data && response.data.features) {
        setLoadingStage('processing');
        
        const layerData = {
          ...response.data,
          layerType: layerKey
        };
        
        console.log(`✅ Layer data structure:`, {
          type: layerData.type,
          featuresCount: layerData.features.length,
          sampleFeature: layerData.features[0],
          loadTime: `${loadTime}s`
        });
        
        setLoadingStage('rendering');
        updateLayerData(layerKey, layerData);
        
        // Thông báo chi tiết cho từng loại layer
        let successMessage = `✅ Đã tải TOÀN BỘ ${layerName} thành công!\n📊 ${response.data.features.length} đối tượng (${loadTime}s)`;
        
        // Thông báo đặc biệt cho từng layer
        if (layerKey === 'forestManagement') {
          const managementTypes = {};
          response.data.features.forEach(feature => {
            const chuQuanLy = feature.properties.chuquanly || "Không xác định";
            managementTypes[chuQuanLy] = (managementTypes[chuQuanLy] || 0) + 1;
          });
          console.log(`🏢 Các loại chủ quản lý:`, managementTypes);
          successMessage += `\n🏢 Bao gồm ${Object.keys(managementTypes).length} loại chủ quản lý khác nhau`;
        }
        
        if (layerKey === 'terrain') {
          const polygonCount = response.data.features.filter(f => f.properties.layer_type === 'terrain_polygon').length;
          const lineCount = response.data.features.filter(f => f.properties.layer_type === 'terrain_line').length;
          successMessage += `\n🏔️ Gồm ${polygonCount} vùng địa hình và ${lineCount} đường địa hình`;
        }

        if (layerKey === 'forestTypes') {
          const typeStats = {};
          response.data.features.forEach(feature => {
            const type = feature.properties.forest_function || "Không xác định";
            typeStats[type] = (typeStats[type] || 0) + 1;
          });
          console.log(`🌲 Thống kê các loại rừng (theo LDLR):`, typeStats);
          successMessage += `\n🌲 Bao gồm ${Object.keys(typeStats).length} loại rừng theo phân loại LDLR`;
        }

        if (layerKey === 'administrative') {
          const boundaryStats = {};
          response.data.features.forEach(feature => {
            const level = feature.properties.boundary_level || "unknown";
            boundaryStats[level] = (boundaryStats[level] || 0) + 1;
          });
          console.log(`🏛️ Thống kê ranh giới:`, boundaryStats);
          successMessage += `\n🏛️ Bao gồm ${Object.keys(boundaryStats).length} cấp ranh giới khác nhau`;
        }

        if (layerKey === 'deforestationAlerts') {
          const alertStats = {};
          response.data.features.forEach(feature => {
            const level = feature.properties.alert_level || "Không xác định";
            alertStats[level] = (alertStats[level] || 0) + 1;
          });
          console.log(`⚠️ Thống kê mức cảnh báo:`, alertStats);
          successMessage += `\n⚠️ Gồm ${response.data.features.length} cảnh báo mất rừng với các mức độ khác nhau`;
        }
        
        toast.success(successMessage);
        console.log(`✅ Đã tải TOÀN BỘ ${response.data.features.length} features cho ${layerName} trong ${loadTime}s`);
        
        // Thông báo đang zoom
        toast.info(`🗺️ Đang zoom đến vùng hiển thị ${layerName}...`, { autoClose: 1500 });
      } else {
        console.warn(`⚠️ Không có dữ liệu features trong response cho ${layerName}`);
        toast.warning(`⚠️ Không có dữ liệu cho ${layerName}`);
      }
    } catch (err) {
      console.error(`❌ Lỗi khi tải ${layerName}:`, err);
      
      // Log chi tiết lỗi
      if (err.response) {
        console.error(`📡 Response error:`, {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data
        });
      }
      
      let errorMessage = `❌ Không thể tải ${layerName}`;
      if (err.response?.status === 404) {
        errorMessage += ": Không tìm thấy dữ liệu";
      } else if (err.response?.status === 500) {
        errorMessage += ": Lỗi server";
      } else if (err.response?.status === 504) {
        errorMessage += ": Timeout - Dữ liệu quá lớn, vui lòng thử lại";
      } else {
        errorMessage += `: ${err.response?.data?.error || err.message}`;
      }
      
      toast.error(errorMessage);
      setLayerLoading(layerKey, false);
    }
  };

  // Hàm tải tất cả layers cùng lúc
  const handleLoadAllLayers = async () => {
    const layersToLoad = [
      { key: 'administrative', name: 'Ranh giới hành chính' },
      { key: 'forestTypes', name: 'Các loại rừng (LDLR)' },
      { key: 'forestManagement', name: 'Chủ quản lý rừng' },
      { key: 'terrain', name: 'Nền địa hình' },
      { key: 'deforestationAlerts', name: 'Dự báo mất rừng mới nhất' }
    ];

    setGlobalLoading(true);
    setTotalLayers(layersToLoad.length);
    setLoadedLayers(0);
    setLoadingStage('counting');

    try {
      toast.info(`🚀 Bắt đầu tải TOÀN BỘ ${layersToLoad.length} lớp dữ liệu...`);

      for (let i = 0; i < layersToLoad.length; i++) {
        const layer = layersToLoad[i];
        setLoadingStage('loading');
        
        await handleLoadLayer(layer.key, layer.name);
        
        setLoadedLayers(i + 1);
        
        // Nghỉ ngắn giữa các layer để tránh overload
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      setLoadingStage('complete');
      toast.success(`🎉 Đã tải thành công TOÀN BỘ ${layersToLoad.length} lớp dữ liệu!`);
      
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

  return (
    <>
      {/* Enhanced Loading Overlay */}
      <EnhancedLoadingComponent 
        isLoading={globalLoading}
        loadingStage={loadingStage}
        totalLayers={totalLayers}
        loadedLayers={loadedLayers}
      />

      <div>
        <div
          className="bg-forest-green-primary text-white py-0.2 px-4 rounded-full text-sm font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer"
          onClick={() => setIsForecastOpen(!isForecastOpen)}
        >
          Cập nhật dữ liệu
        </div>

        {isForecastOpen && (
          <div className="flex flex-col gap-2 px-1 pt-3">
            <div className="flex flex-col gap-3">

              {/* Nút tải tất cả layers */}
              <div className="mb-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                <button 
                  onClick={handleLoadAllLayers}
                  disabled={globalLoading || Object.values(mapLayers).some(layer => layer.loading)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md text-center flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {globalLoading ? (
                    <>
                      <ClipLoader color="#ffffff" size={16} />
                      <span className="ml-2">Đang tải tất cả...</span>
                    </>
                  ) : (
                    <>
                      🚀 Tải TOÀN BỘ dữ liệu (5 lớp)
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-600 mt-2 text-center">
                  💡 Tải một lúc tất cả các lớp để tiết kiệm thời gian
                </p>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <h4 className="text-sm font-medium mb-3 text-gray-700">Hoặc tải từng lớp riêng biệt:</h4>
              </div>

              {/* 1. Lớp ranh giới hành chính */}
              <div className="flex items-center gap-1">
                <label className="text-sm font-medium w-full">
                  🏛️ Lớp ranh giới hành chính
                  <span className="text-xs text-gray-500 block">
                    {mapLayers.administrative.data ? 
                      `✅ Đã tải (${mapLayers.administrative.data.features?.length || 0} đối tượng)` : 
                      'Chưa tải'}
                  </span>
                </label>
                <button 
                  onClick={() => handleLoadLayer('administrative', 'Ranh giới hành chính')}
                  disabled={mapLayers.administrative.loading || globalLoading}
                  className="w-18 whitespace-nowrap bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center flex items-center justify-center disabled:opacity-50"
                >
                  {mapLayers.administrative.loading ? (
                    <>
                      <ClipLoader color="#333" size={14} />
                      <span className="ml-1">Đang tải...</span>
                    </>
                  ) : (
                    mapLayers.administrative.data ? "Tải lại" : "Tải lên"
                  )}
                </button>
              </div>

              {/* 2. Lớp các loại rừng (dựa trên LDLR) */}
              <div className="flex items-center gap-1">
                <label className="text-sm font-medium w-full">
                  🌲 Lớp 3 loại rừng (LDLR)
                  <span className="text-xs text-gray-500 block">
                    {mapLayers.forestTypes.data ? 
                      `✅ Đã tải (${mapLayers.forestTypes.data.features?.length || 0} đối tượng)` : 
                      'Chưa tải'}
                  </span>
                </label>
                <button 
                  onClick={() => handleLoadLayer('forestTypes', 'Các loại rừng (LDLR)')}
                  disabled={mapLayers.forestTypes.loading || globalLoading}
                  className="w-18 whitespace-nowrap bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center flex items-center justify-center disabled:opacity-50"
                >
                  {mapLayers.forestTypes.loading ? (
                    <>
                      <ClipLoader color="#333" size={14} />
                      <span className="ml-1">Đang tải...</span>
                    </>
                  ) : (
                    mapLayers.forestTypes.data ? "Tải lại" : "Tải lên"
                  )}
                </button>
              </div>

              {/* 3. Lớp chủ quản lý rừng */}
              <div className="flex items-center gap-1">
                <label className="text-sm font-medium w-full">
                  🏢 Lớp chủ quản lý rừng
                  <span className="text-xs text-gray-500 block">
                    {mapLayers.forestManagement.data ? 
                      `✅ Đã tải (${mapLayers.forestManagement.data.features?.length || 0} đối tượng)` : 
                      'Chưa tải'}
                  </span>
                </label>
                <button 
                  onClick={() => handleLoadLayer('forestManagement', 'Chủ quản lý rừng')}
                  disabled={mapLayers.forestManagement.loading || globalLoading}
                  className="w-18 whitespace-nowrap bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center flex items-center justify-center disabled:opacity-50"
                >
                  {mapLayers.forestManagement.loading ? (
                    <>
                      <ClipLoader color="#333" size={14} />
                      <span className="ml-1">Đang tải...</span>
                    </>
                  ) : (
                    mapLayers.forestManagement.data ? "Tải lại" : "Tải lên"
                  )}
                </button>
              </div>

              {/* 4. Lớp nền địa hình */}
              <div className="flex items-center gap-1">
                <label className="text-sm font-medium w-full">
                  🏔️ Lớp nền địa hình, thủy văn, giao thông
                  <span className="text-xs text-gray-500 block">
                    {mapLayers.terrain.data ? 
                      `✅ Đã tải (${mapLayers.terrain.data.features?.length || 0} đối tượng)` : 
                      'Chưa tải'}
                  </span>
                </label>
                <button 
                  onClick={() => handleLoadLayer('terrain', 'Nền địa hình')}
                  disabled={mapLayers.terrain.loading || globalLoading}
                  className="w-18 whitespace-nowrap bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center flex items-center justify-center disabled:opacity-50"
                >
                  {mapLayers.terrain.loading ? (
                    <>
                      <ClipLoader color="#333" size={14} />
                      <span className="ml-1">Đang tải...</span>
                    </>
                  ) : (
                    mapLayers.terrain.data ? "Tải lại" : "Tải lên"
                  )}
                </button>
              </div>

              {/* 5. Lớp dự báo mất rừng mới nhất */}
              <div className="flex items-center gap-1">
                <label className="text-sm font-medium w-full">
                  ⚠️ Dự báo mất rừng mới nhất
                  <span className="text-xs text-gray-500 block">
                    {mapLayers.deforestationAlerts.data ? 
                      `✅ Đã tải (${mapLayers.deforestationAlerts.data.features?.length || 0} đối tượng)` : 
                      'Chưa tải'}
                  </span>
                </label>
                <button 
                  onClick={() => handleLoadLayer('deforestationAlerts', 'Dự báo mất rừng mới nhất')}
                  disabled={mapLayers.deforestationAlerts.loading || globalLoading}
                  className="w-18 whitespace-nowrap bg-red-100 hover:bg-red-200 text-red-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center flex items-center justify-center disabled:opacity-50"
                >
                  {mapLayers.deforestationAlerts.loading ? (
                    <>
                      <ClipLoader color="#dc2626" size={14} />
                      <span className="ml-1">Đang tải...</span>
                    </>
                  ) : (
                    mapLayers.deforestationAlerts.data ? "Tải lại" : "Tải lên"
                  )}
                </button>
              </div>

              {/* Thông tin trạng thái */}
              <div className="mt-4 p-3 bg-gray-50 rounded-md">
                <h4 className="text-sm font-medium mb-2">📊 Trạng thái các lớp:</h4>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  {Object.entries(mapLayers).map(([key, layer]) => (
                    <div key={key} className="flex items-center gap-2">
                      <div 
                        className={`w-3 h-3 rounded-full ${
                          layer.loading ? 'bg-yellow-500 animate-pulse' : 
                          layer.data ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      ></div>
                      <span className={`${layer.visible ? 'font-medium' : 'opacity-60'}`}>
                        {layer.name}
                        {/* Thêm icon đặc biệt */}
                        {key === 'forestManagement' && ' 🏢'}
                        {key === 'administrative' && ' 🏛️'}
                        {key === 'forestTypes' && ' 🌲'}
                        {key === 'terrain' && ' 🏔️'}
                        {key === 'deforestationAlerts' && ' ⚠️'}
                      </span>
                      {layer.data && (
                        <span className="text-gray-500">
                          ({layer.data.features?.length || 0})
                        </span>
                      )}
                      {layer.loading && (
                        <span className="text-yellow-600 text-xs">Đang tải...</span>
                      )}
                    </div>
                  ))}
                </div>
                
                {/* Thống kê tổng hợp */}
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                  <div className="flex justify-between">
                    <span><strong>Đã tải:</strong> {Object.values(mapLayers).filter(layer => layer.data).length} lớp</span>
                    <span><strong>Hiển thị:</strong> {Object.values(mapLayers).filter(layer => layer.data && layer.visible).length} lớp</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span><strong>Tổng đối tượng:</strong> {Object.values(mapLayers).reduce((total, layer) => total + (layer.data?.features?.length || 0), 0)}</span>
                  </div>
                </div>

                {/* Lưu ý về performance */}
                <div className="mt-3 p-2 bg-yellow-50 rounded text-xs">
                  <p className="text-yellow-800">
                    <strong>⚠️ Lưu ý:</strong> Hệ thống hiện đang tải TOÀN BỘ dữ liệu (không giới hạn).
                    Quá trình tải có thể mất 30-60 giây tùy vào kích thước dữ liệu và tốc độ mạng.
                  </p>
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