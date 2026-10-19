import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, Pane, ScaleControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import config from '../../config';
import { WMSTileLayer } from 'react-leaflet';
import { STATUS, formatArea } from './monitoring-data';

function MapSize({ rows, selected }) {
  const map = useMap();
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  useEffect(() => {
    const features = rows.map(row => row.feature).filter(f => f.geometry);
    if (!features.length) return;
    const bounds = L.geoJSON({ type: 'FeatureCollection', features }).getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15, animate: false });
  }, [map, rows]);
  useEffect(() => {
    if (!selected?.feature.geometry) return;
    const bounds = L.geoJSON(selected.feature).getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17, animate: false });
  }, [map, selected]);
  return null;
}

function AlertLayer({ rows, selected, onSelect }) {
  const ref = useRef(null);
  useEffect(() => {
    const group = ref.current;
    if (!group) return;
    group.clearLayers();
    rows.forEach(row => {
      if (!row.feature.geometry) return;
      const style = { color: STATUS[row.status].color, fillColor: STATUS[row.status].color, weight: selected === row ? 4 : 2, fillOpacity: selected === row ? 0.65 : 0.35 };
      L.geoJSON(row.feature, { style, onEachFeature: (_, layer) => {
        // Use textContent, never interpolate database strings as HTML.
        const tooltip = document.createElement('div');
        tooltip.textContent = `${row.code || 'Chưa có mã'} · ${row.commune || 'Chưa rõ xã'} · ${formatArea(row.area)} ha · ${STATUS[row.status].label}`;
        layer.bindTooltip(tooltip, { sticky: true });
        layer.on('click', () => onSelect(row));
        layer.on('mouseover', () => layer.setStyle?.({ weight: 4 }));
        layer.on('mouseout', () => layer.setStyle?.(style));
      } }).addTo(group);
    });
  }, [rows, selected, onSelect]);
  return <GeoJSON ref={ref} data={{ type: 'FeatureCollection', features: [] }} />;
}

export default function MonitoringMap({ rows, selected, onSelect, layers, base }) {
  return <MapContainer center={[21.3276, 103.9144]} zoom={8} className="monitor-map" aria-label="Bản đồ giám sát mất rừng">
    <TileLayer key={base} url={base === 'satellite' ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'} attribution={base === 'satellite' ? 'Tiles © Esri' : '© OpenStreetMap contributors'} />
    <Pane name="forest-status" style={{ zIndex: 250 }}>
      {layers.forest && <WMSTileLayer url={`${config.API_URL}/api/mapserver`} layers="hientrangrung" format="image/png" transparent opacity={0.6} />}
    </Pane>
    <Pane name="commune-boundaries" style={{ zIndex: 300 }}>
      {layers.boundaries && <WMSTileLayer url={`${config.API_URL}/api/mapserver`} layers="ranhgioixa" format="image/png" transparent />}
    </Pane>
    {layers.alerts && <AlertLayer rows={rows} selected={selected} onSelect={onSelect} />}
    <MapSize rows={rows} selected={selected} /><ScaleControl position="bottomright" imperial={false} />
  </MapContainer>;
}
