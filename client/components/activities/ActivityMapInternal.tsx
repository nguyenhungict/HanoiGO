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

const getActivityIcon = (scheduledAtStr: string, category: string) => {
  let color = '#1e50a0'; // Default blue (Upcoming)
  let pulse = '';
  let opacity = '1';
  let badge = '';
  let status = 'UPCOMING';

  if (scheduledAtStr) {
    const scheduledAt = new Date(scheduledAtStr);
    const now = new Date();
    const diffMs = scheduledAt.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < -3) {
      status = 'ENDED';
    } else if (diffHours >= -3 && diffHours <= 0) {
      status = 'ONGOING';
    } else if (diffHours > 0 && diffHours <= 2) {
      status = 'STARTING';
    }
  }

  if (status === 'STARTING') {
    color = '#f59e0b'; // Amber / Orange
    badge = '<div class="absolute -top-1 -right-1 bg-red-500 text-white font-black text-[6px] px-1 rounded-full animate-bounce">SOON</div>';
  } else if (status === 'ONGOING') {
    color = '#16a34a'; // Green
    pulse = '<div class="absolute inset-0 bg-green-400 rounded-2xl animate-ping opacity-75 z-0"></div>';
    badge = '<div class="absolute -top-1 -right-1 bg-green-500 text-white font-black text-[6px] px-1 rounded-full">LIVE</div>';
  } else if (status === 'ENDED') {
    color = '#9ca3af'; // Gray
    opacity = 'opacity-50';
  }

  // Get icon by category
  let iconName = 'group';
  if (category === 'Nature & Outdoors') iconName = 'forest';
  else if (category === 'Arts & Culture') iconName = 'theater_comedy';
  else if (category === 'Heritage & History') iconName = 'history_edu';
  else if (category === 'Spiritual') iconName = 'temple_buddhist';
  else if (category === 'Eat & Shop') iconName = 'restaurant';
  else if (category === 'Sightseeing') iconName = 'photo_camera';

  return L.divIcon({
    className: `activity-marker ${opacity}`,
    html: `
      <div class="relative flex items-center justify-center">
        ${pulse}
        <div class="w-8 h-8 rounded-2xl shadow-xl border-2 border-white flex items-center justify-center z-10 transform hover:scale-110 transition-all" style="background-color: ${color}">
           <span class="material-symbols-outlined text-white text-[18px]">${iconName}</span>
        </div>
        <div class="absolute -bottom-1.5 w-3 h-3 rotate-45 z-0" style="background-color: ${color}"></div>
        ${badge}
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

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
            icon={getActivityIcon(activity.scheduledAt, activity.category)}
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
