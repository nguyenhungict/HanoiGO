'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getNearbyPlacesAction, type NearbyPlace } from '@/lib/actions/places';

const RADIUS_OPTIONS = [
  { label: '2 km', value: 2000 },
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
];

const formatDistance = (m: number) =>
  m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;

/**
 * Opt-in proximity search. The surrounding Places page is a server component
 * and keeps rendering the full landmark list untouched — this panel only ever
 * adds a result set, so a denied GPS permission or an empty radius can never
 * blank out the page.
 */
export default function NearbyPlaces() {
  const [radius, setRadius] = useState(5000);
  const [places, setPlaces] = useState<NearbyPlace[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = (meters: number) => {
    if (!('geolocation' in navigator)) {
      setError('Trình duyệt của bạn không hỗ trợ định vị.');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const result = await getNearbyPlacesAction(
          pos.coords.latitude,
          pos.coords.longitude,
          meters,
        );
        if ('error' in result) {
          setError(result.error);
          setPlaces(null);
        } else {
          setPlaces(result.data);
        }
        setLoading(false);
      },
      (err) => {
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Bạn đã từ chối quyền truy cập vị trí.'
            : 'Không lấy được vị trí của bạn.',
        );
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  const reset = () => {
    setPlaces(null);
    setError(null);
  };

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-outline/10 p-5 rounded-[2rem] shadow-[0_8px_30px_rgba(0,0,0,0.015)] space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-outline px-1">
          Near You
        </span>
        {places && (
          <button
            type="button"
            onClick={reset}
            className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant hover:text-primary transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex gap-1.5">
        {RADIUS_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              setRadius(opt.value);
              if (places || error) search(opt.value);
            }}
            className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-all ${radius === opt.value
              ? 'bg-primary text-white shadow-sm'
              : 'bg-white border border-outline/10 text-on-surface-variant hover:border-primary/30'
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => search(radius)}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary text-white font-black text-xs shadow-sm hover:opacity-90 disabled:opacity-60 transition-all"
      >
        <span className="material-symbols-outlined text-base">
          {loading ? 'progress_activity' : 'my_location'}
        </span>
        {loading ? 'Searching...' : 'Places near me'}
      </button>

      {error && (
        <p className="text-[11px] font-bold text-on-surface-variant leading-relaxed px-1">
          {error}
        </p>
      )}

      {places && places.length === 0 && !error && (
        <p className="text-[11px] font-bold text-on-surface-variant leading-relaxed px-1">
          There are no places within {formatDistance(radius)}. Try expanding the
          radius.
        </p>
      )}

      {places && places.length > 0 && (
        <div className="space-y-1.5 max-h-[22rem] overflow-y-auto -mx-1 px-1">
          <p className="text-[10px] font-bold text-on-surface-variant px-1 pb-1">
            {places.length} places within {formatDistance(radius)}
          </p>
          {places.map((p) => (
            <Link
              key={p.id}
              href={`/places/${p.id}`}
              className="flex items-center gap-3 p-2.5 rounded-2xl bg-white border border-outline/10 hover:border-primary/30 hover:shadow-sm transition-all group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-on-surface truncate group-hover:text-primary transition-colors">
                  {p.name}
                </p>
                <p className="text-[10px] font-bold text-on-surface-variant truncate">
                  {p.category}
                </p>
              </div>
              <span className="text-[10px] font-black text-primary tabular-nums shrink-0">
                {formatDistance(p.distanceMeters)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
