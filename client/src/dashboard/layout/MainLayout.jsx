import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Outlet } from "react-router-dom";
import { FaBars, FaTimes } from "react-icons/fa";

const MainLayout = () => {
  const [showSidebar, setShowSidebar] = useState(false);
  
  return (
    <div className="flex flex-col h-screen">
      <Header />
      
      {/* Mobile sidebar toggle button */}
      <div className="mobile-only bg-forest-green-primary p-2">
        <button 
          onClick={() => setShowSidebar(!showSidebar)}
          className="flex items-center justify-center bg-white text-forest-green-primary p-2 rounded-md w-full"
        >
          {showSidebar ? (
            <>
              <FaTimes className="mr-2" />
              Ẩn menu
            </>
          ) : (
            <>
              <FaBars className="mr-2" />
              Hiển thị menu
            </>
          )}
        </button>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar với chiều rộng cố định thay vì tỷ lệ phần trăm */}
        <div className={`sidebar bg-gray-50 overflow-y-auto ${showSidebar ? 'block' : 'mobile-hidden'}`}
             style={{ width: '280px', flexShrink: 0 }}>
          <Sidebar />
        </div>
        
        <div className={`flex-1 overflow-hidden ${showSidebar ? 'mobile-hidden' : 'block'}`}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default MainLayout;