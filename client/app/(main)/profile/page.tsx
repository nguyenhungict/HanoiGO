'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getProfileAction } from '@/lib/actions';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('trips');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

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

  const stats = [
    { label: 'Trips', value: '12', icon: 'map' },
    { label: 'Places', value: '48', icon: 'account_balance' },
    { label: 'Reviews', value: '5', icon: 'rate_review' },
    { label: 'Community', value: '1.2k', icon: 'groups' }
  ];

  if (loading) {
    return (
      <div className="h-[70vh] w-full flex items-center justify-center bg-surface-container-lowest">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full bg-surface-container-lowest animate-in fade-in duration-1000">
      {/* Hero Header Section */}
      <div className="relative h-80 w-full overflow-hidden">
        <img
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCDuj667b1KGLZvDyMCtmJfR_aCBOzrI4DWc7-8Pt_PrnjTxTTjJugC9QQmeQiRVoxebycJnQjg6Qujr7g3Cj-_n0onIvKmJlZ756UgehWB2UwVf1dfl-CEsVmsbMKEwZm4itFyEEQ7h9RZsMsNfw_YaKkObXD_i_mQViE7XXHK0FtdMEZPBD_9BTbHye6XAXKnEg5kBulYfAf11kZphBOZ03hEAQ63YGuAuFSBh0yg12wPCn4yeLjMyRiYUxkUgQAProsWDp98qHSI"
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
                <div className="w-32 h-32 rounded-full border-[6px] border-white bg-surface-container-high overflow-hidden shadow-xl ring-4 ring-primary/5 capitalize">
                  <div className="w-full h-full bg-primary flex items-center justify-center text-white text-4xl font-black">
                    {user?.username?.charAt(0) || 'H'}
                  </div>
                </div>
              </div>

              <div className="pt-16 text-center space-y-4">
                <div className="space-y-1">
                  <h1 className="text-3xl font-black tracking-tighter text-on-surface leading-none decoration-primary/30">
                    {user?.fullName || user?.username || 'Traveler'}
                  </h1>
                  <p className="text-xs text-outline font-medium tracking-widest uppercase">@{user?.username}</p>
                </div>
                <p className="text-sm text-outline font-medium leading-relaxed italic">
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
                  <button className="w-12 h-12 flex items-center justify-center bg-surface-container-high text-on-surface rounded-2xl hover:bg-primary/5 transition-all">
                    <span className="material-symbols-outlined">settings</span>
                  </button>
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
                <div className="grid sm:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  {/* Trip Card 1 */}
                  <div className="group bg-white rounded-3xl border border-outline-variant/10 overflow-hidden hover:shadow-2xl transition-all duration-500">
                    <div className="h-44 overflow-hidden relative">
                      <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAVc2wfEhkM85eOwrrcrrrRp_RxYZ9y0ePi-_OqRhsueNfuqqe9jTXGu4rGYfr-6hQa3fTwiN39LF5KsUQfLiJX_V7eq-UE6xgcekNTBfV-dnZsuw-3cvWQPFyIDFtruFoSRT-Tmkow1VoK1CJOF_5UGHWuPTILg9ZnMxsHT_8qXHBSdAsZ7PpevwCGUDbpfUwZbgq0BtCmnZr7sos87wNeiIu3zRV_Q7eNE4Vn_mtsUSg2nYgF4Jcj1enK6MwZ6kw2BTkX9OFERFui" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Trip" />
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg text-primary text-[10px] font-black uppercase">3 Days</div>
                    </div>
                    <div className="p-6 space-y-3">
                      <h3 className="text-lg font-black tracking-tighter text-on-surface">The Indochine Muse Expedition</h3>
                      <p className="text-xs text-outline font-medium line-clamp-2">Exploring the French colonial architecture and hidden coffee gems of Hanoi...</p>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[10px] font-bold text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">schedule</span> Oct 12, 2024
                        </span>
                        <button className="text-[10px] font-black text-primary uppercase underline">Details</button>
                      </div>
                    </div>
                  </div>

                  {/* Trip Card 2 */}
                  <div className="group bg-white rounded-3xl border border-outline-variant/10 overflow-hidden hover:shadow-2xl transition-all duration-500">
                    <div className="h-44 overflow-hidden relative">
                      <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAiDDwvxWuAAOyzPIxfAVgQO4Q9RoNJfGDgEnckkfjpYlZFLujiudmfOI5j2qp3GMldpShSE4_hi_o8obKKh63VzYuPZlgD3SDPlvOjisWY6U7K0gpGl1JPU_wTKhaiLUirtpvAXLJYvCd0rAdKgsbaFbG4O2vS-W0GfFTGXEZVr6v8rR4nb0dObCEODrVB-0d3TuIPY8CSpCNVmzw_h-5lbP-WuIExhGpJvv3G33EfwSOsT53kk6vzgrgQuYtk13FFMms9c-Q6v7Ra" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Trip" />
                      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg text-primary text-[10px] font-black uppercase">Weekend</div>
                    </div>
                    <div className="p-6 space-y-3">
                      <h3 className="text-lg font-black tracking-tighter text-on-surface">Autumn in Sword Lake</h3>
                      <p className="text-xs text-outline font-medium line-clamp-2">A peaceful weekend soaking in the golden leaves and traditional tea ceremonies.</p>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[10px] font-bold text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">schedule</span> Sept 05, 2024
                        </span>
                        <button className="text-[10px] font-black text-primary uppercase underline">Details</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'saved' && (
                <div className="bg-surface-container p-20 rounded-[3rem] text-center space-y-4 animate-in zoom-in duration-500">
                  <span className="material-symbols-outlined text-6xl text-outline-variant">favorite</span>
                  <p className="text-on-surface font-black tracking-tight text-xl">No saved heritage yet</p>
                  <p className="text-sm text-outline font-medium">Explore the map and save your favorite places to build your bucket list.</p>
                  <Link href="/discovery" className="inline-block px-8 py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:opacity-90">Start Discovering</Link>
                </div>
              )}

              {activeTab === 'activities' && (
                <div className="bg-white rounded-3xl border border-outline-variant/10 p-8 flex items-center gap-6 animate-in slide-in-from-right-8 duration-700">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-3xl">chat_bubble</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-on-surface font-black text-lg">Hanoi Heritage Walk 2024</h4>
                    <p className="text-xs text-outline font-medium">You joined this group activity with 14 other travelers.</p>
                  </div>
                  <button className="px-6 py-2.5 bg-surface-container-high rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all">View Chat</button>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
