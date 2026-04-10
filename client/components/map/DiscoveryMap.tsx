"use client";

import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface Landmark {
  id: string;
  name: string;
  image: string;
  rating: number;
  category: string;
  description: string;
  lat: number;
  lng: number;
}

// Map icon categories to material icons
const getCategoryIcon = (category: string) => {
  const cat = category.toLowerCase();
  if (cat.includes('religious')) return 'temple_buddhist';
  if (cat.includes('museum')) return 'museum';
  if (cat.includes('market') || cat.includes('shopping')) return 'shopping_bag';
  if (cat.includes('theater')) return 'theater_comedy';
  if (cat.includes('park') || cat.includes('water')) return 'park';
  if (cat.includes('historic')) return 'account_balance';
  return 'location_on';
};

// Component to track zoom level
function ZoomTracker({ setZoom }: { setZoom: (z: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      setZoom(map.getZoom());
    },
  });
  return null;
}

// User location marker icon
const userLocationIcon = L.divIcon({
  className: 'user-location-marker',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg z-10"></div>
      <div class="absolute inset-0 w-4 h-4 bg-blue-400 rounded-full animate-ping z-0 opacity-75"></div>
      <div class="absolute inset-0 w-8 h-8 -left-2 -top-2 bg-blue-500/20 rounded-full z-[-1]"></div>
    </div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Component to handle user location
function LocationMarker({ setUserPos }: { setUserPos: (pos: [number, number] | null) => void }) {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const map = useMap();

  useEffect(() => {
    // Locate on start
    map.locate({ watch: true, enableHighAccuracy: true });

    map.on('locationfound', (e) => {
      setPosition(e.latlng);
      setUserPos([e.latlng.lat, e.latlng.lng]);
    });

    map.on('locationerror', (e) => {
      console.warn("Location access denied or error:", e.message);
    });

    return () => {
      map.stopLocate();
    };
  }, [map, setUserPos]);

  return position === null ? null : (
    <Marker position={position} icon={userLocationIcon}>
      <Popup>
        <div className="text-xs font-bold py-1 px-2">Vị trí của bạn</div>
      </Popup>
    </Marker>
  );
}

// Tạo icon tùy chỉnh sử dụng HTML và Tailwind
const createCustomIcon = (landmark: Landmark, showLabel: boolean) => {
  const iconName = getCategoryIcon(landmark.category);
  
  const isFood = landmark.category.toLowerCase().includes('food') || landmark.category.toLowerCase().includes('cafe');
  const bgColor = isFood ? 'bg-[#004D40]' : 'bg-[#1A1A1A]';
  
  return L.divIcon({
    className: 'custom-landmark-marker',
    html: `
      <div class="flex items-center group">
        <div class="relative flex items-center justify-center">
          <div class="w-8 h-8 rounded-full ${bgColor} shadow-lg border border-white/20 flex items-center justify-center z-10 overflow-hidden transform group-hover:scale-110 transition-all duration-300">
             <span class="material-symbols-outlined text-white text-[16px]">${iconName}</span>
          </div>
          <div class="absolute -inset-1 border-2 border-primary/40 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300 z-0"></div>
        </div>
        
        <div class="ml-2 flex flex-col pointer-events-none transition-all duration-300 ${showLabel ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'}">
          <div class="bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-md shadow-[0_2px_10px_rgba(0,0,0,0.1)] border border-outline/5">
            <div class="text-[11px] font-black text-on-surface leading-tight whitespace-nowrap">${landmark.name}</div>
            <div class="text-[9px] font-bold text-outline uppercase tracking-wider whitespace-nowrap">${landmark.category}</div>
          </div>
        </div>
      </div>
    `,
    iconSize: [160, 40],
    iconAnchor: [16, 16],
    popupAnchor: [0, -20],
  });
};

export default function DiscoveryMap() {
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [zoomLevel, setZoomLevel] = useState(13);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  useEffect(() => {
    fetch('/data/landmarks.json')
      .then(res => res.json())
      .then(data => setLandmarks(data))
      .catch(err => console.error("Could not load landmarks data", err));
  }, []);

  const handleCenterOnUser = () => {
    if (mapInstance && userLocation) {
      mapInstance.flyTo(userLocation, 16, { duration: 1.5 });
    }
  };

  const showLabels = zoomLevel >= 15;

  return (
    <div className="w-full h-full relative z-0">
      <style>{`
        .leaflet-popup-content-wrapper { padding: 0; border-radius: 1.5rem; overflow: hidden; background: transparent; box-shadow: none; }
        .leaflet-popup-content { margin: 0; width: auto !important; }
        .leaflet-popup-tip-container { display: none; }
        .custom-landmark-marker { background: none !important; border: none !important; }
        .user-location-marker { background: none !important; border: none !important; }
      `}</style>
      
      {/* Location Control Button */}
      <button 
        onClick={handleCenterOnUser}
        disabled={!userLocation}
        className={`absolute bottom-8 right-8 z-[1000] w-12 h-12 bg-white rounded-2xl shadow-2xl flex items-center justify-center border border-outline/10 hover:bg-slate-50 transition-all active:scale-95 group ${!userLocation && 'opacity-50 cursor-not-allowed'}`}
        title="Center on my location"
      >
        <span className={`material-symbols-outlined text-2xl ${userLocation ? 'text-primary' : 'text-outline'} group-hover:scale-110 transition-transform`}>
          my_location
        </span>
      </button>

      <MapContainer 
        center={[21.0285, 105.8521]} 
        zoom={13} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="grayscale-[0.2] transition-all"
        ref={setMapInstance}
      >
        <ZoomTracker setZoom={setZoomLevel} />
        <LocationMarker setUserPos={setUserLocation} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {landmarks.map(landmark => (
            <Marker 
                key={landmark.id} 
                position={[landmark.lat, landmark.lng]}
                icon={createCustomIcon(landmark, showLabels)}
            >
                <Popup closeButton={false} offset={[0, -10]}>
                    <div className="w-72 p-0 flex flex-col rounded-3xl overflow-hidden shadow-2xl bg-white border border-outline/5">
                        <div className="relative w-full h-40 bg-gray-100 overflow-hidden">
                            <img 
                                src={landmark.image} 
                                alt={landmark.name}
                                className="object-cover w-full h-full hover:scale-110 transition-transform duration-700"
                            />
                            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur shadow-xl text-primary px-3 py-1 rounded-full text-xs font-black flex items-center gap-1">
                               <span class="material-symbols-outlined text-[14px]">star</span>
                               {landmark.rating}
                            </div>
                        </div>
                        <div className="p-6 bg-white flex flex-col gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                            {landmark.category}
                          </span>
                          <h3 className="font-black text-xl tracking-tighter text-on-surface">{landmark.name}</h3>
                          <p className="text-sm text-outline font-medium line-clamp-2 leading-relaxed mb-4">
                            {landmark.description || `Khám phá vẻ đẹp lịch sử và văn hóa tại ${landmark.name}, một trong những điểm đến không thể bỏ qua tại Hà Nội.`}
                          </p>
                          <button className="w-full py-3.5 bg-primary text-white font-black text-[11px] uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95">
                            Xem chi tiết
                          </button>
                        </div>
                    </div>
                </Popup>
            </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
