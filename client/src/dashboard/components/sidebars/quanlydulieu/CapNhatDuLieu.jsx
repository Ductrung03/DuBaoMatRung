// client/src/dashboard/components/sidebars/quanlydulieu/CapNhatDuLieu.jsx - UPDATED
import React, { useState } from "react";
import { useGeoData } from "../../../contexts/GeoDataContext";
import { toast } from "react-toastify";
import { ClipLoader } from 'react-spinners';
import { useIsMobile } from "../../../../hooks/useMediaQuery";

const CapNhatDuLieu = () => {
  const [isOpen, setIsOpen] = useState(true);
  const { mapLayers, loadSingleLayer, loadAllDefaultLayers } = useGeoData();
  const isMobile = useIsMobile();
  
  // Loading state cho nút "Tải tất cả"
  const [loadingAll, setLoadingAll] = useState(false);

  // ✅ HÀM MỚI: Load tất cả layers (trừ forestTypes)
  // eslint-disable-next-line no-unused-vars
  const handleLoadAllLayers = async () => {
    setLoadingAll(true);
    
    try {
      toast.info(`🚀 Đang tải lại tất cả dữ liệu...`, { autoClose: 2000 });
      await loadAllDefaultLayers();
      toast.success(`🎉 Đã tải lại thành công tất cả dữ liệu!`, { autoClose: 3000 });
    } catch (error) {
      console.error('Lỗi khi tải tất cả layers:', error);
      toast.error('❌ Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoadingAll(false);
    }
  };

  // ✅ HÀM CẬP NHẬT: Sử dụng loadSingleLayer từ context
  const handleLoadLayer = async (layerKey) => {
    await loadSingleLayer(layerKey);
  };

  // Get enhanced status indicator

  return (
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
        <div className="flex flex-col gap-3 px-1 sm:px-2 pt-3">
          
         
         

          {/* ✅ DANH SÁCH CÁC LAYER - Phân biệt WMS vs GeoJSON */}
          <div className="flex flex-col gap-2">
            {Object.entries(mapLayers).map(([layerKey, layer]) => {
              const isWMS = layer.layerType === 'wms';
              const isGeoJSON = layer.layerType === 'geojson';

              return (
                <div key={layerKey} className={`flex ${isMobile ? 'flex-col' : 'items-center justify-between'} gap-2 p-2 sm:p-3 border rounded-md hover:bg-gray-50`}>
                  <div className="flex-1">
                    <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                      {/* Icon theo layer - SƠN LA 3 LAYERS */}
                      {layerKey === 'ranhgioixa' && '🏘️'}
                      {layerKey === 'tieukukhoanh' && '📐'}
                      {layerKey === 'hientrangrung' && '🌳'}
                      {layerKey === 'deforestationAlerts' && '⚠️'}

                      <span>{layer.name}</span>

                      {/* Badge hiển thị loại layer */}
                      {isWMS && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                          WMS
                        </span>
                      )}
                      {isGeoJSON && (
                        <span className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded">
                          GeoJSON
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Button khác nhau cho WMS vs GeoJSON */}
                  <button
                    onClick={() => handleLoadLayer(layerKey)}
                    disabled={layer.loading || loadingAll}
                    className={`${
                      isWMS
                        ? (layer.visible ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-400 hover:bg-gray-500')
                        : 'bg-green-600 hover:bg-green-700'
                    } text-white font-medium py-2 px-3 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                      isMobile ? 'w-full' : 'min-w-[80px]'
                    } min-h-[44px] flex items-center justify-center`}
                  >
                    {layer.loading ? (
                      <ClipLoader color="#ffffff" size={12} />
                    ) : (
                      <>
                        {isWMS && (layer.visible ? '👁️ Hiển thị' : '🙈 Ẩn')}
                        {isGeoJSON && (
                          <>
                            {layer.data ? "🔄 Tải lại" : "📥 Tải"}
                            {layerKey === 'deforestationAlerts' && !layer.data?.autoLoaded && (
                              <span className="block text-xs opacity-75">1 năm</span>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* ✅ THỐNG KÊ TỔNG QUAN */}
          

        </div>
      )}
    </div>
  );
};

export default CapNhatDuLieu;