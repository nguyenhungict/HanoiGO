'use client';

import React from 'react';
import Link from 'next/link';

export default function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8 animate-in fade-in zoom-in duration-700">
      <div className="relative">
        <div className="w-32 h-32 bg-primary/10 rounded-[2.5rem] flex items-center justify-center animate-pulse">
          <span className="material-symbols-outlined text-6xl text-primary fill-0">construction</span>
        </div>
        <div className="absolute -top-2 -right-2 w-10 h-10 bg-secondary rounded-2xl flex items-center justify-center shadow-xl rotate-12">
          <span className="material-symbols-outlined text-primary text-xl">engineering</span>
        </div>
      </div>

      <div className="text-center space-y-4">
        <h1 className="text-5xl font-black tracking-tighter text-on-surface">Under Construction</h1>
        <p className="text-[12px] font-black text-outline uppercase tracking-[0.3em] max-w-md mx-auto leading-relaxed">
          Our engineers are currently forging this module in the digital furnace. Check back soon for full operational capability.
        </p>
      </div>

      <div className="flex gap-4 pt-4">
        <Link 
          href="/admin/dashboard"
          className="h-14 px-8 bg-on-surface text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all flex items-center gap-3 shadow-xl shadow-black/10 active:scale-95"
        >
          <span className="material-symbols-outlined text-lg">dashboard</span>
          Return to Command
        </Link>
      </div>
    </div>
  );
}
