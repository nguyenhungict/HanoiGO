import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/useAuthStore';
import { Activity } from '@/types';
import { cancelJoinRequestAction, cloneActivityTripAction } from '@/lib/actions';
import { useNotification } from '@/hooks/use-notification';

interface ActivityReelCardProps {
  activity: Activity;
  onClick: (activity: Activity) => void;
  onChat?: (activity: Activity) => void;
  onCancelSuccess?: () => void;
}

const CATEGORY_CONFIG: Record<string, { icon: string; label: string; bg: string; text: string }> = {
  'Nature & Outdoors':  { icon: 'park',            label: 'Nature',      bg: '#43A0471A', text: '#43A047' },
  'Arts & Culture':     { icon: 'museum',          label: 'Culture',     bg: '#3F51B51A', text: '#3F51B5' },
  'Heritage & History': { icon: 'account_balance', label: 'Heritage',    bg: '#607D8B1A', text: '#607D8B' },
  'Spiritual':          { icon: 'temple_buddhist', label: 'Spiritual',   bg: '#FF98001A', text: '#FF9800' },
  'Eat & Shop':         { icon: 'restaurant',      label: 'Food',        bg: '#F443361A', text: '#F44336' },
  'Sightseeing':        { icon: 'location_on',     label: 'Sightseeing', bg: '#0288D11A', text: '#0288D1' },
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
  const [cloning, setCloning] = useState(false);
  const { user } = useAuthStore();
  const router = useRouter();
  const { show } = useNotification();

  const handleCancelClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canceling) return;
    setCanceling(true);
    const result = await cancelJoinRequestAction(activity.id);
    setCanceling(false);
    if (result.success) onCancelSuccess?.();
    else console.error(result.error);
  };

  const handleCloneTrip = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (cloning || !user) return;
    setCloning(true);
    const result = await cloneActivityTripAction(activity.id);
    setCloning(false);
    if (result.success) {
      show({ type: 'success', title: 'Trip Saved!', message: 'The trip has been saved to your account.' });
      router.push('/trips');
    } else {
      show({ type: 'error', title: 'Error', message: result.error || 'Failed to save trip.' });
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
      const d = new Date(ds);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        + ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const formatRelative = (ds: string) => {
    try {
      const diff = Date.now() - new Date(ds).getTime();
      const h = Math.floor(diff / 3600000);
      if (h < 1) return 'Just now';
      if (h < 24) return `${h}h ago`;
      return `${Math.floor(h / 24)}d ago`;
    } catch { return ''; }
  };

  return (
    <article className="bg-white rounded-xl border border-outline/15 mb-4 overflow-hidden transition-all duration-200 hover:border-outline/30 hover:shadow-sm">

      {/* ── Cover ────────────────────────────────────────── */}
      {hasImage && (
      <div
        className="relative w-full overflow-hidden cursor-pointer"
        style={{ aspectRatio: '16/9' }}
        onClick={() => onClick(activity)}
      >
          <img
            src={imageUrl!}
            alt={activity.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />

        {/* Shared-trip badge */}
        {activity.tripId && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-on-surface/75 backdrop-blur-sm text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md">
            <span className="material-symbols-outlined text-[12px]">route</span>
            Shared Trip
          </div>
        )}
      </div>
      )}

      {/* ── Body ─────────────────────────────────────────── */}
      <div className={`px-5 pb-3 ${hasImage ? 'pt-4' : 'pt-5'}`}>

        {/* Author row */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-secondary-container overflow-hidden flex items-center justify-center shrink-0 border border-[#e8e3dd]">
            {activity.hostAvatar
              ? <img src={resolveImageUrl(activity.hostAvatar) ?? ''} alt="" className="w-full h-full object-cover" />
              : <span className="text-xs font-bold text-on-surface-variant">{(activity.hostName || 'H')[0].toUpperCase()}</span>
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-on-surface truncate">{activity.hostName || 'Host'}</span>
              {isHost && (
                <span className="text-[8px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded">You</span>
              )}
              {activity.hostNationality && (
                <span className="text-[9px] text-on-surface-variant">· {activity.hostNationality}</span>
              )}
            </div>
            <span className="text-[11px] text-on-surface-variant">{formatRelative(activity.createdAt)}</span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {activity.tripId && !hasImage && (
              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-on-surface text-white">
                <span className="material-symbols-outlined text-[11px]">route</span>
                Trip
              </span>
            )}
            <span
              className="text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-md"
              style={{ backgroundColor: cat.bg, color: cat.text }}
            >
              {cat.label}
            </span>
          </div>
        </div>

        <h2
          className={`${hasImage ? 'text-[15px]' : 'text-xl'} font-extrabold text-on-surface leading-snug mb-2 cursor-pointer hover:text-primary transition-colors`}
          onClick={() => onClick(activity)}
        >
          {activity.title}
        </h2>

        {activity.description && (
          <p className={`text-[13px] text-on-surface-variant leading-relaxed mb-3 ${hasImage ? 'line-clamp-2' : 'line-clamp-4'}`}>
            {activity.description}
          </p>
        )}

        {/* Meta pills */}
        <div className="flex flex-wrap gap-2 mt-2">
          <span className="flex items-center gap-1 text-[11px] text-on-surface-variant">
            <span className="material-symbols-outlined text-[13px]">schedule</span>
            {formatDate(activity.scheduledAt)}
          </span>

          {activity.address && (
            <span className="flex items-center gap-1 text-[11px] text-on-surface-variant truncate max-w-[200px]">
              <span className="material-symbols-outlined text-[13px]">location_on</span>
              {activity.address}
            </span>
          )}

          <span className="flex items-center gap-1 text-[11px] text-on-surface-variant ml-auto">
            <span className="material-symbols-outlined text-[13px]">group</span>
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </span>
        </div>
      </div>

      {/* ── Actions ──────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-outline/10">
        <div className="flex items-center gap-2">
          {(isHost || isMember) && onChat && (
            <button
              onClick={(e) => { e.stopPropagation(); onChat(activity); }}
              className="flex items-center gap-1.5 text-[12px] font-medium text-on-surface-variant hover:text-on-surface transition-colors px-2 py-1.5 rounded-lg hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[16px]">chat_bubble_outline</span>
              Chat
            </button>
          )}
        </div>

        {/* Primary CTA */}
        <div className="flex items-center gap-2">
          {activity.tripId ? (
            !isHost ? (
              <button
                onClick={handleCloneTrip}
                disabled={cloning}
                className="flex items-center gap-1.5 px-4 h-9 bg-on-surface text-white text-[12px] font-semibold rounded-lg hover:bg-primary transition-colors disabled:opacity-50"
              >
                {cloning
                  ? <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><span className="material-symbols-outlined text-[14px]">bookmark_add</span> Save trip</>
                }
              </button>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); onClick(activity); }}
                className="px-4 h-9 text-[12px] font-semibold text-on-surface-variant border border-[#e8e3dd] rounded-lg hover:bg-surface-container transition-colors"
              >
                Details
              </button>
            )
          ) : isHost ? (
            <button
              onClick={(e) => { e.stopPropagation(); onClick(activity); }}
              className="px-4 h-9 text-[12px] font-semibold text-on-surface-variant border border-[#e8e3dd] rounded-lg hover:bg-surface-container transition-colors"
            >
              Manage
            </button>
          ) : isMember ? (
            <button
              onClick={(e) => { e.stopPropagation(); onClick(activity); }}
              className="flex items-center gap-1.5 px-4 h-9 bg-[#E8F5E9] text-[#2E7D32] text-[12px] font-semibold rounded-lg hover:bg-[#C8E6C9] transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">check_circle</span>
              Joined
            </button>
          ) : hasRequested ? (
            <button
              onClick={handleCancelClick}
              disabled={canceling}
              className="group/btn flex items-center gap-1.5 px-4 h-9 bg-[#FFF3E0] text-[#E65100] text-[12px] font-semibold rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
            >
              {canceling
                ? <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                : (
                  <>
                    <span className="material-symbols-outlined text-[14px] group-hover/btn:hidden">schedule</span>
                    <span className="material-symbols-outlined text-[14px] hidden group-hover/btn:block">cancel</span>
                    <span className="group-hover/btn:hidden">Pending</span>
                    <span className="hidden group-hover/btn:block">Cancel</span>
                  </>
                )
              }
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onClick(activity); }}
              className="px-4 h-9 bg-primary text-white text-[12px] font-semibold rounded-lg hover:bg-primary-container transition-colors shadow-sm"
            >
              Join group
            </button>
          )}
        </div>
      </div>
    </article>
  );
};
