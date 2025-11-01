import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

const MapUpdater = ({ selectedFeature }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedFeature && selectedFeature.geometry) {
      try {
        
        // Tạo layer mới từ geometry của feature đã chọn
        const geojsonFeature = {
          type: "Feature",
          geometry: selectedFeature.geometry,
          properties: {},
        };

        // Tạo một layer tạm thời
        const tempLayer = L.geoJSON(geojsonFeature);
        const bounds = tempLayer.getBounds();

        if (bounds.isValid()) {

          // Sử dụng setTimeout để đảm bảo map đã render xong
          setTimeout(() => {
            map.flyToBounds(bounds, {
              padding: [50, 50],
              duration: 1.5
            });
          }, 200);
        } else {

          // Phương án dự phòng - zoom đến tọa độ trung tâm
          try {
            let centerCoords;
            if (selectedFeature.geometry.type === "MultiPolygon") {
              centerCoords = selectedFeature.geometry.coordinates[0][0][0];
              map.setView([centerCoords[1], centerCoords[0]], 16);
            } else if (selectedFeature.geometry.type === "Polygon") {
              centerCoords = selectedFeature.geometry.coordinates[0][0];
              map.setView([centerCoords[1], centerCoords[0]], 16);
            }
          } catch (innerErr) {
            console.error("MapUpdater: Lỗi khi dùng phương án dự phòng:", innerErr);
          }
        }
      } catch (err) {
        console.error("MapUpdater: Lỗi khi zoom đến feature:", err);
      }
    }
  }, [selectedFeature, map]);

  return null;
};

export default MapUpdater;
