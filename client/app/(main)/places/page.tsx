import Link from 'next/link';
import { getPlaceStory, fetchLandmarks } from '@/lib/landmarks';

type PlacesPageProps = {
  searchParams?: {
    place?: string;
    category?: string;
  };
};

function buildPlacesHref(placeId: string, category?: string) {
  const params = new URLSearchParams({ place: placeId });

  if (category && category !== 'All') {
    params.set('category', category);
  }

  return `/places?${params.toString()}`;
}

export default async function PlacesPage({ searchParams }: PlacesPageProps) {
  const landmarks = await fetchLandmarks();
  const selectedCategory = searchParams?.category || 'All';
  const filteredLandmarks =
    selectedCategory === 'All'
      ? landmarks
      : landmarks.filter((landmark) => landmark.category === selectedCategory);

  const selectedLandmark =
    landmarks.find(l => l.id === searchParams?.place) ||
    filteredLandmarks[0] ||
    landmarks[0];

  const story = getPlaceStory(selectedLandmark);
  const categories = [
    'All',
    ...Array.from(new Set(landmarks.map((landmark) => landmark.category))).slice(0, 6),
  ];
  const archiveLandmarks = filteredLandmarks
    .filter((landmark) => landmark.id !== selectedLandmark.id)
    .slice(0, 9);

  return (
    <div className="min-h-full bg-background animate-in fade-in duration-700">
      <header className="sticky top-0 z-20 border-b border-outline/10 bg-white/80 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-8 py-6">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">
              Place Archive
            </p>
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h1 className="text-4xl font-black tracking-tighter text-on-surface">
                  {selectedLandmark.name}
                </h1>
                <p className="mt-1 text-sm font-medium text-on-surface-variant">
                  Curated from the discovery map into a full editorial view.
                </p>
              </div>
              <Link
                href="/discovery"
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-outline/15 px-6 text-[10px] font-black uppercase tracking-[0.22em] text-on-surface transition-all hover:bg-secondary"
              >
                Return To Discovery
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {categories.map((category) => {
              const href =
                category === 'All'
                  ? buildPlacesHref(selectedLandmark.id)
                  : buildPlacesHref(selectedLandmark.id, category);

              return (
                <Link
                  key={category}
                  href={href}
                  className={`rounded-2xl px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                    selectedCategory === category
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-secondary text-on-secondary hover:scale-[1.01]'
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
          <article className="overflow-hidden rounded-[2rem] border border-outline/10 bg-white shadow-[0_18px_60px_rgba(38,24,23,0.08)]">
            <div className="relative h-[24rem] overflow-hidden bg-secondary-container">
              <img
                src={selectedLandmark.image}
                alt={selectedLandmark.name}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src.includes('unsplash.com')) return;
                  target.src = 'https://images.unsplash.com/photo-1509030450996-93f25ef2030f?w=800&q=80';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-on-surface/90 via-on-surface/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-8 text-white">
                <div className="mb-4 flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] backdrop-blur-xl">
                    {story.eyebrow}
                  </span>
                  <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.24em] backdrop-blur-xl">
                    {selectedLandmark.category}
                  </span>
                </div>
                <h2 className="max-w-3xl text-4xl font-black tracking-tighter">
                  {story.intro}
                </h2>
              </div>
            </div>

            <div className="grid gap-8 p-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
              <div className="space-y-8">
                {selectedLandmark.gallery && selectedLandmark.gallery.length > 0 && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">
                      Visual Archive
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      {selectedLandmark.gallery.slice(1, 4).map((img, idx) => (
                        <div key={idx} className="aspect-[4/3] overflow-hidden rounded-2xl border border-outline/10">
                          <img 
                            src={img} 
                            alt={`${selectedLandmark.name} gallery ${idx + 1}`} 
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover transition-transform hover:scale-110 duration-500"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (target.src.includes('unsplash.com')) return;
                              target.src = 'https://images.unsplash.com/photo-1509030450996-93f25ef2030f?w=800&q=80';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {story.sections.map((section) => (
                  <div key={section.title} className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">
                      {section.title}
                    </p>
                    <p className="text-[15px] leading-8 text-on-surface-variant">
                      {section.body}
                    </p>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="rounded-[1.75rem] bg-secondary-container p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">
                    Archive Note
                  </p>
                  <p className="mt-3 text-sm leading-7 text-on-secondary">
                    {story.archiveNote}
                  </p>
                </div>

                <div className="rounded-[1.75rem] border border-outline/10 bg-background p-6">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-outline">
                    Quick Facts
                  </p>
                  <div className="mt-4 space-y-4">
                    {story.facts.map((fact) => (
                      <div
                        key={fact.label}
                        className="border-b border-outline/10 pb-4 last:border-b-0 last:pb-0"
                      >
                        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-outline">
                          {fact.label}
                        </p>
                        <p className="mt-1 text-sm font-bold text-on-surface">
                          {fact.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </article>

          <aside className="space-y-4">
            <div className="rounded-[2rem] border border-outline/10 bg-white p-6 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-outline">
                Nearby Archive Flow
              </p>
              <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                Move through the collection without losing the editorial framing. Each card opens another destination inside the same archive layout.
              </p>
            </div>

            {archiveLandmarks.slice(0, 4).map((landmark) => (
              <Link
                key={landmark.id}
                href={buildPlacesHref(landmark.id, selectedCategory)}
                className="block overflow-hidden rounded-[1.75rem] border border-outline/10 bg-white transition-all duration-300 hover:scale-[1.01] hover:shadow-xl hover:shadow-primary/10"
              >
                <div className="flex gap-4 p-4">
                  <img
                    src={landmark.image}
                    alt={landmark.name}
                    referrerPolicy="no-referrer"
                    className="h-24 w-24 rounded-[1.25rem] object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src.includes('unsplash.com')) return;
                      target.src = 'https://images.unsplash.com/photo-1509030450996-93f25ef2030f?w=800&q=80';
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                      {landmark.category}
                    </p>
                    <h3 className="mt-2 line-clamp-2 text-lg font-black tracking-tight text-on-surface">
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

        <section className="space-y-5">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">
                Archive Continuum
              </p>
              <h2 className="text-3xl font-black tracking-tighter text-on-surface">
                Continue Through The Collection
              </h2>
            </div>
            <p className="text-sm font-medium text-on-surface-variant">
              Select another place to swap the hero article without leaving the places route.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {archiveLandmarks.map((landmark) => (
              <Link
                key={landmark.id}
                href={buildPlacesHref(landmark.id, selectedCategory)}
                className="group overflow-hidden rounded-[2rem] border border-outline/10 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-primary/10"
              >
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={landmark.image}
                    alt={landmark.name}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src.includes('unsplash.com')) return;
                      target.src = 'https://images.unsplash.com/photo-1509030450996-93f25ef2030f?w=800&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-on-surface/75 via-transparent to-transparent" />
                  <div className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-primary backdrop-blur-xl">
                    {landmark.category}
                  </div>
                </div>

                <div className="space-y-4 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-xl font-black tracking-tight text-on-surface">
                      {landmark.name}
                    </h3>
                    <div className="flex items-center gap-1 text-primary">
                      <span className="material-symbols-outlined text-base">star</span>
                      <span className="text-xs font-black">{landmark.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  <p className="line-clamp-3 text-sm leading-7 text-on-surface-variant">
                    {getPlaceStory(landmark).sections[0].body}
                  </p>

                  <div className="flex items-center justify-between border-t border-outline/10 pt-4 text-[10px] font-black uppercase tracking-[0.22em] text-outline transition-colors group-hover:text-primary">
                    <span>Read Introduction</span>
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
