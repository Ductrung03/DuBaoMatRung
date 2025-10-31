import React, { useState } from "react";
import { FaFileAlt, FaChartBar, FaSearch } from "react-icons/fa";

const ReportTypeSelector = ({ onGenerateReport }) => {
  const [formData, setFormData] = useState({
    fromDate: '',
    toDate: '',
    huyen: '',
    xa: '',
    reportType: '1', // 1: Phát hiện sớm (toàn bộ), 2: Vị trí mất rừng (xác minh)
    outputType: 'table' // table: Văn bản, chart: Biểu đồ
  });

  const [errors, setErrors] = useState({});

  // Validate form
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fromDate) {
      newErrors.fromDate = 'Vui lòng chọn ngày bắt đầu';
    }
    
    if (!formData.toDate) {
      newErrors.toDate = 'Vui lòng chọn ngày kết thúc';
    }
    
    if (formData.fromDate && formData.toDate && formData.fromDate > formData.toDate) {
      newErrors.dateRange = 'Ngày bắt đầu phải nhỏ hơn ngày kết thúc';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Xử lý thay đổi input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Xóa lỗi khi user nhập lại
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Xử lý tạo báo cáo
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Chuẩn bị params cho báo cáo
    const reportParams = {
      fromDate: formData.fromDate,
      toDate: formData.toDate,
      huyen: formData.huyen,
      xa: formData.xa,
      xacMinh: formData.reportType === '2' ? 'true' : 'false',
      type: formData.outputType === 'chart' ? 'Biểu đồ' : 'Văn bản'
    };

    onGenerateReport(reportParams);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
        TẠO BÁO CÁO THỐNG KÊ MẤT RỪNG
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Thời gian báo cáo */}
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-blue-800">
            📅 Thời gian báo cáo (bắt buộc)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Từ ngày *
              </label>
              <input
                type="date"
                name="fromDate"
                value={formData.fromDate}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.fromDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.fromDate && (
                <p className="text-red-500 text-sm mt-1">{errors.fromDate}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Đến ngày *
              </label>
              <input
                type="date"
                name="toDate"
                value={formData.toDate}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.toDate ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.toDate && (
                <p className="text-red-500 text-sm mt-1">{errors.toDate}</p>
              )}
            </div>
          </div>
          {errors.dateRange && (
            <p className="text-red-500 text-sm mt-2">{errors.dateRange}</p>
          )}
        </div>

        {/* Khu vực báo cáo */}
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-green-800">
            📍 Khu vực báo cáo (tùy chọn)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Huyện
              </label>
              <input
                type="text"
                name="huyen"
                value={formData.huyen}
                onChange={handleInputChange}
                placeholder="Nhập tên huyện (để trống = tất cả)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Xã
              </label>
              <input
                type="text"
                name="xa"
                value={formData.xa}
                onChange={handleInputChange}
                placeholder="Nhập tên xã (để trống = tất cả)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Loại báo cáo */}
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-yellow-800">
            📋 Loại báo cáo
          </h3>
          <div className="space-y-3">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                name="reportType"
                value="1"
                checked={formData.reportType === '1'}
                onChange={handleInputChange}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-gray-800">
                  Loại 1: Bảng thống kê phát hiện sớm mất rừng (toàn bộ)
                </div>
                <div className="text-sm text-gray-600">
                  Hiển thị tất cả các vị trí được phát hiện, bao gồm cả chưa xác minh và đã xác minh
                </div>
              </div>
            </label>
            
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                name="reportType"
                value="2"
                checked={formData.reportType === '2'}
                onChange={handleInputChange}
                className="mt-1"
              />
              <div>
                <div className="font-medium text-gray-800">
                  Loại 2: Bảng thống kê vị trí mất rừng (đã xác minh)
                </div>
                <div className="text-sm text-gray-600">
                  Chỉ hiển thị các vị trí đã được xác minh mất rừng (xacminh=1)
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Định dạng xuất */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3 text-purple-800">
            📊 Định dạng hiển thị
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center space-x-3 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
              <input
                type="radio"
                name="outputType"
                value="table"
                checked={formData.outputType === 'table'}
                onChange={handleInputChange}
              />
              <FaFileAlt className="text-blue-600" />
              <div>
                <div className="font-medium">Bảng văn bản</div>
                <div className="text-sm text-gray-600">Hiển thị dạng bảng chi tiết</div>
              </div>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer p-3 border border-gray-300 rounded-lg hover:bg-gray-50">
              <input
                type="radio"
                name="outputType"
                value="chart"
                checked={formData.outputType === 'chart'}
                onChange={handleInputChange}
              />
              <FaChartBar className="text-green-600" />
              <div>
                <div className="font-medium">Biểu đồ thống kê</div>
                <div className="text-sm text-gray-600">Hiển thị dạng biểu đồ</div>
              </div>
            </label>
          </div>
        </div>

        {/* Nút tạo báo cáo */}
        <div className="text-center">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg shadow-lg transition duration-200 flex items-center space-x-2 mx-auto"
          >
            <FaSearch />
            <span>Tạo báo cáo</span>
          </button>
        </div>
      </form>

      {/* Ghi chú */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-semibold text-gray-800 mb-2">📝 Lưu ý:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Thông tin tối thiểu để xuất báo cáo là thời gian (từ ngày - đến ngày)</li>
          <li>• Loại 1 sử dụng cột "dtich" để tính diện tích</li>
          <li>• Loại 2 sử dụng cột "dtichXM" để tính diện tích</li>
          <li>• Tọa độ X,Y được làm tròn, không lấy sau dấu phẩy</li>
          <li>• Dòng tổng sẽ tính toán tổng số lô và tổng diện tích</li>
        </ul>
      </div>
    </div>
  );
};

export default ReportTypeSelector;
