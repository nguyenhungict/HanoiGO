'use client';

import React, { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useTripStore, type Landmark } from '@/store/useTripStore';

const TripMap = dynamic(() => import('@/components/map/DiscoveryMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-slate-100 animate-pulse text-gray-400">
      Loading Map...
    </div>
  ),
});

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

export default function TripsPage() {
  const selectedPlaces = useTripStore((s) => s.selectedPlaces);
  const removePlace = useTripStore((s) => s.removePlace);
  const clearPlaces = useTripStore((s) => s.clearPlaces);
  const config = useTripStore((s) => s.config);
  const setConfig = useTripStore((s) => s.setConfig);

  const places = useMemo(() => Object.values(selectedPlaces), [selectedPlaces]);
  const count = places.length;

  // Local state
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [itinerary, setItinerary] = useState<ItineraryResult | null>(null);
  const [activeDayTab, setActiveDayTab] = useState(1);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

  const timeToMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const handleGenerate = async () => {
    if (count < 2) return;
    setIsGenerating(true);
    setShowConfigModal(false);

    try {
      const selectedNames = places.map((l) => l.name);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_ACTIONS_URL}/trips/generate-itinerary`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            placeNames: selectedNames,
            numDays: config.numDays,
            startTime: timeToMin(config.startTime),
            endTime: timeToMin(config.endTime),
            travelDate: config.travelDate,
            visitDurationMin: config.visitDuration,
            startLat: userLocation?.[0],
            startLng: userLocation?.[1],
            lunchBreakStart: timeToMin(config.lunchBreakStart),
            lunchBreakEnd: timeToMin(config.lunchBreakEnd),
          }),
        }
      );

      const data: ItineraryResult = await res.json();
      setItinerary(data);
      setActiveDayTab(1);
    } catch (err) {
      console.error('Failed to generate itinerary:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setItinerary(null);
  };

  // Build itinerary markers for the map — memoized to avoid recreating on every render
  const itineraryMarkers = useMemo(() =>
    itinerary?.days?.flatMap((day) =>
      day.stops.map((stop) => ({
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
    ) || []
  , [itinerary]);

  const activeDay = useMemo(() =>
    itinerary?.days?.find((d) => d.dayNumber === activeDayTab)
  , [itinerary, activeDayTab]);

  const freeH = activeDay ? Math.floor(activeDay.freeTimeMin / 60) : 0;
  const freeM = activeDay ? activeDay.freeTimeMin % 60 : 0;

  return (
    <div className="flex h-screen w-full overflow-hidden animate-in fade-in duration-500">
      {/* Left Panel: Timeline / Selection */}
      <aside className="w-[38%] min-w-[440px] bg-white z-20 flex flex-col border-r border-outline/10 shadow-2xl shadow-black/5">
        <div className="p-8 space-y-6 flex-1 overflow-y-auto hide-scrollbar">

          {/* ═══ ITINERARY VIEW ═══ */}
          {itinerary ? (
            <>
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-black tracking-tighter text-on-surface">
                    Your Itinerary
                  </h1>
                  <button
                    onClick={handleReset}
                    className="w-10 h-10 rounded-2xl bg-surface-container-high flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <span className="material-symbols-outlined text-lg">close</span>
                  </button>
                </div>
                <p className="text-outline text-[10px] font-black uppercase tracking-widest">
                  {itinerary.days?.length || 0} day
                  {(itinerary.days?.length || 0) > 1 ? 's' : ''} •{' '}
                  {itinerary.days?.reduce((s, d) => s + d.stops.length, 0) || 0} places
                </p>
              </div>

              {/* Day Tabs */}
              <div className="flex gap-2">
                {itinerary.days?.map((day) => (
                  <button
                    key={day.dayNumber}
                    onClick={() => setActiveDayTab(day.dayNumber)}
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2
                      ${
                        activeDayTab === day.dayNumber
                          ? 'text-white shadow-md'
                          : 'bg-surface-container-high text-outline hover:brightness-95'
                      }`}
                    style={
                      activeDayTab === day.dayNumber
                        ? { backgroundColor: day.color }
                        : undefined
                    }
                  >
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: day.color }}
                    ></div>
                    Day {day.dayNumber} ({day.dayLabel})
                  </button>
                ))}
              </div>

              {/* Day Summary */}
              {activeDay && (
                <div className="flex gap-3">
                  <div className="flex-1 bg-surface-container-lowest border border-outline/5 p-4 rounded-2xl text-center">
                    <div className="text-2xl font-black tracking-tighter text-on-surface">
                      {activeDay.stops.length}
                    </div>
                    <div className="text-[9px] font-black text-outline uppercase tracking-widest">
                      Stops
                    </div>
                  </div>
                  <div className="flex-1 bg-surface-container-lowest border border-outline/5 p-4 rounded-2xl text-center">
                    <div className="text-2xl font-black tracking-tighter text-on-surface">
                      {activeDay.totalTravelMin}p
                    </div>
                    <div className="text-[9px] font-black text-outline uppercase tracking-widest">
                      Travel
                    </div>
                  </div>
                  <div className="flex-1 bg-surface-container-lowest border border-outline/5 p-4 rounded-2xl text-center">
                    <div className="text-2xl font-black tracking-tighter text-on-surface">
                      {freeH}h{freeM > 0 ? `${freeM}m` : ''}
                    </div>
                    <div className="text-[9px] font-black text-outline uppercase tracking-widest">
                      Free
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline */}
              {activeDay && (
                <div className="space-y-1">
                  <label className="font-label text-[10px] font-black uppercase tracking-widest text-outline block mb-3">
                    Timeline
                  </label>
                  {activeDay.stops.map((stop, idx) => {
                    const prevDepartMin = idx > 0 
                      ? timeToMin(activeDay.stops[idx - 1].departAt) 
                      : timeToMin(config.startTime);
                    
                    const currentArriveMin = timeToMin(stop.arriveAt);
                    const currentStartVisitMin = currentArriveMin + stop.waitMin;
                    const lunchStartMin = timeToMin(config.lunchBreakStart);
                    const lunchEndMin = timeToMin(config.lunchBreakEnd);

                    const showsLunchBreakBefore = 
                      prevDepartMin <= lunchStartMin && 
                      currentStartVisitMin >= lunchEndMin;

                    // Calculate real wait time excluding lunch break
                    let displayWait = stop.waitMin;
                    if (showsLunchBreakBefore) {
                      // How much of the wait time was actually just waiting for lunch to end?
                      const overlapStart = Math.max(currentArriveMin, lunchStartMin);
                      const overlapEnd = Math.min(currentStartVisitMin, lunchEndMin);
                      if (overlapEnd > overlapStart) {
                        displayWait -= (overlapEnd - overlapStart);
                      }
                    }

                    return (
                      <React.Fragment key={stop.placeId}>
                        {showsLunchBreakBefore && (
                          <div className="flex gap-4 group my-2">
                            <div className="flex flex-col items-center w-10">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-amber-100 text-amber-600 shadow-md z-10">
                                <span className="material-symbols-outlined text-[16px]">restaurant</span>
                              </div>
                              <div className="w-0.5 flex-1 my-1 rounded-full bg-amber-500/20"></div>
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="bg-amber-50/50 border border-amber-500/20 p-4 rounded-2xl flex items-center justify-between">
                                <div>
                                  <h3 className="font-black text-sm text-amber-900 tracking-tight">Nghỉ trưa & Tự do</h3>
                                  <p className="text-[10px] text-amber-700/70 font-bold uppercase tracking-wider mt-0.5">
                                    Thưởng thức ẩm thực Hà Nội
                                  </p>
                                </div>
                                <span className="px-2.5 py-1 bg-amber-500/10 text-amber-700 text-[9px] font-black rounded-lg uppercase tracking-wider">
                                  {config.lunchBreakStart} — {config.lunchBreakEnd}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex gap-4 group">
                          {/* Left — number + line */}
                          <div className="flex flex-col items-center w-10">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0 shadow-md z-10"
                              style={{ backgroundColor: activeDay.color }}
                            >
                              {stop.order}
                            </div>
                            {idx < activeDay.stops.length - 1 && (
                              <div
                                className="w-0.5 flex-1 my-1 rounded-full"
                                style={{
                                  backgroundColor: activeDay.color,
                                  opacity: 0.2,
                                }}
                              ></div>
                            )}
                          </div>

                          {/* Right — card */}
                          <div className="flex-1 pb-4">
                            {stop.travelFromPrevMin > 0 && (
                              <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold text-outline">
                                <span className="material-symbols-outlined text-[14px]">
                                  two_wheeler
                                </span>
                                {stop.travelFromPrevMin} phút di chuyển
                                {displayWait > 0 && (
                                  <span className="text-amber-600">
                                    {' '}
                                    • ⏳ chờ {displayWait}p
                                  </span>
                                )}
                              </div>
                            )}
                            <div className="bg-surface-container-lowest border border-outline/5 p-4 rounded-2xl hover:border-primary/20 hover:shadow-lg transition-all relative z-0">
                              <div className="flex justify-between items-start mb-1">
                                <h3 className="font-black text-base tracking-tight text-on-surface leading-tight">
                                  {stop.name}
                                </h3>
                              </div>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="px-2.5 py-1 bg-primary/5 text-primary text-[9px] font-black rounded-lg uppercase tracking-wider">
                                  {/* Format depart time from min to time */}
                                  {Math.floor(currentStartVisitMin / 60).toString().padStart(2, '0')}:{Math.floor(currentStartVisitMin % 60).toString().padStart(2, '0')} — {stop.departAt}
                                </span>
                                <span className="text-[9px] font-bold text-outline uppercase tracking-wider">
                                  {stop.district}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              {/* Warnings */}
              {((itinerary.infeasible?.length ?? 0) > 0 || (itinerary.unscheduled?.length ?? 0) > 0) && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-3 mt-4">
                  {(itinerary.infeasible?.length ?? 0) > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                        Không khả dụng (Đóng cửa)
                      </div>
                      {itinerary.infeasible?.map((i) => (
                        <p
                          key={i.name}
                          className="text-xs text-amber-600 font-medium"
                        >
                          • {i.name}: {i.reason}
                        </p>
                      ))}
                    </div>
                  )}

                  {(itinerary.unscheduled?.length ?? 0) > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-black text-amber-700 uppercase tracking-widest">
                        Không thể sắp xếp (Quá giờ/Quá xa)
                      </div>
                      {itinerary.unscheduled?.map((i) => (
                        <p
                          key={i.name}
                          className="text-xs text-amber-600 font-medium"
                        >
                          • {i.name}: {i.reason}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* ═══ SELECTION VIEW ═══ */
            <>
              <div className="space-y-2">
                <h1 className="text-3xl font-black tracking-tighter text-on-surface">
                  Trip Planner
                </h1>
                <p className="text-outline text-[10px] font-black uppercase tracking-widest">
                  Architect your Hanoi legacy
                </p>
              </div>

              {count === 0 ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center text-center py-16 space-y-6">
                  <div className="w-24 h-24 rounded-[2rem] bg-secondary-container/50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-5xl text-primary/40">
                      explore
                    </span>
                  </div>
                  <div className="space-y-2 max-w-xs">
                    <h2 className="text-xl font-black tracking-tight text-on-surface">
                      Chưa có địa điểm nào
                    </h2>
                    <p className="text-sm text-outline font-medium leading-relaxed">
                      Khám phá bản đồ Discovery và bấm ❤️ để lưu các địa điểm bạn muốn ghé thăm.
                    </p>
                  </div>
                  <Link
                    href="/discovery"
                    className="bg-primary text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">explore</span>
                    Khám phá ngay
                  </Link>
                </div>
              ) : (
                /* Selected Places List */
                <>
                  <div className="flex items-center justify-between">
                    <label className="font-label text-[10px] font-black uppercase tracking-widest text-outline">
                      {count} địa điểm đã chọn
                    </label>
                    <button
                      onClick={clearPlaces}
                      className="text-[10px] font-black text-outline/50 hover:text-red-500 uppercase tracking-widest transition-colors"
                    >
                      Xóa tất cả
                    </button>
                  </div>

                  <div className="space-y-3">
                    {places.map((place) => (
                      <div
                        key={place.id}
                        className="bg-surface-container-lowest border border-outline/5 p-3.5 rounded-[1.5rem] shadow-sm flex gap-3.5 items-center group hover:border-primary/20 hover:shadow-lg transition-all"
                      >
                        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0">
                          <img
                            className="w-full h-full object-cover"
                            src={place.image}
                            alt={place.name}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-on-surface text-sm leading-tight tracking-tight truncate">
                            {place.name}
                          </h3>
                          <p className="text-[10px] text-outline font-bold uppercase tracking-wider truncate">
                            {place.category}
                          </p>
                        </div>
                        <button
                          onClick={() => removePlace(place.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-outline/30 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                          title="Xóa"
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            close
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!itinerary && count >= 2 && (
          <div className="p-6 bg-surface-container-low border-t border-outline/10">
            <button
              onClick={() => setShowConfigModal(true)}
              className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
              Cấu hình & tạo lịch trình
            </button>
          </div>
        )}

        {itinerary && (
          <div className="p-6 bg-surface-container-low border-t border-outline/10">
            <button
              onClick={handleReset}
              className="w-full py-4 bg-outline/10 text-on-surface rounded-2xl font-black hover:bg-outline/20 transition-all uppercase tracking-widest text-[10px]"
            >
              Tạo lịch trình mới
            </button>
          </div>
        )}
      </aside>

      {/* Right Panel: Map */}
      <section className="flex-1 relative overflow-hidden bg-neutral-100 z-0">
        <TripMap
          itineraryMarkers={itineraryMarkers}
          onLocationFound={setUserLocation}
          showLandmarks={!itinerary}
        />

        {/* Map overlay when no itinerary — shows selected place pins info */}
        {!itinerary && count === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-white/90 backdrop-blur-xl px-8 py-6 rounded-[2rem] shadow-2xl text-center space-y-2 max-w-sm">
              <span className="material-symbols-outlined text-4xl text-primary/30">map</span>
              <p className="text-sm font-black text-on-surface tracking-tight">
                Bản đồ lịch trình
              </p>
              <p className="text-[10px] font-bold text-outline uppercase tracking-widest">
                Các điểm đã chọn sẽ hiển thị tại đây
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ═══ CONFIG MODAL ═══ */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] w-full max-w-md p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
            <div className="space-y-1">
              <h2 className="text-2xl font-black tracking-tighter text-on-surface">
                Cấu hình chuyến đi
              </h2>
              <p className="text-[10px] font-black text-outline uppercase tracking-widest">
                {count} địa điểm đã chọn
              </p>
            </div>

            {/* Number of days */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-outline uppercase tracking-widest block">
                Số ngày
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setConfig({ numDays: n })}
                    className={`flex-1 py-3 rounded-xl text-sm font-black transition-all
                      ${
                        config.numDays === n
                          ? 'bg-primary text-white shadow-md shadow-primary/20'
                          : 'bg-surface-container-high text-outline hover:bg-primary/10'
                      }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Travel date */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-outline uppercase tracking-widest block">
                Ngày bắt đầu
              </label>
              <input
                type="date"
                value={config.travelDate}
                onChange={(e) => setConfig({ travelDate: e.target.value })}
                className="w-full px-4 py-3 bg-surface-container-low border border-outline/10 rounded-xl font-bold text-sm outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5"
              />
            </div>

            {/* Time range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-outline uppercase tracking-widest block">
                  Bắt đầu
                </label>
                <input
                  type="time"
                  value={config.startTime}
                  onChange={(e) => setConfig({ startTime: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline/10 rounded-xl font-bold text-sm outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-outline uppercase tracking-widest block">
                  Kết thúc
                </label>
                <input
                  type="time"
                  value={config.endTime}
                  onChange={(e) => setConfig({ endTime: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline/10 rounded-xl font-bold text-sm outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5"
                />
              </div>
            </div>

            {/* Lunch Break */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-outline uppercase tracking-widest block">
                  Nghỉ trưa từ
                </label>
                <input
                  type="time"
                  value={config.lunchBreakStart}
                  onChange={(e) => setConfig({ lunchBreakStart: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline/10 rounded-xl font-bold text-sm outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-outline uppercase tracking-widest block">
                  Đến
                </label>
                <input
                  type="time"
                  value={config.lunchBreakEnd}
                  onChange={(e) => setConfig({ lunchBreakEnd: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-container-low border border-outline/10 rounded-xl font-bold text-sm outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5"
                />
              </div>
            </div>

            {/* Visit duration */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-outline uppercase tracking-widest block">
                Thời gian tham quan mỗi điểm:{' '}
                <span className="text-primary">{config.visitDuration} phút</span>
              </label>
              <input
                type="range"
                min={15}
                max={120}
                step={5}
                value={config.visitDuration}
                onChange={(e) =>
                  setConfig({ visitDuration: Number(e.target.value) })
                }
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
                  <span className="material-symbols-outlined text-sm">
                    auto_awesome
                  </span>
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
            <p className="text-sm font-black text-on-surface">
              Đang tối ưu lịch trình...
            </p>
            <p className="text-[10px] font-bold text-outline uppercase tracking-widest">
              Goong Distance Matrix API
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
