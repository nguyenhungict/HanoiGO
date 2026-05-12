'use client';

import React, { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

import { Activity } from '@/types';

interface ActivityReelCardProps {
  activity: Activity;
  onClick: (activity: Activity) => void;
  onChat?: (activity: Activity) => void;
}

const CATEGORY_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  'Nature & Outdoors':   { icon: 'forest',           label: 'Nature & Outdoors',   color: 'bg-emerald-600' },
  'Arts & Culture':      { icon: 'theater_comedy',   label: 'Arts & Culture',      color: 'bg-purple-600' },
  'Heritage & History':  { icon: 'history_edu',      label: 'Heritage & History',  color: 'bg-amber-700' },
  'Spiritual':           { icon: 'temple_buddhist',  label: 'Spiritual',           color: 'bg-amber-600' },
  'Eat & Shop':          { icon: 'restaurant',       label: 'Eat & Shop',          color: 'bg-orange-500' },
  'Sightseeing':         { icon: 'photo_camera',     label: 'Sightseeing',         color: 'bg-blue-500' },
};

const BACKEND_URL = process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8888';

function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  
  // Tránh bị double slash //
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${BACKEND_URL}${cleanUrl}`;
}

export const ActivityReelCard: React.FC<ActivityReelCardProps> = ({ activity, onClick, onChat }) => {
  const [imgError, setImgError] = useState(false);
  const { user } = useAuthStore();

  const isHost = !!(user?.id && user.id === activity.hostId);
  const isMember = activity.myStatus === 'APPROVED' && !isHost;
  const hasRequested = activity.myStatus === 'PENDING';

  const cat = CATEGORY_CONFIG[activity.category] ?? CATEGORY_CONFIG['Arts & Culture'];
  const memberCount = activity.memberCount || 1;
  const imageUrl = resolveImageUrl(activity.imageUrl);
  const hasImage = !!activity.imageUrl && !imgError;

  // Debug log (Bạn có thể xoá sau khi đã chạy ổn)
  if (activity.imageUrl) {
    console.log(`Activity [${activity.title}] Image:`, imageUrl);
  }

  const formatDate = (ds: string) => {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      }).format(new Date(ds));
    } catch { return 'Invalid Date'; }
  };

  const formatRelative = (ds: string) => {
    try {
      const diff = Date.now() - new Date(ds).getTime();
      const h = Math.floor(diff / 3600000);
      if (h < 1) return 'Just now';
      if (h < 24) return `${h}h ago`;
      const d = Math.floor(h / 24);
      return `${d}d ago`;
    } catch { return ''; }
  };

  return (
    <article className="w-full bg-white/70 backdrop-blur-xl border border-white/40 rounded-none md:rounded-[2.5rem] overflow-hidden mb-0 md:mb-6 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.1)] hover:scale-[1.005]">
      {/* ── Post Header ──────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-full bg-secondary border-2 border-primary/20 overflow-hidden flex items-center justify-center text-white font-bold text-sm shadow">
            {activity.hostAvatar
              ? <img src={resolveImageUrl(activity.hostAvatar) ?? ''} alt={activity.hostName || ''} className="w-full h-full object-cover" />
              : <span className="text-on-surface font-bold">{(activity.hostName || 'H').charAt(0).toUpperCase()}</span>
            }
          </div>
          {isHost && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-primary rounded-full border-2 border-white flex items-center justify-center">
              <span className="material-symbols-outlined text-[8px] text-white fill-1">star</span>
            </div>
          )}
        </div>

        {/* Host info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm text-on-surface truncate">{activity.hostName || 'Host'}</span>
            {activity.hostNationality && (
              <span className="text-[9px] font-bold text-primary uppercase tracking-widest bg-primary/8 px-2 py-0.5 rounded-full">
                {activity.hostNationality}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold text-white uppercase tracking-widest px-2 py-0.5 rounded-full ${cat.color}`}>
              <span className="material-symbols-outlined text-[10px]">{cat.icon}</span>
              {cat.label}
            </span>
            <span className="text-[10px] text-on-surface-variant font-medium">{formatRelative(activity.createdAt)}</span>
          </div>
        </div>

        {/* More options placeholder */}
        <button className="w-8 h-8 flex items-center justify-center text-on-surface/40 hover:text-on-surface rounded-full hover:bg-secondary transition-all">
          <span className="material-symbols-outlined text-lg">more_horiz</span>
        </button>
      </div>

      {/* ── Cover Image / Text Background ────────────────── */}
      <div
        className="relative w-full cursor-pointer select-none"
        style={{ minHeight: hasImage ? 320 : 'auto' }}
        onClick={() => onClick(activity)}
      >
        {hasImage ? (
          <>
            <img
              src={imageUrl!}
              alt={activity.title}
              onError={() => setImgError(true)}
              className="w-full object-cover"
              style={{ maxHeight: 480, minHeight: 280 }}
            />
            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

            {/* Title overlay on image */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              <h2 className="text-white font-bold text-lg leading-tight drop-shadow-lg line-clamp-2">
                {activity.title}
              </h2>
            </div>
          </>
        ) : (
          /* Threads-style text post when no image */
          <div className="px-4 pb-3">
            <h2 className="font-bold text-on-surface text-lg leading-snug mb-2 mt-1">
              {activity.title}
            </h2>
            {activity.description && (
              <p className="text-on-surface-variant text-sm leading-relaxed line-clamp-4">
                {activity.description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Description (below image) ─────────────────────── */}
      {hasImage && activity.description && (
        <div className="px-4 pt-3">
          <p className="text-on-surface-variant text-sm leading-relaxed line-clamp-2">
            {activity.description}
          </p>
        </div>
      )}

      {/* ── Meta info row ─────────────────────────────────── */}
      <div className="flex items-center gap-4 px-4 py-3 border-t border-outline/5 mt-2">
        {/* Date */}
        <div className="flex items-center gap-1.5 text-on-surface-variant">
          <span className="material-symbols-outlined text-[14px]">schedule</span>
          <span className="text-[11px] font-semibold">{formatDate(activity.scheduledAt)}</span>
        </div>

        {/* Location */}
        {activity.address && (
          <div className="flex items-center gap-1.5 text-on-surface-variant flex-1 min-w-0">
            <span className="material-symbols-outlined text-[14px]">location_on</span>
            <span className="text-[11px] font-semibold truncate">{activity.address}</span>
          </div>
        )}

        {/* Members */}
        <div className="flex items-center gap-1.5 text-on-surface-variant ml-auto shrink-0">
          <div className="flex -space-x-1.5">
            {[...Array(Math.min(3, memberCount))].map((_, i) => (
              <div
                key={i}
                className="w-5 h-5 rounded-full border-2 border-white bg-secondary overflow-hidden"
              >
                {activity.hostAvatar && i === 0
                  ? <img src={resolveImageUrl(activity.hostAvatar) ?? ''} className="w-full h-full object-cover" alt="" />
                  : <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/60" />
                }
              </div>
            ))}
          </div>
          <span className="text-[11px] font-bold text-on-surface">{memberCount}</span>
          <span className="text-[11px] text-on-surface-variant">joined</span>
        </div>
      </div>

      {/* ── Action Bar ────────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-outline/5 px-4 py-2 bg-slate-50/30">
        <div className="flex items-center gap-1">
          {/* Interested / Like button */}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-on-surface/50 hover:text-primary hover:bg-primary/5 transition-all text-[11px] font-bold uppercase tracking-widest"
            onClick={(e) => { e.stopPropagation(); /* Future: Like logic */ }}
          >
            <span className="material-symbols-outlined text-lg">thumb_up</span>
            <span className="hidden sm:inline">Interested</span>
          </button>

          {/* Chat — only for members/host */}
          {(isHost || isMember) && onChat && (
            <button
              onClick={(e) => { e.stopPropagation(); onChat(activity); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-primary bg-primary/8 hover:bg-primary/12 transition-all text-[11px] font-bold uppercase tracking-widest border border-primary/10"
            >
              <span className="material-symbols-outlined text-lg">forum</span>
              <span>Chat</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isHost ? (
            <button
              onClick={(e) => { e.stopPropagation(); onClick(activity); }}
              className="px-5 py-2 bg-on-surface text-white rounded-xl hover:bg-on-surface/90 transition-all font-bold text-[10px] uppercase tracking-widest shadow-md"
            >
              Manage
            </button>
          ) : isMember ? (
            <button
              onClick={(e) => { e.stopPropagation(); onClick(activity); }}
              className="px-5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all font-bold text-[10px] uppercase tracking-widest shadow-md flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">check_circle</span>
              Joined
            </button>
          ) : hasRequested ? (
            <div className="px-5 py-2 bg-secondary/50 text-on-surface-variant text-center rounded-xl text-[10px] font-bold uppercase tracking-widest border border-outline/5">
              Pending…
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onClick(activity); }}
              className="px-5 py-2 bg-primary text-white rounded-xl hover:opacity-90 transition-all font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20"
            >
              Join Group
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
