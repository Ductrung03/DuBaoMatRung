// client/src/dashboard/components/sidebars/quanlydulieu/XacMinhDuBaoMatRung.jsx - FIXED SEARCH LOGIC
import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { ClipLoader } from "react-spinners";
import { useGeoData } from "../../../contexts/GeoDataContext";
import { useAuth } from "../../../contexts/AuthContext";
import config from "../../../../config";
import Dropdown from "../../../../components/Dropdown";
import { useIsMobile } from "../../../../hooks/useMediaQuery";
import BulkVerificationModal from "./BulkVerificationModal";

const XacMinhDuBaoMatRung = () => {
  const { geoData, setGeoData } = useGeoData();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  
  const nguyenNhanList = [
    "Khai thác rừng trái phép",
    "Chuyển đổi mục đích sử dụng đất",
    "Cháy rừng",
    "Khai thác khoáng sản",
    "Sạt lở đất",
    "Tự nhiên phục hồi",
    "Sai sót dữ liệu",
    "Nguyên nhân khác",
  ];

  const [isForecastOpen, setIsForecastOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    maLoDuBao: "",
    nguyenNhan: "",
    dienTichThucTe: "",
    nguoiXacMinh: user?.full_name || "",
    ngayXacMinh: "",
    ghiChu: ""
  });

  // Selected record state
  const [selectedRecord, setSelectedRecord] = useState(null);

  // ✅ FIX: Hàm tìm kiếm được sửa hoàn toàn
  const handleTimKiem = async () => {
    if (!formData.maLoDuBao.trim()) {
      toast.warning("Vui lòng nhập mã lô dự báo");
      return;
    }

    setSearchLoading(true);
    
    try {
      const gidToSearch = formData.maLoDuBao.trim();

      // ✅ FIX: Gọi API search đã được sửa
      const response = await axios.get(
        `/api/search/mat-rung/${gidToSearch}`,
        {
          params: { radius: 10000 }, // Tăng radius lên 10km để tìm nhiều hơn
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        const { target_feature, geojson, center, bbox } = response.data.data;

        // ✅ FIX: Set selectedRecord từ target_feature
        setSelectedRecord(target_feature);
        
        // ✅ FIX: Đảm bảo target feature luôn ở đầu array
        const sortedFeatures = [
          target_feature, // Target luôn đầu tiên
          ...geojson.features.filter(f => f.properties.gid !== target_feature.properties.gid)
        ];
        
        const sortedGeoJSON = {
          ...geojson,
          features: sortedFeatures
        };
        
        // ✅ FIX: Load GeoJSON với target ở đầu
        setGeoData(sortedGeoJSON);
        
        // ✅ FIX: Điền thông tin target vào form
        const props = target_feature.properties;
        setFormData(prev => ({
          ...prev,
          dienTichThucTe: props.verified_area ? (props.verified_area / 10000).toFixed(2) : "",
          nguyenNhan: props.verification_reason || "",
          nguoiXacMinh: user?.full_name || "",
          ngayXacMinh: props.detection_date || "",
          ghiChu: props.verification_notes || ""
        }));

        // ✅ FIX: Zoom map đến target feature với delay
        setTimeout(() => {
          const zoomEvent = new CustomEvent('zoomToFeature', {
            detail: { 
              feature: target_feature,
              center: center,
              bbox: bbox,
              zoom: 16 // Zoom level cao để thấy rõ
            }
          });
          window.dispatchEvent(zoomEvent);
          
        }, 500);

        // ✅ FIX: Highlight row trong table với delay
        setTimeout(() => {
          const tableEvent = new CustomEvent('highlightTableRow', {
            detail: { 
              feature: target_feature,
              gid: target_feature.properties.gid
            }
          });
          window.dispatchEvent(tableEvent);
          
        }, 1000);

        toast.success(`✅ Đã tìm thấy PH-${gidToSearch} và load ${sortedFeatures.length} khu vực`, {
          autoClose: 3000
        });

      } else {
        toast.error(response.data.message || "Không tìm thấy dữ liệu");
        setSelectedRecord(null);
      }

    } catch (error) {
      console.error("❌ Lỗi tìm kiếm:", error);
      
      let errorMessage = "Có lỗi xảy ra khi tìm kiếm";
      
      if (error.response?.status === 404) {
        errorMessage = `❌ Không tìm thấy lô PH-${formData.maLoDuBao} trong cơ sở dữ liệu`;
      } else if (error.response?.status === 401) {
        errorMessage = "❌ Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error(errorMessage, { autoClose: 5000 });
      setSelectedRecord(null);
      
    } finally {
      setSearchLoading(false);
    }
  };

  // ✅ FIX: Hàm xác minh với validation tốt hơn
  const handleCapNhat = async () => {
    if (!selectedRecord) {
      toast.warning("Vui lòng tìm kiếm và chọn lô dự báo trước khi cập nhật");
      return;
    }

    if (!formData.nguyenNhan) {
      toast.error("Vui lòng chọn nguyên nhân");
      return;
    }

    // Validate diện tích nếu có nhập
    if (formData.dienTichThucTe && formData.dienTichThucTe.trim()) {
      const dienTich = parseFloat(formData.dienTichThucTe);
      if (isNaN(dienTich) || dienTich <= 0) {
        toast.error("Diện tích thực tế phải là số hợp lệ và lớn hơn 0");
        return;
      }
    }

    setLoading(true);
    
    try {
      const gid = selectedRecord.properties.gid;

      // Chuẩn bị dữ liệu xác minh
      const verificationData = {
        verification_reason: formData.nguyenNhan,
        verification_notes: formData.ghiChu || null,
        verified_area: formData.dienTichThucTe && formData.dienTichThucTe.trim()
          ? parseFloat(formData.dienTichThucTe) * 10000 // ha → m²
          : null,
        detection_date: formData.ngayXacMinh || null
      };


      // Gọi API xác minh
      const response = await axios.post(
        `/api/verification/mat-rung/${gid}/verify`,
        verificationData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        const updatedData = response.data.data;
        const changes = response.data.meta?.changes || {};


        // ✅ FIX: Cập nhật dữ liệu local ngay lập tức
        if (geoData && geoData.features) {
          const updatedFeatures = geoData.features.map(feature => {
            if (feature.properties.gid === gid) {
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  detection_status: updatedData.detection_status,
                  verification_reason: updatedData.verification_reason,
                  verified_area: updatedData.verified_area,
                  dtichXM: updatedData.verified_area,  // sync dtichXM với verified_area
                  verification_notes: updatedData.verification_notes,
                  detection_date: updatedData.detection_date,
                  verified_by: updatedData.verified_by,
                  verified_by_name: updatedData.verified_by_name
                }
              };
            }
            return feature;
          });

          setGeoData({
            ...geoData,
            features: updatedFeatures
          });
        }

        // Hiển thị thông báo chi tiết
        let successMessage = `✅ Đã xác minh thành công PH-${gid}!`;
        if (changes && changes.area_changed) {
          successMessage += `\n📏 Diện tích: ${(changes.original_area / 10000).toFixed(2)} ha → ${(changes.new_verified_area / 10000).toFixed(2)} ha`;
        } else if (changes && changes.original_area) {
          successMessage += `\n📏 Diện tích: Giữ nguyên ${(changes.original_area / 10000).toFixed(2)} ha`;
        }
        if (changes && changes.verification_date_used) {
          successMessage += `\n📅 Ngày: ${changes.verification_date_used}`;
        }
        if (changes && changes.verified_by_user) {
          successMessage += `\n👤 Người XM: ${changes.verified_by_user}`;
        }

        toast.success(successMessage, { autoClose: 5000 });
        
        // ✅ FIX: Reset form nhưng giữ mã lô để tiện tìm kiếm tiếp
        const currentMaLo = formData.maLoDuBao;
        setFormData({
          maLoDuBao: currentMaLo, // Giữ mã lô
          nguyenNhan: "",
          dienTichThucTe: "",
          nguoiXacMinh: user?.full_name || "",
          ngayXacMinh: "",
          ghiChu: ""
        });
        
        // Clear selected record để force tìm kiếm lại
        setSelectedRecord(null);

        // ✅ FIX: Refresh table để hiển thị trạng thái mới
        setTimeout(() => {
          const refreshEvent = new CustomEvent('refreshTable', {
            detail: { gid: gid }
          });
          window.dispatchEvent(refreshEvent);
        }, 1000);

      } else {
        toast.error(`❌ ${response.data.message}`);
      }

    } catch (error) {
      console.error("❌ Lỗi xác minh:", error);
      
      let errorMessage = "Có lỗi xảy ra khi xác minh";
      
      if (error.response?.status === 404) {
        errorMessage = "Không tìm thấy lô dự báo cần xác minh";
      } else if (error.response?.status === 400) {
        errorMessage = `Dữ liệu không hợp lệ: ${error.response.data.message}`;
      } else if (error.response?.status === 401) {
        errorMessage = "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }
      
      toast.error("❌ " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Hàm xử lý thay đổi input
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Hàm xử lý thay đổi nguyên nhân
  const handleNguyenNhanChange = (value) => {
    setFormData(prev => ({
      ...prev,
      nguyenNhan: value
    }));
  };

  return (
    <div>
      {/* Bulk verification modal */}
      {showBulkModal && (
        <BulkVerificationModal
          onClose={() => setShowBulkModal(false)}
          onDone={() => {
            setShowBulkModal(false);
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent("refreshTable", { detail: {} }));
            }, 500);
          }}
        />
      )}

      {/* Loading overlay */}
      {(loading || searchLoading) && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999]">
          <div className="bg-white p-8 rounded-lg shadow-2xl max-w-sm w-full mx-4">
            <div className="flex flex-col items-center space-y-4">
              <ClipLoader color="#027e02" size={40} />
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-800 mb-2">
                  {searchLoading ? "Đang tìm kiếm..." : "Đang xác minh..."}
                </div>
                <div className="text-sm text-gray-600">
                  {searchLoading 
                    ? `Đang tìm PH-${formData.maLoDuBao} trong cơ sở dữ liệu...`
                    : `Đang lưu xác minh cho PH-${selectedRecord?.properties?.gid}...`
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="bg-forest-green-primary text-white py-0.2 px-4 rounded-full text-sm font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer"
        onClick={() => setIsForecastOpen(!isForecastOpen)}
      >
        Xác minh phân tích mất rừng
      </div>

      {/* Nút xác minh hàng loạt */}
      <button
        onClick={() => setShowBulkModal(true)}
        className="w-full mt-2 flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 text-emerald-800 font-semibold py-2.5 px-4 rounded-lg border-2 border-emerald-400 hover:border-emerald-500 transition-all shadow-sm hover:shadow text-sm"
      >
        <span className="text-base">📥</span>
        <span>Nhập xác minh từ file Excel</span>
      </button>

      {isForecastOpen && (
        <div className="flex flex-col gap-2 px-1 sm:px-2 pt-3">


          {/* ✅ FIX: Hiển thị thông tin lô được tìm thấy */}
          {selectedRecord && (
            <div className={`mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md ${isMobile ? 'text-sm' : ''}`}>
              <div className="text-sm font-medium text-blue-800">
                🎯 Đang xác minh: <span className="font-bold text-red-600">CB-{selectedRecord.properties.gid}</span>
              </div>
              <div className="text-xs text-blue-600 mt-1">
                📏 Diện tích: {selectedRecord.properties.area ? (selectedRecord.properties.area / 10000).toFixed(2) : 'N/A'} ha
                {selectedRecord.properties.huyen && ` | 🏛️ ${selectedRecord.properties.huyen}`}
                {selectedRecord.properties.xa && ` | 🏘️ ${selectedRecord.properties.xa}`}
              </div>
              {selectedRecord.properties.detection_status === 'Đã xác minh' && (
                <div className="text-xs text-green-600 mt-1 font-medium">
                  ✅ Đã xác minh: {selectedRecord.properties.verified_by_name || 'N/A'}
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <div className="flex flex-col gap-3">
            {/* Mã lô dự báo */}
            <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-1'}`}>
              <label className={`text-sm font-medium ${isMobile ? '' : 'w-40'}`}>Mã lô CB</label>
              <div className={`flex ${isMobile ? 'flex-col' : 'items-center'} gap-2 ${isMobile ? 'w-full' : 'w-36'}`}>
                <input
                  type="text"
                  value={formData.maLoDuBao}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      handleInputChange('maLoDuBao', value);
                      // Clear selected khi thay đổi mã
                      if (selectedRecord && value !== selectedRecord.properties.gid.toString()) {
                        setSelectedRecord(null);
                      }
                    }
                  }}
                  placeholder="VD: 3619"
                  className={`${isMobile ? 'w-full' : 'w-16'} border border-green-400 rounded-md py-2 px-3 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400`}
                  disabled={loading || searchLoading}
                />
                <button
                  onClick={handleTimKiem}
                  disabled={loading || searchLoading || !formData.maLoDuBao.trim()}
                  className={`${isMobile ? 'w-full' : 'w-16'} bg-forest-green-gray hover:bg-green-200 text-black-800 whitespace-nowrap font-medium py-2 px-2 rounded-md text-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] flex items-center justify-center`}
                >
                  {searchLoading ? (
                    <ClipLoader color="#027e02" size={12} />
                  ) : (
                    "Tìm"
                  )}
                </button>
              </div>
            </div>

            {/* Nguyên nhân */}
            <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-1'}`}>
              <label className={`text-sm font-medium ${isMobile ? '' : 'w-24 flex-shrink-0'}`}>Nguyên nhân *</label>
              <div className={isMobile ? 'w-full' : 'flex-1 min-w-0 overflow-hidden'}>
                <Dropdown
                  selectedValue={formData.nguyenNhan}
                  onValueChange={handleNguyenNhanChange}
                  options={nguyenNhanList.map(nn => ({ value: nn, label: nn }))}
                  placeholder="Chọn nguyên nhân"
                  disabled={loading || searchLoading}
                  loading={loading || searchLoading}
                  className={`border border-green-400 rounded-md bg-white ${isMobile ? 'w-full' : ''}`}
                  selectClassName="text-sm py-2"
                />
              </div>
            </div>

            {/* Diện tích thực tế */}
            <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-1'}`}>
              <label className={`text-sm font-medium ${isMobile ? '' : 'w-40'}`}>
                Diện tích thực tế (ha)
              </label>
              <div className={`relative ${isMobile ? 'w-full' : 'w-36'}`}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.dienTichThucTe}
                  onChange={(e) => handleInputChange('dienTichThucTe', e.target.value)}
                  className="w-full border border-green-400 rounded-md py-2 px-3 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  disabled={loading || searchLoading}
                />
              </div>
            </div>

            {/* Người xác minh */}
            <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-1'}`}>
              <label className={`text-sm font-medium ${isMobile ? '' : 'w-40'}`}>Người xác minh</label>
              <div className={`relative ${isMobile ? 'w-full' : 'w-36'}`}>
                <input
                  type="text"
                  value={formData.nguoiXacMinh}
                  readOnly
                  className="w-full border border-gray-300 rounded-md py-2 px-3 appearance-none bg-gray-100 text-gray-700 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Ngày xác minh */}
            <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-1'}`}>
              <label className={`text-sm font-medium ${isMobile ? '' : 'w-40'}`}>Ngày xác minh</label>
              <div className={`relative ${isMobile ? 'w-full' : 'w-36'}`}>
                <input
                  type="date"
                  value={formData.ngayXacMinh}
                  onChange={(e) => handleInputChange('ngayXacMinh', e.target.value)}
                  className="w-full border border-green-400 rounded-md py-2 px-3 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  disabled={loading || searchLoading}
                />
              </div>
            </div>

            {/* Ghi chú */}
            <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-1'}`}>
              <label className={`text-sm font-medium ${isMobile ? '' : 'w-40'}`}>Ghi chú</label>
              <div className={`relative ${isMobile ? 'w-full' : 'w-36'}`}>
                <textarea
                  value={formData.ghiChu}
                  onChange={(e) => handleInputChange('ghiChu', e.target.value)}
                  placeholder="Ghi chú thêm..."
                  rows="2"
                  className="w-full border border-green-400 rounded-md py-2 px-3 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                  disabled={loading || searchLoading}
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleCapNhat}
            disabled={loading || searchLoading || !selectedRecord || !formData.nguyenNhan}
            className={`${isMobile ? 'w-full' : 'w-36'} bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-2.5 px-3 rounded-full text-center mt-3 ${isMobile ? '' : 'self-center'} disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center min-h-[44px]`}
          >
            {loading ? (
              <>
                <ClipLoader color="#027e02" size={14} />
                <span className="ml-2">Đang lưu...</span>
              </>
            ) : (
              "Xác minh"
            )}
          </button>

         
          
        </div>
      )}
    </div>
  );
};

export default XacMinhDuBaoMatRung;