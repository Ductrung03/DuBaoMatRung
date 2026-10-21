// client/src/dashboard/components/sidebars/dubaomatrung/DuBaoMatRungTuDong.jsx - ENHANCED VERSION
import React, { useState } from "react";

import { toast } from "react-toastify";
import { useGeoData } from "../../../contexts/GeoDataContext";
import Dropdown from "../../../../components/Dropdown";


const DuBaoMatRungTuDong = () => {
  const { 
    loadAutoForecastData, 
    resetToDefaultData,
    loading,isMapActionCurrent
  } = useGeoData();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState("01");
  const [selectedPeriod, setSelectedPeriod] = useState("Trước ngày 15");
  const [isForecastOpen, setIsForecastOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString().padStart(2, "0"),
    label: `Tháng ${i + 1}`
  }));

  // ✅ LOGIC TÍNH TOÁN THỜI GIAN THEO YÊU CẦU

  // ✅ HÀM XỬ LÝ DỰ BÁO TỰ ĐỘNG - Updated to use Context
  const handleAutomaticForecast = async () => {
    if(!/^\d{4}$/.test(selectedYear)||!/^(0[1-9]|1[0-2])$/.test(selectedMonth)||!['Trước ngày 15','Sau ngày 15'].includes(selectedPeriod)){toast.warning('Vui lòng chọn đầy đủ năm, tháng và kỳ');return;}
    try {
      setIsProcessing(true);
      
      
      // Hiển thị thông tin cho user
      const periodDescription = selectedPeriod === "Trước ngày 15" 
        ? `từ 15/${selectedMonth === "01" ? "12" : (parseInt(selectedMonth) - 1).toString().padStart(2, '0')} đến 15/${selectedMonth}`
        : `toàn bộ tháng ${selectedMonth}`;
        
      toast.info(`🔍 Đang tải dữ liệu phân tích mất rừng ${periodDescription}/${selectedYear}...`, {
        autoClose: 3000
      });

      // ✅ SỬ DỤNG CONTEXT FUNCTION thay vì gọi API trực tiếp
      const result = await loadAutoForecastData(selectedYear, selectedMonth, selectedPeriod);
      if(!isMapActionCurrent()||result.cancelled)return;
      
      if (result.success) {
        const count = result.data.features?.length || 0;
        const totalAreaHa = result.summary?.total_area_ha || 0;

        toast.success(
          `✅ Phân tích hoàn tất: ${count} khu vực mất rừng (${totalAreaHa} ha) ${periodDescription}/${selectedYear}. Xem bảng dữ liệu bên dưới bản đồ!`,
          { autoClose: 5000, position: "top-center" }
        );

        // ✅ Tự động scroll xuống để user thấy bảng dữ liệu
        setTimeout(() => {
          if(!isMapActionCurrent())return;
          const mapElement = document.querySelector('.leaflet-container');
          if (mapElement) {
            mapElement.scrollIntoView({
              behavior: 'smooth',
              block: 'start'
            });

            // Scroll thêm một chút để thấy cả table
            setTimeout(() => {
              if(!isMapActionCurrent())return;
              window.scrollBy({
                top: 100,
                behavior: 'smooth'
              });
            }, 500);
          }
        }, 300);

      } else {
        toast.warning(`⚠️ ${result.message || 'Không có dữ liệu trong khoảng thời gian này'}`);
      }

    } catch (error) {
      if(!isMapActionCurrent())return;
      console.error('❌ Lỗi dự báo tự động:', error);
      toast.error(`❌ Lỗi khi thực hiện phân tích: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ HÀM RESET VỀ DỮ LIỆU MẶC ĐỊNH
  const handleResetToDefault = async () => {
    try {
      setIsProcessing(true);
      
      const result = await resetToDefaultData();
      if(!isMapActionCurrent())return;
      
      if (!result.success) {
        toast.error("❌ Lỗi khi khôi phục dữ liệu mặc định");
      }
    } catch (error) {
      if(!isMapActionCurrent())return;
      console.error("❌ Error resetting:", error);
      toast.error("❌ Lỗi khi khôi phục dữ liệu");
    } finally {
      setIsProcessing(false);
    }
  };


  // ✅ LẤY THÔNG TIN DỮ LIỆU HIỆN TẠI



  // ✅ ENHANCED PREVIEW LOGIC


  return (
    <div>
      {/* HEADER */}
      <div
        className="bg-forest-green-primary text-white py-0.2 px-4 rounded-full text-sm font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer hover:bg-green-800 transition-colors"
        onClick={() => setIsForecastOpen(!isForecastOpen)}
      >
        <div className="flex items-center justify-between">
          <span>Giám sát mất rừng tự động</span>
          <span className={`transform transition-transform ${isForecastOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </div>
      </div>

      {isForecastOpen && (
        <div className="flex flex-col gap-3 px-1 pt-3">
          
         
          
       

          {/* Container để căn chỉnh */}
          <div className="flex flex-col gap-3">

            {/* Năm */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <label className="text-sm font-medium w-full sm:w-16 flex-shrink-0">Năm</label>
              <div className="flex-1 min-w-0 overflow-hidden">
                <Dropdown
                  selectedValue={selectedYear}
                  onValueChange={setSelectedYear}
                  options={years.map(year => ({ value: year.toString(), label: year.toString() }))}
                  placeholder="Chọn năm"
                  disabled={isProcessing || loading}
                  loading={isProcessing || loading}
                  className="border border-green-400 rounded-md bg-white w-full"
                  selectClassName="text-sm py-1.5 sm:py-1"
                />
              </div>
            </div>

            {/* Tháng */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <label className="text-sm font-medium w-full sm:w-16 flex-shrink-0">Tháng</label>
              <div className="flex-1 min-w-0 overflow-hidden">
                <Dropdown
                  selectedValue={selectedMonth}
                  onValueChange={setSelectedMonth}
                  options={months}
                  placeholder="Chọn tháng"
                  disabled={isProcessing || loading}
                  loading={isProcessing || loading}
                  className="border border-green-400 rounded-md bg-white w-full"
                  selectClassName="text-sm py-1.5 sm:py-1"
                />
              </div>
            </div>

            {/* Kỳ */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <label className="text-sm font-medium w-full sm:w-16 flex-shrink-0">Kỳ</label>
              <div className="flex-1 min-w-0 overflow-hidden">
                <Dropdown
                  selectedValue={selectedPeriod}
                  onValueChange={setSelectedPeriod}
                  options={[{ value: "Trước ngày 15", label: "Trước ngày 15" }, { value: "Sau ngày 15", label: "Sau ngày 15" }]}
                  placeholder="Chọn kỳ"
                  disabled={isProcessing || loading}
                  loading={isProcessing || loading}
                  className="border border-green-400 rounded-md bg-white w-full"
                  selectClassName="text-sm py-1.5 sm:py-1"
                />
              </div>
            </div>
          </div>

          {/* ✅ ENHANCED BUTTONS */}
          <div className="flex flex-col sm:flex-row gap-2 mt-2 justify-center">
            <button
              onClick={handleAutomaticForecast}
              disabled={isProcessing || loading}
              className={`flex-1 min-h-[44px] sm:min-h-0 ${
                isProcessing || loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-forest-green-gray hover:bg-green-200 hover:shadow-md'
              } text-black-800 font-medium py-2 sm:py-1 px-3 rounded-full text-center transition-all duration-200`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  Đang xử lý...
                </span>
              ) : (
                'Phân tích'
              )}
            </button>

            <button
              onClick={handleResetToDefault}
              disabled={isProcessing || loading}
              className={`w-full sm:w-auto min-h-[44px] sm:min-h-0 px-3 py-2 sm:py-1 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 ${
                isProcessing || loading
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200 hover:shadow-sm'
              }`}
              title="Khôi phục dữ liệu mặc định"
            >
              🔄 Reset
            </button>
          </div>

          {/* ✅ HELP TEXT */}
         
        </div>
      )}
    </div>
  );
};

export default DuBaoMatRungTuDong;
