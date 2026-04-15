'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

const DiscoveryMap = dynamic(() => import('@/components/map/DiscoveryMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full flex items-center justify-center bg-slate-100 animate-pulse text-gray-400">Loading Map...</div>
});

const ChatAssistant = dynamic(() => import('@/components/chat/ChatAssistant'), { ssr: false });

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

interface ItineraryStop {
  order: number;
  placeId: string;
  name: string;
  lat: number;
  lng: number;
  category: string;
  district: string;
  imageUrl: string | null;
  arriveAt: string;
  departAt: string;
  visitDurationMin: number;
  travelFromPrevMin: number;
  waitMin: number;
}

interface ItineraryDay {
  dayNumber: number;
  dayLabel: string;
  color: string;
  stops: ItineraryStop[];
  totalTravelMin: number;
  freeTimeMin: number;
}

interface ItineraryResult {
  days: ItineraryDay[];
  infeasible: { name: string; reason: string }[];
  unscheduled: { name: string; reason: string }[];
}

export default function DiscoveryPage() {
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Trip planning state
  const [isPlanMode, setIsPlanMode] = useState(false);
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [itinerary, setItinerary] = useState<ItineraryResult | null>(null);
  const [activeDayTab, setActiveDayTab] = useState(1);

  // Config form state
  const [numDays, setNumDays] = useState(1);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('18:00');
  const [visitDuration, setVisitDuration] = useState(30);
  const [travelDate, setTravelDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetch('/data/landmarks.json')
      .then(res => res.json())
      .then(data => setLandmarks(data))
      .catch(err => console.error("Could not load landmarks data", err));
  }, []);

  const filteredLandmarks = landmarks.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const togglePlace = (id: string) => {
    setSelectedPlaces(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const timeToMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const handleGenerate = async () => {
    if (selectedPlaces.size < 2) return;
    setIsGenerating(true);
    setShowConfigModal(false);

    try {
      // Get user GPS location
      let startLat: number | undefined;
      let startLng: number | undefined;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 8000,
          })
        );
        startLat = pos.coords.latitude;
        startLng = pos.coords.longitude;
      } catch {
        console.warn('GPS unavailable — itinerary will skip start-point travel time');
      }

      // landmarks.json uses numeric IDs, DB uses UUIDs — send names instead
      const selectedNames = landmarks
        .filter(l => selectedPlaces.has(l.id))
        .map(l => l.name);

      const res = await fetch(`${process.env.NEXT_PUBLIC_ACTIONS_URL}/trips/generate-itinerary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeNames: selectedNames,
          numDays,
          startTime: timeToMin(startTime),
          endTime: timeToMin(endTime),
          travelDate,
          visitDurationMin: visitDuration,
          startLat,
          startLng,
        }),
      });

      const data: ItineraryResult = await res.json();
      setItinerary(data);
      setActiveDayTab(1);
      setIsPlanMode(false); // Exit selection mode, show results
    } catch (err) {
      console.error('Failed to generate itinerary:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setItinerary(null);
    setSelectedPlaces(new Set());
    setIsPlanMode(false);
  };

  // Build itinerary markers for the map component
  const itineraryMarkers = itinerary?.days?.flatMap(day =>
    day.stops.map(stop => ({
      placeId: stop.placeId,
      lat: stop.lat,
      lng: stop.lng,
      name: stop.name,
      order: stop.order,
      color: day.color,
      dayNumber: day.dayNumber,
      arriveAt: stop.arriveAt,
      departAt: stop.departAt,
    }))
  ) || [];

  // Active day for the timeline 
  const activeDay = itinerary?.days?.find(d => d.dayNumber === activeDayTab);
  const freeH = activeDay ? Math.floor(activeDay.freeTimeMin / 60) : 0;
  const freeM = activeDay ? activeDay.freeTimeMin % 60 : 0;

  return (
    <div className="flex h-screen w-full overflow-hidden animate-in fade-in duration-500">
      {/* Sidebar */}
      <aside className="w-[30%] min-w-[420px] bg-white z-20 flex flex-col border-r border-outline/10 shadow-2xl shadow-black/5">
        <div className="p-8 space-y-6 flex-1 overflow-y-auto hide-scrollbar">

          {/* ═══ ITINERARY RESULT VIEW ═══ */}
          {itinerary ? (
            <>
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-black tracking-tighter text-on-surface">Your Itinerary</h1>
                  <button onClick={handleReset} className="w-10 h-10 rounded-2xl bg-surface-container-high flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors">
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
                <p className="text-outline text-[10px] font-black uppercase tracking-widest">
                  {itinerary.days?.length || 0} day{(itinerary.days?.length || 0) > 1 ? 's' : ''} • {itinerary.days?.reduce((s, d) => s + d.stops.length, 0) || 0} places
                </p>
              </div>

              {/* Day Tabs */}
              <div className="flex gap-2">
                {itinerary.days?.map(day => (
                  <button
                    key={day.dayNumber}
                    onClick={() => setActiveDayTab(day.dayNumber)}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2
                      ${activeDayTab === day.dayNumber
                        ? 'text-white shadow-md'
                        : 'bg-surface-container-high text-outline hover:brightness-95'}`}
                    style={activeDayTab === day.dayNumber ? { backgroundColor: day.color } : undefined}
                  >
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: day.color }}></div>
                    Day {day.dayNumber} ({day.dayLabel})
                  </button>
                ))}
              </div>

              {/* Day Summary */}
              {activeDay && (
                <div className="flex gap-3">
                  <div className="flex-1 bg-surface-container-lowest border border-outline/5 p-4 rounded-2xl text-center">
                    <div className="text-2xl font-black tracking-tighter text-on-surface">{activeDay.stops.length}</div>
                    <div className="text-[9px] font-black text-outline uppercase tracking-widest">Stops</div>
                  </div>
                  <div className="flex-1 bg-surface-container-lowest border border-outline/5 p-4 rounded-2xl text-center">
                    <div className="text-2xl font-black tracking-tighter text-on-surface">{activeDay.totalTravelMin}p</div>
                    <div className="text-[9px] font-black text-outline uppercase tracking-widest">Travel</div>
                  </div>
                  <div className="flex-1 bg-surface-container-lowest border border-outline/5 p-4 rounded-2xl text-center">
                    <div className="text-2xl font-black tracking-tighter text-on-surface">{freeH}h{freeM > 0 ? `${freeM}m` : ''}</div>
                    <div className="text-[9px] font-black text-outline uppercase tracking-widest">Free</div>
                  </div>
                </div>
              )}

              {/* Timeline */}
              {activeDay && (
                <div className="space-y-1">
                  <label className="font-label text-[10px] font-black uppercase tracking-widest text-outline block mb-3">Timeline</label>
                  {activeDay.stops.map((stop, idx) => (
                    <div key={stop.placeId} className="flex gap-4 group">
                      {/* Left — number + line */}
                      <div className="flex flex-col items-center w-10">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 shadow-md"
                          style={{ backgroundColor: activeDay.color }}
                        >
                          {stop.order}
                        </div>
                        {idx < activeDay.stops.length - 1 && (
                          <div className="w-0.5 flex-1 my-1 rounded-full" style={{ backgroundColor: activeDay.color, opacity: 0.2 }}></div>
                        )}
                      </div>

                      {/* Right — card */}
                      <div className="flex-1 pb-4">
                        {/* Travel info */}
                        {stop.travelFromPrevMin > 0 && (
                          <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold text-outline">
                            <span className="material-symbols-outlined text-[14px]">two_wheeler</span>
                            {stop.travelFromPrevMin} phút di chuyển
                            {stop.waitMin > 0 && <span className="text-amber-600"> • ⏳ chờ {stop.waitMin}p</span>}
                          </div>
                        )}
                        <div className="bg-surface-container-lowest border border-outline/5 p-4 rounded-2xl hover:border-primary/20 hover:shadow-lg transition-all">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-black text-base tracking-tight text-on-surface leading-tight">{stop.name}</h3>
                          </div>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="px-2.5 py-1 bg-primary/5 text-primary text-[9px] font-black rounded-lg uppercase tracking-wider">{stop.arriveAt} — {stop.departAt}</span>
                            <span className="text-[9px] font-bold text-outline uppercase tracking-wider">{stop.district}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Warnings */}
              {(itinerary.infeasible?.length ?? 0) > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-1">
                  <div className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Không khả dụng</div>
                  {itinerary.infeasible?.map(i => (
                    <p key={i.name} className="text-xs text-amber-600 font-medium">• {i.name}: {i.reason}</p>
                  ))}
                </div>
              )}
            </>
          ) : (
            /* ═══ NORMAL / SELECTION VIEW ═══ */
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h1 className="text-4xl font-black tracking-tighter text-on-surface">
                    {isPlanMode ? 'Chọn địa điểm' : 'Discovery Archive'}
                  </h1>
                  {isPlanMode && (
                    <button onClick={() => { setIsPlanMode(false); setSelectedPlaces(new Set()); }}
                      className="w-10 h-10 rounded-2xl bg-surface-container-high flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors">
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  )}
                </div>
                <p className="text-outline text-[10px] font-black uppercase tracking-widest">
                  {isPlanMode ? `${selectedPlaces.size} địa điểm đã chọn` : 'Unveil 1,000 years of heritage layers.'}
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

              {/* Place Cards with selection */}
              <div className="space-y-3">
                <label className="font-label text-[10px] font-black uppercase tracking-widest text-outline block">
                  {isPlanMode ? 'Nhấn để chọn/bỏ chọn' : 'Heritage Collection'}
                </label>
                {filteredLandmarks.slice(0, isPlanMode ? 50 : 10).map(l => {
                  const isSelected = selectedPlaces.has(l.id);
                  return (
                    <div
                      key={l.id}
                      onClick={() => isPlanMode && togglePlace(l.id)}
                      className={`group cursor-pointer bg-surface-container-lowest border p-3.5 rounded-[1.5rem] shadow-sm transition-all duration-300 flex gap-3.5 items-center
                        ${isPlanMode && isSelected
                          ? 'border-primary bg-primary/5 shadow-primary/10 shadow-md'
                          : 'border-outline/5 hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5'}`}
                    >
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 relative">
                        <img className="w-full h-full object-cover" src={l.image} alt={l.name} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-on-surface text-sm leading-tight tracking-tight truncate">{l.name}</h3>
                        <p className="text-[10px] text-outline font-bold uppercase tracking-wider truncate">{l.category}</p>
                      </div>
                      {isPlanMode && (
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all shrink-0
                          ${isSelected ? 'bg-primary text-white' : 'bg-surface-container-high text-outline/30'}`}>
                          <span className="material-symbols-outlined text-[16px]">
                            {isSelected ? 'check' : 'add'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-surface-container-low border-t border-outline/10">
          {itinerary ? (
            <button onClick={handleReset} className="w-full py-4 bg-outline/10 text-on-surface rounded-2xl font-black hover:bg-outline/20 transition-all uppercase tracking-widest text-[10px]">
              Tạo lịch trình mới
            </button>
          ) : isPlanMode ? (
            <button
              onClick={() => selectedPlaces.size >= 2 && setShowConfigModal(true)}
              disabled={selectedPlaces.size < 2}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all uppercase tracking-widest text-[10px] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
              Tối ưu lịch trình ({selectedPlaces.size} địa điểm)
            </button>
          ) : (
            <button onClick={() => setIsPlanMode(true)} className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-lg">route</span>
              Lên kế hoạch chuyến đi
            </button>
          )}
        </div>
      </aside>

      {/* Map Section */}
      <section className="flex-1 relative overflow-hidden bg-surface-container bg-neutral-100 z-0">
        <DiscoveryMap itineraryMarkers={itineraryMarkers} />
      </section>

      {/* ═══ CONFIG MODAL ═══ */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tighter text-on-surface">Cấu hình chuyến đi</h2>
              <p className="text-[10px] font-black text-outline uppercase tracking-widest">{selectedPlaces.size} địa điểm đã chọn</p>
            </div>

            {/* Number of days */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-outline uppercase tracking-widest block">Số ngày</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setNumDays(n)}
                    className={`flex-1 py-3 rounded-xl text-sm font-black transition-all
                      ${numDays === n ? 'bg-primary text-white shadow-md shadow-primary/20' : 'bg-surface-container-high text-outline hover:bg-primary/10'}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Travel date */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-outline uppercase tracking-widest block">Ngày bắt đầu</label>
              <input
                type="date"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low border border-outline/10 rounded-xl font-bold text-sm outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5"
              />
            </div>

            {/* Time range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-outline uppercase tracking-widest block">Bắt đầu</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline/10 rounded-xl font-bold text-sm outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-outline uppercase tracking-widest block">Kết thúc</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline/10 rounded-xl font-bold text-sm outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5"
                />
              </div>
            </div>

            {/* Visit duration */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-outline uppercase tracking-widest block">
                Thời gian tham quan mỗi điểm: <span className="text-primary">{visitDuration} phút</span>
              </label>
              <input
                type="range"
                min={15}
                max={120}
                step={5}
                value={visitDuration}
                onChange={(e) => setVisitDuration(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <div className="flex justify-between text-[9px] font-bold text-outline">
                <span>15 phút</span>
                <span>120 phút</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfigModal(false)}
                className="flex-1 py-3.5 bg-surface-container-high text-outline rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-outline/20 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex-[2] py-3.5 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                )}
                {isGenerating ? 'Đang tối ưu...' : 'Tạo lịch trình'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isGenerating && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[2rem] shadow-2xl flex flex-col items-center gap-4 animate-in zoom-in-95">
            <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-sm font-black text-on-surface">Đang tối ưu lịch trình...</p>
            <p className="text-[10px] font-bold text-outline uppercase tracking-widest">Goong Distance Matrix API</p>
          </div>
        </div>
      )}
      {/* AI Chat Assistant */}
      <ChatAssistant />
    </div>
  );
}
