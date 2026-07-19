'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useTripStore, type Landmark } from '@/store/useTripStore';

const DiscoveryMap = dynamic(() => import('@/components/map/DiscoveryMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-slate-100 animate-pulse text-gray-400">Loading Map...</div>
});

const ChatAssistant = dynamic(() => import('@/components/chat/ChatAssistant'), { ssr: false });
const TravelBasket = dynamic(() => import('@/components/TravelBasket'), { ssr: false });

import { fetchLandmarks, getOpeningStatus } from '@/lib/landmarks';

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
  { id: 'Museum', name: 'Museum', icon: 'museum' },
  { id: 'Temple & Pagoda', name: 'Temple & Pagoda', icon: 'temple_buddhist' },
  { id: 'Historic Site', name: 'Historic Site', icon: 'castle' },
  { id: 'Nature & Lake', name: 'Nature & Lake', icon: 'forest' },
  { id: 'Arts & Performance', name: 'Arts & Performance', icon: 'theater_comedy' },
  { id: 'Street & Market', name: 'Street & Market', icon: 'storefront' },
];

function DiscoveryPageContent() {
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapFocus, setMapFocus] = useState<[number, number] | null>(null);
  const [activeLandmarkId, setActiveLandmarkId] = useState<string | null>(null);
  const [aiMarkers, setAiMarkers] = useState<AiMarker[]>([]);
  const [visibleCount, setVisibleCount] = useState(20);
  const [isFilterBarVisible, setIsFilterBarVisible] = useState(true);

  const searchParams = useSearchParams();

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

  // Handle auto-focus / selection via URL query (?select=...)
  useEffect(() => {
    const selectId = searchParams.get('select');
    if (selectId && landmarks.length > 0) {
      const landmark = landmarks.find(l => l.id === selectId);
      if (landmark) {
        setMapFocus([landmark.lat, landmark.lng]);
        setActiveLandmarkId(landmark.id);
      }
    }
  }, [searchParams, landmarks]);

  // Memoize filtered list — only recalculates when landmarks, selectedCategory, or searchQuery change
  const filteredLandmarks = useMemo(() => {
    let list = landmarks;

    // Filter by selected category
    if (selectedCategory !== 'all') {
      list = list.filter(l => l.category === selectedCategory);
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
            </div>
            {filteredLandmarks.slice(0, visibleCount).map(l => {
              const saved = l.id in selectedPlaces;
              const status = getOpeningStatus(l);
              return (
                <div
                  key={l.id}
                  onClick={() => {
                    setMapFocus([l.lat, l.lng]);
                    setActiveLandmarkId(l.id);
                  }}
                  className={`group cursor-pointer border p-4 rounded-[22px] shadow-sm transition-all duration-500 flex gap-4 items-center hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:scale-[1.02] active:scale-[0.98] relative overflow-hidden
                    ${activeLandmarkId === l.id ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20' : 'bg-surface-container-lowest border-outline/5'}`}
                >
                  <div className="w-[72px] h-[72px] rounded-[16px] overflow-hidden flex-shrink-0 relative shadow-inner">
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
                    <h3 className="font-extrabold text-on-surface text-[16px] leading-tight tracking-tight truncate">{l.name}</h3>
                    <p className="text-[11px] text-outline/60 font-black uppercase tracking-widest mt-1 truncate">{l.category}</p>
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 mt-1.5 rounded-full text-[9px] font-bold border w-fit ${status.colorClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dotColorClass}`} />
                      <span>{status.text}</span>
                    </div>
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

        {/* Floating Category Selector */}
        {isFilterBarVisible ? (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-1 max-w-[90%] bg-background/90 backdrop-blur-xl p-0.5 pl-1.5 pr-0.5 rounded-[16px] shadow-lg border border-white/20 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex gap-1 overflow-x-auto hide-scrollbar pr-1">
              {CATEGORIES.map((cat) => {
                const active = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all duration-300 active:scale-95 whitespace-nowrap border
                      ${active 
                        ? 'bg-primary text-white border-primary shadow-md shadow-primary/20 scale-[1.02]' 
                        : 'bg-white/40 text-on-surface/80 border-outline/10 hover:text-on-surface hover:bg-white/80 hover:border-outline/20 active:scale-95'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[11px]">{cat.icon}</span>
                    {cat.name}
                  </button>
                );
              })}
            </div>
            
            {/* Divider */}
            <div className="h-5 w-px bg-outline/10 mx-1 flex-shrink-0"></div>

            {/* Close button */}
            <button 
              onClick={() => setIsFilterBarVisible(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-outline/50 hover:text-primary hover:bg-primary/5 transition-all active:scale-90 flex-shrink-0"
              title="Hide filter bar"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        ) : (
          /* Mini Floating Filter Icon Button */
          <button 
            onClick={() => setIsFilterBarVisible(true)}
            className={`absolute top-6 z-[1000] w-12 h-12 bg-background/90 backdrop-blur-xl rounded-[20px] shadow-[0_15px_40px_rgba(0,0,0,0.15)] flex items-center justify-center border border-white/50 hover:bg-white transition-all active:scale-90 animate-in fade-in duration-300
              ${isSidebarOpen ? 'left-6' : 'left-[80px]'}`}
            title="Show filter bar"
          >
            <span className="material-symbols-outlined text-2xl text-primary">filter_list</span>
          </button>
        )}

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

export default function DiscoveryPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <DiscoveryPageContent />
    </Suspense>
  );
}
