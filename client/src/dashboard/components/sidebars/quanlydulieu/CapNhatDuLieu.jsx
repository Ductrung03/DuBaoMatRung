// client/src/dashboard/components/sidebars/quanlydulieu/CapNhatDuLieu.jsx - UPDATED
import React, { useState } from "react";
import { useGeoData } from "../../../contexts/GeoDataContext";
import { toast } from "react-toastify";
import { ClipLoader } from 'react-spinners';

const CapNhatDuLieu = () => {
  const [isOpen, setIsOpen] = useState(true);
  const { mapLayers, loadSingleLayer, loadAllDefaultLayers } = useGeoData();
  
  // Loading state cho nút "Tải tất cả"
  const [loadingAll, setLoadingAll] = useState(false);

  // ✅ HÀM MỚI: Load tất cả layers (trừ forestTypes)
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
  const getStatusIndicator = (layerKey) => {
    const layer = mapLayers[layerKey];
    
    if (layer.loading) return <span className="text-yellow-600">⏳ Đang tải...</span>;
    if (layer.data) {
      let status = <span className="text-green-600">✅ Đã tải</span>;
      
      // Hiển thị nguồn dữ liệu
      if (layer.data.autoLoaded) {
        status = <span className="text-blue-600">🚀 Tự động</span>;
      } else if (layer.data.loadStrategy === 'manual_load') {
        status = <span className="text-green-600">✅ Thủ công</span>;
      }
      
      return status;
    }
    return <span className="text-gray-500">➖ Chưa tải</span>;
  };

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
        <div className="flex flex-col gap-3 px-1 pt-3">
          
         
         

          {/* ✅ DANH SÁCH CÁC LAYER RIÊNG LẺ */}
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
                  
                
                </div>
                
                <button 
                  onClick={() => handleLoadLayer(layerKey)}
                  disabled={layer.loading || loadingAll}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-1 px-3 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[70px]"
                >
                  {layer.loading ? (
                    <ClipLoader color="#ffffff" size={12} />
                  ) : (
                    <>
                      {layer.data ? "🔄 Tải lại" : "📥 Tải"}
                      {layerKey === 'deforestationAlerts' && !layer.data?.autoLoaded && (
                        <span className="block text-xs opacity-75">1 năm</span>
                      )}
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* ✅ THỐNG KÊ TỔNG QUAN */}
          

        </div>
      )}
    </div>
  );
};

export default CapNhatDuLieu;