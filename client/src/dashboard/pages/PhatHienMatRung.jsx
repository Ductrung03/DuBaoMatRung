// client/src/dashboard/pages/PhatHienMatRung.jsx - FIXED VERSION
import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { ClipLoader } from 'react-spinners';
import { FaCloudSun, FaImage, FaListAlt, FaExclamationTriangle, FaRedo, FaExternalLinkAlt } from "react-icons/fa";
import { toast } from "react-toastify";

export default function PhatHienMatRung() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("phantich");
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const iframeRef = useRef(null);
  const location = useLocation();
  
  // Timeout để detect iframe loading issues
  const [loadTimeout, setLoadTimeout] = useState(null);
  
  useEffect(() => {
    // Kiểm tra tab từ URL
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get("tab");
    if (tab && ["phantich", "locmay", "xulyanh"].includes(tab)) {
      setActiveTab(tab);
    }
    
    // Reset states when component mounts
    setError(null);
    setRetryCount(0);
    loadIframe();
  }, [location]);

  useEffect(() => {
    loadIframe();
  }, [activeTab]);
  
  const loadIframe = () => {
    setLoading(true);
    setError(null);
    
    // Clear previous timeout
    if (loadTimeout) {
      clearTimeout(loadTimeout);
    }
    
    // Set timeout để detect loading issues
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn(`⚠️ Iframe loading timeout for ${activeTab}`);
        setError("TIMEOUT");
        setLoading(false);
      }
    }, 15000); // 15 seconds timeout
    
    setLoadTimeout(timeout);
  };
  
  // URLs cho các tab
  const getTabConfig = () => {
    const configs = {
      phantich: {
        title: "Phân tích mất rừng",
        url: "https://ee-phathiensommatrung.projects.earthengine.app/view/phantichmatrung",
        icon: <FaListAlt />,
        description: "Phân tích và phát hiện mất rừng sử dụng AI"
      },
      locmay: {
        title: "Công cụ lọc mây",
        url: "https://ee-phathiensommatrung.projects.earthengine.app/view/locmay",
        icon: <FaCloudSun />,
        description: "Lọc và xử lý mây trong ảnh vệ tinh"
      },
      xulyanh: {
        title: "Xử lý ảnh vệ tinh",
        url: "https://ee-phathiensommatrung.projects.earthengine.app/view/xulyanh",
        icon: <FaImage />,
        description: "Công cụ xử lý và phân tích ảnh vệ tinh"
      }
    };
    
    return configs[activeTab] || configs.phantich;
  };
  
  // Xử lý khi iframe load thành công
  const handleIframeLoad = () => {
    console.log(`✅ Iframe loaded successfully for ${activeTab}`);
    setLoading(false);
    setError(null);
    
    if (loadTimeout) {
      clearTimeout(loadTimeout);
    }
    
    // Toast success message
    toast.success(`🎉 Đã tải thành công ${getTabConfig().title}`, {
      autoClose: 2000
    });
  };
  
  // Xử lý khi iframe load error
  const handleIframeError = () => {
    console.error(`❌ Iframe failed to load for ${activeTab}`);
    setLoading(false);
    setError("LOAD_ERROR");
    
    if (loadTimeout) {
      clearTimeout(loadTimeout);
    }
    
    // Toast error message
    toast.error(`❌ Không thể tải ${getTabConfig().title}. Vui lòng thử lại.`, {
      autoClose: 5000
    });
  };
  
  // Xử lý chuyển tab
  const handleChangeTab = (tab) => {
    if (tab === activeTab) return;
    
    console.log(`🔄 Switching to tab: ${tab}`);
    setActiveTab(tab);
  };
  
  // Retry loading
  const handleRetry = () => {
    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);
    
    console.log(`🔄 Retry attempt ${newRetryCount} for ${activeTab}`);
    
    if (newRetryCount <= 3) {
      loadIframe();
      toast.info(`🔄 Đang thử lại... (${newRetryCount}/3)`, {
        autoClose: 2000
      });
    } else {
      toast.error("❌ Đã thử lại nhiều lần. Vui lòng kiểm tra kết nối mạng.", {
        autoClose: 5000
      });
    }
  };
  
  // Mở trong tab mới
  const handleOpenInNewTab = () => {
    const config = getTabConfig();
    window.open(config.url, '_blank', 'noopener,noreferrer');
    toast.info(`🌐 Đã mở ${config.title} trong tab mới`, {
      autoClose: 3000
    });
  };
  
  const currentConfig = getTabConfig();

  return (
    <div className="w-full h-screen flex flex-col bg-gray-50">
      
      {/* Header với tab navigation */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
       
        
        {/* Current tab info */}
        <div className="mt-2 flex items-center">
          <span className="mr-2">{currentConfig.icon}</span>
          <h1 className="text-lg font-semibold text-gray-800">{currentConfig.title}</h1>
          <span className="ml-2 text-sm text-gray-500">• {currentConfig.description}</span>
        </div>
      </div>

      {/* Main content area */}
      <div className="relative flex-1 overflow-hidden">
        
        {/* Loading overlay */}
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="flex flex-col items-center max-w-md mx-4 text-center">
              <ClipLoader color="#027e02" size={50} />
              <p className="mt-4 text-lg text-forest-green-primary font-medium">
                Đang tải {currentConfig.title}...
              </p>
              <p className="mt-2 text-sm text-gray-600">
                {currentConfig.description}
              </p>
              {retryCount > 0 && (
                <p className="mt-2 text-xs text-orange-600">
                  Lần thử: {retryCount}/3
                </p>
              )}
              <div className="mt-4 text-xs text-gray-500">
                💡 Nếu tải lâu, hãy thử mở trong tab mới hoặc kiểm tra kết nối mạng
              </div>
            </div>
          </div>
        )}
        
        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="flex flex-col items-center max-w-md mx-4 text-center p-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <FaExclamationTriangle className="text-2xl text-red-500" />
              </div>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                Không thể tải {currentConfig.title}
              </h3>
              
              <div className="text-sm text-gray-600 mb-4">
                {error === "TIMEOUT" && (
                  <div>
                    <p className="mb-2">⏱️ Thời gian tải quá lâu</p>
                    <p>Có thể do kết nối mạng chậm hoặc server Google Earth Engine đang bận.</p>
                  </div>
                )}
                
                {error === "LOAD_ERROR" && (
                  <div>
                    <p className="mb-2">🔗 Lỗi kết nối</p>
                    <p>Không thể kết nối đến Google Earth Engine. Kiểm tra kết nối mạng và thử lại.</p>
                  </div>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <button
                  onClick={handleRetry}
                  disabled={retryCount > 3}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FaRedo className="mr-2" />
                  {retryCount > 3 ? "Đã hết lượt thử" : `Thử lại (${retryCount}/3)`}
                </button>
                
                <button
                  onClick={handleOpenInNewTab}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  <FaExternalLinkAlt className="mr-2" />
                  Mở tab mới
                </button>
              </div>
              
              <div className="mt-4 p-3 bg-yellow-50 rounded-md text-xs text-yellow-800">
                <p className="font-medium mb-1">💡 Mẹo khắc phục:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Tắt ad blocker nếu có</li>
                  <li>Kiểm tra kết nối mạng</li>
                  <li>Thử mở trong tab mới</li>
                  <li>Refresh toàn bộ trang</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* Main iframe */}
        {!error && (
          <iframe
            ref={iframeRef}
            src={currentConfig.url}
            title={currentConfig.title}
            width="100%"
            height="100%"
            frameBorder="0"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            style={{ 
              border: "none",
              display: loading ? "none" : "block"
            }}
            // Security và compatibility attributes
            allow="geolocation; camera; microphone; encrypted-media; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        )}
      </div>
      
      {/* Footer info */}
      <div className="bg-gray-800 text-white px-4 py-2 text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="mr-2">🌍</span>
            <span>Google Earth Engine Application</span>
          </div>
          <div className="flex items-center space-x-4">
            <span>Powered by Google Earth Engine</span>
            <span>•</span>
            <span>Lào Cai Forest Monitoring</span>
          </div>
        </div>
      </div>
    </div>
  );
}