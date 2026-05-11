'use client';

import React, { useState, useEffect } from 'react';
import { ActivityReelCard } from '@/components/activities/ActivityReelCard';
import { ActivityMap } from '@/components/activities/ActivityMap';
import { ActivityDetailsModal } from '@/components/activities/ActivityDetailsModal';
import { CreateActivityDialog } from '@/components/activities/CreateActivityDialog';
import { ActivityChat } from '@/components/activities/ActivityChat';
import { getActivitiesAction, getMyActivitiesAction, getSessionAction } from '@/lib/actions';
import { useAuthStore } from '@/store/useAuthStore';

const CATEGORIES = [
  { id: 'all',      name: 'All',      icon: 'apps' },
  { id: 'culture',  name: 'Culture',  icon: 'theater_comedy' },
  { id: 'food',     name: 'Food',     icon: 'restaurant' },
  { id: 'history',  name: 'History',  icon: 'history_edu' },
  { id: 'nature',   name: 'Nature',   icon: 'forest' },
  { id: 'sport',    name: 'Sport',    icon: 'sports_soccer' },
  { id: 'shopping', name: 'Shopping', icon: 'shopping_bag' },
];

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [myActivities, setMyActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [viewMode, setViewMode] = useState<'reel' | 'map'>('reel');
  const [chatActivity, setChatActivity] = useState<any | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { setUser, setToken } = useAuthStore();

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

  const displayActivities = (activeTab === 'all' ? activities : myActivities).filter(a =>
    selectedCategory === 'all' || a.category === selectedCategory
  );

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
    <div className="flex flex-col h-[calc(100vh-80px)] w-full overflow-hidden bg-background">

      {/* ── Header ──────────────────────────────────────────────── */}
      <header className="px-5 py-4 bg-white/80 backdrop-blur-2xl border-b border-outline/5 flex flex-row gap-4 justify-between items-center z-20 shrink-0">
        <div className="flex items-center gap-4">
          {/* Title */}
          <div>
            <h1 className="text-xl font-bold tracking-tight text-on-surface leading-none">Activities</h1>
            <p className="text-primary text-[8px] font-bold uppercase tracking-[0.2em] mt-0.5">Hanoi Guild Network</p>
          </div>

          {/* Feed / Joined tabs */}
          <nav className="flex bg-secondary p-1 rounded-2xl border border-outline/5 shadow-inner">
            {(['all', 'my'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                  activeTab === tab ? 'bg-white text-primary shadow-sm' : 'text-on-surface/40 hover:text-on-surface'
                }`}
              >
                {tab === 'all' ? 'Feed' : 'Joined'}
              </button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {/* View switcher: Reel / Map */}
          <div className="flex bg-secondary p-1 rounded-2xl border border-outline/5 shadow-inner">
            <button
              onClick={() => setViewMode('reel')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                viewMode === 'reel' ? 'bg-white text-primary shadow-sm' : 'text-on-surface/40 hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-sm">dynamic_feed</span>
              Feed
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ${
                viewMode === 'map' ? 'bg-white text-primary shadow-sm' : 'text-on-surface/40 hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-sm">map</span>
              Map
            </button>
          </div>

          <div className="w-[1px] h-7 bg-outline/10" />

          {/* Create button */}
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:opacity-90 transition-all active:scale-95 shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Create
          </button>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 relative overflow-hidden flex flex-col">

        {/* Categories Bar */}
        <div className="px-4 py-3 border-b border-outline/5 flex gap-2 overflow-x-auto hide-scrollbar bg-white/60 backdrop-blur-md z-10 shrink-0">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all whitespace-nowrap border-2 ${
                selectedCategory === cat.id
                  ? 'bg-primary border-primary text-white shadow-md shadow-primary/20 scale-105'
                  : 'bg-white border-outline/5 text-on-surface/60 hover:border-primary/30 hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-sm">{cat.icon}</span>
              <span className="text-[9px] font-bold uppercase tracking-widest">{cat.name}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 relative overflow-hidden">

          {/* ── Reel Feed View ──────────────────────────────────── */}
          {viewMode === 'reel' && (
            <div className="h-full overflow-y-auto" id="reel-feed">
              {/* Centered narrow column — like IG/Facebook */}
              <div className="max-w-[600px] mx-auto pb-8">
                {loading ? (
                  /* Skeleton loaders */
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="mb-4 animate-pulse">
                      <div className="flex items-center gap-3 px-4 py-4">
                        <div className="w-10 h-10 rounded-full bg-secondary/60" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 bg-secondary/60 rounded-full w-1/3" />
                          <div className="h-2.5 bg-secondary/40 rounded-full w-1/4" />
                        </div>
                      </div>
                      <div className="h-64 bg-secondary/40" />
                      <div className="px-4 py-3 space-y-2">
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
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-32 text-center px-8">
                    <div className="w-20 h-20 rounded-3xl bg-secondary flex items-center justify-center mb-6 shadow-inner">
                      <span className="material-symbols-outlined text-4xl text-outline/60">explore_off</span>
                    </div>
                    <h3 className="font-bold text-xl text-on-surface mb-2">No active groups</h3>
                    <p className="text-on-surface-variant text-sm font-medium max-w-xs mx-auto leading-relaxed">
                      {activeTab === 'all'
                        ? 'Be the first to spark a new adventure in this category!'
                        : 'Your adventure log is empty. Join some groups to get started.'}
                    </p>
                    <button
                      onClick={() => setShowCreate(true)}
                      className="mt-8 px-8 py-3 bg-primary text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20"
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
            <div className="h-full relative animate-in fade-in zoom-in-95 duration-500">
              <ActivityMap
                activities={displayActivities}
                onSelectActivity={setSelectedActivity}
                userLocation={userLocation}
              />

              {/* Map Floating Controls */}
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-xl px-5 py-3 rounded-3xl shadow-2xl border border-outline/5 flex items-center gap-6 z-20">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">Active Groups</span>
                  <span className="text-lg font-bold text-on-surface">{displayActivities.length}</span>
                </div>
                <div className="w-[1px] h-8 bg-outline/10" />
                <button
                  onClick={() => setUserLocation(userLocation)}
                  className="w-12 h-12 bg-primary text-white rounded-2xl shadow-xl shadow-primary/5 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined">my_location</span>
                </button>
              </div>

              {selectedActivity && (
                <div className="absolute top-6 left-6 w-72 bg-white/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-outline/5 p-5 z-20 animate-in slide-in-from-left duration-500">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-on-surface leading-tight">{selectedActivity.title}</h3>
                    <button onClick={() => setSelectedActivity(null)} className="text-on-surface-variant hover:text-primary ml-2">
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  </div>
                  <p className="text-on-surface-variant text-xs mb-5 line-clamp-3 leading-relaxed">
                    {selectedActivity.description}
                  </p>
                  <button
                    onClick={() => setSelectedActivity(selectedActivity)}
                    className="w-full py-3 bg-on-surface text-white text-[10px] font-bold uppercase tracking-widest rounded-2xl hover:bg-primary transition-all"
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
    </div>
  );
}
