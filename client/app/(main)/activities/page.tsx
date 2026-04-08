'use client';

import React from 'react';

export default function ActivitiesPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden animate-in fade-in duration-700">
      <header className="px-8 py-6 border-b border-outline/5 bg-white flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tighter text-on-surface">Activities</h1>
          <p className="text-outline text-xs font-bold uppercase tracking-widest">Connect with the Hanoi guild</p>
        </div>
        <div className="flex gap-4">
          <button className="bg-surface-container-high text-on-surface px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-primary/5 hover:text-primary transition-all flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">group_add</span>
            Create Group
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden p-8 bg-surface-container-lowest">
        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-8 h-full">
          {/* Active Chats / Groups Sidebar */}
          <section className="col-span-12 lg:col-span-4 flex flex-col gap-8 h-full">
            <div className="bg-white rounded-[2.5rem] p-8 border border-outline/5 shadow-sm flex flex-col h-full overflow-hidden">
              <h2 className="text-sm font-black tracking-tighter uppercase text-on-surface mb-6">Active Channels</h2>
              <div className="space-y-4 overflow-y-auto hide-scrollbar flex-1">
                {[
                  { name: 'Old Quarter Explorers', msg: 'Someone at Ta Hien?', time: '2m', active: true },
                  { name: 'Coffee Seekers', msg: 'Egg coffee is a must!', time: '14m', active: false },
                  { name: 'Heritage Photographers', msg: 'Sunset at Long Bien...', time: '1h', active: false },
                ].map((chat, i) => (
                  <div key={i} className={`p-5 rounded-[2rem] cursor-pointer transition-all border ${chat.active ? 'bg-primary/5 border-primary/20' : 'bg-surface-container-lowest border-transparent hover:bg-surface-container-low'}`}>
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`font-black text-sm tracking-tight ${chat.active ? 'text-primary' : 'text-on-surface'}`}>{chat.name}</h3>
                      <span className="text-[9px] font-black text-outline uppercase">{chat.time}</span>
                    </div>
                    <p className="text-outline text-[11px] font-medium truncate">{chat.msg}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Main Chat Interface / Activity Feed */}
          <section className="col-span-12 lg:col-span-8 flex flex-col h-full gap-8">
            <div className="bg-white rounded-[2.5rem] p-10 border border-outline/5 shadow-sm flex flex-col grow overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
              
              <div className="flex-1 space-y-8 overflow-y-auto hide-scrollbar p-4">
                <div className="flex gap-4 items-end">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-xs">M</div>
                  <div className="bg-surface-container-low p-6 rounded-[2rem] rounded-bl-none max-w-md">
                    <p className="text-sm font-medium leading-relaxed">Hey travelers! we're planning a street food tour tomorrow evening. Anyone want to join? 🍜</p>
                  </div>
                </div>

                <div className="flex gap-4 items-end justify-end">
                  <div className="bg-primary p-6 rounded-[2rem] rounded-br-none max-w-md text-white">
                    <p className="text-sm font-medium leading-relaxed">Count me in! I've been dying to find the best Bun Cha in the city.</p>
                  </div>
                  <div className="w-10 h-10 rounded-2xl bg-primary flex items-center justify-center text-white font-black text-xs">You</div>
                </div>
              </div>

              <div className="mt-8 relative group">
                <input 
                  className="w-full pl-8 pr-20 py-5 bg-surface-container-low border border-transparent rounded-[2rem] focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/20 transition-all text-sm outline-none font-medium" 
                  placeholder="Type your message to the guild..." 
                  type="text"
                />
                <button className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center active:scale-90 transition-transform shadow-lg shadow-primary/20">
                  <span className="material-symbols-outlined text-sm">send</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
