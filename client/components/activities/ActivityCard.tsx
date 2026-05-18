'use client';

import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';

interface ActivityCardProps {
  activity: any;
  onClick: (activity: any) => void;
  onChat?: (activity: any) => void;
  isActive?: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Nature & Outdoors': 'forest',
  'Arts & Culture': 'theater_comedy',
  'Heritage & History': 'history_edu',
  'Spiritual': 'temple_buddhist',
  'Eat & Shop': 'restaurant',
  'Sightseeing': 'photo_camera',
};

export const ActivityCard: React.FC<ActivityCardProps> = ({ activity, onClick, onChat, isActive }) => {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch (e) {
      return 'Invalid Date';
    }
  };

  const { user } = useAuthStore();
  // isHost: user.id must match hostId. Also covers case where user is host (they're APPROVED too).
  const isHost = !!(user?.id && user.id === activity.hostId);
  // isMember: APPROVED but not the host (to avoid double-rendering Manage+Joined)
  const isMember = activity.myStatus === 'APPROVED' && !isHost;
  const hasRequested = activity.myStatus === 'PENDING';

  const host = {
    username: activity.hostName || 'Host',
    avatar: activity.hostAvatar,
    nationality: activity.hostNationality
  };

  const memberCount = activity.memberCount || 1;

  return (
    <div 
      onClick={() => onClick(activity)}
      className={`group relative overflow-hidden p-6 rounded-[2rem] cursor-pointer transition-all duration-500 border h-full flex flex-col ${
        isActive 
          ? 'bg-white/90 backdrop-blur-2xl border-primary shadow-[0_20px_50px_rgba(0,0,0,0.1)] scale-[1.02]' 
          : 'bg-white/60 backdrop-blur-xl border-white/40 hover:border-primary/40 hover:shadow-xl hover:scale-[1.01]'
      }`}
    >
      {/* Background Accent */}
      <div className={`absolute -right-20 -top-20 w-40 h-40 rounded-full blur-[80px] transition-all duration-700 ${
        isActive ? 'bg-primary/20 opacity-100' : 'bg-primary/5 opacity-0 group-hover:opacity-100'
      }`} />

      <div className="relative z-10 flex flex-col h-full">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
            <div className="w-11 h-11 rounded-xl bg-on-surface flex items-center justify-center text-white font-bold text-base shadow-lg overflow-hidden border-2 border-white">
                {host.avatar ? (
                   <img src={host.avatar} alt={host.username} className="w-full h-full object-cover" />
                ) : (
                  host.username.charAt(0).toUpperCase()
                )}
              </div>
              {isHost && (
                <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-primary rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-[12px] text-white font-bold">star</span>
                </div>
              )}
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-outline/60 text-[9px] font-bold uppercase tracking-widest">Host</span>
                <span className="w-1 h-1 rounded-full bg-outline/20" />
                <span className="text-primary text-[9px] font-bold uppercase tracking-widest">{host.nationality || 'Local'}</span>
              </div>
              <h4 className="font-bold text-on-surface text-sm">{host.username}</h4>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
              <div className="bg-secondary px-3 py-1.5 rounded-xl border border-outline/5 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm text-on-surface/40">
                  {CATEGORY_ICONS[activity.category] || 'theater_comedy'}
                </span>
                <span className="text-[9px] font-bold text-on-secondary uppercase tracking-widest whitespace-nowrap">
                   {formatDate(activity.scheduledAt)}
                </span>
             </div>
          </div>
        </div>

        <h3 className={`font-bold text-base tracking-tight leading-tight mb-2 transition-colors ${isActive ? 'text-primary' : 'text-on-surface group-hover:text-primary'}`}>
          {activity.title}
        </h3>
        
        <p className="text-on-surface-variant text-[11px] font-medium line-clamp-2 mb-5 leading-relaxed opacity-80 min-h-[2.5rem]">
          {activity.description || 'Join this activity to explore Hanoi together!'}
        </p>
        
        <div className="mt-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 bg-secondary/50 px-3 py-1.5 rounded-xl border border-outline/5">
            <div className="flex items-center -space-x-1.5">
              {[...Array(Math.min(3, memberCount))].map((_, i) => (
                <div key={i} className="w-5 h-5 rounded-full border-2 border-white bg-secondary flex items-center justify-center text-[7px] font-bold shadow-sm overflow-hidden">
                   {host.avatar && i === 0 ? <img src={host.avatar} className="w-full h-full object-cover" /> : '👤'}
                </div>
              ))}
            </div>
            <span className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest">
              {memberCount} Joined
            </span>
          </div>
          
          <div className="flex gap-2">
            {(isHost || isMember) && onChat && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onChat?.(activity);
                }}
                className="px-4 h-[34px] flex items-center gap-1.5 bg-white text-on-surface border border-outline/20 rounded-xl hover:bg-surface transition-all active:scale-95 font-bold text-[10px] uppercase tracking-widest shadow-sm"
                title="Open Chat"
              >
                <span className="material-symbols-outlined text-[16px]">forum</span>
                <span>Chat</span>
              </button>
            )}

            {isHost ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(activity); 
                }}
                className="px-4 h-[34px] flex items-center justify-center bg-on-surface text-white rounded-xl hover:bg-on-surface/90 transition-all active:scale-95 font-bold text-[10px] uppercase tracking-widest shadow-sm"
              >
                Manage
              </button>
            ) : isMember ? (
               <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(activity); 
                }}
                className="px-4 py-2 bg-tertiary text-white rounded-xl hover:bg-tertiary/90 transition-all active:scale-95 font-bold text-[10px] uppercase tracking-widest shadow-sm flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                Joined
              </button>
            ) : hasRequested ? (
                 <div className="px-4 py-2 bg-secondary/40 text-on-surface-variant/70 rounded-xl flex items-center gap-1 border border-outline/10 text-[10px] font-bold uppercase tracking-widest justify-center">
                    Pending
                 </div>
            ) : (
               <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(activity); 
                }}
                className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all active:scale-95 font-bold text-[10px] uppercase tracking-widest shadow-sm"
              >
                Join Group
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
