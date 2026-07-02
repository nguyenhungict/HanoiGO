import Link from 'next/link';
import { fetchLandmarks } from '@/lib/landmarks';

export const dynamic = 'force-dynamic';

const CATEGORY_ICONS: Record<string, string> = {
  'All': 'travel_explore',
  'Museum': 'museum',
  'Temple & Pagoda': 'temple_buddhist',
  'Historic Site': 'castle',
  'Nature & Lake': 'forest',
  'Arts & Performance': 'theater_comedy',
  'Street & Market': 'storefront',
};

const getCategoryIcon = (category: string) => {
  return CATEGORY_ICONS[category] || 'location_on';
};

// Suggested visit duration (minutes) per category. Must stay in sync with the
// VISIT_DURATION map in actions/scripts/recategorize-places.ts.
const VISIT_DURATION: Record<string, number> = {
  'Museum': 90,
  'Temple & Pagoda': 45,
  'Historic Site': 60,
  'Nature & Lake': 45,
  'Arts & Performance': 90,
  'Street & Market': 75,
};

const getVisitDuration = (category: string): number => {
  return VISIT_DURATION[category] ?? 60;
};

export default async function PlacesDirectoryPage({ 
  searchParams 
}: { 
  searchParams?: { category?: string; search?: string; page?: string } 
}) {
  const landmarks = await fetchLandmarks();
  const selectedCategory = searchParams?.category || 'All';
  const searchQuery = searchParams?.search?.toLowerCase() || '';

  // Get categories from actual data
  const categories = [
    'All',
    ...Array.from(new Set(landmarks.map((l) => l.category))).slice(0, 8),
  ];

  // Helper to count places per category in current search context
  const getCategoryCount = (cat: string) => {
    return landmarks.filter((l) => {
      const matchesCategory = cat === 'All' || l.category === cat;
      const matchesSearch = !searchQuery || 
        l.name.toLowerCase().includes(searchQuery) || 
        l.description?.toLowerCase().includes(searchQuery);
      return matchesCategory && matchesSearch;
    }).length;
  };

  // Filter based on category and search
  const filteredLandmarks = landmarks.filter((l) => {
    const matchesCategory = selectedCategory === 'All' || l.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      l.name.toLowerCase().includes(searchQuery) || 
      l.description?.toLowerCase().includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  // Featured destinations: Show only on page 1 of All category when no search is active
  const isDefaultView = selectedCategory === 'All' && !searchQuery;
  const featuredLandmarks = isDefaultView 
    ? filteredLandmarks.filter(l => l.rating >= 4.5).slice(0, 3) 
    : [];

  // Exclude featured landmarks from the main list in default view
  const otherLandmarks = filteredLandmarks.filter(l => !featuredLandmarks.includes(l));

  // Pagination Configuration
  const pageSize = 9; // Fit 3 columns grid beautifully
  const totalPages = Math.ceil(otherLandmarks.length / pageSize);
  const currentPage = Math.max(
    1, 
    Math.min(Number(searchParams?.page) || 1, totalPages || 1)
  );
  
  const paginatedLandmarks = otherLandmarks.slice(
    (currentPage - 1) * pageSize, 
    currentPage * pageSize
  );

  // Pagination Link Helper
  const getPageLink = (pageNumber: number) => {
    const params = new URLSearchParams();
    if (selectedCategory !== 'All') params.set('category', selectedCategory);
    if (searchQuery) params.set('search', searchQuery);
    params.set('page', pageNumber.toString());
    return `/places?${params.toString()}`;
  };

  // Dynamic Pagination Pages to Show
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="min-h-full bg-background animate-in fade-in duration-700 font-body pb-20 pt-8 md:pt-12">
      {/* Subtle Aurora Decorative background elements */}
      <div className="absolute inset-0 bg-background z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[100px] mix-blend-multiply"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[80px] mix-blend-multiply"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          
          {/* LEFT SIDEBAR: Search & Filters (25% width on desktop) */}
          <aside className="md:col-span-3 space-y-6">
            {/* Search Box */}
            <div className="bg-white/60 backdrop-blur-xl border border-outline/10 p-5 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-outline px-1">Search</span>
              </div>
              <form action="/places" className="relative flex items-center">
                 <span className="material-symbols-outlined absolute left-4 text-on-surface-variant text-xl z-10 pointer-events-none">search</span>
                 {selectedCategory !== 'All' && <input type="hidden" name="category" value={selectedCategory} />}
                 <input 
                   type="text" 
                   name="search"
                   defaultValue={searchQuery}
                   placeholder="Search landmarks..." 
                   className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-outline/10 text-on-surface font-bold shadow-sm focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary/30 transition-all text-xs"
                 />
              </form>
            </div>

            {/* Categories List */}
            <div className="bg-white/60 backdrop-blur-xl border border-outline/10 p-5 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4">
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-outline px-1 block">Categories</span>
               <div className="flex flex-col gap-2">
                 {categories.map((category) => {
                    const params = new URLSearchParams();
                    if (category !== 'All') params.set('category', category);
                    if (searchQuery) params.set('search', searchQuery);
                    const href = `/places?${params.toString()}`;
                    const isActive = selectedCategory === category;
                    const count = getCategoryCount(category);
                    return (
                      <Link
                        key={category}
                        href={href}
                        className={`w-full px-4 py-3 rounded-2xl text-[11px] font-black uppercase tracking-[0.05em] transition-all duration-200 border flex items-center justify-between group/cat ${
                          isActive
                            ? 'bg-primary border-primary text-white shadow-md shadow-primary/20 scale-[1.01]'
                            : 'bg-white border-outline/5 text-on-surface-variant hover:bg-secondary hover:text-on-surface hover:border-secondary'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`material-symbols-outlined text-[18px] transition-colors ${isActive ? 'text-white' : 'text-primary/70 group-hover/cat:text-primary'}`}>
                            {getCategoryIcon(category)}
                          </span>
                          <span>{category}</span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold transition-colors ${isActive ? 'bg-white/20 text-white' : 'bg-black/5 text-on-surface-variant/60'}`}>
                          {count}
                        </span>
                      </Link>
                    );
                 })}
               </div>
            </div>
          </aside>

          {/* RIGHT PANEL: Content Area (75% width on desktop) */}
          <main className="md:col-span-9 space-y-10">
            {/* Compact Header (Replaces the large hero banner) */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-outline/5 pb-6">
              <div className="space-y-1">
                <h1 className="text-2xl md:text-3xl font-black text-on-surface tracking-tight leading-none">
                  Discover <span className="text-primary">Hanoi</span>'s Heritage
                </h1>
                <p className="text-xs font-semibold text-on-surface-variant/80">
                  Explore curated destinations, historical landmarks, and hidden gems across the city.
                </p>
              </div>
              <div className="bg-white/80 border border-outline/10 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest text-outline shadow-sm shrink-0 w-fit">
                Found {otherLandmarks.length} places {totalPages > 1 && `• Page ${currentPage} of ${totalPages}`}
              </div>
            </div>

            {/* Featured Section Bento (Page 1 All category only) */}
            {featuredLandmarks.length > 0 && currentPage === 1 && (
              <section className="space-y-6">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">auto_awesome</span>
                  <h2 className="text-xs font-black tracking-tight text-on-surface uppercase tracking-widest">Featured Destinations</h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 h-auto md:h-[350px]">
                  {featuredLandmarks.map((landmark, idx) => (
                    <Link 
                      href={`/places/${landmark.id}`} 
                      key={landmark.id}
                      className={`group relative overflow-hidden rounded-[2rem] block transition-all duration-500 hover:scale-[1.01] hover:shadow-xl hover:shadow-primary/5 ${
                        idx === 0 ? 'md:col-span-8' : 'md:col-span-4'
                      }`}
                    >
                      <img 
                        src={landmark.image} 
                        alt={landmark.name} 
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-750 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-on-surface/95 via-on-surface/30 to-transparent"></div>
                      
                      <div className="absolute bottom-0 left-0 right-0 p-6">
                         <span className="inline-flex px-3 py-1 bg-white/20 backdrop-blur-md rounded-2xl text-white text-[9px] font-black uppercase tracking-widest mb-2 border border-white/20 items-center gap-1.5">
                           <span className="material-symbols-outlined text-[12px]">{getCategoryIcon(landmark.category)}</span>
                           {landmark.category}
                         </span>
                         <h3 className={`font-extrabold text-white tracking-tight ${idx === 0 ? 'text-2xl' : 'text-lg'}`}>
                           {landmark.name}
                         </h3>
                         <div className="flex items-center gap-1 mt-1 text-primary-container">
                           <span className="material-symbols-outlined fill-1 text-[13px]">star</span>
                           <span className="text-xs font-black">{landmark.rating.toFixed(1)}</span>
                         </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Places Grid */}
            <section className="space-y-10">
               {paginatedLandmarks.length === 0 ? (
                 <div className="w-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-[2rem] border border-outline/10 shadow-sm">
                    <span className="material-symbols-outlined text-5xl text-outline/30 mb-3">search_off</span>
                    <h3 className="text-lg font-bold text-on-surface">No places found</h3>
                    <p className="text-xs text-on-surface-variant mt-1">Try adjusting your filters or search query.</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedLandmarks.map((landmark) => (
                      <Link 
                        href={`/places/${landmark.id}`} 
                        key={landmark.id}
                        className="group bg-white rounded-[2rem] overflow-hidden border border-outline/10 shadow-[0_8px_30px_rgba(0,0,0,0.01)] hover:shadow-[0_20px_50px_rgba(255,90,95,0.05)] hover:border-primary/10 transition-all duration-500 hover:-translate-y-1.5 flex flex-col h-full"
                      >
                         <div className="relative h-44 overflow-hidden bg-secondary-container">
                            <img 
                              src={landmark.image} 
                              alt={landmark.name} 
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl text-[9px] font-black uppercase tracking-widest text-on-surface shadow-sm border border-white/40 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[12px] text-primary">{getCategoryIcon(landmark.category)}</span>
                              {landmark.category}
                            </div>
                            <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-2xl text-[10px] font-black text-primary shadow-sm border border-white/40 flex items-center gap-1">
                              <span className="material-symbols-outlined fill-1 text-[13px]">star</span>
                              {landmark.rating.toFixed(1)}
                            </div>
                         </div>
                         <div className="p-6 flex-1 flex flex-col gap-4">
                            <div className="flex flex-col gap-1.5">
                              <h3 className="font-extrabold text-base leading-tight text-on-surface tracking-tight group-hover:text-primary transition-colors line-clamp-1">
                                {landmark.name}
                              </h3>
                              <p className="text-on-surface-variant/80 text-xs font-semibold line-clamp-2 leading-relaxed h-8">
                                 {landmark.description || `Explore the historical and cultural beauty of ${landmark.name}.`}
                              </p>
                            </div>
                            
                            <div className="w-full h-px bg-outline/5"></div>

                            {/* Meta Info Grid */}
                            <div className="grid grid-cols-2 gap-4 text-left">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                                  <span className="material-symbols-outlined text-[15px]">location_on</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-outline uppercase tracking-wider">District</span>
                                  <span className="text-[10px] font-black text-on-surface tracking-tight truncate max-w-[80px]">{landmark.district || 'Hoan Kiem'}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-[#10B981]/5 flex items-center justify-center text-[#10B981]">
                                  <span className="material-symbols-outlined text-[15px]">schedule</span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[8px] font-black text-outline uppercase tracking-wider">Duration</span>
                                  <span className="text-[10px] font-black text-on-surface tracking-tight">~{getVisitDuration(landmark.category)} mins</span>
                                </div>
                              </div>
                            </div>

                            <div className="w-full h-px bg-outline/5 mt-auto"></div>

                            <div className="flex items-center text-primary text-[10px] font-black uppercase tracking-widest">
                               View Details
                               <span className="material-symbols-outlined text-[14px] ml-1 group-hover:translate-x-1.5 transition-transform">arrow_forward</span>
                            </div>
                         </div>
                      </Link>
                    ))}
                 </div>
               )}

               {/* Pagination */}
               {totalPages > 1 && (
                 <div className="pt-4">
                   <div className="bg-white/60 backdrop-blur-xl border border-outline/10 p-2 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.01)] flex items-center justify-center gap-1.5 w-fit mx-auto">
                     <Link
                       href={getPageLink(currentPage - 1)}
                       className={`w-10 h-10 rounded-2xl flex items-center justify-center border border-outline/5 transition-all active:scale-95 ${
                         currentPage > 1
                           ? 'bg-white hover:bg-primary hover:text-white text-on-surface shadow-sm'
                           : 'bg-black/5 text-on-surface/20 pointer-events-none'
                       }`}
                       title="Previous Page"
                     >
                       <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                     </Link>

                     {getPageNumbers().map(pageNum => {
                       const isActive = pageNum === currentPage;
                       return (
                         <Link
                           key={pageNum}
                           href={getPageLink(pageNum)}
                           className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black transition-all active:scale-95 ${
                             isActive
                               ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.05]'
                               : 'bg-white hover:bg-on-surface/5 text-on-surface-variant border border-outline/5'
                           }`}
                         >
                           {pageNum}
                         </Link>
                       );
                     })}

                     <Link
                       href={getPageLink(currentPage + 1)}
                       className={`w-10 h-10 rounded-2xl flex items-center justify-center border border-outline/5 transition-all active:scale-95 ${
                         currentPage < totalPages
                           ? 'bg-white hover:bg-primary hover:text-white text-on-surface shadow-sm'
                           : 'bg-black/5 text-on-surface/20 pointer-events-none'
                       }`}
                       title="Next Page"
                     >
                       <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                     </Link>
                   </div>
                 </div>
               )}
            </section>
          </main>

        </div>
      </div>
    </div>
  );
}
