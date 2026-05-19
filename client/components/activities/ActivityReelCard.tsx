import React, { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Activity } from '@/types';
import { cancelJoinRequestAction } from '@/lib/actions';

interface ActivityReelCardProps {
  activity: Activity;
  onClick: (activity: Activity) => void;
  onChat?: (activity: Activity) => void;
  onCancelSuccess?: () => void;
}

const CATEGORY_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  'Nature & Outdoors':   { icon: 'forest',           label: 'Nature & Outdoors',  color: '#43A047' },
  'Arts & Culture':      { icon: 'theater_comedy',   label: 'Arts & Culture',     color: '#3F51B5' },
  'Heritage & History':  { icon: 'history_edu',      label: 'Heritage & History', color: '#607D8B' },
  'Spiritual':           { icon: 'temple_buddhist',  label: 'Spiritual',          color: '#FF9800' },
  'Eat & Shop':          { icon: 'restaurant',       label: 'Eat & Shop',         color: '#F44336' },
  'Sightseeing':         { icon: 'photo_camera',     label: 'Sightseeing',        color: '#0288D1' },
};

const BACKEND_URL = process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8888';

function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${BACKEND_URL}${cleanUrl}`;
}

export const ActivityReelCard: React.FC<ActivityReelCardProps> = ({ activity, onClick, onChat, onCancelSuccess }) => {
  const [imgError, setImgError] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const { user } = useAuthStore();

  const handleCancelClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canceling) return;
    
    setCanceling(true);
    const result = await cancelJoinRequestAction(activity.id);
    setCanceling(false);
    
    if (result.success) {
      onCancelSuccess?.();
    } else {
      console.error(result.error);
    }
  };

  const isHost = !!(user?.id && user.id === activity.hostId);
  const isMember = activity.myStatus === 'APPROVED' && !isHost;
  const hasRequested = activity.myStatus === 'PENDING';

  const cat = CATEGORY_CONFIG[activity.category] ?? CATEGORY_CONFIG['Arts & Culture'];
  const memberCount = activity.memberCount || 1;
  const imageUrl = resolveImageUrl(activity.imageUrl);
  const hasImage = !!activity.imageUrl && !imgError;

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
    <article className="w-full bg-white border border-outline/10 rounded-xl overflow-hidden mb-6 transition-all duration-300 hover:shadow-md hover:scale-[1.005]">
      {/* ── Post Header ──────────────────────────────────── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-outline/5 bg-secondary-container/20">
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-lg bg-secondary border border-outline/15 overflow-hidden flex items-center justify-center text-on-surface font-bold text-sm shadow-sm">
            {activity.hostAvatar
              ? <img src={resolveImageUrl(activity.hostAvatar) ?? ''} alt={activity.hostName || ''} className="w-full h-full object-cover" />
              : <span className="text-on-surface font-bold">{(activity.hostName || 'H').charAt(0).toUpperCase()}</span>
            }
          </div>
          {isHost && (
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full border border-white flex items-center justify-center shadow">
              <span className="material-symbols-outlined text-[10px] text-white font-bold">star</span>
            </div>
          )}
        </div>

        {/* Host info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-extrabold text-sm text-on-surface truncate">{activity.hostName || 'Host'}</span>
            {activity.hostNationality && (
              <span className="text-[8px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-full">
                {activity.hostNationality}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span 
              className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md border border-outline/5"
              style={{ color: cat.color, backgroundColor: `${cat.color}15` }}
            >
              <span className="material-symbols-outlined text-[10px]">{cat.icon}</span>
              <span>{cat.label}</span>
            </span>
            <span className="w-1 h-1 rounded-full bg-outline/25" />
            <span className="text-[10px] text-on-surface-variant font-medium">{formatRelative(activity.createdAt)}</span>
          </div>
        </div>

        {/* More Options */}
        <button className="w-8 h-8 flex items-center justify-center text-on-surface/40 hover:text-on-surface rounded-lg hover:bg-secondary transition-colors shrink-0">
          <span className="material-symbols-outlined text-lg">more_horiz</span>
        </button>
      </div>

      {/* ── Cover Image Frame ────────────────────────────── */}
      {hasImage && (
        <div 
          className="relative w-full aspect-[16/9] overflow-hidden bg-secondary-container border-b border-outline/5 cursor-pointer"
          onClick={() => onClick(activity)}
        >
          <img
            src={imageUrl!}
            alt={activity.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-102"
          />
        </div>
      )}

      {/* ── Typographic Content Block ────────────────────── */}
      <div className="px-6 py-5 flex flex-col gap-3">
        <h2 
          className="text-lg font-extrabold tracking-tighter text-on-surface hover:text-primary transition-colors leading-tight cursor-pointer"
          onClick={() => onClick(activity)}
        >
          {activity.title}
        </h2>
        {activity.description && (
          <p className="text-on-surface-variant text-xs leading-relaxed font-medium opacity-90 line-clamp-3">
            {activity.description}
          </p>
        )}

        {/* ── Metadata Row ───────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-4 border-t border-outline/5 mt-2">
          {/* Date */}
          <div className="flex items-center gap-1.5 text-on-surface-variant">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            <span className="text-[10px] font-black uppercase tracking-widest">{formatDate(activity.scheduledAt)}</span>
          </div>

          {/* Location */}
          {activity.address && (
            <div className="flex items-center gap-1.5 text-on-surface-variant min-w-0 max-w-[240px]">
              <span className="material-symbols-outlined text-[14px]">location_on</span>
              <span className="text-[10px] font-black uppercase tracking-widest truncate">{activity.address}</span>
            </div>
          )}

          {/* Members */}
          <div className="flex items-center gap-2 text-on-surface-variant ml-auto shrink-0 bg-secondary-container/60 px-2 py-1 rounded-md border border-outline/5">
            <div className="flex -space-x-1">
              {[...Array(Math.min(3, memberCount))].map((_, i) => (
                <div key={i} className="w-4 h-4 rounded-full border border-white bg-secondary overflow-hidden shrink-0 shadow-sm">
                  {activity.hostAvatar && i === 0
                    ? <img src={resolveImageUrl(activity.hostAvatar) ?? ''} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/60" />
                  }
                </div>
              ))}
            </div>
            <span className="text-[9px] font-black text-on-surface uppercase tracking-widest">{memberCount} Joined</span>
          </div>
        </div>
      </div>

      {/* ── Action Footer ────────────────────────────────── */}
      <div className="flex items-center justify-between border-t border-outline/5 px-6 py-3 bg-secondary-container/10">
        <div className="flex items-center gap-2">
          {/* Interested / Like */}
          <button
            className="px-4 h-[34px] flex items-center gap-1.5 bg-white text-on-surface border border-outline/20 rounded-lg hover:bg-secondary transition-colors font-bold text-[9px] uppercase tracking-widest shadow-sm active:scale-95"
            onClick={(e) => { e.stopPropagation(); }}
          >
            <span className="material-symbols-outlined text-[14px]">thumb_up</span>
            <span>Interested</span>
          </button>

          {/* Chat (Host/Member only) */}
          {(isHost || isMember) && onChat && (
            <button
              onClick={(e) => { e.stopPropagation(); onChat(activity); }}
              className="px-4 h-[34px] flex items-center gap-1.5 bg-white text-on-surface border border-outline/20 rounded-lg hover:bg-secondary transition-colors font-bold text-[9px] uppercase tracking-widest shadow-sm active:scale-95"
            >
              <span className="material-symbols-outlined text-[14px]">forum</span>
              <span>Chat</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isHost ? (
            <button
              onClick={(e) => { e.stopPropagation(); onClick(activity); }}
              className="min-w-[120px] px-4 h-[34px] flex items-center justify-center bg-on-surface text-white rounded-lg hover:bg-primary transition-colors font-bold text-[9px] uppercase tracking-widest shadow-sm active:scale-95"
            >
              Manage
            </button>
          ) : isMember ? (
            <button
              onClick={(e) => { e.stopPropagation(); onClick(activity); }}
              className="min-w-[120px] px-4 h-[34px] flex items-center justify-center bg-tertiary text-white rounded-lg hover:bg-tertiary/90 transition-colors font-bold text-[9px] uppercase tracking-widest shadow-sm active:scale-95 gap-1.5"
            >
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              <span>Joined</span>
            </button>
          ) : hasRequested ? (
            <button
              type="button"
              onClick={handleCancelClick}
              disabled={canceling}
              className="group/btn min-w-[120px] px-4 h-[34px] flex items-center justify-center bg-amber-50 hover:bg-red-50 text-amber-600 hover:text-red-600 rounded-lg border border-amber-200/50 hover:border-red-200/50 text-[9px] font-black uppercase tracking-widest gap-1.5 transition-all duration-300 active:scale-95 disabled:opacity-50"
            >
              {canceling ? (
                <div className="w-3.5 h-3.5 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-[14px] group-hover/btn:hidden">schedule</span>
                  <span className="material-symbols-outlined text-[14px] hidden group-hover/btn:inline">cancel</span>
                  <span className="group-hover/btn:hidden">Pending</span>
                  <span className="hidden group-hover/btn:inline">Cancel</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onClick(activity); }}
              className="min-w-[120px] px-4 h-[34px] flex items-center justify-center bg-primary text-white rounded-lg hover:bg-primary-container transition-colors font-bold text-[9px] uppercase tracking-widest shadow-sm active:scale-95"
            >
              Join Group
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
