import React from "react";

export default function XuLyAnh() {
  return (
    <div className="w-full h-screen bg-black relative overflow-y-auto">
      <iframe
        src="https://ee-phathiensommatrung.projects.earthengine.app/view/xulyanh"
        title="GEE Xử lý ảnh"
        width="100%"
        height="100%"
        style={{ border: "none" }}
      />
    </div>
  );
}