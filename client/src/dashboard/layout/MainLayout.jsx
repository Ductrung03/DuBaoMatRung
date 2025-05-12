/* Cập nhật MainLayout.jsx để hỗ trợ responsive */ 
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
        {/* Responsive sidebar */}
        <div className={`sidebar w-1/5 bg-gray-50 overflow-y-auto ${showSidebar ? 'block' : 'mobile-hidden'}`}>
          <Sidebar className="w-full h-full bg-gray-50" />
        </div>
        
        <div className={`flex-1 overflow-hidden ${showSidebar ? 'mobile-hidden' : 'block'}`}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
