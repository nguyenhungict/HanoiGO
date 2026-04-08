'use client';

import React from 'react';

export default function TripsPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-700">
      <header className="px-8 py-6 border-b border-outline/5 bg-white flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tighter text-on-surface">Trip Planner</h1>
          <p className="text-outline text-xs font-bold uppercase tracking-widest">Architect your Hanoi legacy</p>
        </div>
        <div className="flex gap-4">
          <button className="bg-primary/10 text-primary px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/20 transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">auto_awesome</span>
            AI Generate
          </button>
          <button className="bg-primary text-white px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20">Create New</button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 h-full">
          {/* Main Timeline Card */}
          <section className="col-span-12 lg:col-span-8 bg-white rounded-[2.5rem] p-10 border border-outline/5 shadow-sm space-y-8">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black tracking-tighter uppercase text-on-surface">Personal Timeline</h2>
              <div className="flex gap-2">
                {['Day 1', 'Day 2', 'Day 3'].map((day, i) => (
                  <button key={day} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${i === 0 ? 'bg-primary text-white' : 'bg-surface-container-high text-outline hover:bg-primary/10'}`}>
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex gap-6 group">
                  <div className="flex flex-col items-center gap-2 pt-1">
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-primary font-black group-hover:bg-primary group-hover:text-white transition-all">0{item}</div>
                    <div className="w-0.5 flex-1 bg-outline/10"></div>
                  </div>
                  <div className="flex-1 bg-surface-container-lowest border border-outline/5 p-6 rounded-[2rem] hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all cursor-pointer">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-black text-lg tracking-tight">Imperial Citadel Discovery</h3>
                      <span className="text-[10px] font-black text-outline uppercase tracking-widest">09:00 AM</span>
                    </div>
                    <p className="text-outline text-sm font-medium mb-4">Walk through ancient palace ruins and explore underground bunkers.</p>
                    <div className="flex gap-4">
                      <span className="px-3 py-1 bg-secondary-container/30 text-primary text-[9px] font-black rounded-lg uppercase tracking-widest">Cultural</span>
                      <span className="px-3 py-1 bg-secondary-container/30 text-primary text-[9px] font-black rounded-lg uppercase tracking-widest">2.5 Hours</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Sidebar Bento Items */}
          <aside className="col-span-12 lg:col-span-4 space-y-8">
            {/* Map Preview */}
            <div className="bg-white rounded-[2.5rem] p-10 border border-outline/5 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-black tracking-tighter uppercase text-on-surface">Route Scope</h2>
                <span className="material-symbols-outlined text-outline">map</span>
              </div>
              <div className="aspect-square bg-surface-container-high rounded-[2rem] overflow-hidden relative grayscale group cursor-pointer border border-outline/10">
                <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuAVc2wfEhkM85eOwrrcrrrRp_RxYZ9y0ePi-_OqRhsueNfuqqe9jTXGu4rGYfr-6hQa3fTwiN39LF5KsUQfLiJX_V7eq-UE6xgcekNTBfV-dnZsuw-3cvWQPFyIDFtruFoSRT-Tmkow1VoK1CJOF_5UGHWuPTILg9ZnMxsHT_8qXHBSdAsZ7PpevwCGUDbpfUwZbgq0BtCmnZr7sos87wNeiIu3zRV_Q7eNE4Vn_mtsUSg2nYgF4Jcj1enK6MwZ6kw2BTkX9OFERFui" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <button className="bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl">Expand Map</button>
                </div>
              </div>
            </div>

            {/* Weather / Stats Bento */}
            <div className="grid grid-cols-2 gap-8">
              <div className="bg-primary rounded-[2.5rem] p-8 text-white space-y-4 shadow-lg shadow-primary/20">
                <span className="material-symbols-outlined text-4xl">wb_sunny</span>
                <div>
                  <h3 className="text-2xl font-black tracking-tighter">28°C</h3>
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-80">Ideal for walking</p>
                </div>
              </div>
              <div className="bg-white rounded-[2.5rem] p-8 border border-outline/5 shadow-sm space-y-4">
                <span className="material-symbols-outlined text-4xl text-primary">payments</span>
                <div>
                  <h3 className="text-2xl font-black tracking-tighter">$142</h3>
                  <p className="text-[9px] font-black uppercase tracking-widest text-outline">Total Budget</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
