import React, { useState, useEffect, useRef } from "react";
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
import { formatDate } from "../../utils/formatDate";
import { ClipLoader } from "react-spinners";

// Component hiển thị loading overlay
const LoadingOverlay = ({ message }) => (
  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
    <div className="bg-white p-6 rounded-lg shadow-lg max-w-md text-center">
      <ClipLoader color="#027e02" size={50} />
      <p className="mt-4 text-forest-green-primary font-medium">{message}</p>
    </div>
  </div>
);

// Xác định tên bảng từ URL của layer
const getTableNameFromLayerParam = (layerName) => {
  if (!layerName) return null;
  return layerName.includes(":") ? layerName.split(":")[1] : layerName;
};

// Component MapUpdater để xử lý flying đến vị trí của feature được chọn
const MapUpdater = ({ selectedFeature }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedFeature && selectedFeature.geometry) {
      try {
        console.log("MapUpdater: Đang cố gắng zoom đến feature");
        // Tạo layer mới từ geometry của feature đã chọn
        const geojsonFeature = {
          type: "Feature",
          geometry: selectedFeature.geometry,
          properties: {}
        };
        
        // Tạo một layer tạm thời
        const tempLayer = L.geoJSON(geojsonFeature);
        const bounds = tempLayer.getBounds();
        
        if (bounds.isValid()) {
          console.log("MapUpdater: Bounds hợp lệ, thực hiện flyToBounds:", bounds);
          
          // Sử dụng setTimeout để đảm bảo map đã render xong
          setTimeout(() => {
            map.flyToBounds(bounds, {
              padding: [50, 50],
              duration: 1.0,
              animate: true
            });
          }, 200);
        } else {
          console.warn("MapUpdater: Bounds không hợp lệ, thử phương án khác");
          
          // Phương án dự phòng - zoom đến tọa độ trung tâm
          try {
            let centerCoords;
            if (selectedFeature.geometry.type === "MultiPolygon") {
              // Lấy tọa độ đầu tiên của polygon đầu tiên 
              centerCoords = selectedFeature.geometry.coordinates[0][0][0];
              map.setView([centerCoords[1], centerCoords[0]], 16);
              console.log("MapUpdater: Đã zoom đến tọa độ MultiPolygon:", centerCoords);
            } else if (selectedFeature.geometry.type === "Polygon") {
              centerCoords = selectedFeature.geometry.coordinates[0][0];
              map.setView([centerCoords[1], centerCoords[0]], 16);
              console.log("MapUpdater: Đã zoom đến tọa độ Polygon:", centerCoords);
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

// Control để chọn loại bản đồ
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

// Helper function để lấy query param từ URL
const getQueryParam = (search, key) => {
  const params = new URLSearchParams(search);
  return params.get(key);
};

// Hàm xác định màu cho feature dựa theo trạng thái
const getColorByStatus = (properties) => {
  // Nếu có trạng thái xác minh
  if (properties.detection_status) {
    switch (properties.detection_status) {
      case "Chưa xác minh": return "#ff7f00"; // Cam
      case "Đang xác minh": return "#ffff00"; // Vàng
      case "Đã xác minh": return "#ff0000"; // Đỏ
      case "Không xác minh được": return "#808080"; // Xám
      default: return "#3388ff"; // Xanh mặc định
    }
  }

  // Phân loại theo thời gian nếu không có trạng thái
  const today = new Date();
  if (properties.end_sau) {
    const endDate = new Date(properties.end_sau);
    const daysDiff = Math.floor((today - endDate) / (1000 * 60 * 60 * 24));

    if (daysDiff < 30) return "#ff0000"; // Đỏ - mới nhất (trong 30 ngày)
    else if (daysDiff < 90) return "#ff7f00"; // Cam - trong 90 ngày
    else if (daysDiff < 180) return "#ffff00"; // Vàng - trong 180 ngày
    else return "#808080"; // Xám - cũ hơn 180 ngày
  }

  return "#3388ff"; // Xanh mặc định
};

// Hàm chuyển đổi diện tích thành số
const parseArea = (areaValue) => {
  if (areaValue === null || areaValue === undefined) return null;
  
  // Nếu là chuỗi có chứa "ha"
  if (typeof areaValue === 'string' && areaValue.includes('ha')) {
    return parseFloat(areaValue.replace(/[^0-9.,]/g, '').replace(',', '.'));
  }
  
  // Nếu là số hoặc chuỗi số
  return parseFloat(String(areaValue).replace(',', '.'));
};

// Component chính
const Map = () => {
  const { geoData, loading, setGeoData } = useGeoData();
  const [mapType, setMapType] = useState("satellite");
  const [mapReady, setMapReady] = useState(false);
  const location = useLocation();
  const isDataPage = location.pathname === "/dashboard/quanlydulieu";
  const geoJsonLayerRef = useRef(null);
  const [selectedFeature, setSelectedFeature] = useState(null);
  const [selectedRowFeature, setSelectedRowFeature] = useState(null);
  const [highlightedLayerRef, setHighlightedLayerRef] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");

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

  // Hàm tối ưu để xử lý khi click vào một hàng trong bảng
  const handleRowClick = (row) => {
    setLoadingDetails(true);
    setLoadingMessage("Đang tìm vị trí trên bản đồ...");
    
    console.log("Đã click vào hàng:", row);
    console.log("Chi tiết dòng đã chọn:", JSON.stringify(row, null, 2));
    
    // Kiểm tra dữ liệu GeoJSON
    if (!geoData || !geoData.features || geoData.features.length === 0) {
      console.error("Không có dữ liệu GeoJSON hoặc dữ liệu rỗng");
      setLoadingDetails(false);
      return;
    }
    
    console.log("Tổng số features:", geoData.features.length);
    
    try {
      // Chuẩn bị các giá trị để so sánh
      const rowArea = parseArea(row.area);
      const rowTk = row.tk;
      const rowKhoanh = row.khoanh;
      const rowMahuyen = row.mahuyen;
      const rowXa = row.xa;
      const rowStartDau = row.start_dau;
      const rowEndSau = row.end_sau;
      
      console.log(`Tìm feature với: TK=${rowTk}, Khoảnh=${rowKhoanh}, Diện tích=${rowArea}, Mã huyện=${rowMahuyen}, Từ=${rowStartDau}, Đến=${rowEndSau}`);
      
      // Tạo ID ảo để phân biệt các feature
      const createVirtualId = (props) => {
        return `${props.tk || ''}|${props.khoanh || ''}|${props.area || ''}|${props.start_dau || ''}|${props.end_sau || ''}`;
      };
      
      const rowVirtualId = createVirtualId(row);
      console.log("ID ảo của dòng:", rowVirtualId);
      
      // Tìm feature khớp chính xác nhất
      let matchedFeature = null;
      let bestMatchScore = -1;
      
      // Giả lập quá trình tìm kiếm để hiển thị loading
      setTimeout(() => {
        setLoadingMessage("Phân tích dữ liệu...");
      }, 300);
      
      setTimeout(() => {
        setLoadingMessage("Đang xác định vị trí...");
      }, 600);
      
      // Duyệt qua từng feature để tìm khớp nhất
      for (let i = 0; i < geoData.features.length; i++) {
        const feature = geoData.features[i];
        const props = feature.properties;
        const featureArea = parseArea(props.area);
        
        // Tính điểm khớp cho feature này
        let matchScore = 0;
        
        // Khớp theo tiểu khu (trọng số cao)
        if (rowTk && props.tk && rowTk === props.tk) {
          matchScore += 5;
        }
        
        // Khớp theo khoảnh (trọng số cao)
        if (rowKhoanh && props.khoanh && rowKhoanh === props.khoanh) {
          matchScore += 5;
        }
        
        // Khớp theo diện tích (với độ chính xác cao)
        if (rowArea && featureArea && Math.abs(rowArea - featureArea) < 0.05) {
          matchScore += 10 - Math.abs(rowArea - featureArea) * 100; // Điểm cao hơn cho khớp chính xác hơn
        }
        
        // Khớp theo mã huyện
        if (rowMahuyen && props.mahuyen && rowMahuyen === props.mahuyen) {
          matchScore += 3;
        }
        
        // Khớp theo xã
        if (rowXa && props.xa && rowXa === props.xa) {
          matchScore += 3;
        }
        
        // Khớp theo thời gian
        if (rowStartDau && props.start_dau && rowStartDau === props.start_dau) {
          matchScore += 2;
        }
        
        if (rowEndSau && props.end_sau && rowEndSau === props.end_sau) {
          matchScore += 2;
        }
        
        // So sánh ID ảo (trọng số rất cao)
        const featureVirtualId = createVirtualId(props);
        if (rowVirtualId === featureVirtualId) {
          matchScore += 20;
        }
        
        // Kiểm tra nếu feature này khớp tốt hơn
        if (matchScore > bestMatchScore) {
          bestMatchScore = matchScore;
          matchedFeature = feature;
          console.log(`Feature #${i} có điểm khớp: ${matchScore}, hiện là feature tốt nhất`);
        }
      }
      
      setTimeout(() => {
        if (matchedFeature) {
          console.log("Tìm thấy feature khớp tốt nhất với điểm:", bestMatchScore);
          console.log("Feature:", matchedFeature);
          
          // Đánh dấu feature được chọn
          setSelectedFeature(matchedFeature);
          setSelectedRowFeature(matchedFeature);
          
          // Thực hiện zoom đến feature
          if (window._leaflet_map) {
            try {
              // Reset style cho feature được highlight trước đó
              if (highlightedLayerRef && geoJsonLayerRef.current) {
                geoJsonLayerRef.current.resetStyle(highlightedLayerRef);
              }
              
              // Highlight feature mới trên bản đồ
              if (geoJsonLayerRef.current) {
                let newHighlightedLayer = null;
                
                geoJsonLayerRef.current.eachLayer(layer => {
                  if (layer.feature === matchedFeature) {
                    layer.setStyle({
                      weight: 3,
                      color: '#ff7800',
                      opacity: 1,
                      fillOpacity: 0.7
                    });
                    layer.bringToFront();
                    newHighlightedLayer = layer;
                    
                    // Mở popup nếu có
                    if (layer.getPopup) {
                      layer.openPopup();
                    }
                  }
                });
                
                setHighlightedLayerRef(newHighlightedLayer);
              }
              
              // Tạo layer tạm thời chỉ với geometry để tạo bounds
              const tempGeojson = {
                type: "Feature",
                geometry: matchedFeature.geometry,
                properties: {}
              };
              
              const tempLayer = L.geoJSON(tempGeojson);
              const bounds = tempLayer.getBounds();
              
              if (bounds && bounds.isValid()) {
                console.log("Bounds hợp lệ, thực hiện flyToBounds:", bounds);
                
                // Sử dụng timeout để đảm bảo map đã render
                setTimeout(() => {
                  window._leaflet_map.flyToBounds(bounds, {
                    padding: [100, 100],
                    maxZoom: 18,
                    duration: 1.5,
                    animate: true
                  });
                  
                  // Hoàn thành quá trình tìm kiếm
                  setLoadingDetails(false);
                }, 300);
              } else {
                console.warn("Bounds không hợp lệ, sử dụng phương án dự phòng");
                
                // Phương án dự phòng - zoom đến tọa độ trung tâm
                let centerCoords;
                if (matchedFeature.geometry.type === "MultiPolygon") {
                  // Duyệt qua tất cả các polygon và tìm một điểm hợp lệ
                  for (let i = 0; i < matchedFeature.geometry.coordinates.length; i++) {
                    if (matchedFeature.geometry.coordinates[i][0].length > 0) {
                      centerCoords = matchedFeature.geometry.coordinates[i][0][0];
                      break;
                    }
                  }
                } else if (matchedFeature.geometry.type === "Polygon") {
                  centerCoords = matchedFeature.geometry.coordinates[0][0];
                }
                
                if (centerCoords) {
                  window._leaflet_map.setView([centerCoords[1], centerCoords[0]], 16);
                  console.log("Đã zoom đến tọa độ:", centerCoords);
                  
                  // Hoàn thành quá trình tìm kiếm
                  setLoadingDetails(false);
                } else {
                  console.error("Không thể tìm tọa độ hợp lệ trong geometry");
                  setLoadingDetails(false);
                }
              }
            } catch (error) {
              console.error("Lỗi khi zoom:", error);
              setLoadingDetails(false);
            }
          } else {
            console.error("Map chưa được khởi tạo");
            setLoadingDetails(false);
          }
        } else {
          console.error("Không tìm thấy feature tương ứng");
          toast.error("Không thể tìm thấy vị trí chính xác trên bản đồ. Vui lòng thử lại hoặc chọn mục khác.");
          setLoadingDetails(false);
        }
      }, 1000); // Đợi 1 giây để giả lập quá trình tìm kiếm
    } catch (error) {
      console.error("Lỗi xử lý sự kiện click bảng:", error);
      setLoadingDetails(false);
    }
  };

  // Xử lý cho mỗi feature trên bản đồ
  const onEachFeature = (feature, layer) => {
    if (feature.properties) {
      // Xây dựng HTML popup
      let popupContent = `
      <div class="custom-popup">
        <h4 class="popup-title">Thông tin đối tượng</h4>
        <table class="popup-table">
      `;

      // Các trường quan trọng hiển thị đầu tiên
      const priorityFields = [
        "huyen", "xa", "area", "start_dau", "end_sau", 
        "tk", "khoanh", "churung", "mahuyen"
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
            value = `${(parseFloat(value) / 10000).toFixed(2)} ha`;
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
          !["x", "y", "x_vn2000", "y_vn2000"].includes(key)
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

      layer.bindPopup(popupContent, { maxWidth: 300, className: "custom-popup-container" });
    }

    // Sự kiện mouseover/mouseout để highlight đối tượng
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

    // Sự kiện click cho layer
    layer.on("click", () => {
      // Đặt style cho tất cả các layer
      if (geoJsonLayerRef.current) {
        geoJsonLayerRef.current.eachLayer((l) => {
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
      setHighlightedLayerRef(layer);
    });
  };

  // Xử lý zoom đến layer từ WMS
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
          const name = layerNodes[i].getElementsByTagName("Name")[0]?.textContent;
          if (name === layer) {
            const bboxEl = layerNodes[i].getElementsByTagName("LatLonBoundingBox")[0];
            if (bboxEl) {
              const minx = parseFloat(bboxEl.getAttribute("minx"));
              const miny = parseFloat(bboxEl.getAttribute("miny"));
              const maxx = parseFloat(bboxEl.getAttribute("maxx"));
              const maxy = parseFloat(bboxEl.getAttribute("maxy"));

              const bounds = [[miny, minx], [maxy, maxx]];
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
    <div className="p-2 md:p-5 font-sans relative">
      <h2 className="text-center text-lg md:text-xl font-bold mb-2 md:mb-5">
        Bản đồ khu vực
      </h2>

      <div className={`flex justify-center items-center ${isDataPage ? "mb-2 md:mb-5" : ""} relative`}>
        {/* Loading overlay for map */}
        {loading && (
          <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
            <div className="bg-white p-4 rounded-lg shadow-lg flex flex-col items-center">
              <ClipLoader color="#027e02" size={40} />
              <p className="mt-2 text-forest-green-primary">Đang tải dữ liệu bản đồ...</p>
            </div>
          </div>
        )}
        
        <MapContainer
          center={[22.1702, 104.1225]} // Center tỉnh Lào Cai
          zoom={8}
          className={`w-full rounded-xl shadow-lg ${
            isDataPage
              ? "h-[40vh] md:h-[50vh]"
              : "h-[50vh] md:h-[calc(100vh-150px)]"
          }`}
          whenCreated={(mapInstance) => {
            console.log("Map đã được khởi tạo");
            window._leaflet_map = mapInstance;
            // Thêm timeout để đảm bảo map hoàn toàn sẵn sàng
            setTimeout(() => {
              setMapReady(true);
              console.log("Map đã sẵn sàng");
            }, 500);
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

          {/* Component để xử lý việc bay đến feature được chọn từ bảng */}
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
                  weight: selectedFeature && feature === selectedFeature ? 3 : 1,
                  opacity: 1,
                  color: selectedFeature && feature === selectedFeature ? "#ff7800" : "#ffffff",
                  fillOpacity: 0.7,
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
            <div className="relative">
              {/* Loading overlay cho bảng dữ liệu */}
              {loadingDetails && (
                <LoadingOverlay message={loadingMessage} />
              )}
              
              <Table
                data={geoData.features.map((f) => f.properties)}
                tableName={tableName}
                onRowClick={handleRowClick}
              />
            </div>
          )
        ))}

      {/* Debugging display */}
      {!loading &&
        (!geoData || !geoData.features || geoData.features.length === 0) && (
          <div className="text-center text-amber-700 font-semibold p-3 bg-amber-50 rounded-md mt-2">
            ⚠️ Không có dữ liệu hoặc dữ liệu không đúng định dạng.
            {geoData && (
              <div className="text-xs mt-1 text-gray-600">
                Type: {geoData.type || "N/A"}, Features:{" "}
                {geoData.features?.length || 0}
              </div>
            )}
          </div>
        )}
    </div>
  );
};

export default Map;
