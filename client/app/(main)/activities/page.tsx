'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ActivityReelCard } from '@/components/activities/ActivityReelCard';
import { ActivityMap } from '@/components/activities/ActivityMap';
import { ActivityDetailsModal } from '@/components/activities/ActivityDetailsModal';
import { CreateActivityDialog } from '@/components/activities/CreateActivityDialog';
import { ActivityChat } from '@/components/activities/ActivityChat';
import { 
  getActivitiesAction, 
  getMyActivitiesAction, 
  getSessionAction,
  getActivityDetailsAction 
} from '@/lib/actions';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatNotificationStore } from '@/store/useChatNotificationStore';

const CATEGORIES = [
  { id: 'all',                name: 'All',                icon: 'apps' },
  { id: 'Nature & Outdoors',   name: 'Nature',             icon: 'forest' },
  { id: 'Arts & Culture',      name: 'Culture',            icon: 'theater_comedy' },
  { id: 'Heritage & History',  name: 'History',            icon: 'history_edu' },
  { id: 'Spiritual',           name: 'Spiritual',          icon: 'temple_buddhist' },
  { id: 'Eat & Shop',          name: 'Food & Shop',        icon: 'restaurant' },
  { id: 'Sightseeing',         name: 'Sightseeing',        icon: 'photo_camera' },
];

import { Activity } from '@/types';

