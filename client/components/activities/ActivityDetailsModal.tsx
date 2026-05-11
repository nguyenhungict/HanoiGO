'use client';

import React, { useState } from 'react';
import { requestToJoinAction } from '@/lib/actions';
import { useAuthStore } from '@/store/useAuthStore';
import { MemberManager } from './MemberManager';

interface ActivityDetailsModalProps {
  activity: any;
  onClose: () => void;
  onJoined?: () => void;
}

export const ActivityDetailsModal: React.FC<ActivityDetailsModalProps> = ({ activity, onClose, onJoined }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const { user } = useAuthStore();

  const BACKEND_URL = process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8888';

  const resolveImageUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${BACKEND_URL}${cleanUrl}`;
  };

  const activityImageUrl = resolveImageUrl(activity.imageUrl);

  const isHost = !!(user?.id && user.id === activity.hostId);
  const isMember = activity.myStatus === 'APPROVED' && !isHost;
  const hasRequested = activity.myStatus === 'PENDING';

  const host = { 
    username: activity.hostName, 
    nationality: activity.hostNationality, 
    avatarUrl: activity.hostAvatar 
  };
  const memberCount = activity.memberCount || 1;

  const handleJoin = async () => {
    setLoading(true);
    setStatus('idle');
    const result = await requestToJoinAction(activity.id);
    setLoading(false);

    if (result.success) {
      setStatus('success');
      setMessage('Join request sent! The host will review your request soon.');
      // Let parent refresh lists and close the modal after a short delay
      setTimeout(() => {
        if (onJoined) onJoined();
      }, 1200);
    } else {
      setStatus('error');
      setMessage(result.error || 'Failed to send join request.');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-white w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl border border-outline/5 flex flex-col animate-in zoom-in-95 duration-500 max-h-[90vh]">
        {/* Header Image/Banner Area */}
        <div className="h-48 bg-slate-900 relative flex items-center justify-center overflow-hidden shrink-0">
          {activityImageUrl ? (
            <>
              <img src={activityImageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-container opacity-90" />
              <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            </>
          )}
           
           <div className="relative z-10 text-white text-center p-6 mt-4">
              <h2 className="text-2xl font-bold tracking-tight mb-2 drop-shadow-md">{activity.title}</h2>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest bg-white/20 backdrop-blur-md py-2 px-4 rounded-full border border-white/10">
                   <span className="material-symbols-outlined text-[12px]">location_on</span>
                   {activity.address}
                </div>
                <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-widest bg-white/20 backdrop-blur-md py-2 px-4 rounded-full border border-white/10">
                   <span className="material-symbols-outlined text-[12px]">
                      {activity.category === 'food' ? 'restaurant' : 
                       activity.category === 'history' ? 'history_edu' : 
                       activity.category === 'nature' ? 'forest' : 
                       activity.category === 'sport' ? 'sports_soccer' : 
                       activity.category === 'shopping' ? 'shopping_bag' : 'theater_comedy'}
                   </span>
                   {activity.category || 'Culture'}
                </div>
              </div>
           </div>
           <button 
             onClick={onClose} 
             className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/20 backdrop-blur-md hover:bg-white/40 flex items-center justify-center text-white transition-all active:scale-90"
           >
             <span className="material-symbols-outlined">close</span>
           </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary-container/30 p-5 rounded-3xl border border-outline/5">
              <p className="text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-widest mb-3">Host</p>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center font-bold text-base shadow-sm">
                  {host.username?.charAt(0)}
                </div>
                <div>
                  <p className="font-bold text-on-surface text-sm">{host.username}</p>
                  <p className="text-on-surface-variant/60 text-[9px] font-semibold uppercase tracking-wider">{host.nationality || 'Traveler'}</p>
                </div>
              </div>
            </div>

            <div className="bg-secondary-container/30 p-5 rounded-3xl border border-outline/5 flex flex-col items-center justify-center text-center">
              <p className="text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-widest mb-1.5">Capacity</p>
              <div className="flex items-baseline gap-1">
                 <span className="text-2xl font-bold text-primary">{memberCount}</span>
                 <span className="text-on-surface-variant/40 text-[10px] font-semibold uppercase">/ {activity.maxMembers || 10}</span>
              </div>
              <p className="text-[8px] font-bold text-on-surface uppercase mt-1 tracking-widest opacity-60">Joined</p>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-4">
            <h4 className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-[0.2em]">Activity Details</h4>
            <p className="text-sm font-medium leading-relaxed text-on-surface-variant opacity-80">
              {activity.description || 'No description provided for this activity.'}
            </p>
          </div>

          {/* Host Management or Join Button */}
          {isHost ? (
            <div className="border-t border-outline/10 pt-10">
               <MemberManager activityId={activity.id} />
            </div>
          ) : isMember ? (
            <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 text-center">
               <span className="material-symbols-outlined text-3xl text-primary mb-2">verified</span>
               <h4 className="font-bold text-base text-primary">You're a member!</h4>
               <p className="text-[9px] font-semibold text-primary/70 uppercase tracking-widest mt-1">Check the group chat for coordination</p>
            </div>
          ) : hasRequested ? (
            <div className="bg-secondary-container/20 p-6 rounded-3xl border border-secondary-container/40 text-center">
               <span className="material-symbols-outlined text-3xl text-primary mb-2 animate-pulse">history</span>
               <h4 className="font-bold text-base text-on-surface">Request Pending</h4>
               <p className="text-[9px] font-semibold text-on-surface/40 uppercase tracking-widest mt-1">The host will review your request soon</p>
            </div>
          ) : (
            <div className="pt-4">
               {status === 'idle' ? (
                 <button 
                   onClick={handleJoin}
                   disabled={loading}
                   className="w-full bg-primary text-white py-4 rounded-2xl font-bold uppercase tracking-widest text-xs hover:shadow-xl hover:shadow-primary/10 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                 >
                   {loading ? (
                     <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                   ) : (
                     <>
                       <span className="material-symbols-outlined text-lg">person_add</span>
                       Join Group
                     </>
                   )}
                 </button>
               ) : (
                 <div className={`p-8 rounded-3xl text-center animate-in zoom-in-95 duration-500 ${status === 'success' ? 'bg-green-500 text-white shadow-xl shadow-green-500/20' : 'bg-red-500 text-white shadow-xl shadow-red-500/20'}`}>
                    <span className="material-symbols-outlined text-4xl mb-3">
                      {status === 'success' ? 'check_circle' : 'error'}
                    </span>
                    <h4 className="text-lg font-bold uppercase mb-1">{status === 'success' ? 'Success!' : 'Failed'}</h4>
                    <p className="text-xs font-medium opacity-90">{message}</p>
                    <button onClick={onClose} className="mt-6 bg-white/20 hover:bg-white/30 px-6 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all">Close</button>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
