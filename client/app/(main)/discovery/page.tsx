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

const CATEGORIES = [
  { id: 'all', name: 'All', icon: 'explore' },
  { id: 'nature', name: 'Nature & Outdoors', icon: 'forest' },
  { id: 'art', name: 'Arts & Culture', icon: 'theater_comedy' },
  { id: 'heritage', name: 'Heritage & History', icon: 'history_edu' },
  { id: 'spiritual', name: 'Spiritual', icon: 'temple_buddhist' },
  { id: 'eat', name: 'Eat & Shop', icon: 'restaurant' },
  { id: 'sightseeing', name: 'Sightseeing', icon: 'photo_camera' },
];

export default function DiscoveryPage() {
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapFocus, setMapFocus] = useState<[number, number] | null>(null);
  const [activeLandmarkId, setActiveLandmarkId] = useState<string | null>(null);
  const [aiMarkers, setAiMarkers] = useState<AiMarker[]>([]);

  const [visibleCount, setVisibleCount] = useState(20);

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

  // Memoize filtered list — only recalculates when landmarks, selectedCategory, or searchQuery change
  const filteredLandmarks = useMemo(() => {
    let list = landmarks;

    // Filter by selected category
    if (selectedCategory !== 'all') {
      list = list.filter(l => {
        const cat = l.category.toLowerCase();
        if (selectedCategory === 'heritage') return cat.includes('heritage') || cat.includes('historic');
        if (selectedCategory === 'spiritual') return cat.includes('spiritual') || cat.includes('temple');
        if (selectedCategory === 'nature') return cat.includes('nature') || cat.includes('outdoor');
        if (selectedCategory === 'art') return cat.includes('art') || cat.includes('museum') || cat.includes('theater');
        if (selectedCategory === 'eat') return cat.includes('eat') || cat.includes('shop') || cat.includes('food');
        if (selectedCategory === 'sightseeing') return cat.includes('sightseeing') || cat.includes('tourist') || cat.includes('attraction');
        return cat.includes(selectedCategory);
      });
    }

    // Filter by search query
    const q = searchQuery.toLowerCase();
    if (!q) return list;
    return list.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.category.toLowerCase().includes(q)
    );
  }, [landmarks, selectedCategory, searchQuery]);

  // Reset visibleCount when searchQuery or selectedCategory changes
  useEffect(() => {
    setVisibleCount(20);
  }, [searchQuery, selectedCategory]);

  // Handle progressive rendering (Infinite Scroll) when user scrolls near the bottom of list
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    if (container.scrollHeight - container.scrollTop <= container.clientHeight + 100) {
      setVisibleCount((prev) => Math.min(prev + 20, filteredLandmarks.length));
    }
  }, [filteredLandmarks.length]);

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
        <div className="w-[400px] flex flex-col h-full overflow-hidden p-8 pb-6 space-y-6">
          <div className="flex items-start justify-between flex-shrink-0">
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
              className="w-10 h-10 rounded-2xl bg-on-surface/5 flex items-center justify-center text-on-surface hover:bg-on-surface/10 transition-all active:scale-90 flex-shrink-0"
              title="Close sidebar"
            >
              <span className="material-symbols-outlined text-2xl">menu_open</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative group flex-shrink-0">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/40 group-focus-within:text-primary transition-colors text-xl">search</span>
            <input
              className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest border border-outline/10 rounded-2xl focus:ring-8 focus:ring-primary/5 focus:bg-white focus:border-primary/40 transition-all text-sm outline-none font-bold shadow-sm"
              placeholder="Search landmarks..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>


          {/* Place Cards Container (Restricted scroll strictly here) */}
          <div 
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto min-h-0 space-y-4 pr-1.5 custom-scrollbar"
          >
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
               <label className="font-label text-[10px] font-black uppercase tracking-[0.25em] text-outline/60 block">
                 Heritage Collection
               </label>
               {/* <span className="text-[10px] font-black text-primary bg-primary/5 px-2 py-1 rounded-md">{filteredLandmarks.length} results</span> */}
            </div>
            {filteredLandmarks.slice(0, visibleCount).map(l => {
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
                    title={saved ? 'Remove from trip' : 'Save to trip'}
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
      </aside>

      {/* Map Section */}
      <section className="flex-1 relative overflow-hidden z-10 bg-neutral-100 min-w-0">
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-6 left-6 z-[1000] w-12 h-12 bg-background/90 backdrop-blur-xl rounded-[20px] shadow-[0_15px_40px_rgba(0,0,0,0.15)] flex items-center justify-center border border-white/50 hover:bg-white transition-all active:scale-90 animate-in slide-in-from-left-8 fade-in duration-700"
            title="Open sidebar"
          >
            <span className="material-symbols-outlined text-2xl text-primary">menu</span>
          </button>
        )}

        {/* Floating Category Selector (Sleek and compact size) */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] flex gap-1.5 max-w-[90%] overflow-x-auto scrollbar-none bg-background/90 backdrop-blur-xl p-1 px-2 rounded-[20px] shadow-lg border border-white/20 animate-in fade-in slide-in-from-top-4 duration-500">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all duration-300 active:scale-95 whitespace-nowrap border
                  ${active 
                    ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-[1.02]' 
                    : 'bg-white/40 text-on-surface/80 border-outline/10 hover:text-on-surface hover:bg-white/80 hover:border-outline/20 active:scale-95'
                  }`}
              >
                <span className="material-symbols-outlined text-[13px]">{cat.icon}</span>
                {cat.name}
              </button>
            );
          })}
        </div>

        <DiscoveryMap
          onLocationFound={setUserLocation}
          showLandmarks={true}
          focusLocation={mapFocus}
          focusedLandmarkId={activeLandmarkId}
          aiMarkers={aiMarkers}
          selectedCategory={selectedCategory}
          isSidebarOpen={isSidebarOpen}
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
