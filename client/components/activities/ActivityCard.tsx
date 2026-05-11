'use client';

import React from 'react';
import { useAuthStore } from '@/store/useAuthStore';

interface ActivityCardProps {
  activity: any;
  onClick: (activity: any) => void;
  onChat?: (activity: any) => void;
  isActive?: boolean;
}

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
      className={`group relative overflow-hidden p-5 rounded-3xl cursor-pointer transition-all duration-500 border-2 h-full flex flex-col ${
        isActive 
          ? 'bg-white border-primary shadow-xl shadow-primary/5 scale-[1.01]' 
          : 'bg-white border-outline/5 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:scale-[1.01]'
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
                  {activity.category === 'food' ? 'restaurant' : 
                   activity.category === 'history' ? 'history_edu' : 
                   activity.category === 'nature' ? 'forest' : 
                   activity.category === 'sport' ? 'sports_soccer' : 
                   activity.category === 'shopping' ? 'shopping_bag' : 'theater_comedy'}
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
                className="w-8 h-8 flex items-center justify-center bg-primary/10 text-primary rounded-xl hover:bg-primary hover:text-white transition-all active:scale-95"
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
                className="px-3 py-1.5 bg-on-surface/5 text-on-surface border border-outline/10 rounded-xl hover:bg-on-surface/10 transition-all active:scale-95 font-bold text-[9px] uppercase tracking-widest"
              >
                Manage
              </button>
            ) : isMember ? (
               <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(activity); 
                }}
                className="px-3 py-1.5 bg-secondary text-on-secondary rounded-xl hover:opacity-90 transition-all active:scale-95 font-bold text-[9px] uppercase tracking-widest border border-outline/10"
              >
                Joined
              </button>
            ) : hasRequested ? (
                <div className="px-3 py-1.5 bg-secondary/30 text-on-secondary/50 rounded-xl flex items-center gap-1 border border-outline/5">
                   <span className="text-[9px] font-bold uppercase tracking-widest">Pending</span>
                </div>
            ) : (
               <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onClick(activity); 
                }}
                className="px-4 py-1.5 bg-primary text-white rounded-xl hover:opacity-90 transition-all active:scale-95 font-bold text-[9px] uppercase tracking-widest"
              >
                Join
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
