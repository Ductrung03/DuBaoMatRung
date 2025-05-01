import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import { Outlet } from "react-router-dom";

const MainLayout = () => {
    return (
      
        <div className="flex flex-col h-screen">
          <Header />
          <div className="flex flex-1 overflow-hidden">
            <Sidebar className="w-full h-full bg-gray-50" />
            <div className="flex-1 overflow-hidden">
                <Outlet/>
            </div>
            {/* <main className="flex-1 overflow-hidden">{children}</main> */}
          </div>
        </div>
      );
};

export default MainLayout;
