import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGeoData } from "../../../contexts/GeoDataContext";


const ImportShapefile = () => {
  const [zipUrl, setZipUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setGeoData } = useGeoData();

  const handleImport = async () => {
    if (!zipUrl || !zipUrl.includes(":getFeatures")) {
      alert("❗ Vui lòng nhập đúng link từ Google Earth Engine.");
      return;
    }

    setLoading(true);

    try {
      const tableName = "mat_rung_shape_" + Date.now();

      const res = await fetch("http://localhost:3000/api/import-gee-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zipUrl, tableName }),
      });

      const data = await res.json();
      alert(data.message);

      if (data.geojson) {
        setGeoData(data.geojson);
        navigate("/dashboard/quanlydulieu");
      }
    } catch (err) {
      alert("❌ Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={zipUrl}
        onChange={(e) => setZipUrl(e.target.value)}
        placeholder="Dán URL từ Google Earth Engine"
      />
      <button onClick={handleImport} disabled={loading}>
        {loading ? "Đang xử lý..." : "Tải & Import"}
      </button>
    </div>
  );
};

export default ImportShapefile;
