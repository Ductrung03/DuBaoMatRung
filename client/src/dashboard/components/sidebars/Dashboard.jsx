import React from "react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  return (
    <div>
      <div className="mb-4">
        <Link to="/dashboard/dubaomatrung">
          <div className="bg-forest-green-primary text-white py-2 px-4 rounded-full text-lg font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer hover:bg-green-800 transition">
            Giám sát mất rừng
          </div>
        </Link>
      </div>

      <div className="mb-4">
        <Link to="/dashboard/quanlydulieu">
          <div className="bg-forest-green-primary text-white py-2 px-4 rounded-full text-lg font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer hover:bg-green-800 transition">
            Tra cứu dữ liệu
          </div>
        </Link>
      </div>

      <div className="mb-4">
        <Link to="/dashboard/baocao">
          <div className="bg-forest-green-primary text-white py-2 px-4 rounded-full text-lg font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer hover:bg-green-800 transition">
            Báo cáo
          </div>
        </Link>
      </div>

      <div className="mb-4">
        <Link to="/dashboard/phathienmatrung">
          <div className="bg-forest-green-primary text-white py-2 px-4 rounded-full text-lg font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer hover:bg-green-800 transition">
            Xử lý ảnh viễn thám
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
