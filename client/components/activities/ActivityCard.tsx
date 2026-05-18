'use client';

import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';

interface ActivityCardProps {
  activity: any;
  onClick: (activity: any) => void;
  onChat?: (activity: any) => void;
  isActive?: boolean;
}

const CATEGORY_CONFIG: Record<string, { icon: string; color: string }> = {
  'Nature & Outdoors':   { icon: 'forest',           color: '#43A047' },
  'Arts & Culture':      { icon: 'theater_comedy',   color: '#3F51B5' },
  'Heritage & History':  { icon: 'history_edu',      color: '#607D8B' },
  'Spiritual':           { icon: 'temple_buddhist',  color: '#FF9800' },
  'Eat & Shop':          { icon: 'restaurant',       color: '#F44336' },
  'Sightseeing':         { icon: 'photo_camera',     color: '#0288D1' },
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
  const isHost = !!(user?.id && user.id === activity.hostId);
  const isMember = activity.myStatus === 'APPROVED' && !isHost;
  const hasRequested = activity.myStatus === 'PENDING';

  const host = {
    username: activity.hostName || 'Host',
    avatar: activity.hostAvatar,
    nationality: activity.hostNationality,
  };

  const memberCount = activity.memberCount || 1;

  return (
    <div 
      onClick={() => onClick(activity)}
      className={`group relative overflow-hidden p-5 rounded-xl cursor-pointer transition-all duration-300 border flex flex-col h-full ${
        isActive 
          ? 'bg-white border-primary shadow-lg ring-1 ring-primary/20 scale-[1.01]' 
          : 'bg-white border-outline/10 hover:border-primary/40 hover:shadow-md hover:scale-[1.005]'
      }`}
    >
      <div className="relative z-10 flex flex-col h-full">
        {/* Host & Category Header */}
        <div className="flex justify-between items-start mb-4 gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-lg bg-secondary border border-outline/15 flex items-center justify-center text-on-surface font-bold text-xs shadow-sm overflow-hidden">
                {host.avatar ? (
                  <img src={host.avatar} alt={host.username} className="w-full h-full object-cover" />
                ) : (
                  host.username.charAt(0).toUpperCase()
                )}
              </div>
              {isHost && (
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-primary rounded-full border border-white flex items-center justify-center shadow">
                  <span className="material-symbols-outlined text-[8px] text-white font-bold">star</span>
                </div>
              )}
            </div>
            
            <div className="space-y-0 min-w-0">
              <h4 className="font-extrabold text-on-surface text-xs truncate max-w-[120px]">{host.username}</h4>
              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <span className="text-outline/70 text-[8px] font-black uppercase tracking-widest">Host</span>
                <span className="w-1 h-1 rounded-full bg-outline/25" />
                <span className="text-primary text-[8px] font-black uppercase tracking-widest">{host.nationality || 'Local'}</span>
              </div>
            </div>
          </div>
          
          <div 
            className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-md border border-outline/5"
            style={{ 
              color: CATEGORY_CONFIG[activity.category]?.color || '#607D8B', 
              backgroundColor: `${CATEGORY_CONFIG[activity.category]?.color || '#607D8B'}15` 
            }}
          >
            <span className="material-symbols-outlined text-xs">
              {CATEGORY_CONFIG[activity.category]?.icon || 'theater_comedy'}
            </span>
            <span className="text-[8px] font-black uppercase tracking-widest whitespace-nowrap">
              {formatDate(activity.scheduledAt)}
            </span>
          </div>
        </div>

        {/* Content Block (Expanded to dominate space) */}
        <div className="flex-1 flex flex-col justify-start">
          <h3 className={`font-extrabold text-lg tracking-tighter leading-snug mb-2 transition-colors duration-200 ${isActive ? 'text-primary' : 'text-on-surface group-hover:text-primary'}`}>
            {activity.title}
          </h3>
          
          <p className="text-on-surface-variant text-xs font-medium leading-relaxed line-clamp-4 opacity-90">
            {activity.description || 'Join this activity to explore Hanoi together!'}
          </p>
        </div>
        
        {/* Minimal Footer Actions / Meta info */}
        <div className="mt-4 pt-3 border-t border-outline/5 flex items-end justify-between gap-3">
          {/* Members */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center -space-x-1">
              {[...Array(Math.min(3, memberCount))].map((_, i) => (
                <div key={i} className="w-5 h-5 rounded-full border-2 border-white bg-secondary flex items-center justify-center text-[6px] font-bold shadow-sm overflow-hidden z-10" style={{ zIndex: 10 - i }}>
                  {host.avatar && i === 0 ? <img src={host.avatar} className="w-full h-full object-cover" alt="" /> : '👤'}
                </div>
              ))}
            </div>
            <span className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest ml-1">
              {memberCount} Joined
            </span>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {(isHost || isMember) && onChat && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onChat?.(activity);
                }}
                className="px-4 h-[40px] flex items-center justify-center bg-white text-on-surface border border-outline/20 rounded-lg hover:bg-secondary transition-colors shadow-sm"
                title="Open Chat"
              >
                <span className="material-symbols-outlined text-[16px]">forum</span>
              </button>
            )}

            {isHost ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(activity); 
                }}
                className="px-8 h-[40px] flex items-center justify-center bg-on-surface text-white rounded-lg hover:bg-primary transition-colors font-bold text-[11px] uppercase tracking-widest shadow-sm"
              >
                Manage
              </button>
            ) : isMember ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(activity); 
                }}
                className="px-8 h-[40px] flex items-center justify-center bg-tertiary text-white rounded-lg hover:bg-tertiary/90 transition-colors font-bold text-[11px] uppercase tracking-widest shadow-sm flex gap-1.5"
              >
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                <span>Joined</span>
              </button>
            ) : hasRequested ? (
              <div className="px-8 h-[40px] flex items-center justify-center bg-secondary-container text-on-secondary/70 rounded-lg border border-outline/10 text-[11px] font-black uppercase tracking-widest gap-1.5">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                <span>Pending</span>
              </div>
            ) : (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(activity); 
                }}
                className="px-8 h-[40px] flex items-center justify-center bg-primary text-white rounded-lg hover:bg-primary-container transition-colors font-bold text-[11px] uppercase tracking-widest shadow-sm flex gap-1.5"
              >
                <span>Join Group</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
