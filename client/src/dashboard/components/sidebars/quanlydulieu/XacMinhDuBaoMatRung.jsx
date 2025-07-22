import React, { useState } from "react";
import Select from "../../Select";

import axios from "axios";

import { toast } from "react-toastify";
import { ClipLoader } from "react-spinners";
import { useGeoData } from "../../../contexts/GeoDataContext";
import config from "../../../../config";

const XacMinhDuBaoMatRung = () => {
  const { geoData, setGeoData } = useGeoData();
  
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
  
  // Form states
  const [formData, setFormData] = useState({
    maLoDuBao: "",
    nguyenNhan: "",
    dienTichThucTe: "",
    nguoiXacMinh: "",
    ngayXacMinh: "",
    ghiChu: ""
  });

  // Selected record state
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Hàm xử lý khi dropdown focus hoặc blur
  const handleDropdownToggle = (dropdownName, isOpen) => {
    setOpenDropdown(isOpen ? dropdownName : null);
  };

  // Hàm validation input
  const validateInputs = () => {
    const errors = [];
    
    // Validate diện tích thực tế (phải là số hợp lệ)
    if (formData.dienTichThucTe && formData.dienTichThucTe.trim()) {
      const dienTich = parseFloat(formData.dienTichThucTe);
      if (isNaN(dienTich) || dienTich < 0) {
        errors.push("Diện tích thực tế phải là số hợp lệ và lớn hơn 0");
      }
    }
    
    // Validate required fields cho cập nhật
    if (selectedRecord) {
      if (!formData.nguyenNhan) errors.push("Vui lòng chọn nguyên nhân");
      if (!formData.nguoiXacMinh.trim()) errors.push("Vui lòng nhập người xác minh");
      if (!formData.ngayXacMinh) errors.push("Vui lòng chọn ngày xác minh");
    }
    
    return errors;
  };

  // Hàm tìm kiếm theo mã lô dự báo
  const handleTimKiem = async () => {
    if (!formData.maLoDuBao.trim()) {
      toast.warning("Vui lòng nhập mã lô dự báo");
      return;
    }

    setLoading(true);
    
    // Thêm delay để user thấy loading
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      console.log("🔍 Tìm kiếm mã lô dự báo:", formData.maLoDuBao);

      // Tìm trong dữ liệu hiện tại
      if (!geoData || !geoData.features || geoData.features.length === 0) {
        toast.error("Không có dữ liệu để tìm kiếm. Vui lòng tải dữ liệu trước.");
        return;
      }

      // Tìm theo gid (lô cảnh báo)
      const targetGid = formData.maLoDuBao.replace(/^CB-/i, ''); // Remove CB- prefix if exists
      
      const foundFeature = geoData.features.find(feature => {
        const gid = feature.properties.gid;
        return gid && gid.toString() === targetGid.toString();
      });

      if (foundFeature) {
        setSelectedRecord(foundFeature);
        
        // Lấy thông tin hiện tại để hiển thị trong form
        const props = foundFeature.properties;
        setFormData(prev => ({
          ...prev,
          dienTichThucTe: props.verified_area || "",
          nguyenNhan: props.verification_reason || "",
          nguoiXacMinh: props.verified_by || "",
          ngayXacMinh: props.detection_date ? new Date(props.detection_date).toISOString().split('T')[0] : "",
          ghiChu: props.verification_notes || ""
        }));

        // Tạo event để map zoom đến feature
        const event = new CustomEvent('zoomToFeature', {
          detail: { feature: foundFeature }
        });
        window.dispatchEvent(event);

        // Tạo event để table highlight row
        const tableEvent = new CustomEvent('highlightTableRow', {
          detail: { feature: foundFeature }
        });
        window.dispatchEvent(tableEvent);

        toast.success(`✅ Đã tìm thấy lô CB-${targetGid}`);
      } else {
        toast.error(`❌ Không tìm thấy lô dự báo: CB-${targetGid}`);
        setSelectedRecord(null);
      }

    } catch (error) {
      console.error("❌ Lỗi tìm kiếm:", error);
      toast.error("Có lỗi xảy ra khi tìm kiếm");
    } finally {
      setLoading(false);
    }
  };

  // Hàm cập nhật thông tin xác minh
  const handleCapNhat = async () => {
    if (!selectedRecord) {
      toast.warning("Vui lòng tìm kiếm và chọn lô dự báo trước khi cập nhật");
      return;
    }

    // Validate inputs trước khi submit
    const validationErrors = validateInputs();
    if (validationErrors.length > 0) {
      toast.error(validationErrors.join("\n"));
      return;
    }

    setLoading(true);
    
    // Thêm delay để user thấy loading
    await new Promise(resolve => setTimeout(resolve, 300));
    
    try {
      console.log("🔄 Cập nhật thông tin xác minh cho gid:", selectedRecord.properties.gid);

      const gid = selectedRecord.properties.gid;
      
      // Chuẩn bị dữ liệu với validation
      const dienTichValue = formData.dienTichThucTe && formData.dienTichThucTe.trim() 
        ? parseFloat(formData.dienTichThucTe) 
        : null;
      
      // Cập nhật từng trường một để đảm bảo tính toàn vẹn dữ liệu
      const updates = [
        {
          column: 'verified_area',
          value: dienTichValue,
          label: 'Diện tích thực tế',
          skip: dienTichValue === null || isNaN(dienTichValue)
        },
        {
          column: 'verification_reason', 
          value: formData.nguyenNhan,
          label: 'Nguyên nhân',
          skip: !formData.nguyenNhan
        },
        {
          column: 'verified_by',
          value: formData.nguoiXacMinh,
          label: 'Người xác minh',
          skip: !formData.nguoiXacMinh.trim()
        },
        {
          column: 'detection_date',
          value: formData.ngayXacMinh,
          label: 'Ngày xác minh',
          skip: !formData.ngayXacMinh
        },
        {
          column: 'verification_notes',
          value: formData.ghiChu || null,
          label: 'Ghi chú',
          skip: false // Always allow null/empty notes
        },
        {
          column: 'detection_status',
          value: 'Đã xác minh',
          label: 'Trạng thái',
          skip: false
        }
      ];

      // Thực hiện cập nhật tuần tự (chỉ các trường không skip)
      const successUpdates = [];
      
      for (const update of updates) {
        if (!update.skip) {
          try {
            console.log(`📝 Updating ${update.label}:`, update.value);
            
            const response = await axios.post(
              `${config.API_URL}/api/data/update-with-where`,
              {
                table: "mat_rung",
                column: update.column,
                value: update.value,
                whereClause: `gid = ${gid}`
              }
            );

            if (response.data.success) {
              successUpdates.push(update.label);
              console.log(`✅ Cập nhật ${update.label} thành công`);
            }
          } catch (error) {
            console.error(`❌ Lỗi cập nhật ${update.label}:`, error);
            
            // Nếu là lỗi validation từ DB, hiển thị chi tiết
            if (error.response?.data?.error) {
              throw new Error(`Lỗi cập nhật ${update.label}: ${error.response.data.error}`);
            } else {
              throw new Error(`Lỗi cập nhật ${update.label}: ${error.message}`);
            }
          }
        }
      }

      if (successUpdates.length === 0) {
        toast.warning("Không có thông tin nào được cập nhật");
        return;
      }

      // Cập nhật dữ liệu local trong context
      if (geoData && geoData.features) {
        const updatedFeatures = geoData.features.map(feature => {
          if (feature.properties.gid === gid) {
            return {
              ...feature,
              properties: {
                ...feature.properties,
                verified_area: dienTichValue,
                verification_reason: formData.nguyenNhan,
                verified_by: formData.nguoiXacMinh,
                detection_date: formData.ngayXacMinh,
                verification_notes: formData.ghiChu || null,
                detection_status: 'Đã xác minh'
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

      toast.success(`✅ Đã cập nhật thành công cho lô CB-${gid}!\nCập nhật: ${successUpdates.join(", ")}`);
      
      // Reset form sau khi cập nhật thành công
      setFormData({
        maLoDuBao: "",
        nguyenNhan: "",
        dienTichThucTe: "",
        nguoiXacMinh: "",
        ngayXacMinh: "",
        ghiChu: ""
      });
      setSelectedRecord(null);

    } catch (error) {
      console.error("❌ Lỗi cập nhật xác minh:", error);
      
      // Hiển thị lỗi chi tiết
      const errorMessage = error.message || "Có lỗi xảy ra khi cập nhật thông tin xác minh";
      toast.error(`❌ ${errorMessage}`);
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

  return (
    <div>
      {/* Loading overlay với animation tốt hơn */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999]">
          <div className="bg-white p-8 rounded-lg shadow-2xl max-w-sm w-full mx-4">
            <div className="flex flex-col items-center space-y-4">
              <ClipLoader color="#027e02" size={40} />
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-800 mb-2">
                  {selectedRecord ? "Đang cập nhật..." : "Đang tìm kiếm..."}
                </div>
                <div className="text-sm text-gray-600">
                  {selectedRecord 
                    ? `Đang lưu thông tin xác minh cho lô CB-${selectedRecord.properties.gid}`
                    : `Đang tìm kiếm lô CB-${formData.maLoDuBao}`
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DỰ BÁO MẤT RỪNG TỰ ĐỘNG */}
      <div
        className="bg-forest-green-primary text-white py-0.2 px-4 rounded-full text-sm font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer"
        onClick={() => setIsForecastOpen(!isForecastOpen)}
      >
        Xác minh dự báo mất rừng
      </div>

      {isForecastOpen && (
        <div className="flex flex-col gap-2 px-1 pt-3">
          {/* Hiển thị thông tin lô đang được chọn */}
          {selectedRecord && (
            <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
              <div className="text-sm font-medium text-blue-800">
                📌 Đang xác minh: CB-{selectedRecord.properties.gid}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                Diện tích: {selectedRecord.properties.area ? (selectedRecord.properties.area / 10000).toFixed(2) : 'N/A'} ha
                {selectedRecord.properties.huyen && ` | ${selectedRecord.properties.huyen}`}
                {selectedRecord.properties.xa && ` | ${selectedRecord.properties.xa}`}
              </div>
              {selectedRecord.properties.detection_status === 'Đã xác minh' && (
                <div className="text-xs text-green-600 mt-1 font-medium">
                  ✅ Đã được xác minh trước đó
                </div>
              )}
            </div>
          )}

          {/* Container để căn chỉnh */}
          <div className="flex flex-col gap-3">
            {/* Mã lô dự báo với validation */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Mã lô dự báo</label>
              <div className="flex items-center gap-2 w-36">
                <input
                  type="text"
                  value={formData.maLoDuBao}
                  onChange={(e) => {
                    const value = e.target.value;
                    // Chỉ cho phép số (GID là integer)
                    if (value === '' || /^\d+$/.test(value)) {
                      handleInputChange('maLoDuBao', value);
                    }
                  }}
                  placeholder="VD: 123"
                  className="w-16 border border-green-400 rounded-md py-0.2 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  disabled={loading}
                />
                <button 
                  onClick={handleTimKiem}
                  disabled={loading || !formData.maLoDuBao.trim()}
                  className="w-16 bg-forest-green-gray hover:bg-green-200 text-black-800 whitespace-nowrap font-medium py-0.5 px-2 rounded-md text-center self-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading && !selectedRecord ? (
                    <ClipLoader color="#027e02" size={12} />
                  ) : (
                    "Tìm"
                  )}
                </button>
              </div>
            </div>

            {/* Nguyên nhân */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Nguyên nhân</label>
              <div className="relative w-36">
                <select
                  value={formData.nguyenNhan}
                  onChange={(e) => handleInputChange('nguyenNhan', e.target.value)}
                  className="w-full border border-green-400 rounded-md py-0.2 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  onFocus={() => handleDropdownToggle("nguyennhan", true)}
                  onBlur={() => handleDropdownToggle("nguyennhan", false)}
                  disabled={loading}
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

            {/* Diện tích thực tế với validation */}
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
                  onChange={(e) => {
                    const value = e.target.value;
                    // Chỉ cho phép số và dấu thập phân
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      handleInputChange('dienTichThucTe', value);
                    }
                  }}
                  onBlur={(e) => {
                    // Validate khi blur
                    const value = e.target.value;
                    if (value && (isNaN(parseFloat(value)) || parseFloat(value) < 0)) {
                      toast.warning("Diện tích phải là số hợp lệ và lớn hơn 0");
                      handleInputChange('dienTichThucTe', '');
                    }
                  }}
                  placeholder="VD: 1.25"
                  className={`w-full border rounded-md py-0.2 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 ${
                    formData.dienTichThucTe && (isNaN(parseFloat(formData.dienTichThucTe)) || parseFloat(formData.dienTichThucTe) < 0)
                      ? 'border-red-400 focus:ring-red-400'
                      : 'border-green-400 focus:ring-green-400'
                  }`}
                  disabled={loading}
                />
                {formData.dienTichThucTe && (isNaN(parseFloat(formData.dienTichThucTe)) || parseFloat(formData.dienTichThucTe) < 0) && (
                  <div className="absolute -bottom-5 left-0 text-xs text-red-500">
                    Nhập số hợp lệ
                  </div>
                )}
              </div>
            </div>

            {/* Người xác minh */}
            <div className="flex items-center gap-1">
              <label className="text-sm font-medium w-40">Người xác minh</label>
              <div className="relative w-36">
                <input
                  type="text"
                  value={formData.nguoiXacMinh}
                  onChange={(e) => handleInputChange('nguoiXacMinh', e.target.value)}
                  placeholder="Tên người xác minh..."
                  className="w-full border border-green-400 rounded-md py-0.2 px-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-2 focus:ring-green-400"
                  disabled={loading}
                />
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
                  disabled={loading}
                />
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
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <button 
            onClick={handleCapNhat}
            disabled={loading || !selectedRecord}
            className="w-36 bg-forest-green-gray hover:bg-green-200 text-black-800 font-medium py-0.5 px-3 rounded-full text-center mt-2 self-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {loading && selectedRecord ? (
              <>
                <ClipLoader color="#027e02" size={14} />
                <span className="ml-2">Đang lưu...</span>
              </>
            ) : (
              "Cập nhật"
            )}
          </button>

          {/* Thông tin hướng dẫn */}
          <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="text-xs text-yellow-800">
              <div className="font-medium mb-1">💡 Hướng dẫn sử dụng:</div>
              <ul className="list-disc list-inside space-y-1">
                <li>Nhập mã GID (chỉ số, VD: 123) của lô dự báo cần xác minh</li>
                <li>Ấn "Tìm" để tìm kiếm và hiển thị trên bản đồ</li>
                <li>Diện tích thực tế phải là số hợp lệ (VD: 1.25)</li>
                <li>Điền đầy đủ: Nguyên nhân, Người xác minh, Ngày xác minh</li>
                <li>Ấn "Cập nhật" để lưu thông tin xác minh</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default XacMinhDuBaoMatRung;