import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
  WMSTileLayer,
  Marker,
  Popup
} from "react-leaflet";
import { useLocation } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Table from "./Table";
import { useGeoData } from "../contexts/GeoDataContext";
import { formatDate } from "../../utils/formatDate";

// Xác định tên bảng từ URL của layer
const getTableNameFromLayerParam = (layerName) => {
  if (!layerName) return null;

  // Ví dụ: "rung:mat_rung" -> "mat_rung"
  if (layerName.includes(":")) {
    return layerName.split(":")[1];
  }

  return layerName;
};

// Thêm component MapUpdater để xử lý flying đến vị trí của feature được chọn
const MapUpdater = ({ selectedFeature }) => {
  const map = useMap();
  
  useEffect(() => {
    if (selectedFeature && selectedFeature.geometry) {
      try {
        // Tạo geojson chỉ chứa feature được chọn
        const selectedGeoJson = {
          type: "FeatureCollection",
          features: [selectedFeature]
        };
        
        // Tạo một layer tạm thời để lấy bounds
        const tempLayer = L.geoJSON(selectedGeoJson);
        
        // Kiểm tra nếu bounds hợp lệ
        if (tempLayer.getBounds().isValid()) {
          console.log("✅ Zoom đến feature được chọn:", selectedFeature);
          
          // Thêm timeout nhỏ để đảm bảo map đã render xong
          setTimeout(() => {
            map.flyToBounds(tempLayer.getBounds(), {
              padding: [50, 50],
              duration: 0.5
            });
          }, 100);
        }
      } catch (err) {
        console.error("❌ Lỗi khi zoom đến feature:", err);
      }
    }
  }, [selectedFeature, map]);

  return null;
};

const CustomMapControl = ({ setMapType }) => {
  const map = useMap();

  useEffect(() => {
    const container = L.DomUtil.create("div");

    container.innerHTML = `
      <div class="relative z-[1000]">
        <button id="toggle-map-type" class="flex items-center space-x-2 px-3 py-2 bg-white rounded-lg shadow-md hover:bg-gray-100 text-sm font-semibold text-gray-700">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7l6-3 6 3 6-3v13l-6 3-6-3-6 3V7z" />
          </svg>
          <span>Lớp bản đồ</span>
        </button>
        <div id="map-dropdown" class="hidden absolute right-0 mt-2 w-44 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 text-sm">
          <div class="map-option px-4 py-2 hover:bg-gray-100 cursor-pointer" data-type="normal">🟢 Bản đồ thường</div>
          <div class="map-option px-4 py-2 hover:bg-gray-100 cursor-pointer" data-type="satellite">🛰️ Bản đồ vệ tinh</div>
        </div>
      </div>
    `;

    container.className = "leaflet-control leaflet-bar";

    const toggleBtn = container.querySelector("#toggle-map-type");
    const dropdown = container.querySelector("#map-dropdown");

    toggleBtn.onclick = (e) => {
      e.preventDefault();
      dropdown.classList.toggle("hidden");
    };

    dropdown.querySelectorAll(".map-option").forEach((item) => {
      item.addEventListener("click", () => {
        const type = item.getAttribute("data-type");
        setMapType(type);
        dropdown.classList.add("hidden");
      });
    });

    const CustomControl = L.Control.extend({
      onAdd: () => container,
      onRemove: () => {},
    });

    const control = new CustomControl({ position: "topright" });
    map.addControl(control);

    return () => {
      map.removeControl(control);
    };
  }, [map, setMapType]);

  return null;
};

const getQueryParam = (search, key) => {
  const params = new URLSearchParams(search);
  return params.get(key);
};

const getColorByStatus = (properties) => {
  // Nếu có trạng thái xác minh
  if (properties.detection_status) {
    switch (properties.detection_status) {
      case "Chưa xác minh":
        return "#ff7f00"; // Cam
      case "Đang xác minh":
        return "#ffff00"; // Vàng
      case "Đã xác minh":
        return "#ff0000"; // Đỏ
      case "Không xác minh được":
        return "#808080"; // Xám
      default:
        return "#3388ff"; // Xanh mặc định
    }
  }

  // Phân loại theo thời gian nếu không có trạng thái
  const today = new Date();
  if (properties.end_sau) {
    const endDate = new Date(properties.end_sau);
    const daysDiff = Math.floor((today - endDate) / (1000 * 60 * 60 * 24));

    if (daysDiff < 30) {
      return "#ff0000"; // Đỏ - mới nhất (trong 30 ngày)
    } else if (daysDiff < 90) {
      return "#ff7f00"; // Cam - trong 90 ngày
    } else if (daysDiff < 180) {
      return "#ffff00"; // Vàng - trong 180 ngày
    } else {
      return "#808080"; // Xám - cũ hơn 180 ngày
    }
  }

  return "#3388ff"; // Xanh mặc định
};

