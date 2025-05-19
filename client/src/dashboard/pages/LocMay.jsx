import React from "react";

export default function LocMay() {
  return (
    <div className="w-full h-screen bg-black relative overflow-y-auto">
      <iframe
        src="https://ee-phathiensommatrung.projects.earthengine.app/view/locmay"
        title="GEE Lọc mây"
        width="100%"
        height="100%"
        style={{ border: "none" }}
      />
    </div>
  );
}