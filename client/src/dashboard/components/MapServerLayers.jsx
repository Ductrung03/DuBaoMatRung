// MapServerLayers.jsx - WMS layers from MapServer
import { WMSTileLayer } from 'react-leaflet';
import PropTypes from 'prop-types';

// ✅ WMS Base URL - Qua API Gateway
const WMS_URL = '/api/mapserver';

/**
 * MapServer WMS Layers Component
 * Renders static layers from MapServer for better performance
 */
export function MapServerLayers({ visibleLayers = [] }) {
  const baseParams = {
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetMap',
    FORMAT: 'image/png',
    TRANSPARENT: true,
    CRS: 'EPSG:3857' // Leaflet uses EPSG:3857
  };

  return (
    <>
      {/* Layer: Ranh giới hành chính (Administrative Boundaries) */}
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

      {/* Layer: 3 Loại rừng (Forest Types) - 231,963 records! */}
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

      {/* Layer: Nền địa hình (Terrain) */}
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

      {/* Layer: Chủ quản lý rừng (Management Authority) */}
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

      {/* Layer: Ranh giới huyện (District Boundaries) */}
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

      {/* Layer: Địa hình, Thủy văn, Giao thông (Line Features) */}
      {visibleLayers.includes('nendiahinh_line') && (
        <WMSTileLayer
          url={WMS_URL}
          params={{
            ...baseParams,
            LAYERS: 'nendiahinh_line'
          }}
          layers="nendiahinh_line"
          format="image/png"
          transparent={true}
          opacity={0.8}
        />
      )}

      {/* Layer: Hiện trạng rừng (Forest Status/Coverage) */}
      {visibleLayers.includes('hientrangrung') && (
        <WMSTileLayer
          url={WMS_URL}
          params={{
            ...baseParams,
            LAYERS: 'hientrangrung'
          }}
          layers="hientrangrung"
          format="image/png"
          transparent={true}
          opacity={0.7}
        />
      )}
    </>
  );
}

MapServerLayers.propTypes = {
  visibleLayers: PropTypes.arrayOf(PropTypes.string)
};

export default MapServerLayers;
