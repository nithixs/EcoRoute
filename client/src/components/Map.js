import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
function Bounds({
  trip,
  selected
}) {
  const map = useMap();
  useEffect(() => {
    if (trip?.routes[selected]?.geometry.length) map.fitBounds(trip.routes[selected].geometry, {
      padding: [35, 35]
    });
  }, [map, trip, selected]);
  return null;
}
export default function Map({
  trip,
  selected
}) {
  return <MapContainer center={[12.52, 79.95]} zoom={8} scrollWheelZoom={false} style={{
    height: '100%',
    minHeight: 390,
    width: '100%'
  }}><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><Bounds trip={trip} selected={selected} />{trip && <>{trip.routes.filter(r => r.id !== selected).map(r => <Polyline key={r.id} positions={r.geometry} pathOptions={{
        color: '#96a8b5',
        weight: 5,
        opacity: .65
      }} />)}<Polyline positions={trip.routes[selected].geometry} pathOptions={{
        color: '#168466',
        weight: 6
      }} />{[trip.start, trip.end].map((p, i) => <CircleMarker key={i} center={[p.lat, p.lon]} radius={8} pathOptions={{
        color: '#fff',
        weight: 3,
        fillColor: i ? '#183d38' : '#20a980',
        fillOpacity: 1
      }}><Popup>{p.name}</Popup></CircleMarker>)}</>}</MapContainer>;
}
