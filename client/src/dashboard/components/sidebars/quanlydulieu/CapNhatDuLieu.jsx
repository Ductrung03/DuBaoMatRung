import React, { useState } from "react";
import axios from "axios";
import { useGeoData } from "../../../contexts/GeoDataContext";
import config from "../../../../config";
import { toast } from "react-toastify";
import { ClipLoader } from 'react-spinners';

const CapNhatDuLieu = () => {
  const [isForecastOpen, setIsForecastOpen] = useState(true);
  const { updateLayerData, setLayerLoading, mapLayers } = useGeoData();

  // Hàm load dữ liệu cho từng layer với debug tốt hơn
  const handleLoadLayer = async (layerKey, layerName) => {
    try {
      const layer = mapLayers[layerKey];
      if (!layer) {
        console.error(`Layer ${layerKey} không tồn tại`);
        return;
      }

      setLayerLoading(layerKey, true);
      console.log(`🔄 Đang tải dữ liệu cho layer: ${layerName}`);
      
      const url = `${config.API_URL}/api/layer-data/${layer.endpoint}`;
      console.log(`📡 Request URL: ${url}`);
      
      const response = await axios.get(url);
      
      console.log(`📊 Response status: ${response.status}`);
      console.log(`📊 Response data:`, response.data);
      
      if (response.data && response.data.features) {
        const layerData = {
          ...response.data,
          layerType: layerKey
        };
        
        console.log(`✅ Layer data structure:`, {
          type: layerData.type,
          featuresCount: layerData.features.length,
          sampleFeature: layerData.features[0]
        });
        
        updateLayerData(layerKey, layerData);
        
        // Thông báo chi tiết cho từng loại layer
        let successMessage = `✅ Đã tải ${layerName} thành công! (${response.data.features.length} đối tượng)`;
        
        // Thông báo đặc biệt cho từng layer
        if (layerKey === 'forestManagement') {
          const managementTypes = {};
          response.data.features.forEach(feature => {
            const chuQuanLy = feature.properties.chuquanly || "Không xác định";
            managementTypes[chuQuanLy] = (managementTypes[chuQuanLy] || 0) + 1;
          });
          console.log(`🏢 Các loại chủ quản lý:`, managementTypes);
          successMessage += `\n🏢 Gồm ${Object.keys(managementTypes).length} loại chủ quản lý khác nhau`;
        }
        
        if (layerKey === 'terrain') {
          const polygonCount = response.data.features.filter(f => f.properties.layer_type === 'terrain_polygon').length;
          const lineCount = response.data.features.filter(f => f.properties.layer_type === 'terrain_line').length;
          successMessage += `\n🏔️ Gồm ${polygonCount} vùng và ${lineCount} đường`;
        }

        if (layerKey === 'forestTypes') {
          const typeStats = {};
          response.data.features.forEach(feature => {
            const type = feature.properties.forest_function || "Không xác định";
            typeStats[type] = (typeStats[type] || 0) + 1;
          });
          console.log(`🌲 Thống kê 3 loại rừng:`, typeStats);
          successMessage += `\n🌲 Gồm ${Object.keys(typeStats).length} loại rừng`;
        }
        
        toast.success(successMessage);
        console.log(`✅ Đã tải ${response.data.features.length} features cho ${layerName}`);
        
        // Thông báo đang zoom
        toast.info(`🗺️ Đang zoom đến vùng ${layerName}...`);
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
      } else {
        errorMessage += `: ${err.response?.data?.error || err.message}`;
      }
      
      toast.error(errorMessage);
      setLayerLoading(layerKey, false);
    }
  };

  // Hàm load tất cả layers cơ bản cùng lúc
  const handleLoadAllBasicLayers = async () => {
    const basicLayers = [
      { key: 'administrative', name: 'Ranh giới hành chính' },
      { key: 'forestTypes', name: '3 loại rừng' },
      { key: 'forestManagement', name: 'Chủ quản lý rừng' }
    ];
    
    toast.info("🔄 Đang tải tất cả các lớp cơ bản...");
    
    const loadPromises = basicLayers.map(({ key, name }) => 
      handleLoadLayer(key, name).catch(err => {
        console.error(`Lỗi tải ${name}:`, err);
        return { error: err, layerKey: key };
      })
    );
    
    try {
      const results = await Promise.allSettled(loadPromises);
      
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      const failCount = results.length - successCount;
      
      if (failCount === 0) {
        toast.success("✅ Đã tải xong tất cả các lớp cơ bản!");
      } else {
        toast.warning(`⚠️ Đã tải xong ${successCount}/${results.length} lớp. ${failCount} lớp gặp lỗi.`);
      }
    } catch (err) {
      console.error("❌ Lỗi tổng quát khi tải layers:", err);
      toast.error("❌ Có lỗi xảy ra khi tải một số lớp");
    }
  };

  // Hàm load lớp nâng cao (chỉ có terrain)
  const handleLoadAdvancedLayer = async () => {
    await handleLoadLayer('terrain', 'Nền địa hình, thủy văn, giao thông');
  };

  return (
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
            
            {/* Nút tải nhanh */}
            <div className="mb-3 p-2 bg-green-50 rounded border border-green-200">
              <h4 className="text-sm font-semibold text-green-800 mb-2">Tải nhanh</h4>
              <div className="flex gap-2">
                <button 
                  onClick={handleLoadAllBasicLayers}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-2 rounded text-xs transition-colors"
                >
                  Tải lớp cơ bản
                </button>
                <button 
                  onClick={handleLoadAdvancedLayer}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-1 px-2 rounded text-xs transition-colors"
                >
                  Tải lớp nâng cao
                </button>
              </div>
            </div>

            {/* 1. Lớp ranh giới hành chính */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-full">Lớp ranh giới hành chính</label>
              <button 
                onClick={() => handleLoadLayer('administrative', 'Ranh giới hành chính')}
                disabled={mapLayers.administrative.loading}
                className="w-18 whitespace-nowrap bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center flex items-center justify-center disabled:opacity-50"
              >
                {mapLayers.administrative.loading ? (
                  <>
                    <ClipLoader color="#333" size={14} />
                    <span className="ml-1">Đang tải...</span>
                  </>
                ) : (
                  "Tải lên"
                )}
              </button>
            </div>

            {/* 2. Lớp 3 loại rừng */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-full">Lớp 3 loại rừng</label>
              <button 
                onClick={() => handleLoadLayer('forestTypes', '3 loại rừng')}
                disabled={mapLayers.forestTypes.loading}
                className="w-18 whitespace-nowrap bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center flex items-center justify-center disabled:opacity-50"
              >
                {mapLayers.forestTypes.loading ? (
                  <>
                    <ClipLoader color="#333" size={14} />
                    <span className="ml-1">Đang tải...</span>
                  </>
                ) : (
                  "Tải lên"
                )}
              </button>
            </div>

            {/* 3. Lớp chủ quản lý rừng */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-full">Lớp chủ quản lý rừng</label>
              <button 
                onClick={() => handleLoadLayer('forestManagement', 'Chủ quản lý rừng')}
                disabled={mapLayers.forestManagement.loading}
                className="w-18 whitespace-nowrap bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center flex items-center justify-center disabled:opacity-50"
              >
                {mapLayers.forestManagement.loading ? (
                  <>
                    <ClipLoader color="#333" size={14} />
                    <span className="ml-1">Đang tải...</span>
                  </>
                ) : (
                  "Tải lên"
                )}
              </button>
            </div>

            {/* 4. Lớp nền địa hình */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-full">Lớp nền địa hình, thủy văn, giao thông</label>
              <button 
                onClick={() => handleLoadLayer('terrain', 'Nền địa hình')}
                disabled={mapLayers.terrain.loading}
                className="w-18 whitespace-nowrap bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center flex items-center justify-center disabled:opacity-50"
              >
                {mapLayers.terrain.loading ? (
                  <>
                    <ClipLoader color="#333" size={14} />
                    <span className="ml-1">Đang tải...</span>
                  </>
                ) : (
                  "Tải lên"
                )}
              </button>
            </div>

            {/* Thông tin trạng thái */}
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium mb-2">Trạng thái các lớp:</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {Object.entries(mapLayers).map(([key, layer]) => (
                  <div key={key} className="flex items-center gap-2">
                    <div 
                      className={`w-3 h-3 rounded-full ${
                        layer.loading ? 'bg-yellow-500' : 
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
                  </div>
                ))}
              </div>
              
              {/* Thống kê tổng hợp */}
              <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                <div className="flex justify-between">
                  <span><strong>Đã tải:</strong> {Object.values(mapLayers).filter(layer => layer.data).length} lớp</span>
                  <span><strong>Hiển thị:</strong> {Object.values(mapLayers).filter(layer => layer.data && layer.visible).length} lớp</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CapNhatDuLieu;