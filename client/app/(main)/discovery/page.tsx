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

export default function DiscoveryPage() {
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  // Zustand — subscribe to selectedPlaces directly for reactivity
  const selectedPlaces = useTripStore((s) => s.selectedPlaces);
  const addPlace = useTripStore((s) => s.addPlace);
  const removePlace = useTripStore((s) => s.removePlace);

  useEffect(() => {
    fetch('/data/landmarks.json')
      .then(res => res.json())
      .then(data => setLandmarks(data))
      .catch(err => console.error("Could not load landmarks data", err));
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
    <div className="flex h-screen w-full overflow-hidden animate-in fade-in duration-500">
      {/* Sidebar */}
      <aside className="w-[30%] min-w-[420px] bg-white z-20 flex flex-col border-r border-outline/10 shadow-2xl shadow-black/5">
        <div className="p-8 space-y-6 flex-1 overflow-y-auto hide-scrollbar">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-4xl font-black tracking-tighter text-on-surface">
              Discovery Archive
            </h1>
            <p className="text-outline text-[10px] font-black uppercase tracking-widest">
              Unveil 1,000 years of heritage layers.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/30 group-focus-within:text-primary transition-colors">search</span>
            <input
              className="w-full pl-12 pr-4 py-4 bg-surface-container-low border border-transparent rounded-2xl focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/20 transition-all text-sm outline-none font-bold"
              placeholder="Tìm địa điểm..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Place Cards */}
          <div className="space-y-3">
            <label className="font-label text-[10px] font-black uppercase tracking-widest text-outline block">
              Heritage Collection
            </label>
            {filteredLandmarks.slice(0, 20).map(l => {
              const saved = l.id in selectedPlaces;
              return (
                <div
                  key={l.id}
                  className="group cursor-pointer bg-surface-container-lowest border p-3.5 rounded-[1.5rem] shadow-sm transition-all duration-300 flex gap-3.5 items-center border-outline/5 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 relative"
                >
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 relative">
                    <img className="w-full h-full object-cover" src={l.image} alt={l.name} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-on-surface text-sm leading-tight tracking-tight truncate">{l.name}</h3>
                    <p className="text-[10px] text-outline font-bold uppercase tracking-wider truncate">{l.category}</p>
                  </div>

                  {/* Heart/Save button */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSave(l); }}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 shrink-0
                      ${saved
                        ? 'bg-primary/10 text-primary scale-110'
                        : 'bg-transparent text-outline/30 hover:text-primary hover:bg-primary/5 opacity-0 group-hover:opacity-100'
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
      </aside>

      {/* Map Section */}
      <section className="flex-1 relative overflow-hidden bg-surface-container bg-neutral-100 z-0">
        <DiscoveryMap
          onLocationFound={setUserLocation}
          showLandmarks={true}
        />
      </section>

      {/* Floating Travel Basket */}
      <TravelBasket />

      {/* AI Chat Assistant */}
      <ChatAssistant />
    </div>
  );
}
