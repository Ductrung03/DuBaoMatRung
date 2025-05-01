import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const dataTinCay = [
  { name: "Chiêm Hóa", "Chưa xác minh": 80, "Đã xác minh": 35 },
  { name: "Hàm Yên", "Chưa xác minh": 82, "Đã xác minh": 32 },
  { name: "Lâm Bình", "Chưa xác minh": 95, "Đã xác minh": 28 },
  { name: "Na Hang", "Chưa xác minh": 91, "Đã xác minh": 31 },
  { name: "Sơn Dương", "Chưa xác minh": 89, "Đã xác minh": 30 },
  { name: "TP. T. Quang", "Chưa xác minh": 93, "Đã xác minh": 27 },
  { name: "Yên Sơn", "Chưa xác minh": 80, "Đã xác minh": 28 },
];

const dataDienTich = [
  { name: "Chiêm Hóa", "Chưa xác minh": 92.35, "Đã xác minh": 20.97 },
  { name: "Hàm Yên", "Chưa xác minh": 55.67, "Đã xác minh": 36.6 },
  { name: "Lâm Bình", "Chưa xác minh": 26.83, "Đã xác minh": 34.09 },
  { name: "Na Hang", "Chưa xác minh": 58.6, "Đã xác minh": 74.8 },
  { name: "Sơn Dương", "Chưa xác minh": 86.85, "Đã xác minh": 13.07 },
  { name: "TP. T. Quang", "Chưa xác minh": 24.18, "Đã xác minh": 116.96 },
  { name: "Yên Sơn", "Chưa xác minh": 51.27, "Đã xác minh": 28.24 },
];

const ThongKeBaoCaoMatRung = () => {
  return (
    <div className="p-6 font-sans">
      <h2 className="text-center text-lg font-bold mb-4">
        THỐNG KÊ KẾT QUẢ DỰ BÁO MẤT RỪNG
      </h2>

      <div className="flex gap-6 h-[calc(100vh-150px)] overflow-hidden">
        {/* BẢNG THỐNG KÊ */}
        <div className="w-3/5 overflow-auto border border-gray-300 rounded shadow px-6 pt-2 pb-6">
          <div className="text-sm mb-2">
            <div className="flex justify-between font-semibold">
              <span>Tỉnh: ........................................</span>
              <span>Từ ngày: .......... Đến ngày: ..........</span>
            </div>
          </div>

          <table className="w-full border border-black text-sm text-center table-fixed">
            <thead>
              <tr>
                <th rowSpan={2} className="border border-black px-2 py-1 w-[40px]">TT</th>
                <th rowSpan={2} className="border border-black px-2 py-1">Huyện</th>
                <th rowSpan={2} className="border border-black px-2 py-1">Mã xã</th>
                <th rowSpan={2} className="border border-black px-2 py-1">Xã</th>
                <th colSpan={2} className="border border-black px-2 py-1">Tọa độ (VN-2000)</th>
                <th rowSpan={2} className="border border-black px-2 py-1">Tiểu khu</th>
                <th rowSpan={2} className="border border-black px-2 py-1">Khoảnh</th>
                <th rowSpan={2} className="border border-black px-2 py-1">Diện tích</th>
                <th rowSpan={2} className="border border-black px-2 py-1">Ghi chú</th>
              </tr>
              <tr>
                <th className="border border-black px-2 py-1">X</th>
                <th className="border border-black px-2 py-1">Y</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 16 }).map((_, idx) => (
                <tr key={idx}>
                  <td className="border border-black px-2 py-1 font-semibold">{idx + 1}</td>
                  {Array.from({ length: 9 }).map((_, col) => (
                    <td key={col} className="border border-black px-2 py-1"></td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between mt-6 text-sm px-2">
            <span><strong>Người tổng hợp</strong></span>
            <span className="text-right">........., ngày ...... tháng ...... năm ......<br /><strong>Chi cục trưởng</strong></span>
          </div>
        </div>

        {/* BIỂU ĐỒ */}
        <div className="w-2/5 overflow-auto space-y-8">
          <div>
            <h3 className="text-center font-semibold mb-2">
              Biểu đồ mức độ tin cậy dự báo mất rừng (%)
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataTinCay}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Chưa xác minh" fill="#3399ff" />
                <Bar dataKey="Đã xác minh" fill="#ff6633" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h3 className="text-center font-semibold mb-2">
              Biểu đồ diện tích dự báo mất rừng tỉnh Tuyên Quang
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dataDienTich}>
                <XAxis dataKey="name" />
                <YAxis unit=" ha" />
                <Tooltip />
                <Legend />
                <Bar dataKey="Chưa xác minh" fill="#3399ff" />
                <Bar dataKey="Đã xác minh" fill="#ff6633" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThongKeBaoCaoMatRung;