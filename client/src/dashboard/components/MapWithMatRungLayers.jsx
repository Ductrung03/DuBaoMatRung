import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, WMSTileLayer, GeoJSON, LayersControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import config from '../../config';

const { BaseLayer, Overlay } = LayersControl;

// Component to auto-refresh GeoJSON layer
function AutoRefreshGeoJSON({ url, refreshInterval = 30000, style, onEachFeature }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const map = useMap();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const bounds = map.getBounds();
        const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;

        const response = await axios.get(url, {
          params: { bbox, days: 7 }
        });

        setData(response.data.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch GeoJSON:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up auto-refresh
    const interval = setInterval(fetchData, refreshInterval);

    // Re-fetch when map moves
    map.on('moveend', fetchData);

    return () => {
      clearInterval(interval);
      map.off('moveend', fetchData);
    };
  }, [url, refreshInterval, map]);

  if (error) {
    console.error('GeoJSON Error:', error);
    return null;
  }

  if (!data || !data.features || data.features.length === 0) {
    return null;
  }

  return <GeoJSON key={JSON.stringify(data)} data={data} style={style} onEachFeature={onEachFeature} />;
}

/**
 * MapWithMatRungLayers - Hybrid Map Component
 *
 * 3 Layers Strategy:
 * 1. Hiện trạng rừng (WMS - cached, base layer)
 * 2. Mất rừng đã xác minh (WMS - cached 30min, overlay)
 * 3. Mất rừng mới (GeoJSON - real-time, overlay)
 */
const MapWithMatRungLayers = ({ center = [21.3, 104.0], zoom = 10 }) => {
  const [stats, setStats] = useState(null);

  // Fetch statistics on mount
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('${config.API_BASE_URL}/mat-rung/statistics');
        setStats(response.data.data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    };
    fetchStats();
  }, []);

  // Style for real-time GeoJSON layer (unverified)
  const unverifiedStyle = {
    color: '#ff0000',
    weight: 2,
    opacity: 0.8,
    fillColor: '#ff0000',
    fillOpacity: 0.4
  };

  // Popup for GeoJSON features
  const onEachFeature = (feature, layer) => {
    if (feature.properties) {
      const props = feature.properties;
      const popupContent = `
        <div style="font-size: 12px;">
          <h4 style="margin: 0 0 8px 0; color: #ff0000;">🔴 Chưa xác minh</h4>
          <p><strong>Huyện:</strong> ${props.huyen || 'N/A'}</p>
          <p><strong>Diện tích gốc:</strong> ${props.original_area?.toFixed(2) || 0} ha</p>
          <p><strong>Diện tích (clipped):</strong> ${props.clipped_area_ha || 0} ha</p>
          <p><strong>Phát hiện:</strong> ${props.start_dau || ''} → ${props.end_sau || ''}</p>
          <p><strong>Ngày tạo:</strong> ${new Date(props.created_at).toLocaleDateString('vi-VN')}</p>
          ${props.verification_notes ? `<p><strong>Ghi chú:</strong> ${props.verification_notes}</p>` : ''}
        </div>
      `;
      layer.bindPopup(popupContent);
    }
  };

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <LayersControl position="topright">
          {/* Base Layers */}
          <BaseLayer checked name="OpenStreetMap">
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
          </BaseLayer>

          <BaseLayer name="Satellite">
            <TileLayer
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              attribution='&copy; Esri'
            />
          </BaseLayer>

          {/* Layer 1: Hiện trạng rừng (WMS - Cached) */}
          <Overlay checked name="🌲 Hiện trạng rừng">
            <WMSTileLayer
              url="{config.MAPSERVER_URL}"
              layers="hientrangrung"
              format="image/png"
              transparent={true}
              version="1.3.0"
              crs="EPSG:4326"
              opacity={0.6}
            />
          </Overlay>

          {/* Layer 2: Mất rừng đã xác minh (WMS - Cached 30min) */}
          <Overlay checked name="🟠 Mất rừng (Đã xác minh)">
            <WMSTileLayer
              url="{config.MAPSERVER_URL}"
              layers="matrung_verified"
              format="image/png"
              transparent={true}
              version="1.3.0"
              crs="EPSG:4326"
              opacity={0.85}
            />
          </Overlay>

          {/* Layer 3: Mất rừng mới (GeoJSON - Real-time) */}
          <Overlay checked name="🔴 Mất rừng (Chưa xác minh - Real-time)">
            <AutoRefreshGeoJSON
              url="${config.API_BASE_URL}/mat-rung/geojson/recent"
              refreshInterval={30000}
              style={unverifiedStyle}
              onEachFeature={onEachFeature}
            />
          </Overlay>
        </LayersControl>
      </MapContainer>

      {/* Statistics Panel */}
      {stats && (
        <div style={{
          position: 'absolute',
          top: 10,
          left: 10,
          background: 'white',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
          zIndex: 1000,
          fontSize: '12px',
          maxWidth: '250px'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px' }}>📊 Thống kê mất rừng</h4>
          <div><strong>Tổng số:</strong> {stats.total.toLocaleString()}</div>
          <div><strong>Đã clip:</strong> {stats.clipped.toLocaleString()} ({stats.efficiency.clipping_rate})</div>
          <div style={{ color: '#ff0000' }}>
            <strong>🔴 Chưa xác minh:</strong> {stats.status.unverified.toLocaleString()}
          </div>
          <div style={{ color: '#ff8c00' }}>
            <strong>🟠 Đã xác minh:</strong> {stats.status.verified.toLocaleString()}
          </div>
          <div style={{ color: '#888' }}>
            <strong>⚪ Đã xử lý:</strong> {stats.status.processed.toLocaleString()}
          </div>
          <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #eee' }}>
            <strong>Tổng diện tích (clipped):</strong><br/>
            {stats.area.total_clipped_ha} ha
          </div>
        </div>
      )}

      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: 30,
        right: 10,
        background: 'white',
        padding: '10px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        zIndex: 1000,
        fontSize: '12px'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Chú thích</div>
        <div style={{ marginBottom: '5px' }}>
          <span style={{
            display: 'inline-block',
            width: '20px',
            height: '12px',
            backgroundColor: '#ff0000',
            marginRight: '5px',
            border: '1px solid #cc0000'
          }}></span>
          Chưa xác minh (real-time)
        </div>
        <div style={{ marginBottom: '5px' }}>
          <span style={{
            display: 'inline-block',
            width: '20px',
            height: '12px',
            backgroundColor: '#ff8c00',
            marginRight: '5px',
            border: '1px solid #c87000'
          }}></span>
          Đã xác minh (cached)
        </div>
        <div>
          <span style={{
            display: 'inline-block',
            width: '20px',
            height: '12px',
            backgroundColor: '#228b22',
            marginRight: '5px',
            border: '1px solid #1a6b1a'
          }}></span>
          Hiện trạng rừng
        </div>
      </div>
    </div>
  );
};

export default MapWithMatRungLayers;
