import React, { useState } from "react";
import axios from "axios";
import { useGeoData } from "../../../contexts/GeoDataContext";
import config from "../../../../config";
import { toast } from "react-toastify";
import { ClipLoader } from 'react-spinners';

const CapNhatDuLieu = () => {
  const [isForecastOpen, setIsForecastOpen] = useState(true);
  const { updateLayerData, setLayerLoading, mapLayers } = useGeoData();

  // Hàm load dữ liệu cho từng layer
  const handleLoadLayer = async (layerType, layerName) => {
    try {
      setLayerLoading(layerType, true);
      console.log(`🔄 Đang tải dữ liệu cho layer: ${layerName}`);
      
      const response = await axios.get(`${config.API_URL}/api/layer-data/${layerType}`);
      
      if (response.data && response.data.features) {
        // Thêm metadata để xác định loại layer
        const layerData = {
          ...response.data,
          layerType: layerType
        };
        
        updateLayerData(layerType, layerData);
        toast.success(`✅ Đã tải ${layerName} thành công! (${response.data.features.length} đối tượng)`);
        console.log(`✅ Đã tải ${response.data.features.length} features cho ${layerName}`);
      } else {
        toast.warning(`⚠️ Không có dữ liệu cho ${layerName}`);
      }
    } catch (err) {
      console.error(`❌ Lỗi khi tải ${layerName}:`, err);
      toast.error(`❌ Không thể tải ${layerName}: ${err.response?.data?.error || err.message}`);
      setLayerLoading(layerType, false);
    }
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
            
            {/* Lớp ranh giới hành chính */}
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

            {/* Lớp ranh giới 3 loại rừng */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-full">Lớp ranh giới 3 loại rừng</label>
              <button 
                onClick={() => handleLoadLayer('forest-types', '3 loại rừng')}
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

            {/* Lớp địa hình, thủy văn, giao thông */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-full">Lớp địa hình, thủy văn, giao thông</label>
              <button 
                onClick={() => handleLoadLayer('terrain', 'Địa hình, thủy văn')}
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

            {/* Lớp ranh giới chủ quản lý rừng */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-96">Lớp ranh giới chủ quản lý rừng</label>
              <button 
                onClick={() => handleLoadLayer('forest-management', 'Chủ quản lý rừng')}
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

            {/* Lớp hiện trạng rừng */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-full">Lớp hiện trạng rừng</label>
              <button 
                onClick={() => handleLoadLayer('forest-status', 'Hiện trạng rừng')}
                disabled={mapLayers.forestStatus.loading}
                className="w-18 whitespace-nowrap bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center flex items-center justify-center disabled:opacity-50"
              >
                {mapLayers.forestStatus.loading ? (
                  <>
                    <ClipLoader color="#333" size={14} />
                    <span className="ml-1">Đang tải...</span>
                  </>
                ) : (
                  "Tải lên"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CapNhatDuLieu;