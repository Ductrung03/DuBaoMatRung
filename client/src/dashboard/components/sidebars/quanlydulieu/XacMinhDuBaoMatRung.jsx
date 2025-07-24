// client/src/dashboard/components/sidebars/quanlydulieu/XacMinhDuBaoMatRung.jsx - UPDATED
import React, { useState } from "react";
import Select from "../../Select";
import axios from "axios";
import { toast } from "react-toastify";
import { ClipLoader } from "react-spinners";
import { useGeoData } from "../../../contexts/GeoDataContext";
import { useAuth } from "../../../contexts/AuthContext";
import config from "../../../../config";

const XacMinhDuBaoMatRung = () => {
  const { geoData, setGeoData } = useGeoData();
  const { user } = useAuth(); // Lấy thông tin user để hiển thị
  
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
  const [openDropdown, setOpenDropdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    maLoDuBao: "",
    nguyenNhan: "",
    dienTichThucTe: "", // Để trống = giữ nguyên
    nguoiXacMinh: user?.full_name || "", // Auto fill từ user
    ngayXacMinh: "", // Để trống = ngày hiện tại
    ghiChu: ""
  });

  // Selected record state
  const [selectedRecord, setSelectedRecord] = useState(null);

  // 🆕 HÀM TÌM KIẾM TRONG CSDL
  const handleTimKiem = async () => {
    if (!formData.maLoDuBao.trim()) {
      toast.warning("Vui lòng nhập mã lô dự báo");
      return;
    }

    setSearchLoading(true);
    
    try {
      console.log("🔍 Tìm kiếm trong CSDL mã lô dự báo:", formData.maLoDuBao);

      // Gọi API tìm kiếm trong CSDL
      const response = await axios.get(
        `${config.API_URL}/api/search/mat-rung/${formData.maLoDuBao}`,
        {
          params: { radius: 5000 }, // Tìm kiếm trong bán kính 5km
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (response.data.success) {
        const { target_feature, geojson, center, bbox } = response.data.data;
        
        console.log("✅ Tìm thấy lô CB trong CSDL:", target_feature);

        // Cập nhật selectedRecord
        setSelectedRecord(target_feature);
        
        // 🆕 LOAD DỮ LIỆU XUNG QUANH VÀO GEODATA
        setGeoData(geojson);
        
        // 🆕 Điền thông tin hiện tại vào form
        const props = target_feature.properties;
        setFormData(prev => ({
          ...prev,
          dienTichThucTe: props.verified_area ? (props.verified_area / 10000).toFixed(2) : "", // Chuyển m² sang ha
          nguyenNhan: props.verification_reason || "",
          nguoiXacMinh: user?.full_name || "", // Luôn dùng user hiện tại
          ngayXacMinh: props.detection_date || "", // Để trống nếu chưa có
          ghiChu: props.verification_notes || ""
        }));

        // 🆕 ZOOM MAP ĐẾN VỊ TRÍ
        const zoomEvent = new CustomEvent('zoomToFeature', {
          detail: { 
            feature: target_feature,
            center: center,
            bbox: bbox
          }
        });
        window.dispatchEvent(zoomEvent);

        // 🆕 HIGHLIGHT TRONG TABLE
        const tableEvent = new CustomEvent('highlightTableRow', {
          detail: { feature: target_feature }
        });
        window.dispatchEvent(tableEvent);

        toast.success(`✅ Đã tìm thấy lô CB-${formData.maLoDuBao} và tải ${response.data.data.total_features} khu vực xung quanh`);

      } else {
        toast.error(response.data.message);
        setSelectedRecord(null);
      }

    } catch (error) {
      console.error("❌ Lỗi tìm kiếm:", error);
      
      if (error.response?.status === 404) {
        toast.error(`❌ Không tìm thấy lô dự báo CB-${formData.maLoDuBao} trong cơ sở dữ liệu`);
      } else if (error.response?.status === 401) {
        toast.error("❌ Bạn không có quyền truy cập. Vui lòng đăng nhập lại.");
      } else {
        toast.error("❌ Có lỗi xảy ra khi tìm kiếm trong cơ sở dữ liệu");
      }
      setSelectedRecord(null);
    } finally {
      setSearchLoading(false);
    }
  };

  // 🆕 HÀM XÁC MINH VỚI LOGIC MỚI
  const handleCapNhat = async () => {
    if (!selectedRecord) {
      toast.warning("Vui lòng tìm kiếm và chọn lô dự báo trước khi cập nhật");
      return;
    }

    // Validation
    if (!formData.nguyenNhan) {
      toast.error("Vui lòng chọn nguyên nhân");
      return;
    }

    // Validate diện tích nếu có nhập
    if (formData.dienTichThucTe && formData.dienTichThucTe.trim()) {
      const dienTich = parseFloat(formData.dienTichThucTe);
      if (isNaN(dienTich) || dienTich < 0) {
        toast.error("Diện tích thực tế phải là số hợp lệ và lớn hơn 0");
        return;
      }
    }

    setLoading(true);
    
    try {
      console.log("🔄 Bắt đầu xác minh lô CB:", selectedRecord.properties.gid);

      // 🆕 Chuẩn bị dữ liệu theo logic mới
      const verificationData = {
        verification_reason: formData.nguyenNhan,
        verification_notes: formData.ghiChu || null,
        // 🔧 Diện tích: null/undefined = giữ nguyên, có giá trị = cập nhật (chuyển ha sang m²)
        verified_area: formData.dienTichThucTe && formData.dienTichThucTe.trim()
          ? parseFloat(formData.dienTichThucTe) * 10000 // ha → m²
          : null, // null = giữ nguyên
        // 🔧 Ngày: null/undefined = ngày hiện tại, có giá trị = dùng giá trị đó
        detection_date: formData.ngayXacMinh || null // null = ngày hiện tại
      };

      console.log("📋 Dữ liệu xác minh:", verificationData);

      // Gọi API xác minh mới
      const response = await axios.post(
        `${config.API_URL}/api/verification/mat-rung/${selectedRecord.properties.gid}/verify`,
        verificationData,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        const { data: updatedData, changes } = response.data;
        
        console.log("✅ Xác minh thành công:", updatedData);
        console.log("📊 Thay đổi:", changes);

        // 🆕 Cập nhật dữ liệu local
        if (geoData && geoData.features) {
          const updatedFeatures = geoData.features.map(feature => {
            if (feature.properties.gid === selectedRecord.properties.gid) {
              return {
                ...feature,
                properties: {
                  ...feature.properties,
                  detection_status: updatedData.detection_status,
                  verification_reason: updatedData.verification_reason,
                  verified_area: updatedData.verified_area,
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
        let successMessage = `✅ Đã xác minh thành công lô CB-${selectedRecord.properties.gid}!`;
        if (changes.area_changed) {
          successMessage += `\n📏 Diện tích: ${(changes.original_area / 10000).toFixed(2)} ha → ${(changes.new_verified_area / 10000).toFixed(2)} ha`;
        } else {
          successMessage += `\n📏 Diện tích: Giữ nguyên ${(changes.original_area / 10000).toFixed(2)} ha`;
        }
        successMessage += `\n📅 Ngày xác minh: ${changes.verification_date_used}`;
        successMessage += `\n👤 Người xác minh: ${changes.verified_by_user}`;

        toast.success(successMessage);
        
        // Reset form
        setFormData({
          maLoDuBao: "",
          nguyenNhan: "",
          dienTichThucTe: "",
          nguoiXacMinh: user?.full_name || "",
          ngayXacMinh: "",
          ghiChu: ""
        });
        setSelectedRecord(null);

      } else {
        toast.error(`❌ ${response.data.message}`);
      }

    } catch (error) {
      console.error("❌ Lỗi xác minh:", error);
      
      if (error.response?.status === 404) {
        toast.error("❌ Không tìm thấy lô dự báo cần xác minh");
      } else if (error.response?.status === 400) {
        toast.error(`❌ Dữ liệu không hợp lệ: ${error.response.data.message}`);
      } else if (error.response?.status === 401) {
        toast.error("❌ Bạn không có quyền thực hiện xác minh");
      } else {
        toast.error("❌ Có lỗi xảy ra khi xác minh");
      }
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

  // Hàm xử lý dropdown
  const handleDropdownToggle = (dropdownName, isOpen) => {
    setOpenDropdown(isOpen ? dropdownName : null);
  };

  return (
    <div>
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
                    ? `Đang tìm kiếm lô CB-${formData.maLoDuBao} trong cơ sở dữ liệu`
                    : `Đang lưu thông tin xác minh cho lô CB-${selectedRecord?.properties?.gid}`
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
        Xác minh dự báo mất rừng
      </div>

      {isForecastOpen && (
        <div className="flex flex-col gap-2 px-1 pt-3">
          {/* Hiển thị thông tin user */}
          <div className="mb-2 p-2 bg-green-50 border border-green-200 rounded-md">
            <div className="text-sm font-medium text-green-800">
              👤 Người xác minh: {user?.full_name || 'Unknown'}
            </div>
            <div className="text-xs text-green-600 mt-1">
              Vai trò: {user?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'} | ID: {user?.id}
            </div>
          </div>

          {/* Hiển thị thông tin lô đang được chọn */}
          {selectedRecord && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm font-medium text-blue-800">
                📌 Đang xác minh: CB-{selectedRecord.properties.gid}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Diện tích gốc: {selectedRecord.properties.area ? (selectedRecord.properties.area / 10000).toFixed(2) : 'N/A'} ha
                {selectedRecord.properties.huyen && ` | ${selectedRecord.properties.huyen}`}
                {selectedRecord.properties.xa && ` | ${selectedRecord.properties.xa}`}
              </div>
              {selectedRecord.properties.detection_status === 'Đã xác minh' && (
                <div className="text-xs text-green-600 mt-1 font-medium">
                  ✅ Đã được xác minh trước đó bởi: {selectedRecord.properties.verified_by_name || 'N/A'}
                </div>
              )}
            </div>
          )}

          {/* Form */}
          <div className="flex flex-col gap-3">
            {/* Mã lô dự báo */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Mã lô dự báo</label>
              <div className="flex items-center gap-2 w-36">
                <input
                  type="text"
                  value={formData.maLoDuBao}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || /^\d+$/.test(value)) {
                      handleInputChange('maLoDuBao', value);
                    }
                  }}
                  placeholder="VD: 123"
                  className="w-16 border border-green-400 rounded-md py-0.2 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  disabled={loading || searchLoading}
                />
                <button 
                  onClick={handleTimKiem}
                  disabled={loading || searchLoading || !formData.maLoDuBao.trim()}
                  className="w-16 bg-forest-green-gray hover:bg-green-200 text-black-800 whitespace-nowrap font-medium py-0.5 px-2 rounded-md text-center self-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Nguyên nhân *</label>
              <div className="relative w-36">
                <select
                  value={formData.nguyenNhan}
                  onChange={(e) => handleInputChange('nguyenNhan', e.target.value)}
                  className="w-full border border-green-400 rounded-md py-0.2 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  onFocus={() => handleDropdownToggle("nguyennhan", true)}
                  onBlur={() => handleDropdownToggle("nguyennhan", false)}
                  disabled={loading || searchLoading}
                  required
                >
                  <option value="">Chọn nguyên nhân</option>
                  {nguyenNhanList.map((nn, idx) => (
                    <option key={idx} value={nn}>
                      {nn}
                    </option>
                  ))}
                </select>
                <Select isOpen={openDropdown === "nguyennhan"} />
              </div>
            </div>

            {/* Diện tích thực tế */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">
                Diện tích thực tế (ha)
              </label>
              <div className="relative w-36">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.dienTichThucTe}
                  onChange={(e) => handleInputChange('dienTichThucTe', e.target.value)}
                  placeholder="Để trống = giữ nguyên"
                  className="w-full border border-green-400 rounded-md py-0.2 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  disabled={loading || searchLoading}
                />
                <div className="absolute -bottom-5 left-0 text-xs text-gray-500">
                  💡 Để trống để giữ nguyên diện tích gốc
                </div>
              </div>
            </div>

            {/* Người xác minh - Auto fill, readonly */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Người xác minh</label>
              <div className="relative w-36">
                <input
                  type="text"
                  value={formData.nguoiXacMinh}
                  readOnly
                  className="w-full border border-gray-300 rounded-md py-0.2 px-2 pr-8 appearance-none bg-gray-100 text-gray-700 cursor-not-allowed"
                />
                <div className="absolute -bottom-5 left-0 text-xs text-gray-500">
                  🔒 Tự động từ tài khoản đăng nhập
                </div>
              </div>
            </div>

            {/* Ngày xác minh */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Ngày xác minh</label>
              <div className="relative w-36">
                <input
                  type="date"
                  value={formData.ngayXacMinh}
                  onChange={(e) => handleInputChange('ngayXacMinh', e.target.value)}
                  className="w-full border border-green-400 rounded-md py-0.2 px-1 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  disabled={loading || searchLoading}
                />
                <div className="absolute -bottom-5 left-0 text-xs text-gray-500">
                  💡 Để trống để dùng ngày hiện tại
                </div>
              </div>
            </div>

            {/* Ghi chú */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Ghi chú</label>
              <div className="relative w-36">
                <textarea
                  value={formData.ghiChu}
                  onChange={(e) => handleInputChange('ghiChu', e.target.value)}
                  placeholder="Ghi chú thêm..."
                  rows="2"
                  className="w-full border border-green-400 rounded-md py-0.2 px-2 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                  disabled={loading || searchLoading}
                />
              </div>
            </div>
          </div>

          <button 
            onClick={handleCapNhat}
            disabled={loading || searchLoading || !selectedRecord || !formData.nguyenNhan}
            className="w-36 bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
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

          {/* Hướng dẫn sử dụng */}
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="text-xs text-yellow-800">
              <div className="font-medium mb-1">💡 Hướng dẫn sử dụng (CẬP NHẬT):</div>
              <ul className="list-disc list-inside space-y-1">
                <li>🔍 <strong>Tìm kiếm:</strong> Nhập GID và ấn "Tìm" để tìm trong toàn bộ CSDL</li>
                <li>📏 <strong>Diện tích:</strong> Để trống = giữ nguyên, nhập số = cập nhật mới</li>
                <li>📅 <strong>Ngày:</strong> Để trống = dùng ngày hôm nay, chọn ngày = dùng ngày đó</li>
                <li>👤 <strong>Người xác minh:</strong> Tự động lấy từ tài khoản đăng nhập</li>
                <li>✅ <strong>Nguyên nhân bắt buộc:</strong> Phải chọn để có thể xác minh</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default XacMinhDuBaoMatRung;