// Sửa file: client/src/dashboard/components/sidebars/phathienmatrung/ImportShapefile.jsx

import React, { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import config from "../../../../config";
import { FaFileUpload, FaCloudSun, FaImage, FaExclamationTriangle, FaInfoCircle } from "react-icons/fa";
import { ClipLoader } from "react-spinners";
import { useNavigate } from "react-router-dom";
import { useGeoData } from "../../../contexts/GeoDataContext";

const LoadingOverlay = ({ message, progress }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
    <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center max-w-md w-full mx-4">
      <ClipLoader color="#027e02" size={50} />
      <p className="mt-4 text-gray-800 font-medium text-center">{message}</p>
      {progress > 0 && (
        <div className="w-full mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-center mt-1 text-gray-600">{progress}%</p>
        </div>
      )}
    </div>
  </div>
);

const ImportShapefile = () => {
  const [zipUrl, setZipUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeButton, setActiveButton] = useState(null);
  const [isForecastOpen, setIsForecastOpen] = useState(true);
  const navigate = useNavigate();
  const { setGeoData } = useGeoData();

  // Hàm kiểm tra URL hợp lệ
  const validateGeeUrl = (url) => {
    if (!url || url.trim() === "") {
      return { valid: false, message: "Vui lòng nhập URL từ Google Earth Engine" };
    }
    
    if (!url.includes("earthengine.googleapis.com")) {
      return { valid: false, message: "URL phải từ domain earthengine.googleapis.com" };
    }
    
    if (!url.includes(":getFeatures")) {
      return { valid: false, message: "URL phải có định dạng :getFeatures ở cuối" };
    }
    
    // Kiểm tra định dạng URL cơ bản
    try {
      new URL(url);
    } catch {
      return { valid: false, message: "URL không đúng định dạng" };
    }
    
    return { valid: true, message: "" };
  };

  const handleImport = async () => {
    // Validate URL trước khi gửi request
    const validation = validateGeeUrl(zipUrl);
    if (!validation.valid) {
      toast.error(`❗ ${validation.message}`);
      return;
    }

    setLoading(true);
    setLoadingMessage("Đang kiểm tra URL và tải dữ liệu...");
    setUploadProgress(10);

    try {
      // Simulate progress steps
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const newProgress = prev + 5;
          
          // Update message based on progress
          if (newProgress <= 20) {
            setLoadingMessage("Đang kết nối đến Google Earth Engine...");
          } else if (newProgress <= 40) {
            setLoadingMessage("Đang tải dữ liệu từ Google Earth Engine...");
          } else if (newProgress <= 60) {
            setLoadingMessage("Đang xử lý và chuyển đổi dữ liệu...");
          } else if (newProgress <= 80) {
            setLoadingMessage("Đang import dữ liệu vào hệ thống...");
          } else if (newProgress <= 90) {
            setLoadingMessage("Đang hoàn thiện quá trình import...");
          }
          
          return newProgress > 90 ? 90 : newProgress;
        });
      }, 800);

      console.log("🔄 Gửi request import với URL:", zipUrl);

      const response = await axios.post(
        `${config.API_URL}/api/import-gee-url`,
        { zipUrl },
        {
          timeout: 300000, // 5 phút timeout
        }
      );

      clearInterval(progressInterval);
      setUploadProgress(100);
      setLoadingMessage("Hoàn thành!");

      const data = response.data;
      console.log("✅ Nhận được response:", data);

      // Xử lý các trường hợp response khác nhau
      if (data.success === false) {
        toast.error(`❌ ${data.message}`);
        return;
      }

      if (data.alreadyExists) {
        toast.warning(`⚠️ ${data.message}`);
        // Vẫn có thể navigate để xem dữ liệu hiện có
        if (data.geojson) {
          setGeoData(data.geojson);
        }
        navigate("/dashboard/quanlydulieu");
        return;
      }

      // Import thành công
      let successMessage = `✅ ${data.message}`;
      if (data.recordsAdded > 0) {
        successMessage += ` Đã thêm ${data.recordsAdded} bản ghi mới.`;
      }
      
      toast.success(successMessage);

      if (data.geojson) {
        console.log("📊 Cập nhật dữ liệu GeoJSON vào context");
        setGeoData(data.geojson);
        navigate("/dashboard/quanlydulieu");
      }

    } catch (err) {
      console.error("❌ Lỗi import:", err);
      
      // Xử lý các loại lỗi khác nhau
      let errorMessage = "Có lỗi xảy ra khi import dữ liệu";
      
      if (err.code === 'ECONNABORTED') {
        errorMessage = "⏱️ Hết thời gian chờ. Vui lòng thử lại với URL khác hoặc kiểm tra kết nối mạng.";
      } else if (err.response) {
        const status = err.response.status;
        const responseData = err.response.data;
        
        if (responseData && responseData.message) {
          errorMessage = responseData.message;
        } else {
          switch (status) {
            case 400:
              errorMessage = "❗ URL không hợp lệ. Vui lòng kiểm tra lại URL từ Google Earth Engine.";
              break;
            case 401:
              errorMessage = "🔐 Không có quyền truy cập. URL có thể đã hết hạn hoặc cần đăng nhập Google Earth Engine.";
              break;
            case 403:
              errorMessage = "🚫 Bị từ chối truy cập. Kiểm tra quyền chia sẻ của dữ liệu trên Google Earth Engine.";
              break;
            case 404:
              errorMessage = "❓ Không tìm thấy dữ liệu. URL có thể đã bị xóa hoặc không tồn tại.";
              break;
            case 500:
              errorMessage = "🔧 Lỗi server. Vui lòng thử lại sau hoặc liên hệ quản trị viên.";
              break;
            default:
              errorMessage = `❌ Lỗi ${status}: ${err.response.statusText}`;
          }
        }
      } else if (err.request) {
        errorMessage = "🌐 Không thể kết nối đến server. Kiểm tra kết nối mạng.";
      }
      
      toast.error(errorMessage, {
        autoClose: 8000, // Hiển thị lâu hơn cho thông báo lỗi
      });
      
    } finally {
      setTimeout(() => {
        setLoading(false);
        setUploadProgress(0);
        setLoadingMessage("");
      }, 1000);
    }
  };

  const handlePhatHienMatRungClick = () => {
    setActiveButton("phantich");
    setIsForecastOpen(!isForecastOpen);
    navigate("/dashboard/phathienmatrung?tab=phantich");
  };

  const handleLocMayClick = () => {
    setActiveButton("locMay");
    navigate("/dashboard/phathienmatrung?tab=locmay");
  };

  const handleXuLyAnhClick = () => {
    setActiveButton("xuLyAnh");
    navigate("/dashboard/phathienmatrung?tab=xulyanh");
  };

  const handleUrlChange = (e) => {
    const newUrl = e.target.value;
    setZipUrl(newUrl);
    
    // Real-time validation với feedback visual
    if (newUrl && !newUrl.includes("earthengine.googleapis.com")) {
      // Có thể thêm visual feedback ở đây
    }
  };

  return (
    <div className="p-4 bg-white rounded-md shadow-md relative">
      <button
        onClick={handlePhatHienMatRungClick}
        className={`w-full bg-gradient-to-r ${
          activeButton === "phantich"
            ? "from-teal-500 to-teal-700 border-2 border-white scale-105"
            : "from-forest-green-primary to-green-700"
        } text-white py-2 px-4 rounded-md hover:shadow-lg transition-all duration-300 flex items-center justify-center mb-4`}
      >
        <span className="font-medium">Phát hiện mất rừng</span>
      </button>

      {isForecastOpen && (
        <>
          <h3 className="text-lg font-semibold mb-4">Import dữ liệu mất rừng</h3>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL từ Google Earth Engine
            </label>
            <input
              type="text"
              value={zipUrl}
              onChange={handleUrlChange}
              placeholder="Dán URL từ Google Earth Engine (có chứa :getFeatures)"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-forest-green-primary focus:border-forest-green-primary"
              disabled={loading}
            />
            
            {/* Thông tin hướng dẫn */}
            <div className="mt-2 p-3 bg-blue-50 rounded-md border border-blue-200">
              <div className="flex items-start">
                <FaInfoCircle className="text-blue-500 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-xs text-blue-700">
                  <p className="font-medium mb-1">Hướng dẫn lấy URL:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Truy cập Google Earth Engine Code Editor</li>
                    <li>Xuất dữ liệu và chọn "Export to Drive" hoặc "Export to Cloud"</li>
                    <li>Copy URL có chứa ":getFeatures" ở cuối</li>
                    <li>Dán URL vào ô trên và nhấn "Tải & Import"</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Validation feedback */}
            {zipUrl && (
              <div className="mt-2">
                {zipUrl.includes("earthengine.googleapis.com") && zipUrl.includes(":getFeatures") ? (
                  <div className="flex items-center text-green-600 text-xs">
                    <FaInfoCircle className="mr-1" />
                    URL hợp lệ
                  </div>
                ) : (
                  <div className="flex items-center text-red-600 text-xs">
                    <FaExclamationTriangle className="mr-1" />
                    URL chưa đúng định dạng Google Earth Engine
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleImport}
            disabled={loading || !zipUrl.trim()}
            className={`w-full py-2 px-4 rounded-md flex items-center justify-center mb-4 font-medium transition-all ${
              loading || !zipUrl.trim()
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-forest-green-primary hover:bg-green-700 text-white"
            }`}
          >
            {loading ? (
              <>
                <ClipLoader color="#ffffff" size={20} />
                <span className="ml-2">Đang xử lý...</span>
              </>
            ) : (
              <>
                <FaFileUpload className="mr-2" />
                Tải & Import
              </>
            )}
          </button>

          {/* Progress bar khi đang tải */}
          {loading && (
            <div className="mb-4">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-forest-green-primary h-2.5 rounded-full transition-all duration-300 ease-in-out"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-center text-gray-600 mt-2">
                {loadingMessage}
              </p>
            </div>
          )}
        </>
      )}

      <button
        onClick={handleLocMayClick}
        className={`w-full bg-gradient-to-r ${
          activeButton === "locMay"
            ? "from-green-500 to-green-700 border-2 border-white scale-105"
            : "from-blue-500 to-blue-700"
        } text-white py-2 px-4 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center mb-4`}
      >
        <FaCloudSun className="text-xl mr-3" />
        <span className="font-medium">Công cụ lọc mây</span>
      </button>

      <button
        onClick={handleXuLyAnhClick}
        className={`w-full bg-gradient-to-r ${
          activeButton === "xuLyAnh"
            ? "from-orange-500 to-orange-700 border-2 border-white scale-105"
            : "from-purple-500 to-purple-700"
        } text-white py-3 px-6 rounded-lg hover:shadow-lg transition-all duration-300 flex items-center justify-center`}
      >
        <FaImage className="text-xl mr-3" />
        <span className="font-medium">Xử lý ảnh vệ tinh</span>
      </button>

      {loading && (
        <LoadingOverlay 
          message={loadingMessage} 
          progress={uploadProgress}
        />
      )}
    </div>
  );
};

export default ImportShapefile;