const Map = () => {
  const { geoData, loading, setGeoData } = useGeoData();
  const [mapType, setMapType] = useState("satellite");
  const [mapReady, setMapReady] = useState(false);
  const location = useLocation();
  const isDataPage = location.pathname === "/dashboard/quanlydulieu";
  const geoJsonLayerRef = useRef(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [selectedRowFeature, setSelectedRowFeature] = useState(null);

  const layerName = getQueryParam(location.search, "layer");
  const tableName = getTableNameFromLayerParam(layerName) || "mat_rung"; // Mặc định là mat_rung nếu không có

  // Debug geoData để kiểm tra nó nhận được gì từ backend
  useEffect(() => {
    if (geoData) {
      console.log("Dữ liệu GeoJSON nhận được:", geoData);
      console.log("Số lượng features:", geoData.features?.length || 0);
      if (geoData.features && geoData.features.length > 0) {
        console.log("Feature đầu tiên:", geoData.features[0]);
      }
    }
  }, [geoData]);

  // Hàm mới tối ưu hơn để xử lý khi click vào một hàng trong bảng
  const handleRowClick = (rowData) => {
    console.log("Đã click vào hàng:", rowData);

    if (!geoData || !geoData.features || !mapReady) return;
    
    // Tìm feature trong geoData khớp với dữ liệu hàng
    const matchedFeature = geoData.features.find(feature => {
      const props = feature.properties;
      
      // So sánh các thuộc tính chính để xác định đúng feature
      const keyMatches = ['start_dau', 'end_sau', 'mahuyen', 'area'].reduce((match, key) => {
        // Nếu cả hai giá trị đều tồn tại, so sánh chúng
        if (props[key] !== undefined && rowData[key] !== undefined) {
          return match && (props[key] === rowData[key]);
        }
        // Nếu một trong hai không tồn tại, coi như không ảnh hưởng
        return match;
      }, true);
      
      return keyMatches;
    });

    if (matchedFeature) {
      console.log("Đã tìm thấy feature khớp:", matchedFeature);
      
      // Đánh dấu feature đã chọn
      setSelectedFeature(matchedFeature);
      setSelectedRowFeature(matchedFeature);
      
      // Highlight trong layer GeoJSON
      if (geoJsonLayerRef.current) {
        geoJsonLayerRef.current.eachLayer(layer => {
          if (layer.feature === matchedFeature) {
            layer.setStyle({
              weight: 3,
              color: "#ff7800",
              fillOpacity: 0.7
            });
            layer.bringToFront();
            // Mở popup nếu có
            if (layer.getPopup) {
              layer.openPopup();
            }
          } else {
            layer.setStyle({
              weight: 1,
              color: "#ffffff",
              fillOpacity: 0.5
            });
          }
        });
      }
    } else {
      console.log("Không tìm thấy feature khớp với hàng được click");
    }
  };

  const onEachFeature = (feature, layer) => {
    if (feature.properties) {
      // Xây dựng HTML popup với styling tốt hơn
      let popupContent = `
      <div class="custom-popup">
        <h4 class="popup-title">Thông tin đối tượng</h4>
        <table class="popup-table">
    `;

      // Các trường quan trọng hiển thị đầu tiên
      const priorityFields = [
        "huyen",
        "xa",
        "area",
        "start_dau",
        "end_sau",
        "tk",
        "khoanh",
        "churung",
        "mahuyen"
      ];

      // Xử lý các trường ưu tiên trước
      priorityFields.forEach((field) => {
        if (feature.properties[field] !== undefined) {
          let value = feature.properties[field];
          let label = field;

          // Định dạng ngày tháng
          if (field === "start_dau" || field === "end_sau") {
            value = formatDate(value);
            label = field === "start_dau" ? "Từ ngày" : "Đến ngày";
          }

          // Định dạng diện tích
          if (field === "area" && value !== null) {
            value = `${(value / 10000).toFixed(1)} ha`;
            label = "Diện tích";
          }

          // Đổi tên hiển thị các trường
          if (field === "huyen") label = "Huyện";
          if (field === "xa") label = "Xã";
          if (field === "tk") label = "Tiểu khu";
          if (field === "khoanh") label = "Khoảnh";
          if (field === "churung") label = "Chủ rừng";
          if (field === "mahuyen") label = "Mã huyện";

          popupContent += `
          <tr>
            <th>${label}</th>
            <td>${value !== null ? value : "Không có"}</td>
          </tr>
        `;
        }
      });

      // Trạng thái xác minh nếu có
      if (feature.properties.detection_status) {
        popupContent += `
        <tr>
          <th>Trạng thái</th>
          <td>${feature.properties.detection_status}</td>
        </tr>
      `;
      }

      // Thêm các thuộc tính còn lại (bỏ qua các thuộc tính kỹ thuật)
      Object.entries(feature.properties).forEach(([key, value]) => {
        // Bỏ qua các trường đã xử lý và trường kỹ thuật
        if (
          !priorityFields.includes(key) &&
          key !== "detection_status" &&
          !key.includes("geom") &&
          !key.startsWith("_") &&
          !['x', 'y', 'x_vn2000', 'y_vn2000'].includes(key)
        ) {
          popupContent += `
          <tr>
            <th>${key}</th>
            <td>${value !== null ? value : "Không có"}</td>
          </tr>
        `;
        }
      });

      popupContent += `
        </table>
      </div>
    `;

      const popupOptions = {
        maxWidth: 300,
        className: "custom-popup-container",
      };

      layer.bindPopup(popupContent, popupOptions);
    }

    // Thêm sự kiện mouseover/mouseout để highlight đối tượng
    layer.on("mouseover", function () {
      this.setStyle({
        weight: 3,
        color: "#ff7800",
        dashArray: "",
        fillOpacity: 0.7,
      });
      this.bringToFront();
    });

    layer.on("mouseout", function () {
      // Chỉ reset style nếu không phải đối tượng được chọn
      if (!selectedFeature || this.feature !== selectedFeature) {
        geoJsonLayerRef.current.resetStyle(this);
      }
    });

    // Thêm sự kiện click cho layer
    layer.on("click", (e) => {
      // Đặt style cho tất cả các layer
      const geoJsonLayer = geoJsonLayerRef.current;
      if (geoJsonLayer) {
        geoJsonLayer.eachLayer((l) => {
          l.setStyle({
            weight: l === layer ? 3 : 1,
            color: l === layer ? "#ff7800" : "#3388ff",
            fillOpacity: l === layer ? 0.7 : 0.2,
          });

          if (l === layer) {
            l.bringToFront();
          }
        });
      }

      setSelectedFeature(feature);
    });
  };

  useEffect(() => {
    const map = window._leaflet_map;
    if (!map || !layerName) return;

    const [workspace, layer] = layerName.split(":");
    const url = `http://localhost:8080/geoserver/${workspace}/wms?service=WMS&version=1.1.1&request=GetCapabilities`;

    fetch(url)
      .then((res) => res.text())
      .then((text) => {
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");

        const layerNodes = xml.querySelectorAll("Layer > Layer");

        for (let i = 0; i < layerNodes.length; i++) {
          const name =
            layerNodes[i].getElementsByTagName("Name")[0]?.textContent;
          if (name === layer) {
            const bboxEl =
              layerNodes[i].getElementsByTagName("LatLonBoundingBox")[0];
            if (bboxEl) {
              const minx = parseFloat(bboxEl.getAttribute("minx"));
              const miny = parseFloat(bboxEl.getAttribute("miny"));
              const maxx = parseFloat(bboxEl.getAttribute("maxx"));
              const maxy = parseFloat(bboxEl.getAttribute("maxy"));

              const bounds = [
                [miny, minx],
                [maxy, maxx],
              ];

              map.flyToBounds(bounds, { padding: [20, 20] });
              console.log("✅ Zoom đến bbox:", bounds);
            }
            break;
          }
        }
      })
      .catch((err) => console.error("❌ Lỗi khi lấy GetCapabilities:", err));
  }, [layerName]);

  // Zoom tới feature khi map và data sẵn sàng
  useEffect(() => {
    if (mapReady && geoData?.features?.length > 0 && window._leaflet_map) {
      try {
        console.log("Cố gắng zoom đến dữ liệu...");
        
        // Sử dụng Leaflet để tạo bounds từ GeoJSON
        const geoJsonLayer = L.geoJSON(geoData);
        const bounds = geoJsonLayer.getBounds();
        
        if (bounds.isValid()) {
          console.log("Bounds hợp lệ:", bounds);
          window._leaflet_map.fitBounds(bounds, { padding: [20, 20] });
        } else {
          console.log("Bounds không hợp lệ từ GeoJSON");
        }
      } catch (err) {
        console.error("Lỗi khi zoom đến dữ liệu:", err);
      }
    }
  }, [mapReady, geoData]);
  
  return (
    <div className="p-2 md:p-5 font-sans">
      <h2 className="text-center text-lg md:text-xl font-bold mb-2 md:mb-5">
        Bản đồ khu vực
      </h2>

      <div
        className={`flex justify-center items-center ${
          isDataPage ? "mb-2 md:mb-5" : ""
        }`}
      >
        <MapContainer
          center={[22.1702, 104.1225]} // Center tỉnh Lào Cai
          zoom={8}
          className={`w-full rounded-xl shadow-lg ${
            isDataPage
              ? "h-[40vh] md:h-[50vh]"
              : "h-[50vh] md:h-[calc(100vh-150px)]"
          }`}
          whenCreated={(mapInstance) => {
            window._leaflet_map = mapInstance;
            setMapReady(true);
          }}
        >
          {mapType === "normal" ? (
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          ) : (
            <>
              <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
              <TileLayer url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />
            </>
          )}

          {/* Thêm component để xử lý việc bay đến feature được chọn từ bảng */}
          <MapUpdater selectedFeature={selectedRowFeature} />

          {layerName ? (
            <WMSTileLayer
              url="http://localhost:8080/geoserver/rung/wms"
              layers={layerName}
              format="image/png"
              transparent={true}
              version="1.1.0"
              attribution="GeoServer"
            />
          ) : loading ? (
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-3 rounded shadow-lg text-green-700 font-semibold z-[1000]">
              ⏳ Đang tải dữ liệu...
            </div>
          ) : (
            geoData?.type === "FeatureCollection" &&
            geoData.features?.length > 0 && (
              <GeoJSON
                key={Date.now()}
                data={geoData}
                onEachFeature={onEachFeature}
                style={(feature) => ({
                  fillColor: getColorByStatus(feature.properties),
                  weight:
                    selectedFeature && feature === selectedFeature ? 3 : 1,
                  opacity: 1, // Tăng độ mờ đường viền
                  color:
                    selectedFeature && feature === selectedFeature
                      ? "#ff7800"
                      : "#ffffff",
                  fillOpacity: 0.7, // Tăng độ mờ fill
                })}
                ref={(layerRef) => {
                  if (layerRef) {
                    geoJsonLayerRef.current = layerRef;

                    if (mapReady) {
                      const bounds = layerRef.getBounds();
                      if (bounds.isValid()) {
                        window._leaflet_map.fitBounds(bounds, {
                          padding: [20, 20],
                        });
                        console.log("✅ Đã zoom đến dữ liệu GeoJSON");
                      }
                    }
                  }
                }}
              />
            )
          )}

          <CustomMapControl setMapType={setMapType} />
        </MapContainer>
      </div>

      {!layerName &&
        isDataPage &&
        (loading ? (
          <div className="text-center text-green-700 font-semibold p-3 bg-white rounded-md shadow">
            <div className="animate-spin inline-block w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full mr-2"></div>
            Đang tải dữ liệu... Vui lòng đợi trong giây lát
          </div>
        ) : (
          geoData?.features?.length > 0 && (
            <Table
              data={geoData.features.map((f) => f.properties)}
              tableName={tableName}
              onRowClick={handleRowClick}
            />
          )
        ))}

      {/* Debugging display */}
      {!loading && (!geoData || !geoData.features || geoData.features.length === 0) && (
        <div className="text-center text-amber-700 font-semibold p-3 bg-amber-50 rounded-md mt-2">
          ⚠️ Không có dữ liệu hoặc dữ liệu không đúng định dạng.
          {geoData && (
            <div className="text-xs mt-1 text-gray-600">
              Type: {geoData.type || 'N/A'}, Features: {geoData.features?.length || 0}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Map;