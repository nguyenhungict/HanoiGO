import Link from 'next/link';
import { fetchLandmarks } from '@/lib/landmarks';

export const dynamic = 'force-dynamic';

export default async function PlacesDirectoryPage({ searchParams }: { searchParams?: { category?: string; search?: string } }) {
  const landmarks = await fetchLandmarks();
  const selectedCategory = searchParams?.category || 'All';
  const searchQuery = searchParams?.search?.toLowerCase() || '';

  const categories = [
    'All',
    ...Array.from(new Set(landmarks.map((l) => l.category))).slice(0, 8),
  ];

  const filteredLandmarks = landmarks.filter((l) => {
    const matchesCategory = selectedCategory === 'All' || l.category === selectedCategory;
    const matchesSearch = !searchQuery || l.name.toLowerCase().includes(searchQuery) || l.description?.toLowerCase().includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const featuredLandmarks = filteredLandmarks.filter(l => l.rating >= 4.5).slice(0, 3);
  const otherLandmarks = filteredLandmarks.filter(l => !featuredLandmarks.includes(l));

  return (
    <div className="min-h-full bg-background animate-in fade-in duration-700 font-body pb-20">
      {/* Hero Section */}
      <section className="relative pt-12 pb-10 md:pt-20 md:pb-16 flex items-center justify-center overflow-hidden">
        {/* Aurora-inspired Background matching HanoiGO Theme */}
        <div className="absolute inset-0 bg-background z-0">
           <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 blur-[100px] mix-blend-multiply animate-pulse duration-1000"></div>
           <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/30 blur-[80px] mix-blend-multiply"></div>
           <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-[#3F51B5]/10 blur-[90px] mix-blend-multiply"></div>
        </div>
        <div className="relative z-10 w-full max-w-4xl px-8 flex flex-col items-center text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-on-surface leading-tight drop-shadow-sm">
            Discover <span className="text-primary">Hanoi</span>'s Heritage
          </h1>
          <p className="mt-3 text-sm md:text-base text-on-surface-variant max-w-2xl font-medium">
            Explore curated destinations, historical landmarks, and hidden gems across the city.
          </p>

          <form action="/places" className="mt-8 w-full max-w-2xl relative flex items-center">
             <span className="material-symbols-outlined absolute left-6 text-on-surface-variant text-2xl z-10 pointer-events-none">search</span>
             {selectedCategory !== 'All' && <input type="hidden" name="category" value={selectedCategory} />}
             <input 
               type="text" 
               name="search"
               defaultValue={searchQuery}
               placeholder="Search places, categories..." 
               className="w-full pl-12 pr-28 py-4 rounded-full bg-white/80 backdrop-blur-xl border border-outline/20 text-on-surface font-bold shadow-[0_8px_30px_rgba(38,24,23,0.05)] focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary/40 transition-all text-sm"
             />
             <button type="submit" className="absolute right-2 bg-primary hover:bg-primary-container text-white font-black uppercase tracking-widest text-[10px] px-5 py-2.5 rounded-full transition-all hover:scale-[1.02] shadow-md shadow-primary/20">
               Search
             </button>
          </form>
        </div>
      </section>

      {/* Categories */}
      <section className="sticky top-0 z-30 bg-background/90 backdrop-blur-2xl border-y border-outline/10 shadow-sm">
        <div className="max-w-7xl mx-auto px-8 py-4 overflow-x-auto scrollbar-none flex gap-3">
          {categories.map((category) => {
             const params = new URLSearchParams();
             if (category !== 'All') params.set('category', category);
             if (searchQuery) params.set('search', searchQuery);
             const href = `/places?${params.toString()}`;
             const isActive = selectedCategory === category;
             return (
               <Link
                 key={category}
                 href={href}
                 className={`flex-shrink-0 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 border ${
                   isActive
                     ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                     : 'bg-white border-outline/10 text-on-surface-variant hover:bg-secondary hover:text-on-surface hover:border-secondary hover:scale-[1.02]'
                 }`}
               >
                 {category}
               </Link>
             );
          })}
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-8 py-12 space-y-16">
        {/* Featured Grid (Bento Style) */}
        {featuredLandmarks.length > 0 && (
          <section>
            <div className="mb-8 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary mb-2">Curated Selection</p>
                <h2 className="text-3xl font-extrabold tracking-tighter text-on-surface">Featured Destinations</h2>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 h-auto md:h-[400px]">
              {featuredLandmarks.map((landmark, idx) => (
                <Link 
                  href={`/places/${landmark.id}`} 
                  key={landmark.id}
                  className={`group relative overflow-hidden rounded-3xl block transition-all duration-500 hover:scale-[1.01] hover:shadow-2xl hover:shadow-primary/10 ${
                    idx === 0 ? 'md:col-span-8 md:row-span-2' : 'md:col-span-4'
                  }`}
                >
                  <img 
                    src={landmark.image} 
                    alt={landmark.name} 
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-on-surface/90 via-on-surface/20 to-transparent"></div>
                  
                  <div className="absolute bottom-0 left-0 right-0 p-8">
                     <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-lg text-white text-[10px] font-black uppercase tracking-widest mb-3 border border-white/20">
                       {landmark.category}
                     </span>
                     <h3 className={`font-extrabold text-white tracking-tight ${idx === 0 ? 'text-3xl' : 'text-xl'}`}>
                       {landmark.name}
                     </h3>
                     <div className="flex items-center gap-1.5 mt-2 text-primary-container">
                       <span className="material-symbols-outlined fill-1 text-sm">star</span>
                       <span className="text-xs font-black">{landmark.rating.toFixed(1)}</span>
                     </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Directory Grid */}
        <section>
           <div className="mb-6">
              <h2 className="text-xl font-extrabold tracking-tighter text-on-surface">Explore More</h2>
              <p className="text-on-surface-variant text-xs font-medium mt-1">Found {otherLandmarks.length} places</p>
           </div>
           
           {otherLandmarks.length === 0 ? (
             <div className="w-full py-20 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-outline/10 shadow-sm">
                <span className="material-symbols-outlined text-6xl text-outline/30 mb-4">search_off</span>
                <h3 className="text-xl font-bold text-on-surface">No places found</h3>
                <p className="text-on-surface-variant mt-2">Try adjusting your filters or search query.</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {otherLandmarks.map((landmark) => (
                  <Link 
                    href={`/places/${landmark.id}`} 
                    key={landmark.id}
                    className="group bg-white rounded-[1.25rem] overflow-hidden border border-outline/10 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 hover:-translate-y-1 flex flex-col h-full"
                  >
                     <div className="relative h-40 overflow-hidden bg-secondary-container">
                        <img 
                          src={landmark.image} 
                          alt={landmark.name} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest text-on-surface shadow-sm">
                          {landmark.category}
                        </div>
                     </div>
                     <div className="p-4 flex-1 flex flex-col">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3 className="font-bold text-base leading-tight text-on-surface tracking-tight group-hover:text-primary transition-colors">
                            {landmark.name}
                          </h3>
                          <div className="flex items-center gap-1 text-primary shrink-0 bg-primary/5 px-1.5 py-0.5 rounded">
                            <span className="material-symbols-outlined fill-1 text-[12px]">star</span>
                            <span className="text-[10px] font-black">{landmark.rating.toFixed(1)}</span>
                          </div>
                        </div>
                        <p className="text-on-surface-variant text-xs font-medium line-clamp-2 leading-relaxed mb-4 flex-1">
                           {landmark.description || `Khám phá vẻ đẹp lịch sử và văn hóa tại ${landmark.name}.`}
                        </p>
                        <div className="flex items-center text-primary text-[10px] font-black uppercase tracking-widest pt-4 border-t border-outline/5 mt-auto">
                           View Details
                           <span className="material-symbols-outlined text-[14px] ml-1 group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                     </div>
                  </Link>
                ))}
             </div>
           )}
        </section>
      </main>
    </div>
  );
}
