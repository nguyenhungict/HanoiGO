'use client';

import React from 'react';

export default function AdminDashboard() {
  const stats = [
    { label: 'Total Users', value: '1,284', trend: '+12%', icon: 'group', color: 'bg-blue-500' },
    { label: 'Heritage Sites', value: '156', trend: '+3', icon: 'account_balance', color: 'bg-primary' },
    { label: 'Active Trips', value: '432', trend: '+28%', icon: 'explore', color: 'bg-green-500' },
    { label: 'Reports', value: '12', trend: '-50%', icon: 'warning', color: 'bg-amber-500' },
  ];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 py-4">
        <div>
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2 block">Enterprise Metrics</span>
          <h1 className="text-5xl font-black tracking-tighter text-on-surface leading-none">Command Center</h1>
        </div>
        <div className="flex gap-4">
          <button className="h-14 px-8 bg-white border border-outline/10 rounded-[1.25rem] text-[11px] font-black uppercase tracking-widest text-outline hover:text-primary hover:border-primary/20 hover:shadow-xl transition-all flex items-center gap-3 active:scale-95 tonal-shift">
            <span className="material-symbols-outlined text-lg">download</span>
            Generate Report
          </button>
          <button className="h-14 px-8 bg-primary text-white rounded-[1.25rem] text-[11px] font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:opacity-90 transition-all flex items-center gap-3 active:scale-95 tonal-shift">
            <span className="material-symbols-outlined text-lg">add_circle</span>
            Add Heritage
          </button>
        </div>
      </div>

      {/* Stats Grid - Bento Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-10 rounded-[2.5rem] border border-outline/5 shadow-[0_8px_30px_rgb(0,0,0,0.02)] hover:shadow-2xl hover:shadow-black/5 hover:scale-[1.01] transition-all duration-500 group cursor-pointer relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors" />
            
            <div className="flex items-center justify-between mb-8 relative z-10">
              <div className={`w-14 h-14 ${stat.color} rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-current/20 group-hover:rotate-12 transition-transform duration-500`}>
                <span className="material-symbols-outlined text-2xl fill-0">{stat.icon}</span>
              </div>
              <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] font-black ${stat.trend.startsWith('+') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                <span className="material-symbols-outlined text-sm leading-none">{stat.trend.startsWith('+') ? 'trending_up' : 'trending_down'}</span>
                {stat.trend}
              </div>
            </div>
            
            <div className="relative z-10">
              <p className="text-[11px] font-black text-outline uppercase tracking-[0.2em] mb-2 scale-y-95 opacity-70">{stat.label}</p>
              <h3 className="text-4xl font-black tracking-tighter text-on-surface">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Recent Traffic / User Activity (Bento Large) */}
        <div className="lg:col-span-8 bg-white rounded-[3rem] border border-outline/5 p-12 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h3 className="text-2xl font-black tracking-tighter text-on-surface">Recent Authority Log</h3>
              <p className="text-[10px] font-black text-outline uppercase tracking-[0.15em] mt-1">Global User Access Flow</p>
            </div>
            <button className="h-10 px-5 bg-surface-container rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all">Details</button>
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center justify-between p-5 rounded-[1.5rem] hover:bg-background transition-all border border-transparent hover:border-outline/5 group cursor-pointer">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/30 flex items-center justify-center text-primary font-black text-sm group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                    {String.fromCharCode(64 + i)}
                  </div>
                  <div>
                    <h4 className="text-[13px] font-black text-on-surface uppercase tracking-tight">Access Node_{i}52</h4>
                    <p className="text-[10px] text-outline font-black uppercase tracking-widest opacity-60">Session Auth: Success • 2m ago</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-[10px] font-black text-on-surface mb-1">Hanoi, VN</span>
                    <span className="text-[9px] font-black text-outline uppercase tracking-tighter">192.168.1.{i}</span>
                  </div>
                  <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">chevron_right</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Monitor (Bento Side) */}
        <div className="lg:col-span-4 space-y-8">
            <div className="bg-white rounded-[3rem] border border-outline/5 p-10 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
              <h3 className="text-xl font-black tracking-tighter text-on-surface mb-10">Real-time Load</h3>
              
              <div className="space-y-10">
                <div className="space-y-4">
                   <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-outline">Compute Engine</span>
                      <span className="text-xs font-black text-on-surface bg-primary/10 text-primary px-2 py-0.5 rounded-lg">32%</span>
                   </div>
                   <div className="h-2.5 w-full bg-background rounded-full overflow-hidden p-0.5 border border-outline/5">
                      <div className="h-full bg-primary rounded-full w-[32%] shadow-[0_0_12px_rgba(255,90,95,0.3)]" />
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-outline">Traffic Sync</span>
                      <span className="text-xs font-black text-on-surface bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg">64%</span>
                   </div>
                   <div className="h-2.5 w-full bg-background rounded-full overflow-hidden p-0.5 border border-outline/5">
                      <div className="h-full bg-blue-500 rounded-full w-[64%] shadow-[0_0_12px_rgba(37,99,235,0.3)]" />
                   </div>
                </div>

                <div className="pt-8 border-t border-outline/5">
                    <div className="bg-primary/5 rounded-[1.5rem] p-6 text-center border border-primary/10">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">Security Status</p>
                        <p className="text-[11px] font-bold text-on-surface leading-snug">All systems encrypted and operating within safety parameters.</p>
                    </div>
                </div>
              </div>
            </div>

            <div className="bg-on-background rounded-[3rem] p-10 text-white shadow-2xl overflow-hidden relative group">
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-2xl group-hover:w-60 transition-all duration-700" />
                <h3 className="text-xl font-black tracking-tighter mb-6 relative z-10">System Update</h3>
                <p className="text-[11px] font-medium leading-relaxed mb-8 opacity-70 relative z-10">The new AI Heritage Recognition engine is now live. Please review the documentation.</p>
                <button className="w-full h-12 bg-white text-on-background rounded-2xl text-[10px] font-black uppercase tracking-widest relative z-10 hover:bg-primary hover:text-white transition-all">Docs</button>
            </div>
        </div>
      </div>
    </div>
  );
}
