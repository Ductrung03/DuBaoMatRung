import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Outlet } from "react-router-dom";

const MainLayout = () => {
  return (
    <div className="flex flex-col h-screen">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar cố định */}
        <div className="w-96 bg-white border-r border-gray-200 overflow-y-auto">
          <Sidebar />
        </div>
        
        {/* Main content */}
        <div className="flex-1 overflow-hidden bg-gray-50">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default MainLayout;