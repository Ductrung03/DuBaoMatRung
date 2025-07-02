// client/src/dashboard/components/ErrorBoundary.jsx
import React from 'react';
import { FaExclamationTriangle, FaRedo, FaHome } from 'react-icons/fa';
import { toast } from 'react-toastify';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🔴 ErrorBoundary caught an error:', error);
    console.error('🔴 Error details:', errorInfo);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log error to external service if needed
    if (process.env.NODE_ENV === 'production') {
      // this.logErrorToService(error, errorInfo);
    }

    // Show toast notification
    toast.error('❌ Đã có lỗi xảy ra. Trang sẽ được khôi phục.', {
      autoClose: 5000
    });
  }

  handleRetry = () => {
    const newRetryCount = this.state.retryCount + 1;
    
    if (newRetryCount <= 3) {
      this.setState({ 
        hasError: false, 
        error: null, 
        errorInfo: null,
        retryCount: newRetryCount
      });
      
      toast.info(`🔄 Đang thử lại... (${newRetryCount}/3)`, {
        autoClose: 2000
      });
    } else {
      toast.error('❌ Đã thử lại quá nhiều lần. Vui lòng refresh trang.', {
        autoClose: 5000
      });
    }
  };

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="max-w-lg w-full">
            <div className="bg-white rounded-lg shadow-xl p-6 text-center">
              {/* Error Icon */}
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaExclamationTriangle className="text-2xl text-red-500" />
              </div>

              {/* Error Title */}
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                Oops! Có lỗi xảy ra
              </h1>

              {/* Error Description */}
              <p className="text-gray-600 mb-6">
                {this.state.error?.message?.includes('Google') || this.state.error?.message?.includes('iframe') ? (
                  <>
                    Không thể tải Google Earth Engine. Có thể do:
                    <br />
                    • Ad blocker đang chặn
                    <br />
                    • Kết nối mạng không ổn định  
                    <br />
                    • Server Google Earth Engine đang bảo trì
                  </>
                ) : (
                  'Ứng dụng gặp sự cố kỹ thuật. Chúng tôi đang xử lý vấn đề này.'
                )}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={this.handleRetry}
                  disabled={this.state.retryCount >= 3}
                  className="flex items-center justify-center px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <FaRedo className="mr-2" />
                  {this.state.retryCount >= 3 ? 'Đã hết lượt thử' : `Thử lại (${this.state.retryCount}/3)`}
                </button>

                <button
                  onClick={this.handleRefresh}
                  className="flex items-center justify-center px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  <FaRedo className="mr-2" />
                  Refresh trang
                </button>

                <button
                  onClick={this.handleGoHome}
                  className="flex items-center justify-center px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  <FaHome className="mr-2" />
                  Về trang chủ
                </button>
              </div>

              {/* Debug Info in Development */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 text-left">
                  <summary className="cursor-pointer text-sm text-gray-500 mb-2">
                    🔧 Chi tiết lỗi (chỉ hiển thị ở development)
                  </summary>
                  <div className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-32">
                    <div className="mb-2">
                      <strong>Error:</strong> {this.state.error.toString()}
                    </div>
                    <div>
                      <strong>Stack trace:</strong>
                      <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                    </div>
                  </div>
                </details>
              )}

              {/* Help Text */}
              <div className="mt-6 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
                <p className="font-medium mb-1">💡 Mẹo khắc phục:</p>
                <ul className="list-disc list-inside text-left space-y-1">
                  <li>Tắt ad blocker và thử lại</li>
                  <li>Kiểm tra kết nối internet</li>
                  <li>Xóa cache trình duyệt</li>
                  <li>Thử trình duyệt khác (Chrome, Firefox)</li>
                  <li>Liên hệ admin nếu vấn đề tiếp tục</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;