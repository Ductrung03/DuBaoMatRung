import { WMSTileLayer } from 'react-leaflet';

// WMS Base URL
const WMS_URL = '/api/mapserver'; // Qua API Gateway
// const WMS_URL = 'http://localhost:8090/mapserver'; // Trực tiếp

export function MapServerLayers({ visibleLayers }) {
  const baseParams = {
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetMap',
    FORMAT: 'image/png',
    TRANSPARENT: true,
    CRS: 'EPSG:3857' // Leaflet sử dụng EPSG:3857
  };

  return (
    <>
      {/* Layer: Ranh giới hành chính */}
      {visibleLayers.includes('ranhgioihc') && (
        <WMSTileLayer
          url={WMS_URL}
          params={{
            ...baseParams,
            LAYERS: 'ranhgioihc'
          }}
          layers="ranhgioihc"
          format="image/png"
          transparent={true}
          opacity={0.8}
        />
      )}

      {/* Layer: 3 Loại rừng (LAYER LỚN NHẤT - 231K records) */}
      {visibleLayers.includes('rg3lr') && (
        <WMSTileLayer
          url={WMS_URL}
          params={{
            ...baseParams,
            LAYERS: 'rg3lr'
          }}
          layers="rg3lr"
          format="image/png"
          transparent={true}
          opacity={0.7}
        />
      )}

      {/* Layer: Nền địa hình */}
      {visibleLayers.includes('nendiahinh') && (
        <WMSTileLayer
          url={WMS_URL}
          params={{
            ...baseParams,
            LAYERS: 'nendiahinh'
          }}
          layers="nendiahinh"
          format="image/png"
          transparent={true}
          opacity={0.5}
        />
      )}

      {/* Layer: Chủ quản lý rừng */}
      {visibleLayers.includes('chuquanly') && (
        <WMSTileLayer
          url={WMS_URL}
          params={{
            ...baseParams,
            LAYERS: 'chuquanly'
          }}
          layers="chuquanly"
          format="image/png"
          transparent={true}
          opacity={0.6}
        />
      )}

      {/* Layer: Ranh giới huyện */}
      {visibleLayers.includes('huyen') && (
        <WMSTileLayer
          url={WMS_URL}
          params={{
            ...baseParams,
            LAYERS: 'huyen'
          }}
          layers="huyen"
          format="image/png"
          transparent={true}
          opacity={0.9}
        />
      )}
    </>
  );
}