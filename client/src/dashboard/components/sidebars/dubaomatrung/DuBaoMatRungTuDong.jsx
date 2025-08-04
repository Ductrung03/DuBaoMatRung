// client/src/dashboard/components/sidebars/dubaomatrung/DuBaoMatRungTuDong.jsx - ENHANCED VERSION
import React, { useState, useEffect } from "react";

import { toast } from "react-toastify";
import { useGeoData } from "../../../contexts/GeoDataContext";
import Select from "../../Select";

const DuBaoMatRungTuDong = () => {
  const { 
    loadAutoForecastData, 
    getAutoForecastPreview, 
    resetToDefaultData,
    loading 
  } = useGeoData();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState("01");
  const [selectedPeriod, setSelectedPeriod] = useState("Trước ngày 15");
  const [isForecastOpen, setIsForecastOpen] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [, setPreviewData] = useState(null);
  const [, setShowPreview] = useState(false);

  // Trạng thái mở cho từng dropdown
  const [openDropdown, setOpenDropdown] = useState(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: (i + 1).toString().padStart(2, "0"),
    label: `Tháng ${i + 1}`
  }));

  // ✅ LOGIC TÍNH TOÁN THỜI GIAN THEO YÊU CẦU

  // ✅ HÀM XỬ LÝ DỰ BÁO TỰ ĐỘNG - Updated to use Context
  const handleAutomaticForecast = async () => {
    try {
      setIsProcessing(true);
      
      console.log(`🔄 Dự báo tự động: ${selectedPeriod} tháng ${selectedMonth}/${selectedYear}`);
      
      // Hiển thị thông tin cho user
      const periodDescription = selectedPeriod === "Trước ngày 15" 
        ? `từ 15/${selectedMonth === "01" ? "12" : (parseInt(selectedMonth) - 1).toString().padStart(2, '0')} đến 15/${selectedMonth}`
        : `toàn bộ tháng ${selectedMonth}`;
        
      toast.info(`🔍 Đang tải dữ liệu dự báo mất rừng ${periodDescription}/${selectedYear}...`, {
        autoClose: 3000
      });

      // ✅ SỬ DỤNG CONTEXT FUNCTION thay vì gọi API trực tiếp
      const result = await loadAutoForecastData(selectedYear, selectedMonth, selectedPeriod);
      
      if (result.success) {
        const count = result.data.features?.length || 0;
        const totalAreaHa = result.summary?.total_area_ha || 0;
        
        toast.success(
          `✅ Dự báo hoàn tất: ${count} khu vực mất rừng (${totalAreaHa} ha) ${periodDescription}/${selectedYear}`,
          { autoClose: 5000 }
        );
        
        console.log(`✅ Auto forecast completed:`, {
          period: `${periodDescription}/${selectedYear}`,
          features: count,
          totalArea: `${totalAreaHa} ha`
        });
        
      } else {
        toast.warning(`⚠️ ${result.message || 'Không có dữ liệu trong khoảng thời gian này'}`);
      }

    } catch (error) {
      console.error('❌ Lỗi dự báo tự động:', error);
      toast.error(`❌ Lỗi khi thực hiện dự báo: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ HÀM RESET VỀ DỮ LIỆU MẶC ĐỊNH
  const handleResetToDefault = async () => {
    try {
      setIsProcessing(true);
      toast.info("🔄 Đang khôi phục dữ liệu mặc định...");
      
      const result = await resetToDefaultData();
      
      if (result.success) {
        toast.success("✅ Đã khôi phục dữ liệu mặc định (3 tháng gần nhất)");
        setPreviewData(null);
        setShowPreview(false);
      } else {
        toast.error("❌ Lỗi khi khôi phục dữ liệu mặc định");
      }
    } catch (error) {
      console.error("❌ Error resetting:", error);
      toast.error("❌ Lỗi khi khôi phục dữ liệu");
    } finally {
      setIsProcessing(false);
    }
  };

  // ✅ HÀM LẤY PREVIEW DATA
  const handleGetPreview = async () => {
    try {
      const result = await getAutoForecastPreview(selectedYear, selectedMonth, selectedPeriod);
      
      if (result.success) {
        setPreviewData(result.preview);
        setShowPreview(true);
        toast.success(`📊 Preview: ${result.preview.estimated_features} khu vực (${result.preview.estimated_area_ha} ha)`);
      } else {
        toast.warning("⚠️ Không thể lấy thông tin preview");
      }
    } catch (error) {
      console.error("❌ Error getting preview:", error);
      toast.error("❌ Lỗi khi lấy thông tin preview");
    }
  };

  // ✅ AUTO PREVIEW khi thay đổi parameters
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isForecastOpen) {
        handleGetPreview();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [selectedYear, selectedMonth, selectedPeriod, isForecastOpen]);

  // ✅ LẤY THÔNG TIN DỮ LIỆU HIỆN TẠI

  // Hàm xử lý khi dropdown focus hoặc blur
  const handleDropdownToggle = (dropdownName, isOpen) => {
    setOpenDropdown(isOpen ? dropdownName : null);
  };

  // ✅ ENHANCED PREVIEW LOGIC


  return (
    <div>
      {/* HEADER */}
      <div
        className="bg-forest-green-primary text-white py-0.2 px-4 rounded-full text-sm font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer hover:bg-green-800 transition-colors"
        onClick={() => setIsForecastOpen(!isForecastOpen)}
      >
        <div className="flex items-center justify-between">
          <span>Dự báo mất rừng tự động</span>
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
            <div className="flex items-center gap-0.5">
              <label className="text-sm font-medium w-20">Năm</label>
              <div className="relative w-36">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full border border-green-400 rounded-md py-0.5 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  onFocus={() => handleDropdownToggle("year", true)}
                  onBlur={() => handleDropdownToggle("year", false)}
                >
                  {years.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                <Select isOpen={openDropdown === "year"} />
              </div>
            </div>

            {/* Tháng */}
            <div className="flex items-center gap-0.5">
              <label className="text-sm font-medium w-20">Tháng</label>
              <div className="relative w-36">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full border border-green-400 rounded-md py-0.5 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  onFocus={() => handleDropdownToggle("month", true)}
                  onBlur={() => handleDropdownToggle("month", false)}
                >
                  {months.map((month) => (
                    <option key={month.value} value={month.value}>
                      {month.label}
                    </option>
                  ))}
                </select>
                <Select isOpen={openDropdown === "month"} />
              </div>
            </div>

            {/* Kỳ */}
            <div className="flex items-center gap-0.5">
              <label className="text-sm font-medium w-20">Kỳ</label>
              <div className="relative w-36">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full border border-green-400 rounded-md py-0.2 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  onFocus={() => handleDropdownToggle("period", true)}
                  onBlur={() => handleDropdownToggle("period", false)}
                >
                  <option value="Trước ngày 15">Trước ngày 15</option>
                  <option value="Sau ngày 15">Sau ngày 15</option>
                </select>
                <Select isOpen={openDropdown === "period"} />
              </div>
            </div>
          </div>

          {/* ✅ ENHANCED BUTTONS */}
          <div className="flex gap-2 mt-2 justify-center">
            <button 
              onClick={handleAutomaticForecast}
              disabled={isProcessing || loading}
              className={`flex-1 ${
                isProcessing || loading
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-forest-green-gray hover:bg-green-200 hover:shadow-md'
              } text-black-800 font-medium py-1 px-3 rounded-full text-center transition-all duration-200`}
            >
              {isProcessing ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  Đang xử lý...
                </span>
              ) : (
                'Dự báo'
              )}
            </button>

            <button 
              onClick={handleResetToDefault}
              disabled={isProcessing || loading}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
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