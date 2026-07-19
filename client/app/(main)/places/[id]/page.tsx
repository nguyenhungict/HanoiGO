import Link from 'next/link';
import { getPlaceStory, fetchLandmarks, formatTime } from '@/lib/landmarks';
import PlaceDetailsContent from '@/components/places/PlaceDetailsContent';

export const dynamic = 'force-dynamic';

type PlaceDetailsPageProps = {
  params: { id: string };
};

const CATEGORY_ICONS: Record<string, string> = {
  'All': 'travel_explore',
  'Heritage & History': 'history_edu',
  'Arts & Culture': 'palette',
  'Sightseeing': 'photo_camera',
  'Nature & Outdoors': 'forest',
  'Spiritual': 'temple_buddhist',
  'Museum': 'museum',
  'Temple': 'temple_buddhist',
  'Historic Site': 'castle',
  'Park': 'park',
  'Lake': 'water',
  'Market': 'storefront',
  'Theater': 'theater_comedy',
};

const getCategoryIcon = (category: string) => {
  return CATEGORY_ICONS[category] || 'location_on';
};

const getVisitDuration = (category: string): number => {
  const cat = category.toLowerCase();
  if (cat.includes('museum')) return 90;
  if (cat.includes('temple') || cat.includes('pagoda') || cat.includes('spiritual')) return 45;
  if (cat.includes('historic') || cat.includes('heritage')) return 60;
  if (cat.includes('park') || cat.includes('garden')) return 60;
  if (cat.includes('lake') || cat.includes('water')) return 45;
  if (cat.includes('market')) return 60;
  if (cat.includes('theater') || cat.includes('performance')) return 90;
  if (cat.includes('neighborhood') || cat.includes('street')) return 90;
  if (cat.includes('art') || cat.includes('gallery')) return 60;
  return 60;
};

export default async function PlaceDetailsPage({ params }: PlaceDetailsPageProps) {
  const landmarks = await fetchLandmarks();
  const selectedLandmark = landmarks.find(l => l.id === params.id) || landmarks[0];
  const story = getPlaceStory(selectedLandmark);

  // Find exactly 3 related landmarks (in same category or district)
  const relatedLandmarks = landmarks
    .filter((l) => l.id !== selectedLandmark.id && (l.category === selectedLandmark.category || l.district === selectedLandmark.district))
    .slice(0, 3);
  
  if (relatedLandmarks.length < 3) {
    const ids = new Set(relatedLandmarks.map(r => r.id));
    const extra = landmarks
      .filter((l) => l.id !== selectedLandmark.id && !ids.has(l.id))
      .slice(0, 3 - relatedLandmarks.length);
    relatedLandmarks.push(...extra);
  }

  return (
    <div className="min-h-full bg-background animate-in fade-in duration-700 font-body pb-20">
      {/* Decorative background aurora elements */}
      <div className="absolute inset-0 bg-background z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[100px] mix-blend-multiply"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/10 blur-[80px] mix-blend-multiply"></div>
      </div>

      <header className="relative z-20 border-b border-outline/10 bg-white/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-4">
          <div className="flex items-center gap-3">
             <Link href="/places" className="text-outline hover:text-primary transition-colors flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
                <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                Back to Directory
             </Link>
             <span className="text-outline/20 text-sm">|</span>
             <p className="text-[9px] font-black uppercase tracking-[0.25em] text-primary/80">
               Heritage Chapter
             </p>
          </div>
          <Link
            href="/discovery"
            className="inline-flex h-9 items-center justify-center rounded-xl border border-outline/15 px-4 text-[9px] font-black uppercase tracking-[0.2em] text-on-surface-variant hover:text-primary hover:bg-secondary transition-all shadow-sm"
          >
            Open Discovery Map
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-8 py-8 relative z-10 space-y-16">
        {/* Main Place Content */}
        <PlaceDetailsContent landmark={selectedLandmark} story={story} />

        {/* Curated Related Section */}
        {relatedLandmarks.length > 0 && (
          <section className="pt-12 border-t border-outline/5 space-y-8">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-on-surface tracking-tight">
                Explore Similar Landmarks
              </h2>
              <p className="text-xs font-semibold text-on-surface-variant/80">
                Other historical highlights and cultural hotspots you might want to visit.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedLandmarks.map((landmark) => (
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
                          <div className="w-8 h-8 rounded-xl bg-amber-500/5 flex items-center justify-center text-amber-500">
                            <span className="material-symbols-outlined text-[15px]">schedule</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[8px] font-black text-outline uppercase tracking-wider">Hours</span>
                            <span className="text-[10px] font-black text-on-surface tracking-tight">
                              {landmark.alwaysOpen
                                ? '24/7'
                                : landmark.openTimeStart && landmark.openTimeEnd
                                  ? `${formatTime(landmark.openTimeStart)} - ${formatTime(landmark.openTimeEnd)}`
                                  : 'N/A'}
                            </span>
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
          </section>
        )}
      </main>
    </div>
  );
}
