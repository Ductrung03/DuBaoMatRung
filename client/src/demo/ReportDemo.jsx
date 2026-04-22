import React, { useState } from "react";
import ReportTypeSelector from "../components/ReportTypeSelector";
import ReportGenerator from "../components/ReportGenerator";

// Dữ liệu mẫu cho demo
const sampleData = [
  {
    properties: {
      gid: 1,
      huyen_name: "Bắc Hà",
      xa_name: "Hoàng Thu Phố", 
      lo_canbao: "PH-001",
      tk: "TK01",
      khoanh: "K01",
      x: 2345678.123,
      y: 1234567.456,
      dtich: 15000, // 1.5 ha
      dtichXM: 12000, // 1.2 ha (sau xác minh)
      xacminh: 0,
      verification_reason: "",
      nguyennhan: ""
    }
  },
  {
    properties: {
      gid: 2,
      huyen_name: "Bắc Hà",
      xa_name: "Tả Van Chư",
      lo_canbao: "PH-002",
      tk: "TK02",
      khoanh: "K02",
      x: 2345679.789,
      y: 1234568.123,
      dtich: 25000, // 2.5 ha
      dtichXM: 20000, // 2.0 ha (sau xác minh)
      xacminh: 1,
      verification_reason: "Chặt phá rừng trái phép",
      nguyennhan: "Chặt phá rừng trái phép"
    }
  },
  {
    properties: {
      gid: 3,
      huyen_name: "Sa Pa",
      xa_name: "Tả Phìn",
      lo_canbao: "PH-003",
      tk: "TK03", 
      khoanh: "K03",
      x: 2345680.456,
      y: 1234569.789,
      dtich: 18000, // 1.8 ha
      dtichXM: 0, // Chưa xác minh
      xacminh: 0,
      verification_reason: "",
      nguyennhan: ""
    }
  }
];

const ReportDemo = () => {
  const [currentView, setCurrentView] = useState('selector'); // 'selector' | 'report'
  const [reportData, setReportData] = useState(null);
  const [reportParams, setReportParams] = useState(null);

  // Xử lý tạo báo cáo
  const handleGenerateReport = (params) => {
    console.log('Tạo báo cáo với params:', params);
    
    // Lọc dữ liệu theo loại báo cáo
    let filteredData = [...sampleData];
    
    if (params.xacMinh === 'true') {
      // Loại 2: Chỉ lấy dữ liệu đã xác minh
      filteredData = sampleData.filter(item => item.properties.xacminh === 1);
    }
    
    // Lọc theo huyện nếu có
    if (params.huyen) {
      filteredData = filteredData.filter(item => 
        item.properties.huyen_name?.toLowerCase().includes(params.huyen.toLowerCase())
      );
    }
    
    // Lọc theo xã nếu có
    if (params.xa) {
      filteredData = filteredData.filter(item => 
        item.properties.xa_name?.toLowerCase().includes(params.xa.toLowerCase())
      );
    }

    setReportData(filteredData);
    setReportParams(params);
    setCurrentView('report');
  };

  // Quay lại form tạo báo cáo
  const handleBackToSelector = () => {
    setCurrentView('selector');
    setReportData(null);
    setReportParams(null);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {currentView === 'selector' ? (
        <div className="py-8">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                DEMO - HỆ THỐNG BÁO CÁO THỐNG KÊ MẤT RỪNG
              </h1>
              <p className="text-gray-600">
                Demo tạo báo cáo với dữ liệu mẫu
              </p>
            </div>
            
            <ReportTypeSelector onGenerateReport={handleGenerateReport} />
            
            {/* Hiển thị dữ liệu mẫu */}
            <div className="mt-8 max-w-4xl mx-auto">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-800 mb-4">
                  📊 Dữ liệu mẫu ({sampleData.length} bản ghi)
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-300 px-2 py-1">ID</th>
                        <th className="border border-gray-300 px-2 py-1">Huyện</th>
                        <th className="border border-gray-300 px-2 py-1">Xã</th>
                        <th className="border border-gray-300 px-2 py-1">Lô CB</th>
                        <th className="border border-gray-300 px-2 py-1">DT (ha)</th>
                        <th className="border border-gray-300 px-2 py-1">DT XM (ha)</th>
                        <th className="border border-gray-300 px-2 py-1">Xác minh</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sampleData.map((item, idx) => (
                        <tr key={idx}>
                          <td className="border border-gray-300 px-2 py-1">{item.properties.gid}</td>
                          <td className="border border-gray-300 px-2 py-1">{item.properties.huyen_name}</td>
                          <td className="border border-gray-300 px-2 py-1">{item.properties.xa_name}</td>
                          <td className="border border-gray-300 px-2 py-1">{item.properties.lo_canbao}</td>
                          <td className="border border-gray-300 px-2 py-1">{(item.properties.dtich / 10000).toFixed(2)}</td>
                          <td className="border border-gray-300 px-2 py-1">{(item.properties.dtichXM / 10000).toFixed(2)}</td>
                          <td className="border border-gray-300 px-2 py-1">
                            <span className={`px-2 py-1 rounded text-xs ${
                              item.properties.xacminh === 1 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {item.properties.xacminh === 1 ? 'Đã xác minh' : 'Chưa xác minh'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          {/* Nút quay lại */}
          <div className="bg-white shadow-sm border-b">
            <div className="container mx-auto px-4 py-3">
              <button
                onClick={handleBackToSelector}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                ← Quay lại tạo báo cáo
              </button>
            </div>
          </div>
          
          {/* Hiển thị báo cáo */}
          <ReportGenerator 
            reportData={reportData} 
            reportParams={reportParams}
          />
        </div>
      )}
    </div>
  );
};

export default ReportDemo;
