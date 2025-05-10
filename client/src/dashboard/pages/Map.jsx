import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, GeoJSON, useMap, WMSTileLayer } from "react-leaflet";
import { useLocation } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Table from "./Table";
import { useGeoData } from "../contexts/GeoDataContext";

// Xác định tên bảng từ URL của layer
const getTableNameFromLayerParam = (layerName) => {
  if (!layerName) return null;
  
  // Ví dụ: "rung:mat_rung" -> "mat_rung"
  if (layerName.includes(':')) {
    return layerName.split(':')[1];
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

const Map = () => {
  const { geoData, loading } = useGeoData();
  const [mapType, setMapType] = useState("satellite");
  const [mapReady, setMapReady] = useState(false);
  const location = useLocation();
  const isDataPage = location.pathname === "/dashboard/quanlydulieu";

  const layerName = getQueryParam(location.search, "layer");
  const tableName = getTableNameFromLayerParam(layerName) || "mat_rung"; // Mặc định là mat_rung nếu không có

  const onEachFeature = (feature, layer) => {
    if (feature.properties) {
      let popupContent = "<b>Thông tin đối tượng:</b><br/>";
      Object.entries(feature.properties).forEach(([key, value]) => {
        popupContent += `<b>${key}</b>: ${value ?? "NULL"}<br/>`;
      });
      layer.bindPopup(popupContent);
    }
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

  return (
    <div className="p-5 font-sans">
      <h2 className="text-center text-xl font-bold mb-5">Bản đồ khu vực</h2>

      <div
        className={`flex justify-center items-center ${
          isDataPage ? "mb-5" : ""
        }`}
      >
        <MapContainer
          center={[21.0285, 105.8542]}
          zoom={8}
          className={`w-full rounded-xl shadow-lg ${
            isDataPage ? "h-[50vh]" : "h-[calc(100vh-150px)]"
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
                ref={(layerRef) => {
                  if (layerRef && mapReady) {
                    const bounds = layerRef.getBounds();
                    if (bounds.isValid()) {
                      window._leaflet_map.fitBounds(bounds, {
                        padding: [20, 20],
                      });
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
            />
          )
        ))}
    </div>
  );
};

export default Map;