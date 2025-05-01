import React from "react";

export default function PhatHienMatRung() {
  return (
    <div className="w-full h-screen bg-black">
      <iframe
        src="https://ee-phathiensommatrung.projects.earthengine.app/view/phantichmatrung"
        title="GEE Phát hiện mất rừng"
        width="100%"
        height="100%"
        style={{ border: "none" }}
      />
    </div>
  );
}
