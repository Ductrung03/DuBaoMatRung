// QuanLyDuLieu.jsx
import React from "react";
import Map from "../pages/Map";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const QuanLyDuLieu = () => {
  return (
    <div className="flex flex-col gap-4">
      <Map />
      <ToastContainer position="top-center" autoClose={3000} />
    </div>
  );
};

export default QuanLyDuLieu;
