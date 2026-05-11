'use client';

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

interface ActivityMapInternalProps {
  activities: any[];
  onSelectActivity: (activity: any) => void;
  userLocation?: [number, number] | null;
}

const activityIcon = L.divIcon({
  className: 'activity-marker',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="w-8 h-8 bg-[#1e50a0] rounded-2xl shadow-xl border-2 border-white flex items-center justify-center z-10 transform hover:scale-110 transition-all">
         <span class="material-symbols-outlined text-white text-[18px]">group</span>
      </div>
      <div class="absolute -bottom-1.5 w-3 h-3 bg-[#1e50a0] rotate-45 z-0"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const userIcon = L.divIcon({
  className: 'user-marker',
  html: `
    <div class="relative flex items-center justify-center">
      <div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg z-10"></div>
      <div class="absolute inset-0 w-4 h-4 bg-blue-400 rounded-full animate-ping z-0 opacity-75"></div>
    </div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const MapController = ({ center }: { center: [number, number] }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 14, { duration: 1.5 });
    }
  }, [center, map]);
  return null;
};

const ActivityMapInternal: React.FC<ActivityMapInternalProps> = ({ activities, onSelectActivity, userLocation }) => {
  return (
    <div className="w-full h-full rounded-[2.5rem] overflow-hidden border border-outline/5 shadow-sm relative z-0">
      <style>{`
        .leaflet-container { font-family: 'Inter', sans-serif !important; border-radius: 2.5rem; }
        .activity-marker { background: none !important; border: none !important; }
        .user-marker { background: none !important; border: none !important; }
        .leaflet-popup-content-wrapper { border-radius: 1.5rem; padding: 0; overflow: hidden; }
        .leaflet-popup-content { margin: 0; }
      `}</style>
      <MapContainer 
        center={[21.0285, 105.8521]} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {userLocation && <MapController center={userLocation} />}
        
        {activities.map(activity => (
          <Marker 
            key={activity.id} 
            position={[activity.lat, activity.lng]}
            icon={activityIcon}
          >
            <Popup closeButton={false}>
              <div className="p-4 bg-white min-w-[200px] flex flex-col gap-1">
                <h3 className="font-black text-sm text-on-surface leading-tight">{activity.title}</h3>
                <p className="text-[10px] font-bold text-outline uppercase tracking-widest">
                  By {activity.hostName || activity.host?.username}
                </p>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-outline/5">
                   <span className="material-symbols-outlined text-xs text-primary">group</span>
                   <span className="text-[10px] font-black">{activity.memberCount || activity._count?.activityMembers || 1} members</span>
                </div>
                <button 
                  onClick={() => onSelectActivity(activity)}
                  className="mt-3 w-full py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary/90 transition-all active:scale-95"
                >
                  View Activity
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {userLocation && (
          <Marker position={userLocation} icon={userIcon} />
        )}
      </MapContainer>
    </div>
  );
};

export default ActivityMapInternal;
