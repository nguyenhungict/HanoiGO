'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useTripStore } from '@/store/useTripStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotification } from '@/hooks/use-notification';
import { useConfirm } from '@/hooks/use-confirm';
import { getSessionAction } from '@/lib/actions';
import { Trash2, Map as MapIcon, Clock, Calendar, CheckCircle2, AlertCircle, Share2 } from 'lucide-react';
import { CreateActivityDialog } from '@/components/activities/CreateActivityDialog';

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

interface SavedTrip {
  id: string;
  title: string;
  numDays: number;
  tripDays: Array<{
    dayNumber: number;
    tripStops: unknown[];
  }>;
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

  const { token, setUser, setToken } = useAuthStore();
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [viewMode, setViewMode] = useState<'create' | 'saved'>('create');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [tripTitle, setTripTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [tripToShare, setTripToShare] = useState<string | null>(null);
  const { show } = useNotification();
  const { confirm } = useConfirm();

  // Hydrate auth token from server-side cookie session (same as activities page)
  useEffect(() => {
    getSessionAction().then(session => {
      if (session) { setUser(session.user); setToken(session.token); }
      else { setUser(null); setToken(null); }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSavedTrips = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_ACTIONS_URL}/trips/my-trips`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSavedTrips(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  useEffect(() => {
    fetchSavedTrips();
  }, [fetchSavedTrips]);

  const handleSaveTrip = async () => {
    if (!itinerary) return;

    // Lấy token từ Zustand hoặc fallback từ server session (nếu store chưa hydrate)
    let authToken = token;
    if (!authToken) {
      const session = await getSessionAction();
      if (session?.token) {
        authToken = session.token;
        setUser(session.user);
        setToken(session.token);
      }
    }

    if (!authToken) {
      show({
        type: 'error',
        title: 'Authentication Required',
        message: 'Please log in to save your trip!',
      });
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        title: tripTitle || `My Trip to Hanoi - ${config.travelDate}`,
        numDays: config.numDays,
        startPlaceId: itinerary.days[0]?.stops[0]?.placeId || null,
        days: itinerary.days.map((day) => ({
          dayNumber: day.dayNumber,
          district: day.stops[0]?.district || day.stops.find(s => s.district)?.district || 'Hanoi',
          stops: day.stops.map((stop) => ({
            placeId: stop.placeId,
            stopOrder: stop.order,
            arriveAt: stop.arriveAt,
            departAt: stop.departAt,
            distanceFromPrevM: 0,
            durationFromPrevS: stop.travelFromPrevMin * 60,
            isSkipped: false,
          })),
        })),
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_ACTIONS_URL}/trips/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        show({
          type: 'success',
          title: 'Success',
          message: 'Your trip has been saved!',
        });
        setShowSaveModal(false);
        fetchSavedTrips();
      } else {
        const errText = await res.text();
        console.error('Save Trip API Error (Status ' + res.status + '):', errText);

        let errMsg = 'Could not save trip at this time.';
        if (res.status === 401) {
          errMsg = 'Your session has expired. Please log in again!';
        } else {
          try {
            const errJson = JSON.parse(errText);
            if (errJson.message) {
              errMsg = Array.isArray(errJson.message) ? errJson.message.join(', ') : errJson.message;
            }
          } catch {}
        }

        show({
          type: 'error',
          title: 'Error (' + res.status + ')',
          message: errMsg,
        });
      }
    } catch (e) {
      console.error('Save Trip Connection Error:', e);
      show({
        type: 'error',
        title: 'Connection Error',
        message: 'Please check your network connection or server status.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleViewSavedTrip = (trip: any) => {
    const formattedItinerary: ItineraryResult = {
      days: trip.tripDays.map((day: any, i: number) => ({
        dayNumber: day.dayNumber,
        dayOfWeek: 0,
        dayLabel: `Day ${day.dayNumber}`,
        color: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6'][i % 7],
        totalTravelMin: Math.round(
          day.tripStops.reduce((sum: number, stop: any) => sum + (stop.durationFromPrevS || 0) / 60, 0)
        ),
        freeTimeMin: 0,
        stops: day.tripStops.map((stop: any) => {
          // Extract HH:mm from ISO string (e.g., 1970-01-01T08:30:00.000Z)
          const formatDbTime = (timeStr: string) => {
            if (!timeStr) return '00:00';
            const date = new Date(timeStr);
            return `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
          };

          return {
            placeId: stop.placeId,
            name: stop.place?.name || 'Unknown',
            category: stop.place?.category || 'PLACE',
            district: stop.place?.district || '',
            lat: stop.place?.lat || 0,
            lng: stop.place?.lng || 0,
            arriveAt: formatDbTime(stop.arriveAt),
            departAt: formatDbTime(stop.departAt),
            travelFromPrevMin: Math.round((stop.durationFromPrevS || 0) / 60),
            waitMin: 0,
            order: stop.stopOrder,
          };
        }),
      })),
      infeasible: [],
      unscheduled: [],
    };

    setItinerary(formattedItinerary);
    setActiveDayTab(1);
    setViewMode('create');
  };

  const handleDeleteTrip = async (e: React.MouseEvent, tripId: string) => {
    e.stopPropagation();
    if (!token) return;
    
    const isConfirmed = await confirm({
      title: 'Delete Trip',
      message: 'Are you sure you want to delete this trip? This action cannot be undone.',
      confirmText: 'Delete Now',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (!isConfirmed) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_ACTIONS_URL}/trips/${tripId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        show({
          type: 'success',
          title: 'Deleted',
          message: 'The trip has been removed.',
        });
        fetchSavedTrips();
        if (itinerary) setItinerary(null);
      } else {
        show({ type: 'error', title: 'Error', message: 'Could not delete trip.' });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const timeToMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const handleGenerate = async () => {
    if (count < 2) return;
    setIsGenerating(true);
    setShowConfigModal(false);

    try {
      const selectedIds = places.map((l) => l.id);

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_ACTIONS_URL}/trips/generate-itinerary`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            placeIds: selectedIds,
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
    <div className="flex h-[calc(100vh-80px)] w-full overflow-hidden animate-in fade-in duration-500">
      {/* Left Panel: Timeline / Selection */}
      <aside className="w-[32%] min-w-[360px] bg-white z-20 flex flex-col border-r border-outline/10 shadow-2xl shadow-black/5">
        <div className="p-6 space-y-5 flex-1 overflow-y-auto hide-scrollbar">

          {/* ═══ ITINERARY VIEW ═══ */}
          {itinerary ? (
            <>
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-black tracking-tight text-on-surface">
                    Your Trip
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
                  <div className="flex-1 bg-surface-container-lowest border border-outline/5 p-3 rounded-2xl text-center">
                    <div className="text-xl font-black tracking-tight text-on-surface">
                      {activeDay.stops.length}
                    </div>
                    <div className="text-[9px] font-black text-outline uppercase tracking-widest">
                      Stops
                    </div>
                  </div>
                  <div className="flex-1 bg-surface-container-lowest border border-outline/5 p-3 rounded-2xl text-center">
                    <div className="text-xl font-black tracking-tight text-on-surface">
                      {activeDay.totalTravelMin}p
                    </div>
                    <div className="text-[9px] font-black text-outline uppercase tracking-widest">
                      Travel
                    </div>
                  </div>
                  <div className="flex-1 bg-surface-container-lowest border border-outline/5 p-3 rounded-2xl text-center">
                    <div className="text-xl font-black tracking-tight text-on-surface">
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
                                  <h3 className="font-black text-sm text-amber-900 tracking-tight">Lunch Break & Leisure</h3>
                                  <p className="text-[10px] text-amber-700/70 font-bold uppercase tracking-wider mt-0.5">
                                    Enjoy Hanoi cuisine
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
                                {stop.travelFromPrevMin} min travel
                                {displayWait > 0 && (
                                  <span className="text-amber-600">
                                    {' '}
                                    • ⏳ wait {displayWait}m
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
                        Infeasible (Closed)
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
                        Unscheduled (Time/Distance)
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
              {/* Header */}
              <div className="space-y-2 mb-4">
                <h1 className="text-xl font-black tracking-tight text-on-surface">
                  Trip Planner
                </h1>
                <p className="text-outline text-[10px] font-black uppercase tracking-widest">
                  Architect your Hanoi legacy
                </p>
              </div>

              {/* Tabs */}
              <div className="flex bg-surface-container-high rounded-xl p-1 mb-6">
                <button
                  onClick={() => setViewMode('create')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                    viewMode === 'create'
                      ? 'bg-white shadow-sm text-on-surface'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  New Trip
                </button>
                <button
                  onClick={() => setViewMode('saved')}
                  className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    viewMode === 'saved'
                      ? 'bg-white shadow-sm text-on-surface'
                      : 'text-outline hover:text-on-surface'
                  }`}
                >
                  Saved
                  <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[8px]">
                    {savedTrips.length}
                  </span>
                </button>
              </div>

              {viewMode === 'saved' ? (
                /* Saved Trips List */
                savedTrips.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-16 space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-secondary-container/50 flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl text-primary/40">
                        bookmark_border
                      </span>
                    </div>
                    <div className="space-y-1 max-w-[200px]">
                      <h2 className="text-base font-black tracking-tight text-on-surface">
                        No saved trips
                      </h2>
                      <p className="text-xs text-outline font-medium">
                        You haven't saved any trips yet. Create one and save it!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedTrips.map((trip) => (
                      <div
                        key={trip.id}
                        onClick={() => handleViewSavedTrip(trip)}
                        className="bg-surface-container-lowest border border-outline/5 p-4 rounded-2xl shadow-sm hover:border-primary/20 hover:shadow-lg transition-all cursor-pointer group relative"
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="font-black text-sm text-on-surface">
                            {trip.title}
                          </h3>
                          <button
                            onClick={(e) => handleDeleteTrip(e, trip.id)}
                            className="p-1.5 text-outline hover:text-error hover:bg-error/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="text-[10px] font-bold text-outline flex items-center gap-2 uppercase tracking-wider mb-3">
                          <span>{trip.numDays} days</span>
                          <span>•</span>
                          <span>
                            {trip.tripDays?.reduce(
                              (sum: number, day) =>
                                sum + (day.tripStops?.length || 0),
                              0
                            )}{' '}
                            places
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewSavedTrip(trip);
                            }}
                            className="flex-1 py-2 bg-primary/5 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest group-hover:bg-primary group-hover:text-white transition-all"
                          >
                            View Details
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setTripToShare(trip.id);
                            }}
                            className="p-2 bg-secondary/20 text-on-surface rounded-xl hover:bg-secondary transition-all"
                            title="Share to Activities"
                          >
                            <Share2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : count === 0 ? (
                /* Empty State */
                <div className="flex flex-col items-center justify-center text-center py-16 space-y-6">
                  <div className="w-24 h-24 rounded-[2rem] bg-secondary-container/50 flex items-center justify-center">
                    <span className="material-symbols-outlined text-5xl text-primary/40">
                      explore
                    </span>
                  </div>
                  <div className="space-y-2 max-w-xs">
                    <h2 className="text-xl font-black tracking-tight text-on-surface">
                      No places selected
                    </h2>
                    <p className="text-sm text-outline font-medium leading-relaxed">
                      Explore the Discovery map and click ❤️ to save places you want to visit.
                    </p>
                  </div>
                  <Link
                    href="/discovery"
                    className="bg-primary text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-sm">explore</span>
                    Explore Now
                  </Link>
                </div>
              ) : (
                /* Selected Places List */
                <>
                  <div className="flex items-center justify-between">
                    <label className="font-label text-[10px] font-black uppercase tracking-widest text-outline">
                      {count} selected places
                    </label>
                    <button
                      onClick={clearPlaces}
                      className="text-[10px] font-black text-outline/50 hover:text-red-500 uppercase tracking-widest transition-colors"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="space-y-3">
                    {places.map((place) => (
                      <div
                        key={place.id}
                        className="bg-surface-container-lowest border border-outline/5 p-3 rounded-2xl shadow-sm flex gap-3.5 items-center group hover:border-primary/20 hover:shadow-lg transition-all"
                      >
                        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
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
                          title="Remove"
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
              Configure & Generate Trip
            </button>
          </div>
        )}

        {itinerary && (
          <div className="p-6 bg-surface-container-low border-t border-outline/10 flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 py-4 bg-outline/10 text-on-surface rounded-2xl font-black hover:bg-outline/20 transition-all uppercase tracking-widest text-[10px]"
            >
              New Trip
            </button>
            <button
              onClick={() => setShowSaveModal(true)}
              className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">save</span>
              Save Trip
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
            <div className="bg-white/90 backdrop-blur-xl px-6 py-5 rounded-3xl shadow-2xl text-center space-y-2 max-w-[280px]">
              <span className="material-symbols-outlined text-4xl text-primary/30">map</span>
              <p className="text-sm font-black text-on-surface tracking-tight">
                Itinerary Map
              </p>
              <p className="text-[10px] font-bold text-outline uppercase tracking-widest">
                Selected points will appear here
              </p>
            </div>
          </div>
        )}
      </section>

      {/* ═══ CONFIG MODAL ═══ */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-300">
            <div className="space-y-0.5">
              <h2 className="text-xl font-black tracking-tight text-on-surface">
                Trip Configuration
              </h2>
              <p className="text-[10px] font-black text-outline uppercase tracking-widest">
                {count} selected places
              </p>
            </div>

            {/* Number of days */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-outline uppercase tracking-widest block">
                Number of days
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
                Start Date
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
                  Start Time
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
                  End Time
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
                  Lunch break from
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
                  to
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
                Visit duration per place:{' '}
                <span className="text-primary">{config.visitDuration} mins</span>
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
                <span>15 mins</span>
                <span>120 mins</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowConfigModal(false)}
                className="flex-1 py-3.5 bg-surface-container-high text-outline rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-outline/20 transition-all"
              >
                Cancel
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
                {isGenerating ? 'Optimizing...' : 'Generate Itinerary'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {isGenerating && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-3 animate-in zoom-in-95">
            <div className="w-10 h-10 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-sm font-black text-on-surface">
              Optimizing itinerary...
            </p>
            <p className="text-[10px] font-bold text-outline uppercase tracking-widest">
              Goong Distance Matrix API
            </p>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-black tracking-tight text-on-surface mb-2">
              Save Itinerary
            </h2>
            <p className="text-xs font-medium text-outline mb-5">
              Give this itinerary a name to find it easily later.
            </p>
            
            <div className="space-y-2 mb-6">
              <label className="text-[10px] font-black text-outline uppercase tracking-widest block">
                Itinerary Name
              </label>
              <input
                type="text"
                placeholder={`Trip Hanoi - ${config.travelDate}`}
                value={tripTitle}
                onChange={(e) => setTripTitle(e.target.value)}
                className="w-full px-4 py-3 bg-surface-container-low border border-outline/10 rounded-xl font-bold text-sm outline-none focus:border-primary/30 focus:ring-4 focus:ring-primary/5"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 py-3 bg-surface-container-high text-outline rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-outline/20 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTrip}
                disabled={isSaving}
                className="flex-1 py-3 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  'Save'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SHARE TRIP MODAL ═══ */}
      {tripToShare && (
        <CreateActivityDialog
          tripId={tripToShare}
          onClose={() => setTripToShare(null)}
          onCreated={() => {
            setTripToShare(null);
            show({
              type: 'success',
              title: 'Shared!',
              message: 'Your trip has been shared to Activities.',
            });
          }}
        />
      )}
    </div>
  );
}
