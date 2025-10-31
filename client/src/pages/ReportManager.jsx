import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import ReportTypeSelector from "../components/ReportTypeSelector";
import { toast } from "react-toastify";

const ReportManager = () => {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);

  // Xử lý tạo báo cáo
  const handleGenerateReport = async (reportParams) => {
    try {
      setIsGenerating(true);
      
      // Tạo URL params để chuyển đến trang báo cáo
      const urlParams = new URLSearchParams({
        fromDate: reportParams.fromDate,
        toDate: reportParams.toDate,
        huyen: reportParams.huyen || '',
        xa: reportParams.xa || '',
        xacMinh: reportParams.xacMinh,
        type: reportParams.type
      });

      // Hiển thị thông báo
      const reportTypeName = reportParams.xacMinh === 'true' 
        ? 'Bảng thống kê vị trí mất rừng (đã xác minh)'
        : 'Bảng thống kê phát hiện sớm mất rừng (toàn bộ)';
      
      toast.success(`Đang tạo ${reportTypeName}...`);

      // Chuyển đến trang báo cáo với params
      navigate(`/dashboard/thong-ke-bao-cao-mat-rung?${urlParams.toString()}`);
      
    } catch (error) {
      console.error('Lỗi khi tạo báo cáo:', error);
      toast.error('Có lỗi xảy ra khi tạo báo cáo');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            HỆ THỐNG BÁO CÁO THỐNG KÊ MẤT RỪNG
          </h1>
          <p className="text-gray-600">
            Tạo báo cáo thống kê phát hiện sớm và xác minh mất rừng
          </p>
        </div>

        {/* Form tạo báo cáo */}
        <ReportTypeSelector 
          onGenerateReport={handleGenerateReport}
        />

        {/* Loading overlay */}
        {isGenerating && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-700 font-medium">Đang chuẩn bị báo cáo...</p>
            </div>
          </div>
        )}

        {/* Hướng dẫn sử dụng */}
        <div className="mt-8 max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              📖 Hướng dẫn sử dụng
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-blue-600 mb-2">
                  🔍 Loại 1: Phát hiện sớm (toàn bộ)
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Hiển thị tất cả vị trí được phát hiện</li>
                  <li>• Bao gồm cả chưa xác minh và đã xác minh</li>
                  <li>• Sử dụng cột "dtich" để tính diện tích</li>
                  <li>• Không có cột "Nguyên nhân"</li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-red-600 mb-2">
                  ✅ Loại 2: Vị trí mất rừng (đã xác minh)
                </h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Chỉ hiển thị vị trí đã xác minh (xacminh=1)</li>
                  <li>• Sử dụng cột "dtichXM" để tính diện tích</li>
                  <li>• Có thêm cột "Nguyên nhân"</li>
                  <li>• Dữ liệu đã được kiểm tra và xác nhận</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Lưu ý quan trọng:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Thời gian là thông tin bắt buộc để tạo báo cáo</li>
                <li>• Khu vực (Huyện, Xã) là tùy chọn - để trống sẽ lấy tất cả</li>
                <li>• Báo cáo có thể xuất ra file DOCX hoặc xem/lưu PDF</li>
                <li>• Biểu đồ thống kê chỉ hiển thị trên màn hình</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportManager;
