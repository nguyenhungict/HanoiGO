"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap, Polyline } from 'react-leaflet';
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
  
  if (cat.includes('nature')) return 'park';
  if (cat.includes('art')) return 'museum';
  if (cat.includes('heritage') || cat.includes('historic')) return 'account_balance';
  if (cat.includes('spiritual') || cat.includes('temple')) return 'temple_buddhist';
  if (cat.includes('eat') || cat.includes('shop')) return 'restaurant';
  if (cat.includes('sightseeing')) return 'location_on';
  
  return 'location_on';
};

// Map categories to distinct colors for better UI distinction
const getCategoryColor = (category: string) => {
  const cat = category.toLowerCase();
  
  if (cat.includes('nature')) return '#43A047'; // Green
  if (cat.includes('art')) return '#3F51B5'; // Indigo
  if (cat.includes('heritage')) return '#607D8B'; // Blue Grey
  if (cat.includes('spiritual')) return '#FF9800'; // Orange
  if (cat.includes('eat') || cat.includes('shop')) return '#F44336'; // Red
  if (cat.includes('sightseeing')) return '#0288D1'; // Light Blue
    
  return '#607D8B'; // Default
};

// Tạo icon tùy chỉnh sử dụng HTML và Tailwind
const createCustomIcon = (landmark: Landmark, showLabel: boolean) => {
  const iconName = getCategoryIcon(landmark.category);
  const color = getCategoryColor(landmark.category);
  
  return L.divIcon({
    className: 'custom-landmark-marker',
    html: `
      <div class="relative group w-7 h-7">
        <div class="w-7 h-7 rounded-full shadow-lg border-2 border-white flex items-center justify-center z-10 overflow-hidden transform group-hover:scale-125 transition-all duration-300" style="background-color: ${color}">
           <span class="material-symbols-outlined text-white text-[14px]">${iconName}</span>
        </div>
        <div class="absolute -inset-1 border-2 rounded-full scale-0 group-hover:scale-100 transition-transform duration-300 z-0" style="border-color: ${color}66"></div>
        
        <div class="absolute left-full ml-2 top-1/2 -translate-y-1/2 flex flex-col pointer-events-none transition-all duration-500 ${showLabel ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0'}">
          <div class="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-[0_4px_15px_rgba(0,0,0,0.15)] border border-outline/10">
            <div class="text-[10px] font-black text-on-surface leading-tight whitespace-nowrap">${landmark.name}</div>
            <div class="text-[8px] font-bold uppercase tracking-widest whitespace-nowrap" style="color: ${color}">${landmark.category}</div>
          </div>
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -20],
  });
};

// Component to track map instance
function MapInstanceTracker({ setMap }: { setMap: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      setMap(map);
    }
  }, [map, setMap]);
  return null;
}

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

// Helper function to decode Google/Goong encoded polyline
const decodePolyline = (encoded: string): [number, number][] => {
  let index = 0;
  const len = encoded.length;
  let lat = 0, lng = 0;
  const coordinates: [number, number][] = [];

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0; result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    coordinates.push([lat * 1e-5, lng * 1e-5]);
  }
  return coordinates;
};

// Itinerary marker interface (passed from parent)
interface ItineraryMarkerData {
  placeId: string;
  lat: number;
  lng: number;
  name: string;
  order: number;
  color: string;
  dayNumber: number;
  arriveAt: string;
  departAt: string;
}

interface DiscoveryMapProps {
  itineraryMarkers?: ItineraryMarkerData[];
  onLocationFound?: (pos: [number, number]) => void;
  showLandmarks?: boolean;
}

// Create numbered itinerary marker icon
const createItineraryIcon = (order: number, color: string) => {
  return L.divIcon({
    className: 'itinerary-marker',
    html: `
      <div style="position:relative;display:flex;align-items:center;justify-content:center;">
        <div style="width:36px;height:36px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;color:white;font-weight:900;font-size:14px;">
          ${order}
        </div>
        <div style="position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid ${color};"></div>
      </div>
    `,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -44],
  });
};

import { fetchLandmarks } from '@/lib/landmarks';

export default function DiscoveryMap({ itineraryMarkers = [], onLocationFound, showLandmarks = true }: DiscoveryMapProps) {
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [zoomLevel, setZoomLevel] = useState(13);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Update parent when location is found
  useEffect(() => {
    if (userLocation && onLocationFound) {
      onLocationFound(userLocation);
    }
  }, [userLocation, onLocationFound]);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);

  // === Routing States ===
  const [activeRoute, setActiveRoute] = useState<[number, number][] | null>(null);
  const [routeDetails, setRouteDetails] = useState<{distance: string, duration: string} | null>(null);
  const [transportMode, setTransportMode] = useState<'driving' | 'foot'>('driving');
  const [routingDestination, setRoutingDestination] = useState<Landmark | null>(null);
  const [isRoutingLoading, setIsRoutingLoading] = useState(false);
  const lastFetchedRouteRef = React.useRef<string | null>(null);

  const hasItinerary = itineraryMarkers.length > 0;

  useEffect(() => {
    async function loadData() {
      const data = await fetchLandmarks();
      setLandmarks(data);
    }
    loadData();
  }, []);

  // === Routing Effect (Goong API) ===
  useEffect(() => {
    if (!routingDestination || !userLocation) {
      lastFetchedRouteRef.current = null;
      return;
    }
    
    // Check if we already fetched this route to avoid redundant calls on userLocation jitter
    const routeKey = `${routingDestination.id}-${transportMode}`;
    if (lastFetchedRouteRef.current === routeKey) return;
    
    const abortController = new AbortController();
    
    const fetchPath = async () => {
      setIsRoutingLoading(true);
      const GOONG_KEY = process.env.NEXT_PUBLIC_GOONG_API_KEY || 'YOUR_GOONG_API_KEY';

      try {
        const origin = `${userLocation[0]},${userLocation[1]}`;
        const destination = `${routingDestination.lat},${routingDestination.lng}`;
        const vehicle = transportMode === 'driving' ? 'bike' : 'bike';

        const response = await fetch(
          `https://rsapi.goong.io/direction?origin=${origin}&destination=${destination}&vehicle=${vehicle}&api_key=${GOONG_KEY}`,
          { signal: abortController.signal }
        );
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          lastFetchedRouteRef.current = routeKey; // Mark as fetched
          const route = data.routes[0];
          const points = route.overview_polyline.points;
          const coordinates = decodePolyline(points);
          
          setActiveRoute(coordinates);
          
          if (route.legs && route.legs.length > 0) {
              const leg = route.legs[0];
              setRouteDetails({ 
                distance: leg.distance.text, 
                duration: leg.duration.text 
              });
          }
          
          if (mapInstance && coordinates.length > 0) {
            const bounds = L.latLngBounds(coordinates);
            mapInstance.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
          }
        } else {
            console.warn("Goong Routing failed:", data);
            setActiveRoute(null);
            setRouteDetails(null);
        }
      } catch (error: unknown) {
        if (!(error instanceof Error) || error.name !== 'AbortError') {
          console.error("Error fetching Goong route:", error);
        }
      } finally {
        setIsRoutingLoading(false);
      }
    };
    
    fetchPath();

    return () => abortController.abort();
  }, [routingDestination, userLocation, transportMode, mapInstance]);

  const handleCancelRouting = () => {
    setRoutingDestination(null);
    setActiveRoute(null);
    setRouteDetails(null);
  };

  const handleCenterOnUser = () => {
    if (mapInstance && userLocation) {
      mapInstance.flyTo(userLocation, 16, { duration: 1.5 });
    }
  };

  const showLabels = zoomLevel >= 16;

  // Fit map to itinerary markers when they appear
  React.useEffect(() => {
    if (mapInstance && itineraryMarkers.length > 0) {
      const points: [number, number][] = itineraryMarkers.map(m => [m.lat, m.lng]);
      const bounds = L.latLngBounds(points);
      mapInstance.flyToBounds(bounds, { padding: [60, 60], duration: 1.2 });
    }
  }, [mapInstance, itineraryMarkers]);

  return (
    <div className="w-full h-full relative z-0 font-['Inter',_sans-serif]">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap');
        
        .leaflet-container {
          font-family: 'Inter', sans-serif !important;
        }
        .leaflet-popup-content-wrapper { padding: 0; border-radius: 1.5rem; overflow: hidden; background: transparent; box-shadow: none; }
        .leaflet-popup-content { margin: 0; width: auto !important; font-family: 'Inter', sans-serif !important; }
        .leaflet-popup-tip-container { display: none; }
        .custom-landmark-marker { background: none !important; border: none !important; font-family: 'Inter', sans-serif !important; }
        .user-location-marker { background: none !important; border: none !important; }
        .itinerary-marker { background: none !important; border: none !important; }
      `}</style>
      
      {/* Routing Panel Overlay */}
      {routingDestination && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm bg-white rounded-3xl shadow-2xl border border-outline/10 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="p-3 px-4 flex items-center justify-between border-b border-outline/5 bg-slate-50/50">
            <div className="flex items-center gap-3">
               <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[20px]">{getCategoryIcon(routingDestination.category)}</span>
               </div>
               <div className="flex flex-col">
                  <span className="text-[9px] font-black text-primary uppercase tracking-wider">Đường đến</span>
                  <span className="text-sm font-bold text-on-surface line-clamp-1 max-w-[200px]">{routingDestination.name}</span>
               </div>
            </div>
            <button onClick={handleCancelRouting} className="w-8 h-8 flex items-center justify-center rounded-full bg-outline/5 hover:bg-outline/20 text-outline active:scale-95 transition-all">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          
          <div className="p-4 bg-white flex flex-col gap-3">
            <div className="flex bg-slate-100 p-1 rounded-2xl w-full">
               <button 
                  onClick={() => setTransportMode('driving')}
                  className={`flex-1 py-1.5 flex items-center justify-center gap-2 rounded-xl text-[12px] font-bold transition-all ${transportMode === 'driving' ? 'bg-white text-primary shadow-sm' : 'text-outline hover:bg-slate-200/50'}`}
               >
                 <span className="material-symbols-outlined text-[16px]">two_wheeler</span>
                 Xe máy
               </button>
               <button 
                  onClick={() => setTransportMode('foot')}
                  className={`flex-1 py-1.5 flex items-center justify-center gap-2 rounded-xl text-[12px] font-bold transition-all ${transportMode === 'foot' ? 'bg-white text-primary shadow-sm' : 'text-outline hover:bg-slate-200/50'}`}
               >
                 <span className="material-symbols-outlined text-[16px]">directions_walk</span>
                 Đi bộ
               </button>
            </div>
            
            {isRoutingLoading ? (
               <div className="flex justify-center items-center py-2 h-12">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
               </div>
            ) : routeDetails ? (
               <div className="flex items-center justify-center gap-8 py-1">
                  <div className="flex flex-col items-center">
                     <span className="text-2xl font-black text-on-surface tracking-tighter tabular-nums">{routeDetails.duration}</span>
                     <span className="text-[9px] font-bold text-outline uppercase tracking-widest mt-0.5">Thời gian</span>
                  </div>
                  <div className="w-px h-8 bg-outline/10"></div>
                  <div className="flex flex-col items-center">
                     <span className="text-2xl font-black text-on-surface tracking-tighter tabular-nums">{routeDetails.distance}</span>
                     <span className="text-[9px] font-bold text-outline uppercase tracking-widest mt-0.5">Quãng đường</span>
                  </div>
               </div>
            ) : (
               <div className="text-center py-2 text-xs font-medium text-outline">Không tìm được đường đi phù hợp</div>
            )}
          </div>
        </div>
      )}
      
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
        key="hanoigo-discovery-map"
        center={[21.0285, 105.8521]} 
        zoom={13} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="grayscale-[0.2] transition-all"
      >
        <MapInstanceTracker setMap={setMapInstance} />
        <ZoomTracker setZoom={setZoomLevel} />
        <LocationMarker setUserPos={setUserLocation} />
        
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {activeRoute && (
           <Polyline 
              positions={activeRoute} 
              pathOptions={{ 
                color: '#3b82f6', 
                weight: 5, 
                opacity: 0.8, 
                lineCap: 'round', 
                lineJoin: 'round' 
              }} 
           />
        )}
        
        {/* Itinerary markers (numbered, colored per day) */}
        {itineraryMarkers.map(marker => (
          <Marker
            key={`itin-${marker.placeId}-${marker.dayNumber}`}
            position={[marker.lat, marker.lng]}
            icon={createItineraryIcon(marker.order, marker.color)}
          >
            <Popup closeButton={false} offset={[0, -10]}>
              <div className="bg-white rounded-2xl p-4 shadow-xl min-w-[200px] border border-outline/5">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black" style={{ backgroundColor: marker.color }}>{marker.order}</div>
                  <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: marker.color }}>Day {marker.dayNumber}</span>
                </div>
                <h3 className="font-black text-sm tracking-tight text-on-surface">{marker.name}</h3>
                <p className="text-[10px] font-bold text-outline mt-1">{marker.arriveAt} — {marker.departAt}</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Normal landmark markers (hidden when itinerary is active) */}
        {showLandmarks && !hasItinerary && landmarks.map(landmark => (
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
                                referrerPolicy="no-referrer"
                                className="object-cover w-full h-full hover:scale-110 transition-transform duration-700"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  if (target.src.includes('unsplash.com')) return;
                                  target.src = 'https://images.unsplash.com/photo-1509030450996-93f25ef2030f?w=800&q=80';
                                }}
                            />
                            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur shadow-xl text-primary px-3 py-1 rounded-full text-xs font-black flex items-center gap-1">
                               <span className="material-symbols-outlined text-[14px]">star</span>
                               {landmark.rating}
                            </div>
                        </div>
                        <div className="p-6 bg-white flex flex-col gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                            {landmark.category}
                          </span>
                          <h3 className="font-black text-xl tracking-tighter text-on-surface">{landmark.name}</h3>
                          <p className="text-sm text-outline font-medium line-clamp-2 leading-relaxed mb-3">
                            {landmark.description || `Khám phá vẻ đẹp lịch sử và văn hóa tại ${landmark.name}, một trong những điểm đến không thể bỏ qua tại Hà Nội.`}
                          </p>
                          <div className="flex gap-2">
                            <Link
                              href={`/places?place=${landmark.id}`}
                              className="flex-1 rounded-2xl border border-primary/20 bg-white py-3 text-center text-[11px] font-black uppercase tracking-widest text-primary transition-all hover:bg-primary/5 active:scale-95"
                            >
                              Detail
                            </Link>
                            <button 
                              onClick={() => setRoutingDestination(landmark)}
                              className="flex-[1.5] py-3 bg-primary text-white font-black text-[11px] uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-[16px]">directions</span>
                              Đường đi
                            </button>
                          </div>
                        </div>
                    </div>
                </Popup>
            </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
