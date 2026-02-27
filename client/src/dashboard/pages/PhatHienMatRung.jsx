// client/src/dashboard/pages/PhatHienMatRung.jsx - FIXED VERSION
import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { ClipLoader } from 'react-spinners';
import { FaCloudSun, FaImage, FaListAlt, FaExclamationTriangle, FaRedo, FaExternalLinkAlt, FaExpand } from "react-icons/fa";
import { toast } from "react-toastify";
import { useIsMobile } from "../../hooks/useMediaQuery";

export default function PhatHienMatRung() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("phantich");
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef(null);
  const containerRef = useRef(null);
  const location = useLocation();
  const isMobile = useIsMobile();

  // ✅ BỎ TIMEOUT - Để iframe tự load
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

    // ✅ TĂNG TIMEOUT LÊN 60 GIÂY thay vì bỏ hoàn toàn
    const timeout = setTimeout(() => {
      if (loading) {
        // ✅ KHÔNG SET ERROR - chỉ log warning
      }
    }, 60000); // 60 seconds timeout

    setLoadTimeout(timeout);
  };

  // URLs cho các tab
  const getTabConfig = () => {
    const configs = {
      phantich: {
        title: "Phân tích mất rừng",
        url: "https://ee-phathiensommatrung.projects.earthengine.app/view/phantichmatrung",
        icon: <FaListAlt />,
        description: "Phân tích và xử lý ảnh viễn thám sử dụng AI"
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

    setActiveTab(tab);
  };

  // Retry loading
  const handleRetry = () => {
    const newRetryCount = retryCount + 1;
    setRetryCount(newRetryCount);


    if (newRetryCount <= 5) { // Tăng số lần retry
      loadIframe();
      toast.info(`🔄 Đang thử lại... (${newRetryCount}/5)`, {
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

  // ✅ THÊM FULLSCREEN SUPPORT
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().then(() => {
        setIsFullscreen(true);
        toast.info("📺 Đã chuyển sang chế độ toàn màn hình");
      }).catch(err => {
        console.error("Error entering fullscreen:", err);
        toast.error("Không thể chuyển sang chế độ toàn màn hình");
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        toast.info("🪟 Đã thoát chế độ toàn màn hình");
      });
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const currentConfig = getTabConfig();

  return (
    <div
      ref={containerRef}
      className={`w-full h-screen flex flex-col bg-gray-50 ${isFullscreen ? 'fullscreen-container' : ''}`}
    >

      {/* Header với tab navigation */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-3 sm:px-4 py-2 sm:py-3 flex-shrink-0">
        {/* Tab buttons - Scrollable on mobile */}
        <div className="overflow-x-auto -mx-3 sm:mx-0 mb-2">
          <div className="flex gap-2 px-3 sm:px-0 min-w-max sm:min-w-0">
            <button
              onClick={() => handleChangeTab("phantich")}
              className={`flex items-center px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-xs sm:text-sm min-h-[44px] ${activeTab === "phantich"
                  ? "bg-green-600 text-white shadow-md"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
            >
              <FaListAlt className="mr-1 sm:mr-2" />
              {isMobile ? "Phân tích" : "Phân tích mất rừng"}
            </button>

            <button
              onClick={() => handleChangeTab("locmay")}
              className={`flex items-center px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-xs sm:text-sm min-h-[44px] ${activeTab === "locmay"
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
            >
              <FaCloudSun className="mr-1 sm:mr-2" />
              Lọc mây
            </button>

            <button
              onClick={() => handleChangeTab("xulyanh")}
              className={`flex items-center px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-xs sm:text-sm min-h-[44px] ${activeTab === "xulyanh"
                  ? "bg-purple-600 text-white shadow-md"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
            >
              <FaImage className="mr-1 sm:mr-2" />
              Xử lý ảnh
            </button>

            {/* ✅ NÚT FULLSCREEN - Responsive */}
            <button
              onClick={toggleFullscreen}
              className="flex items-center px-3 sm:px-4 py-2 rounded-lg font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all ml-auto text-xs sm:text-sm min-h-[44px]"
              title={isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}
            >
              <FaExpand className={`${isMobile ? "" : "mr-2"}`} />
              {!isMobile && (isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình")}
            </button>
          </div>
        </div>

        {/* Current tab info - Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <div className="flex items-center">
            <span className="mr-2 text-sm sm:text-base">{currentConfig.icon}</span>
            <h1 className="text-sm sm:text-lg font-semibold text-gray-800">{currentConfig.title}</h1>
            <span className="hidden md:inline ml-2 text-xs sm:text-sm text-gray-500">• {currentConfig.description}</span>
          </div>

          {/* Action buttons - Stack on mobile */}
          <div className="flex gap-2">
            <button
              onClick={handleRetry}
              disabled={retryCount > 5}
              className="flex items-center px-3 py-2 text-xs sm:text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50 transition-colors min-h-[40px]"
            >
              <FaRedo className="mr-1" />
              Tải lại
            </button>

            <button
              onClick={handleOpenInNewTab}
              className="flex items-center px-3 py-2 text-xs sm:text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors min-h-[40px]"
            >
              <FaExternalLinkAlt className="mr-1" />
              {isMobile ? "Tab" : "Tab mới"}
            </button>
          </div>
        </div>
      </div>

      {/* Main content area - ✅ FIXED: Đổi overflow-hidden thành overflow-auto để iframe scroll được */}
      <div className="relative flex-1 overflow-auto">

        {/* Loading overlay - Responsive */}
        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="flex flex-col items-center max-w-md mx-4 text-center px-4">
              <ClipLoader color="#027e02" size={isMobile ? 40 : 50} />
              <p className="mt-3 sm:mt-4 text-base sm:text-lg text-forest-green-primary font-medium">
                Đang tải {currentConfig.title}...
              </p>
              <p className="mt-2 text-xs sm:text-sm text-gray-600">
                {currentConfig.description}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                💡 Có thể mất 1-2 phút để tải hoàn toàn
              </p>
              {retryCount > 0 && (
                <p className="mt-2 text-xs text-orange-600">
                  Lần thử: {retryCount}/5
                </p>
              )}
            </div>
          </div>
        )}

        {/* Error overlay - Responsive */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <div className="flex flex-col items-center max-w-md mx-4 text-center p-4 sm:p-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mb-3 sm:mb-4">
                <FaExclamationTriangle className="text-xl sm:text-2xl text-red-500" />
              </div>

              <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">
                Không thể tải {currentConfig.title}
              </h3>

              <div className="text-xs sm:text-sm text-gray-600 mb-4">
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
                  disabled={retryCount > 5}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] text-sm"
                >
                  <FaRedo className="mr-2" />
                  {retryCount > 5 ? "Đã hết lượt thử" : `Thử lại (${retryCount}/5)`}
                </button>

                <button
                  onClick={handleOpenInNewTab}
                  className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors min-h-[44px] text-sm"
                >
                  <FaExternalLinkAlt className="mr-2" />
                  {isMobile ? "Tab mới" : "Mở tab mới"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ✅ MAIN IFRAME với CSS tối ưu cho scroll - FIXED: Đảm bảo hiển thị đầy đủ */}
        {!error && (
          <iframe
            ref={iframeRef}
            src={currentConfig.url}
            title={currentConfig.title}
            className="w-full border-0"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            // ✅ BỎ SANDBOX hoặc cấu hình nhẹ hơn để cho phép scroll
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
            style={{
              border: "none",
              display: "block", // Luôn hiển thị, không ẩn khi loading
              opacity: loading ? 0.3 : 1, // Làm mờ khi loading thay vì ẩn
              transition: "opacity 0.3s ease",
              // ✅ FIXED: Set min-height để đảm bảo iframe luôn hiển thị đầy đủ
              minHeight: "100%",
              height: "100%",
              // ✅ CSS để iframe có thể scroll trong mọi trường hợp
              WebkitOverflowScrolling: "touch", // iOS smooth scrolling
            }}
            // ✅ Thêm các attributes để tối ưu scrolling
            allow="geolocation; camera; microphone; encrypted-media; fullscreen; autoplay"
            referrerPolicy="strict-origin-when-cross-origin"
            loading="eager"
            scrolling="yes"
          />
        )}
      </div>

      {/* Footer info - Responsive */}
      <div className="bg-gray-800 text-white px-3 sm:px-4 py-2 text-xs flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <div className="flex items-center">
            <span className="mr-2">🌍</span>
            <span className="text-xs">Google Earth Engine {!isMobile && "Application"}</span>
            {loading && <span className="ml-2 text-yellow-300">• Đang tải...</span>}
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 text-xs">
            <span className="hidden sm:inline">Powered by Google Earth Engine</span>
            <span className="hidden sm:inline">•</span>
            <span>Sơn La Forest Monitoring</span>
          </div>
        </div>
      </div>

      {/* ✅ CSS STYLES CHO FULLSCREEN và FIX IFRAME SCROLL */}
      <style>{`
        .fullscreen-container {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 999999 !important;
          background: white;
        }

        .fullscreen-container iframe {
          width: 100% !important;
          min-height: calc(100vh - 120px) !important; /* Trừ header và footer */
          height: auto !important;
        }

        /* ✅ FIXED: Đảm bảo iframe luôn hiển thị đầy đủ và có thể scroll */
        iframe {
          -webkit-overflow-scrolling: touch;
          display: block !important;
          min-height: 100vh !important; /* Đảm bảo ít nhất cao bằng viewport */
          height: auto !important; /* Tự động điều chỉnh theo nội dung */
          overflow: visible !important; /* Cho phép nội dung hiển thị đầy đủ */
        }

        /* ✅ Container của iframe cũng phải cho phép scroll */
        .relative.flex-1 {
          overflow: auto !important;
          -webkit-overflow-scrolling: touch;
        }

        /* ✅ Đảm bảo iframe có thể scroll khi zoom */
        @media screen and (min-resolution: 150dpi) {
          iframe {
            transform-origin: 0 0;
            zoom: 1;
          }
        }

        /* ✅ Mobile optimization */
        @media (max-width: 768px) {
          iframe {
            min-height: calc(100vh - 160px) !important;
          }
        }
      `}</style>
    </div>
  );
}