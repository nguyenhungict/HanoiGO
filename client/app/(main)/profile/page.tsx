'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getProfileAction, getMyActivitiesAction } from '@/lib/actions';
import { useTripStore, type Landmark } from '@/store/useTripStore';
import { useAuthStore } from '@/store/useAuthStore';

interface SavedTrip {
  id: string;
  title: string;
  description?: string;
  numDays: number;
  travelDate?: string;
  createdAt: string;
  itinerary?: any;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8888';

function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${BACKEND_URL}${cleanUrl}`;
}

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('trips');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  // Real data state
  const [savedTrips, setSavedTrips] = useState<SavedTrip[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [fetchingTrips, setFetchingTrips] = useState(false);
  const [fetchingActivities, setFetchingActivities] = useState(false);

  // Zustand stores
  const selectedPlaces = useTripStore((s) => s.selectedPlaces);
  const removePlace = useTripStore((s) => s.removePlace);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    async function loadProfile() {
      const res = await getProfileAction();
      if (res.success) {
        setUser(res.data);
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  useEffect(() => {
    if (!token) return;

    async function loadTrips() {
      setFetchingTrips(true);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_ACTIONS_URL}/trips/my-trips`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSavedTrips(data);
        }
      } catch (e) {
        console.error('Error loading trips:', e);
      } finally {
        setFetchingTrips(false);
      }
    }

    async function loadActivities() {
      setFetchingActivities(true);
      const res = await getMyActivitiesAction();
      if (res.success && res.data) {
        setActivities(res.data);
      }
      setFetchingActivities(false);
    }

    loadTrips();
    loadActivities();
  }, [token]);

  const stats = [
    { label: 'Trips', value: String(savedTrips.length), icon: 'map' },
    { label: 'Places', value: String(Object.keys(selectedPlaces).length), icon: 'account_balance' },
    { label: 'Activities', value: String(activities.length), icon: 'groups' },
    { label: 'Languages', value: String(user?.languages?.length || 0), icon: 'translate' }
  ];

  if (loading) {
    return (
      <div className="h-[70vh] w-full flex items-center justify-center bg-surface-container-lowest">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Format date helper
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full bg-surface-container-lowest animate-in fade-in duration-1000">
      {/* Hero Header Section */}
      <div className="relative h-80 w-full overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1509030450996-93f25ef2030f?w=1600&q=80"
          className="w-full h-full object-cover brightness-75 scale-105"
          alt="Hanoi Cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-black/20" />
      </div>

      <div className="max-w-6xl mx-auto px-8 -mt-24 relative z-10 pb-20">
        <div className="flex flex-col lg:flex-row gap-10">

          {/* Left Column: User Card */}
          <aside className="w-full lg:w-1/3 space-y-6">
            <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl shadow-rose-900/10 border border-outline-variant/10 relative">
              <div className="absolute -top-16 left-1/2 -translate-x-1/2">
                <div className="w-32 h-32 rounded-full border-[6px] border-white bg-surface-container-high overflow-hidden shadow-xl ring-4 ring-primary/5 capitalize flex items-center justify-center">
                  {user?.avatarUrl ? (
                    <img 
                      src={resolveImageUrl(user.avatarUrl) || ''} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-primary flex items-center justify-center text-white text-4xl font-black">
                      {user?.username?.charAt(0) || 'H'}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-16 text-center space-y-4">
                <div className="space-y-1">
                  <h1 className="text-3xl font-black tracking-tighter text-on-surface leading-none decoration-primary/30">
                    {user?.fullName || user?.username || 'Traveler'}
                  </h1>
                  <p className="text-xs text-outline font-medium tracking-widest uppercase">@{user?.username}</p>
                </div>
                <p className="text-sm text-outline font-medium leading-relaxed italic border-t border-outline/5 pt-4">
                  "{user?.bio || 'No bio yet. Edit your profile to tell explorers about your journey!'}"
                </p>

                <div className="flex flex-col gap-3 py-4 border-y border-outline/5 text-left">
                  <div className="flex items-center gap-3 text-on-surface">
                    <span className="material-symbols-outlined text-primary text-xl">flag</span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-outline">Country</p>
                      <p className="text-xs font-bold text-on-surface">{user?.nationality || 'Global Citizen'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-on-surface">
                    <span className="material-symbols-outlined text-primary text-xl">translate</span>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-outline">Languages</p>
                      <p className="text-xs font-bold text-on-surface">{user?.languages?.join(', ') || 'Various'}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3 pt-4">
                  <Link href="/profile/edit" className="flex-1 bg-primary text-white py-3.5 rounded-2xl text-[10px] font-black uppercase text-center tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
                    Edit Profile
                  </Link>
                  <Link href="/discovery" className="w-12 h-12 flex items-center justify-center bg-surface-container-high text-on-surface rounded-2xl hover:bg-primary/5 transition-all">
                    <span className="material-symbols-outlined">explore</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              {stats.map(s => (
                <div key={s.label} className="bg-white/80 backdrop-blur-xl p-6 rounded-3xl border border-outline-variant/10 shadow-sm flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">{s.icon}</span>
                  <p className="text-xl font-black tracking-tighter text-on-surface">{s.value}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-outline">{s.label}</p>
                </div>
              ))}
            </div>
          </aside>

          {/* Right Column: Content Feed */}
          <main className="flex-1 space-y-8">
            {/* Tab Navigation */}
            <div className="bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant/10 flex items-center gap-1 w-fit">
              {['trips', 'saved', 'activities'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-outline hover:text-on-surface'
                    }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Tab Content Rendering */}
            <div className="space-y-6">
              {activeTab === 'trips' && (
                <>
                  {fetchingTrips ? (
                    <div className="py-20 flex justify-center">
                      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : savedTrips.length === 0 ? (
                    <div className="w-full bg-white rounded-3xl border border-outline-variant/10 p-12 text-center space-y-4 animate-in fade-in duration-500">
                      <span className="material-symbols-outlined text-5xl text-outline-variant">map</span>
                      <h3 className="text-lg font-black text-on-surface">No journeys generated yet</h3>
                      <p className="text-xs text-outline font-medium max-w-sm mx-auto leading-relaxed">
                        Use our procedural AI trip planner to craft your first custom Hanoi experience.
                      </p>
                      <Link href="/trips" className="inline-block px-6 py-2.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
                        Create Itinerary
                      </Link>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                      {savedTrips.map(trip => (
                        <div key={trip.id} className="group bg-white rounded-3xl border border-outline-variant/10 overflow-hidden hover:shadow-2xl transition-all duration-500 flex flex-col h-full">
                          <div className="h-44 overflow-hidden relative shrink-0">
                            <img 
                              src="https://images.unsplash.com/photo-1509030450996-93f25ef2030f?w=800&q=80" 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                              alt="Trip" 
                            />
                            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg text-primary text-[10px] font-black uppercase">
                              {trip.numDays} {trip.numDays === 1 ? 'Day' : 'Days'}
                            </div>
                          </div>
                          <div className="p-6 space-y-3 flex-1 flex flex-col justify-between">
                            <div className="space-y-2">
                              <h3 className="text-lg font-black tracking-tighter text-on-surface line-clamp-1">{trip.title}</h3>
                              <p className="text-xs text-outline font-medium line-clamp-2">
                                {trip.description || 'Hành trình di sản tùy biến khám phá các dấu ấn lịch sử, văn hóa ngàn năm của thủ đô Hà Nội.'}
                              </p>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-outline/5 mt-auto">
                              <span className="text-[10px] font-bold text-on-surface-variant flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">schedule</span> {formatDate(trip.travelDate || trip.createdAt)}
                              </span>
                              <Link href="/trips" className="text-[10px] font-black text-primary uppercase underline hover:text-primary-dark">
                                Open Planner
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'saved' && (
                <>
                  {Object.keys(selectedPlaces).length === 0 ? (
                    <div className="bg-surface-container p-20 rounded-[3rem] text-center space-y-4 animate-in zoom-in duration-500">
                      <span className="material-symbols-outlined text-6xl text-outline-variant">favorite</span>
                      <p className="text-on-surface font-black tracking-tight text-xl">No saved heritage yet</p>
                      <p className="text-sm text-outline font-medium max-w-xs mx-auto">
                        Explore the interactive discovery map and bookmark your favorite landmarks to build your bucket list.
                      </p>
                      <Link href="/discovery" className="inline-block px-8 py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
                        Start Discovering
                      </Link>
                    </div>
                  ) : (
                    <div className="grid sm:grid-cols-2 gap-6 animate-in fade-in duration-500">
                      {Object.values(selectedPlaces).map((place: Landmark) => (
                        <div key={place.id} className="group bg-white rounded-3xl border border-outline-variant/10 overflow-hidden hover:shadow-2xl transition-all duration-500 flex flex-col h-full">
                          <div className="h-44 overflow-hidden relative shrink-0">
                            <img 
                              src={place.image || 'https://images.unsplash.com/photo-1509030450996-93f25ef2030f?w=800&q=80'} 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" 
                              alt={place.name} 
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1509030450996-93f25ef2030f?w=800&q=80';
                              }}
                            />
                            <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg text-primary text-[10px] font-black uppercase">
                              {place.category}
                            </div>
                            <button 
                              onClick={() => removePlace(place.id)}
                              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-rose-500 hover:bg-rose-50 hover:scale-105 active:scale-95 transition-all shadow-md"
                              title="Bỏ lưu di sản"
                            >
                              <span className="material-symbols-outlined text-xl fill-1">delete</span>
                            </button>
                          </div>
                          <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                            <div className="space-y-2">
                              <h3 className="text-lg font-black tracking-tighter text-on-surface line-clamp-1">{place.name}</h3>
                              <p className="text-xs text-outline font-medium line-clamp-3 leading-relaxed">
                                {place.description || 'Khám phá câu chuyện lịch sử ngàn năm của di sản tuyệt đẹp này nằm trong lòng thủ đô Hà Nội cổ kính.'}
                              </p>
                            </div>
                            <div className="flex items-center justify-between pt-4 border-t border-outline/5 mt-auto">
                              <span className="text-[10px] font-bold text-on-surface-variant flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm text-yellow-500 fill-1">star</span> {place.rating || 5.0} Rating
                              </span>
                              <Link href="/trips" className="text-[10px] font-black text-primary uppercase underline hover:text-primary-dark">
                                Plan Trip
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'activities' && (
                <>
                  {fetchingActivities ? (
                    <div className="py-20 flex justify-center">
                      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="w-full bg-white rounded-3xl border border-outline-variant/10 p-12 text-center space-y-4 animate-in fade-in duration-500">
                      <span className="material-symbols-outlined text-5xl text-outline-variant">groups</span>
                      <h3 className="text-lg font-black text-on-surface">No activities joined yet</h3>
                      <p className="text-xs text-outline font-medium max-w-sm mx-auto leading-relaxed">
                        Explore community group walks, historical meetups, and chatrooms around Hanoi di sản sites.
                      </p>
                      <Link href="/activities" className="inline-block px-6 py-2.5 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
                        Find Activities
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {activities.map(act => (
                        <div key={act.id} className="bg-white rounded-3xl border border-outline-variant/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 hover:shadow-xl transition-all duration-300 animate-in slide-in-from-right-8 duration-700">
                          <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex flex-col items-center justify-center text-primary shrink-0">
                              <span className="material-symbols-outlined text-3xl">chat_bubble</span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase tracking-wider text-primary bg-primary/5 px-2 py-0.5 rounded-md">
                                  {act.category || 'Culture'}
                                </span>
                                <span className="text-[10px] font-bold text-outline">
                                  {act.memberCount || 1} members
                                </span>
                              </div>
                              <h4 className="text-on-surface font-black text-lg leading-snug">{act.title}</h4>
                              <p className="text-xs text-outline font-medium line-clamp-1 flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">schedule</span> {formatDate(act.scheduledAt)} • {act.address || 'Hà Nội'}
                              </p>
                            </div>
                          </div>
                          <Link href="/activities" className="w-full sm:w-auto text-center px-6 py-3 bg-surface-container-high rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white hover:shadow-lg hover:shadow-primary/10 transition-all shrink-0">
                            View Chat
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