export default function ActivitiesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activityIdParam = searchParams.get('activityId');
  const chatParam = searchParams.get('chat');

  const [activities, setActivities] = useState<Activity[]>([]);
  const [myActivities, setMyActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDeepLink, setLoadingDeepLink] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [activeTab, setActiveTab] = useState<'groups' | 'trips' | 'my'>('groups');
  const [viewMode, setViewMode] = useState<'reel' | 'map'>('reel');
  const [chatActivity, setChatActivity] = useState<Activity | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { setUser, setToken } = useAuthStore();
  const totalUnreadCount = useChatNotificationStore((s) =>
    Object.values(s.unreadCounts).reduce((sum, count) => sum + count, 0)
  );
  const setActiveChatId = useChatNotificationStore((s) => s.setActiveChatId);

  // Handle deep-linking from notifications
  useEffect(() => {
    if (activityIdParam) {
      const loadActivity = async () => {
        setLoadingDeepLink(true);
        const res = await getActivityDetailsAction(activityIdParam);
        setLoadingDeepLink(false);
        if (res.success && res.data) {
          if (chatParam === 'true') {
            setChatActivity(res.data);
          } else {
            setSelectedActivity(res.data);
          }
          // Clean up query params from URL so browser refresh works nicely
          const newParams = new URLSearchParams(searchParams.toString());
          newParams.delete('activityId');
          newParams.delete('chat');
          const cleanUrl = newParams.toString() ? `/activities?${newParams.toString()}` : '/activities';
          router.replace(cleanUrl);
        }
      };
      void loadActivity();
    }
  }, [activityIdParam, chatParam, router, searchParams]);

  useEffect(() => {
    if (chatActivity) {
      setActiveChatId(chatActivity.id);
    } else {
      setActiveChatId(null);
    }
    return () => {
      setActiveChatId(null);
    };
  }, [chatActivity, setActiveChatId]);

  const fetchActivities = async () => {
    setLoading(true);
    const result = await getActivitiesAction();
    if (result.success) setActivities(result.data ?? []);
    setLoading(false);
  };

  const fetchMyActivities = async () => {
    const result = await getMyActivitiesAction();
    if (result.success) setMyActivities(result.data ?? []);
  };

  const refreshAll = async () => {
    setLoading(true);
    await Promise.all([fetchActivities(), fetchMyActivities()]);
    setLoading(false);
  };

  useEffect(() => {
    getSessionAction().then(session => {
      if (session) { setUser(session.user); setToken(session.token); }
      else { setUser(null); setToken(null); }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    refreshAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        err => console.warn('Geolocation error:', err),
      );
    }
  }, []);

  const displayActivities = (activeTab === 'my' ? myActivities : activities).filter(a => {
    if (selectedCategory !== 'all' && a.category !== selectedCategory) return false;
    if (activeTab === 'groups') return !a.tripId;
    if (activeTab === 'trips') return !!a.tripId;
    return true;
  });

  // ── Full-screen Chat ─────────────────────────────────────────────
  if (chatActivity) {
    return (
      <div className="fixed inset-0 z-[100] bg-white animate-in slide-in-from-right duration-500">
        <ActivityChat
          activityId={chatActivity.id}
          activityTitle={chatActivity.title}
          onClose={() => setChatActivity(null)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] w-full overflow-hidden bg-background relative pt-[53px]">
      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="fixed top-20 left-0 right-0 px-5 py-2 bg-white/90 backdrop-blur-xl border-b border-outline/10 flex flex-row gap-3 justify-between items-center z-40">
        <div className="flex items-center gap-4">
          {/* Title */}
          <div>
            <h1 className="text-lg font-extrabold text-on-surface leading-none">Activities</h1>
          </div>

          {/* Feed / Joined tabs */}
          <nav className="flex bg-secondary-container p-0.5 rounded-lg border border-outline/10">
            {(['groups', 'trips', 'my'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${
                  activeTab === tab 
                    ? 'bg-white text-primary shadow-sm' 
                    : 'text-on-surface/50 hover:text-on-surface hover:bg-white/30'
                }`}
              >
                <span>{tab === 'groups' ? 'Groups' : tab === 'trips' ? 'Shared Trips' : 'Joined'}</span>
                {tab === 'my' && totalUnreadCount > 0 && (
                  <span className="bg-primary text-white px-1.5 py-0.5 rounded-full text-[8px] font-bold inline-flex items-center justify-center min-w-[16px] h-4 leading-none">
                    {totalUnreadCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {/* Categories Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-3 py-2 bg-secondary-container rounded-lg text-[9px] font-black uppercase tracking-widest text-on-surface hover:bg-secondary transition-all border border-outline/10">
              <span className="material-symbols-outlined text-sm">
                {CATEGORIES.find(c => c.id === selectedCategory)?.icon || 'category'}
              </span>
              <span>{CATEGORIES.find(c => c.id === selectedCategory)?.name || 'All Categories'}</span>
              <span className="material-symbols-outlined text-sm">expand_more</span>
            </button>
            {/* Dropdown Menu */}
            <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-outline/10 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 flex flex-col p-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-colors w-full text-left ${
                    selectedCategory === cat.id
                      ? 'bg-primary text-white'
                      : 'text-on-surface hover:bg-secondary-container hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">{cat.icon}</span>
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="w-[1px] h-6 bg-outline/10" />

          {/* View switcher: Reel / Map */}
          <div className="flex bg-secondary-container p-0.5 rounded-lg border border-outline/10">
            <button
              onClick={() => setViewMode('reel')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${
                viewMode === 'reel' 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-on-surface/50 hover:text-on-surface hover:bg-white/30'
              }`}
            >
              <span className="material-symbols-outlined text-sm">dynamic_feed</span>
              Feed
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${
                viewMode === 'map' 
                  ? 'bg-white text-primary shadow-sm' 
                  : 'text-on-surface/50 hover:text-on-surface hover:bg-white/30'
              }`}
            >
              <span className="material-symbols-outlined text-sm">map</span>
              Map
            </button>
          </div>

          <div className="w-[1px] h-6 bg-outline/10" />

          {/* Create button */}
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest hover:bg-primary-container transition-all active:scale-95 shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Create
          </button>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 min-h-0 relative overflow-hidden flex flex-col">
        <div className="flex-1 relative overflow-hidden">

          {/* ── Reel Feed View ──────────────────────────────────── */}
          {viewMode === 'reel' && (
            <div className="h-full overflow-y-auto" id="reel-feed">
              <div className="max-w-[600px] mx-auto pb-12 pt-5 px-4">
                {loading ? (
                  /* Skeleton loaders */
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="mb-5 bg-white border border-[#e8e3dd] rounded-xl overflow-hidden animate-pulse">
                      <div className="flex items-center gap-3 px-6 py-4 bg-secondary-container/10">
                        <div className="w-10 h-10 rounded-lg bg-secondary/60" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-secondary/60 rounded-full w-1/3" />
                          <div className="h-2.5 bg-secondary/40 rounded-full w-1/4" />
                        </div>
                      </div>
                      <div className="h-64 bg-secondary/20" />
                      <div className="px-6 py-5 space-y-3">
                        <div className="h-3 bg-secondary/50 rounded-full w-3/4" />
                        <div className="h-2.5 bg-secondary/30 rounded-full w-1/2" />
                      </div>
                    </div>
                  ))
                ) : displayActivities.length > 0 ? (
                  displayActivities.map(activity => (
                    <ActivityReelCard
                      key={activity.id}
                      activity={activity}
                      onClick={setSelectedActivity}
                      onChat={setChatActivity}
                      onCancelSuccess={refreshAll}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-28 text-center px-8 bg-white border border-outline/10 rounded-xl mt-4">
                    <div className="w-16 h-16 rounded-xl bg-secondary-container flex items-center justify-center mb-5 border border-outline/10">
                      <span className="material-symbols-outlined text-4xl text-outline/60">explore_off</span>
                    </div>
                    <h3 className="font-extrabold text-xl text-on-surface mb-2">No active groups</h3>
                    <p className="text-on-surface-variant text-sm font-medium max-w-xs mx-auto leading-relaxed">
                      {selectedCategory === 'all'
                        ? 'Create the first activity for the community.'
                        : 'No activity matches this category yet.'}
                    </p>
                    <button
                      onClick={() => setShowCreate(true)}
                      className="mt-8 px-8 py-3.5 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-primary-container active:scale-95 transition-all shadow-sm"
                    >
                      Start an Activity
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Map View ────────────────────────────────────────── */}
          {viewMode === 'map' && (
            <div className="h-full relative animate-in fade-in duration-300">
              <ActivityMap
                activities={displayActivities}
                onSelectActivity={setSelectedActivity}
                userLocation={userLocation}
              />

              {/* Map Floating Controls */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-xl px-5 py-3 rounded-xl shadow-lg border border-outline/10 flex items-center gap-5 z-20">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest">Active Groups</span>
                  <span className="text-lg font-extrabold text-on-surface">{displayActivities.length}</span>
                </div>
                <div className="w-[1px] h-8 bg-outline/10" />
                <button
                  onClick={() => setUserLocation(userLocation)}
                  className="w-10 h-10 bg-primary text-white rounded-lg shadow-sm flex items-center justify-center hover:bg-primary-container active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined">my_location</span>
                </button>
              </div>

              {selectedActivity && (
                <div className="absolute top-6 left-6 w-72 bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-outline/10 p-5 z-20 animate-in slide-in-from-left duration-300">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-extrabold text-lg text-on-surface leading-tight">{selectedActivity.title}</h3>
                    <button onClick={() => setSelectedActivity(null)} className="text-on-surface-variant hover:text-primary ml-2 transition-colors">
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                  <p className="text-on-surface-variant text-xs mb-5 line-clamp-3 leading-relaxed">
                    {selectedActivity.description}
                  </p>
                  <button
                    onClick={() => setSelectedActivity(selectedActivity)}
                    className="w-full py-3 bg-[#261817] text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary transition-all shadow-md shadow-on-surface/10"
                  >
                    View Details
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Modals ──────────────────────────────────────────────── */}
      {selectedActivity && (
        <ActivityDetailsModal
          activity={selectedActivity}
          onClose={() => setSelectedActivity(null)}
          onChat={setChatActivity}
          onJoined={async () => {
            await refreshAll();
            setSelectedActivity(null);
            setActiveTab('my');
          }}
        />
      )}

      {showCreate && (
        <CreateActivityDialog
          onClose={() => setShowCreate(false)}
          onCreated={async () => {
            setShowCreate(false);
            await refreshAll();
            setActiveTab('my');
          }}
        />
      )}

      {/* ── Deep Link Loading Overlay ───────────────────────────── */}
      {loadingDeepLink && (
        <div className="fixed inset-0 z-[150] bg-white/60 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
          <div className="w-14 h-14 rounded-2xl bg-[#FCF8F2] border border-outline/10 flex items-center justify-center mb-4 shadow-lg shadow-on-surface/5 animate-pulse">
            <span className="material-symbols-outlined text-primary text-2xl animate-spin">
              progress_activity
            </span>
          </div>
          <p className="text-[10px] font-black text-on-surface uppercase tracking-[0.2em] animate-pulse">
            Loading Activity...
          </p>
        </div>
      )}
    </div>
  );
}
