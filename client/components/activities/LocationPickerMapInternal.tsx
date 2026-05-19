'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface LocationPickerMapInternalProps {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}

const pinIcon = L.divIcon({
  className: 'pin-marker',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="w-8 h-8 bg-primary rounded-2xl shadow-xl border-2 border-white flex items-center justify-center z-10 transform scale-110">
         <span class="material-symbols-outlined text-white text-[18px]">location_on</span>
      </div>
      <div class="absolute -bottom-1.5 w-3 h-3 bg-primary rotate-45 z-0"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// Component to handle map clicks to move the marker
const MapEventsHandler = ({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Component to update center when external search changes coords
const MapCenterController = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, 15, { duration: 1.2 });
  }, [center, map]);
  return null;
};

const LocationPickerMapInternal: React.FC<LocationPickerMapInternalProps> = ({ lat, lng, onChange }) => {
  const markerRef = useRef<any>(null);

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker != null) {
          const newLatLng = marker.getLatLng();
          onChange(newLatLng.lat, newLatLng.lng);
        }
      },
    }),
    [onChange]
  );

  return (
    <div className="w-full h-44 rounded-2xl overflow-hidden border border-outline/10 relative z-0 mt-2 shadow-inner">
      <style>{`
        .leaflet-container { font-family: 'Inter', sans-serif !important; border-radius: 1rem; }
        .pin-marker { background: none !important; border: none !important; }
      `}</style>
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <MapCenterController center={[lat, lng]} />
        <MapEventsHandler onMapClick={onChange} />
        <Marker
          draggable={true}
          eventHandlers={eventHandlers}
          position={[lat, lng]}
          icon={pinIcon}
          ref={markerRef}
        />
      </MapContainer>
    </div>
  );
};

export default LocationPickerMapInternal;
