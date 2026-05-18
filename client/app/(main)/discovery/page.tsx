'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useTripStore, type Landmark } from '@/store/useTripStore';

const DiscoveryMap = dynamic(() => import('@/components/map/DiscoveryMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-slate-100 animate-pulse text-gray-400">Loading Map...</div>
});

const ChatAssistant = dynamic(() => import('@/components/chat/ChatAssistant'), { ssr: false });
const TravelBasket = dynamic(() => import('@/components/TravelBasket'), { ssr: false });

import { fetchLandmarks } from '@/lib/landmarks';

// AI-recommended marker to highlight on map
export interface AiMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  distanceKm?: number;
}

export default function DiscoveryPage() {
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapFocus, setMapFocus] = useState<[number, number] | null>(null);
  const [activeLandmarkId, setActiveLandmarkId] = useState<string | null>(null);
  const [aiMarkers, setAiMarkers] = useState<AiMarker[]>([]);

  // Zustand — subscribe to selectedPlaces directly for reactivity
  const selectedPlaces = useTripStore((s) => s.selectedPlaces);
  const addPlace = useTripStore((s) => s.addPlace);
  const removePlace = useTripStore((s) => s.removePlace);

  useEffect(() => {
    async function loadData() {
      const data = await fetchLandmarks();
      setLandmarks(data);
    }
    loadData();
  }, []);

  // Memoize filtered list — only recalculates when landmarks or searchQuery change
  const filteredLandmarks = useMemo(() => {
    const q = searchQuery.toLowerCase();
    if (!q) return landmarks;
    return landmarks.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.category.toLowerCase().includes(q)
    );
  }, [landmarks, searchQuery]);

  const toggleSave = useCallback((landmark: Landmark) => {
    if (landmark.id in selectedPlaces) {
      removePlace(landmark.id);
    } else {
      addPlace(landmark);
    }
  }, [selectedPlaces, addPlace, removePlace]);

  return (
    <div className="flex h-[calc(100vh-80px)] w-full overflow-hidden animate-in fade-in duration-500 font-body relative">
      {/* Sidebar */}
      <aside 
        className={`fixed lg:relative top-0 left-0 h-full bg-background z-30 flex flex-col border-r border-outline/10 transition-all duration-700 ease-in-out
          ${isSidebarOpen ? 'w-[400px] translate-x-0 opacity-100 shadow-2xl lg:shadow-none' : 'w-0 -translate-x-full opacity-0 pointer-events-none'}`}
      >
        <div className="w-[400px] flex flex-col h-full overflow-hidden">
          <div className="p-8 pb-6 space-y-6 flex-1 overflow-y-auto scrollbar-none">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h1 className="text-3xl font-black tracking-tighter text-on-surface">
                  Discovery Archive
                </h1>
                <p className="text-outline text-[10px] font-extrabold uppercase tracking-[0.2em] opacity-70">
                  Unveil 1,000 years of heritage layers
                </p>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="w-10 h-10 rounded-2xl bg-on-surface/5 flex items-center justify-center text-on-surface hover:bg-on-surface/10 transition-all active:scale-90"
                title="Đóng sidebar"
              >
                <span className="material-symbols-outlined text-2xl">menu_open</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/40 group-focus-within:text-primary transition-colors text-xl">search</span>
              <input
                className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest border border-outline/10 rounded-2xl focus:ring-8 focus:ring-primary/5 focus:bg-white focus:border-primary/40 transition-all text-sm outline-none font-bold shadow-sm"
                placeholder="Tìm địa điểm..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Place Cards */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                 <label className="font-label text-[10px] font-black uppercase tracking-[0.25em] text-outline/60 block">
                   Heritage Collection
                 </label>
                 <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-1 rounded-md">{filteredLandmarks.length} kết quả</span>
              </div>
              {filteredLandmarks.slice(0, 20).map(l => {
                const saved = l.id in selectedPlaces;
                return (
                  <div
                    key={l.id}
                    onClick={() => {
                      setMapFocus([l.lat, l.lng]);
                      setActiveLandmarkId(l.id);
                    }}
                    className={`group cursor-pointer border p-3 rounded-[20px] shadow-sm transition-all duration-500 flex gap-4 items-center hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden
                      ${activeLandmarkId === l.id ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20' : 'bg-surface-container-lowest border-outline/5'}`}
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 relative shadow-inner">
                      <img 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                        src={l.image} 
                        alt={l.name} 
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1509030450996-93f25ef2030f?w=800&q=80';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-extrabold text-on-surface text-[15px] leading-tight tracking-tight truncate">{l.name}</h3>
                      <p className="text-[10px] text-outline/60 font-black uppercase tracking-widest mt-1 truncate">{l.category}</p>
                    </div>

                    {/* Heart/Save button */}
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleSave(l); }}
                      className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-500 shrink-0
                        ${saved
                          ? 'bg-primary/10 text-primary scale-110'
                          : 'bg-surface-container-low text-outline/30 hover:text-primary hover:bg-primary/5 opacity-0 group-hover:opacity-100'
                        }`}
                      title={saved ? 'Bỏ lưu' : 'Lưu vào chuyến đi'}
                    >
                      <span className={`material-symbols-outlined text-xl ${saved ? 'fill-1' : ''}`}>
                        favorite
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      {/* Map Section */}
      <section className="flex-1 relative overflow-hidden z-10 bg-neutral-100 min-w-0">
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-8 left-8 z-[1000] w-14 h-14 bg-background/90 backdrop-blur-xl rounded-[22px] shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex items-center justify-center border border-white/50 hover:bg-white transition-all active:scale-90 animate-in slide-in-from-left-8 fade-in duration-700"
            title="Mở sidebar"
          >
            <span className="material-symbols-outlined text-3xl text-primary">menu</span>
          </button>
        )}
        <DiscoveryMap
          onLocationFound={setUserLocation}
          showLandmarks={true}
          focusLocation={mapFocus}
          focusedLandmarkId={activeLandmarkId}
          aiMarkers={aiMarkers}
        />
      </section>

      {/* Floating Travel Basket */}
      <TravelBasket />

      {/* AI Chat Assistant */}
      <ChatAssistant
        onAiMarkers={(markers) => {
          setAiMarkers(markers);
          if (markers.length > 0) setMapFocus([markers[0].lat, markers[0].lng]);
        }}
      />
    </div>
  );
}
