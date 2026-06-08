import Link from 'next/link';
import { getPlaceStory, fetchLandmarks } from '@/lib/landmarks';
import PlaceDetailsContent from '@/components/places/PlaceDetailsContent';

export const dynamic = 'force-dynamic';

type PlaceDetailsPageProps = {
  params: { id: string };
  searchParams?: { category?: string };
};

export default async function PlaceDetailsPage({ params, searchParams }: PlaceDetailsPageProps) {
  const landmarks = await fetchLandmarks();
  const selectedCategory = searchParams?.category || 'All';
  const filteredLandmarks =
    selectedCategory === 'All'
      ? landmarks
      : landmarks.filter((landmark) => landmark.category === selectedCategory);

  const selectedLandmark = landmarks.find(l => l.id === params.id) || landmarks[0];

  const story = getPlaceStory(selectedLandmark);
  const categories = [
    'All',
    ...Array.from(new Set(landmarks.map((landmark) => landmark.category))).slice(0, 6),
  ];
  
  const archiveLandmarks = filteredLandmarks
    .filter((landmark) => landmark.id !== selectedLandmark.id)
    .slice(0, 9);

  return (
    <div className="min-h-full bg-background animate-in fade-in duration-700 font-body">
      <header className="relative z-20 border-b border-outline/10 bg-white/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-8 py-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <Link href="/places" className="text-outline hover:text-primary transition-colors flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest">
                    <span className="material-symbols-outlined text-[14px]">arrow_back</span>
                    Back to Directory
                 </Link>
                 <span className="text-outline/30 text-xs">|</span>
                 <p className="text-[9px] font-black uppercase tracking-[0.28em] text-primary">
                   Place Archive
                 </p>
              </div>
              <Link
                href="/discovery"
                className="inline-flex h-9 items-center justify-center rounded-xl border border-outline/15 px-4 text-[9px] font-black uppercase tracking-[0.22em] text-on-surface transition-all hover:bg-secondary"
              >
                Return To Discovery Map
              </Link>
            </div>
            
            <div className="flex flex-col gap-1.5 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tighter text-on-surface">
                  {selectedLandmark.name}
                </h1>
                <p className="text-xs font-medium text-on-surface-variant">
                  Curated from the discovery map into a full editorial view.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t border-outline/5 pt-2">
            {categories.map((category) => {
              const href = `/places/${selectedLandmark.id}${category !== 'All' ? `?category=${category}` : ''}`;
              return (
                <Link
                  key={category}
                  href={href}
                  className={`rounded-lg px-4 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] transition-all border ${
                    selectedCategory === category
                      ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-white border-outline/10 text-on-surface-variant hover:bg-secondary hover:text-on-surface hover:border-secondary hover:scale-[1.02]'
                  }`}
                >
                  {category}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-7xl flex-col gap-8 px-8 py-8">
        <section className="grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_24rem]">
          <PlaceDetailsContent landmark={selectedLandmark} story={story} />

          <aside className="space-y-4">
            <div className="rounded-3xl border border-outline/10 bg-white p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-outline">
                Nearby Archive Flow
              </p>
              <p className="mt-3 text-sm font-medium leading-7 text-on-surface-variant">
                Move through the collection without losing the editorial framing. Each card opens another destination inside the same archive layout.
              </p>
            </div>

            {archiveLandmarks.slice(0, 4).map((landmark) => (
              <Link
                key={landmark.id}
                href={`/places/${landmark.id}${selectedCategory !== 'All' ? `?category=${selectedCategory}` : ''}`}
                className="block overflow-hidden rounded-3xl border border-outline/10 bg-white transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:shadow-primary/10"
              >
                <div className="flex gap-4 p-4">
                  <img
                    src={landmark.image}
                    alt={landmark.name}
                    referrerPolicy="no-referrer"
                    className="h-24 w-24 rounded-2xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                      {landmark.category}
                    </p>
                    <h3 className="mt-2 line-clamp-2 text-lg font-extrabold tracking-tight text-on-surface">
                      {landmark.name}
                    </h3>
                    <p className="mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-outline">
                      Open Article
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </aside>
        </section>

        {archiveLandmarks.length > 4 && (
          <section className="space-y-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">
                  Archive Continuum
                </p>
                <h2 className="text-3xl font-extrabold tracking-tighter text-on-surface">
                  Continue Through The Collection
                </h2>
              </div>
              <p className="text-sm font-medium text-on-surface-variant">
                Select another place to swap the hero article without leaving the places route.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {archiveLandmarks.slice(4).map((landmark) => (
                <Link
                  key={landmark.id}
                  href={`/places/${landmark.id}${selectedCategory !== 'All' ? `?category=${selectedCategory}` : ''}`}
                  className="group overflow-hidden rounded-3xl border border-outline/10 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 flex flex-col"
                >
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={landmark.image}
                      alt={landmark.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-on-surface/75 via-transparent to-transparent" />
                    <div className="absolute left-5 top-5 rounded-lg border border-white/20 bg-white/20 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-white backdrop-blur-md">
                      {landmark.category}
                    </div>
                  </div>

                  <div className="space-y-4 p-6 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-xl font-extrabold tracking-tight text-on-surface">
                        {landmark.name}
                      </h3>
                      <div className="flex items-center gap-1 text-primary shrink-0">
                        <span className="material-symbols-outlined fill-1 text-base">star</span>
                        <span className="text-xs font-black">{landmark.rating.toFixed(1)}</span>
                      </div>
                    </div>

                    <p className="line-clamp-3 text-sm font-medium leading-7 text-on-surface-variant flex-1">
                      {getPlaceStory(landmark).sections[0].body}
                    </p>

                    <div className="flex items-center justify-between border-t border-outline/10 pt-4 text-[10px] font-black uppercase tracking-[0.22em] text-outline transition-colors group-hover:text-primary mt-auto">
                      <span>Read Introduction</span>
                      <span className="material-symbols-outlined text-base group-hover:translate-x-1 transition-transform">arrow_forward</span>
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
