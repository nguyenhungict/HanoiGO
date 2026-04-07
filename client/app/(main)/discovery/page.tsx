'use client';

import React from 'react';

export default function DiscoveryPage() {
  return (
    <div className="flex h-full w-full overflow-hidden animate-in fade-in duration-500">
      {/* Sidebar (35%) - Heritage Explorer Panel (Restored) */}
      <aside className="w-[30%] min-w-[420px] bg-white z-20 flex flex-col border-r border-outline-variant/10 shadow-2xl shadow-black/5">
        <div className="p-8 space-y-8 flex-1 overflow-y-auto hide-scrollbar">
          {/* Header Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-black tracking-tighter text-on-surface">Explore Hanoi</h1>
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">filter_list</span>
              </div>
            </div>
            <p className="text-on-surface-variant text-sm font-medium">Uncover 1,000 years of layers through curated heritage spots.</p>
            
            {/* Search Bar - Modern Glassmorphic */}
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors">search</span>
              <input 
                className="w-full pl-12 pr-4 py-4 bg-surface-container-low border border-transparent rounded-2xl focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary/30 transition-all text-sm outline-none" 
                placeholder="Search heritage, food, or districts..." 
                type="text"
              />
            </div>
          </div>

          {/* District Filters */}
          <div className="space-y-4">
              <label className="font-label text-[10px] uppercase tracking-widest text-outline font-black block">Featured Districts</label>
              <div className="flex flex-wrap gap-2">
                <button className="px-5 py-2 bg-primary text-white rounded-full text-xs font-bold shadow-md shadow-primary/20 transition-all">Hoan Kiem</button>
                <button className="px-5 py-2 bg-surface-container-high text-on-surface-variant rounded-full text-xs font-bold hover:bg-primary/10 hover:text-primary transition-all">Ba Dinh</button>
                <button className="px-5 py-2 bg-surface-container-high text-on-surface-variant rounded-full text-xs font-bold hover:bg-primary/10 hover:text-primary transition-all">Tay Ho</button>
              </div>
          </div>

          {/* Recommendations List */}
          <div className="space-y-5 pt-4">
            <div className="flex items-center justify-between">
              <label className="font-label text-[10px] uppercase tracking-widest text-outline font-black block">Heritage Collection</label>
              <button className="text-[10px] font-bold text-primary hover:underline">View All</button>
            </div>

            {/* Heritage Card 1 */}
            <div className="group cursor-pointer bg-surface-container-lowest border border-outline-variant/10 hover:border-primary/20 p-4 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 flex gap-4">
              <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 relative">
                <img 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-110 group-hover:scale-100" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuA3_3Ys6itfzI-qcjC6GGAbPLzJ7GlOiFbBkyfA4InHZ5en20ct237GwITHy0C4SOOdps7VFI7xdoeb9p_Z5_BMnT3ySaCiYB71MraVhFBrC-uUbEmbKfbOalGDYQQ5ykZ3qrTaRNMhfNtTIMtVao-GOB1PN-AMTM2tM8hD3lTIEl9oYZWVyIvGxxYzmtIHaVh_KXThvrJAn9-C83750PhxLWhu8EnknsR1kAxyQcdsFE3xOSjEeyMyo3GtQBjK3b1DG7-pyT2w8cDY" 
                  alt="Temple of Literature" 
                />
                <div className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-black text-primary uppercase tracking-tighter">4.9 ★</div>
              </div>
              <div className="flex flex-col justify-between py-1">
                <div className="space-y-1">
                  <h3 className="font-black text-on-surface text-lg leading-tight tracking-tight">Temple of Literature</h3>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-outline">location_on</span>
                    <p className="text-xs text-outline font-medium">Hoan Kiem • Heritage</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-secondary-container/30 text-on-secondary-container text-[10px] font-bold rounded-lg w-fit">1,000+ Visited</div>
              </div>
            </div>

            {/* Heritage Card 2 */}
            <div className="group cursor-pointer bg-surface-container-lowest border border-outline-variant/10 hover:border-primary/20 p-4 rounded-2xl shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-500 flex gap-4">
              <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 relative">
                <img 
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-110 group-hover:scale-100" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuAiDDwvxWuAAOyzPIxfAVgQO4Q9RoNJfGDgEnckkfjpYlZFLujiudmfOI5j2qp3GMldpShSE4_hi_o8obKKh63VzYuPZlgD3SDPlvOjisWY6U7K0gpGl1JPU_wTKhaiLUirtpvAXLJYvCd0rAdKgsbaFbG4O2vS-W0GfFTGXEZVr6v8rR4nb0dObCEODrVB-0d3TuIPY8CSpCNVmzw_h-5lbP-WuIExhGpJvv3G33EfwSOsT53kk6vzgrgQuYtk13FFMms9c-Q6v7Ra" 
                  alt="Sword Lake" 
                />
                <div className="absolute top-1.5 left-1.5 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-lg text-[10px] font-black text-primary uppercase tracking-tighter">4.8 ★</div>
              </div>
              <div className="flex flex-col justify-between py-1">
                <div className="space-y-1">
                  <h3 className="font-black text-on-surface text-lg leading-tight tracking-tight">Sword Lake</h3>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[14px] text-outline">location_on</span>
                    <p className="text-xs text-outline font-medium">Hoan Kiem • Scenic</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-lg w-fit">Open now</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Attachment Footer */}
        <div className="p-6 bg-surface-container-low border-t border-outline-variant/10 text-center">
             <p className="text-[10px] font-bold text-outline-variant uppercase tracking-widest mb-4">Start your own story</p>
             <button className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all">Create New Trip</button>
        </div>
      </aside>

      {/* Map Section (65%) - Interactive Layer */}
      <section className="flex-1 relative overflow-hidden bg-surface-container bg-neutral-100">
        <div className="absolute inset-0 map-bg grayscale-[0.2] brightness-[0.95] contrast-[1.05]">
          <div className="absolute inset-0 bg-primary/5 pointer-events-none"></div>

          {/* Active Pin & Pop-over */}
          <div className="absolute top-[35%] left-[42%] z-30">
            <div className="relative flex flex-col items-center">
              {/* Pop-over Detail Card */}
              <div className="absolute bottom-full mb-6 w-80 bg-white rounded-[2rem] shadow-[0_32px_64px_rgba(0,0,0,0.15)] overflow-hidden border border-outline-variant/10 transition-all">
                <div className="h-44 relative">
                  <img 
                    className="w-full h-full object-cover" 
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAVc2wfEhkM85eOwrrcrrrRp_RxYZ9y0ePi-_OqRhsueNfuqqe9jTXGu4rGYfr-6hQa3fTwiN39LF5KsUQfLiJX_V7eq-UE6xgcekNTBfV-dnZsuw-3cvWQPFyIDFtruFoSRT-Tmkow1VoK1CJOF_5UGHWuPTILg9ZnMxsHT_8qXHBSdAsZ7PpevwCGUDbpfUwZbgq0BtCmnZr7sos87wNeiIu3zRV_Q7eNE4Vn_mtsUSg2nYgF4Jcj1enK6MwZ6kw2BTkX9OFERFui" 
                    alt="Temple Detail" 
                  />
                </div>
                <div className="p-6 space-y-4">
                  <h4 className="text-xl font-black text-on-surface leading-none tracking-tighter">Temple of Literature</h4>
                  <button className="w-full bg-primary text-white px-5 py-3 rounded-xl text-[10px] font-black shadow-lg shadow-primary/20 hover:opacity-90 transition-all uppercase tracking-widest">Explore Site</button>
                </div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white rotate-45 border-r border-b border-outline-variant/10"></div>
              </div>

              {/* The Pulse Pin */}
              <div className="relative w-10 h-10 flex items-center justify-center cursor-pointer group">
                <div className="absolute inset-0 bg-primary/30 rounded-full animate-ping"></div>
                <div className="relative w-10 h-10 bg-primary rounded-full border-[4px] border-white shadow-2xl flex items-center justify-center group-hover:scale-125 transition-transform">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          {/* Zoom Controls */}
          <div className="absolute bottom-10 right-10 flex flex-col gap-4">
            <div className="bg-white/90 backdrop-blur-xl p-2 rounded-2xl shadow-gray-200 shadow-xl flex flex-col gap-2 border border-white/50">
              <button className="w-12 h-12 flex items-center justify-center text-outline-variant hover:text-primary border-b border-outline-variant/10 transition-colors">
                <span className="material-symbols-outlined">add</span>
              </button>
              <button className="w-12 h-12 flex items-center justify-center text-outline-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined">remove</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
