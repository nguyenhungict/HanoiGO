'use client';

import { useRouter } from 'next/navigation';
import { useTripStore } from '@/store/useTripStore';

export default function TravelBasket() {
  const router = useRouter();
  const selectedPlaces = useTripStore((s) => s.selectedPlaces);
  const clearPlaces = useTripStore((s) => s.clearPlaces);

  const places = Object.values(selectedPlaces);
  const count = places.length;

  if (count === 0) return null;

  const visibleThumbs = places.slice(0, 4);

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-6 fade-in duration-500">
      <div className="bg-white/85 backdrop-blur-2xl border border-outline/10 rounded-[2rem] shadow-2xl shadow-primary/15 px-6 py-4 flex items-center gap-5 min-w-[360px]">
        {/* Stacked thumbnails */}
        <div className="flex items-center -space-x-3">
          {visibleThumbs.map((place, i) => (
            <div
              key={place.id}
              className="w-10 h-10 rounded-full border-[3px] border-white overflow-hidden shadow-md"
              style={{ zIndex: visibleThumbs.length - i }}
            >
              <img
                src={place.image}
                alt={place.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src.includes('unsplash.com')) return;
                  target.src = 'https://images.unsplash.com/photo-1509030450996-93f25ef2030f?w=800&q=80';
                }}
              />
            </div>
          ))}
          {count > 4 && (
            <div className="w-10 h-10 rounded-full border-[3px] border-white bg-surface-container-high flex items-center justify-center text-[10px] font-black text-outline shadow-md">
              +{count - 4}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-on-surface tracking-tight">
            {count} địa điểm
          </p>
          <p className="text-[10px] font-bold text-outline uppercase tracking-widest">
            Sẵn sàng lên lịch
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={() => router.push('/trips')}
          className="bg-primary text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-sm">route</span>
          Lên lịch trình
        </button>

        {/* Clear button */}
        <button
          onClick={clearPlaces}
          className="w-8 h-8 rounded-full flex items-center justify-center text-outline/40 hover:text-red-500 hover:bg-red-50 transition-all shrink-0"
          title="Xóa tất cả"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>
    </div>
  );
}
