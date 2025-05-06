import React from "react";
import { Link } from "react-router-dom";

const Dashboard = () => {
  return (
    <div>
      <div className="mb-4">
        <Link to="/dashboard/dubaomatrung">
          <div className="bg-forest-green-primary text-white py-2 px-4 rounded-full text-2xl font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer hover:bg-green-800 transition">
            Dự báo mất rừng
          </div>
        </Link>
      </div>

      <div className="mb-4">
        <Link to="/dashboard/quanlydulieu">
          <div className="bg-forest-green-primary text-white py-2 px-4 rounded-full text-2xl font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer hover:bg-green-800 transition">
            Quản lý dữ liệu
          </div>
        </Link>
      </div>

      <div className="mb-4">
        <Link to="/dashboard/phathienmatrung">
          <div className="bg-forest-green-primary text-white py-2 px-4 rounded-full text-2xl font-medium uppercase tracking-wide text-left shadow-md w-full cursor-pointer hover:bg-green-800 transition">
            Phát hiện mất rừng
          </div>
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
