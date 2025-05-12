import React, { useEffect, useState, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  useMap,
  WMSTileLayer,
} from "react-leaflet";
import { useLocation } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Table from "./Table";
import { useGeoData } from "../contexts/GeoDataContext";
import {
  wgs84ToVN2000LaoCai,
  getFeatureCenter,
} from "../../utils/coordinateTransform";

// Xác định tên bảng từ URL của layer
const getTableNameFromLayerParam = (layerName) => {
  if (!layerName) return null;

  // Ví dụ: "rung:mat_rung" -> "mat_rung"
  if (layerName.includes(":")) {
    return layerName.split(":")[1];
  }

  return layerName;
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
  const { geoData, loading, setGeoData  } = useGeoData();
  const [mapType, setMapType] = useState("satellite");
  const [mapReady, setMapReady] = useState(false);
  const location = useLocation();
  const isDataPage = location.pathname === "/dashboard/quanlydulieu";
  const geoJsonLayerRef = useRef(null);
  const [selectedFeature, setSelectedFeature] = useState(null);

  const layerName = getQueryParam(location.search, "layer");
  const tableName = getTableNameFromLayerParam(layerName) || "mat_rung"; // Mặc định là mat_rung nếu không có

  // Hàm xử lý khi click vào một hàng trong bảng
  const handleRowClick = (rowData) => {
    console.log("Đã click vào hàng:", rowData);

    if (!mapReady || !geoJsonLayerRef.current) {
      console.log("Map hoặc GeoJSON layer chưa sẵn sàng");
      return;
    }

    const map = window._leaflet_map;
    const layer = geoJsonLayerRef.current;

    // Tìm feature tương ứng với dữ liệu hàng được click
    let targetFeature = null;
    let targetLayer = null;

    layer.eachLayer((l) => {
      const props = l.feature.properties;

      // So sánh các thuộc tính chính để xác định đúng feature
      const isMatch =
        props.start_dau === rowData.start_dau &&
        props.end_sau === rowData.end_sau &&
        props.area === rowData.area &&
        props.mahuyen === rowData.mahuyen;

      if (isMatch) {
        targetFeature = l.feature;
        targetLayer = l;
      }
    });

    if (targetLayer) {
      console.log("Đã tìm thấy layer tương ứng:", targetLayer);

      // Lưu feature đã chọn
      setSelectedFeature(targetFeature);

      // Hiển thị popup
      targetLayer.openPopup();

      // Zoom tới đối tượng được chọn
      const bounds = targetLayer.getBounds();
      map.fitBounds(bounds, { padding: [50, 50] });

      // Highlight đối tượng được chọn
      layer.eachLayer((l) => {
        l.setStyle({
          weight: l === targetLayer ? 3 : 1,
          color: l === targetLayer ? "#ff7800" : "#3388ff",
          fillOpacity: l === targetLayer ? 0.7 : 0.2,
        });

        if (l === targetLayer) {
          l.bringToFront();
        }
      });
    } else {
      console.log("Không tìm thấy layer tương ứng với hàng được click");
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

          popupContent += `
          <tr>
            <th>${label}</th>
            <td>${value !== null ? value : "Không có"}</td>
          </tr>
        `;

          // Xóa trường đã xử lý để không hiển thị lại
          delete feature.properties[field];
        }
      });

      // Tọa độ VN-2000
      const center = getFeatureCenter(feature);
      if (center) {
        const vn2000Coords = wgs84ToVN2000LaoCai(
          center.longitude,
          center.latitude
        );

        popupContent += `
        <tr>
          <th>X (VN-2000)</th>
          <td>${vn2000Coords.x}</td>
        </tr>
        <tr>
          <th>Y (VN-2000)</th>
          <td>${vn2000Coords.y}</td>
        </tr>
      `;

        // Lưu tọa độ vào properties để có thể hiển thị trong bảng
        feature.properties.x_vn2000 = vn2000Coords.x;
        feature.properties.y_vn2000 = vn2000Coords.y;
      }

      // Trạng thái xác minh nếu có
      if (feature.properties.detection_status) {
        popupContent += `
        <tr>
          <th>Trạng thái</th>
          <td>${feature.properties.detection_status}</td>
        </tr>
      `;
        delete feature.properties.detection_status;
      }

      // Thêm các thuộc tính còn lại (bỏ qua các thuộc tính kỹ thuật)
      Object.entries(feature.properties).forEach(([key, value]) => {
        // Bỏ qua các trường kỹ thuật và tọa độ đã xử lý
        if (
          !key.includes("geom") &&
          !key.startsWith("_") &&
          key !== "x" &&
          key !== "y" &&
          key !== "x_vn2000" &&
          key !== "y_vn2000"
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
  // Thêm effect mới để xử lý dữ liệu khi geoData thay đổi
  useEffect(() => {
    // Chỉ xử lý khi có dữ liệu và không đang loading
    if (geoData?.features?.length > 0 && !loading) {
      // Tạo bản sao của geoData để không thay đổi trực tiếp state
      const updatedGeoData = {
        ...geoData,
        features: geoData.features.map((feature) => {
          // Tạo bản sao của feature
          const updatedFeature = {
            ...feature,
            properties: { ...feature.properties },
          };

          // Nếu feature có geometry, tính tọa độ tâm
          if (feature.geometry) {
            const center = getFeatureCenter(feature);
            if (center) {
              const vn2000Coords = wgs84ToVN2000LaoCai(
                center.longitude,
                center.latitude
              );
              // Thêm tọa độ VN-2000 vào properties
              updatedFeature.properties.x = vn2000Coords.x;
              updatedFeature.properties.y = vn2000Coords.y;
            }
          }
          return updatedFeature;
        }),
      };

      // Cập nhật dữ liệu
      setGeoData(updatedGeoData);
    }
  }, [geoData?.features?.length, loading]);
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
          center={[21.0285, 105.8542]}
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
                  opacity: 0.7,
                  color:
                    selectedFeature && feature === selectedFeature
                      ? "#ff7800"
                      : "#ffffff",
                  fillOpacity: 0.5,
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
          <div className="text-center text-green-700 font-semibold p-3">
            ⏳ Đang tải bảng dữ liệu...
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
    </div>
  );
};

export default Map;
