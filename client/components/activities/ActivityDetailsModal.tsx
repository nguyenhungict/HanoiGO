'use client';

import React, { useState } from 'react';
import { requestToJoinAction, deleteActivityAction, cancelJoinRequestAction } from '@/lib/actions';
import { useAuthStore } from '@/store/useAuthStore';
import { MemberManager } from './MemberManager';

import { Activity } from '@/types';

interface ActivityDetailsModalProps {
  activity: Activity;
  onClose: () => void;
  onJoined?: () => void;
  onChat?: (activity: Activity) => void;
}

export const ActivityDetailsModal: React.FC<ActivityDetailsModalProps> = ({ activity, onClose, onJoined, onChat }) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
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

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteActivityAction(activity.id);
    setDeleting(false);
    if (result.success) {
      onClose();
      if (onJoined) onJoined();
    } else {
      setStatus('error');
      setMessage(result.error || 'Failed to delete activity.');
    }
  };

  const handleCancelRequest = async () => {
    setLoading(true);
    const result = await cancelJoinRequestAction(activity.id);
    setLoading(false);
    if (result.success) {
      onClose();
      if (onJoined) onJoined();
    } else {
      setStatus('error');
      setMessage(result.error || 'Failed to cancel request.');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-on-surface/10 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="bg-background w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-[0_40px_120px_-20px_rgba(65,48,16,0.15)] border border-outline/10 flex flex-col animate-in zoom-in-95 duration-500 max-h-[92vh]">
        
        {/* ── Top Header Area ────────────────────────────── */}
        <div className="relative h-64 shrink-0 overflow-hidden">
          {activityImageUrl ? (
            <img src={activityImageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary via-primary-container to-secondary opacity-90" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-on-surface/5" />
          
          <button 
             onClick={onClose} 
             className="absolute top-6 right-6 w-12 h-12 rounded-xl bg-white/40 backdrop-blur-xl hover:bg-white/60 flex items-center justify-center text-on-surface transition-all active:scale-90 border border-white/20 shadow-xl"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>

          {/* Overlaid Title */}
          <div className="absolute bottom-0 left-0 right-0 p-8 pt-20">
             <div className="flex items-end justify-between gap-4">
                <div className="flex-1">
                   <div className="flex items-center gap-2 mb-3">
                      <span className="px-3 py-1 bg-primary text-white text-[9px] font-bold uppercase tracking-widest rounded-lg shadow-lg shadow-primary/20">
                        {activity.category || 'Culture'}
                      </span>
                      <span className="px-3 py-1 bg-secondary text-on-secondary text-[9px] font-bold uppercase tracking-widest rounded-lg border border-outline/10 shadow-sm">
                        {activity.address?.split(',')[0] || 'Hanoi'}
                      </span>
                   </div>
                   <h2 className="text-3xl font-black tracking-tight text-on-surface leading-tight">{activity.title}</h2>
                </div>
             </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          
          {/* ── Details Grid ─────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary/40 p-6 rounded-[2.5rem] border border-outline/10 flex flex-col justify-between h-32">
               <span className="material-symbols-outlined text-primary text-2xl">person_pin</span>
               <div>
                 <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Host</p>
                 <p className="text-sm font-black text-on-surface">{host.username}</p>
               </div>
            </div>

            <div className="bg-secondary/40 p-6 rounded-[2.5rem] border border-outline/10 flex flex-col justify-between h-32">
               <span className="material-symbols-outlined text-tertiary text-2xl">groups</span>
               <div>
                 <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Space Left</p>
                 <p className="text-sm font-black text-on-surface">{activity.maxMembers - memberCount} Spots</p>
               </div>
            </div>
            
            <div className="col-span-2 bg-secondary text-on-secondary p-6 rounded-[2.5rem] flex items-center justify-between shadow-sm border border-outline/10">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/50 flex items-center justify-center border border-outline/5">
                    <span className="material-symbols-outlined text-on-secondary">calendar_month</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-on-secondary/50 uppercase tracking-widest">Scheduled For</p>
                    <p className="text-sm font-bold">{new Date(activity.scheduledAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                  </div>
               </div>
               <div className="text-right">
                  <p className="text-[10px] font-bold text-on-secondary/50 uppercase tracking-widest">At</p>
                  <p className="text-xl font-black text-primary">{new Date(activity.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
               </div>
            </div>
          </div>

          {/* Description */}
          <div className="px-2">
            <h4 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.2em] mb-4">About Activity</h4>
            <p className="text-base font-medium leading-relaxed text-on-surface">
              {activity.description || 'No description provided for this activity.'}
            </p>
          </div>

          {/* Host Management or Join Button */}
          {isHost ? (
            <div className="border-t border-outline/10 pt-10 space-y-8">
               <div className="flex gap-4">
                 <button 
                   onClick={() => onChat?.(activity)}
                   className="flex-1 bg-white text-on-surface border border-outline/20 py-3.5 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-surface transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"
                 >
                   <span className="material-symbols-outlined text-[16px]">forum</span>
                   Open Group Chat
                 </button>
               </div>
               
               <MemberManager activityId={activity.id} />
               
               <div className="pt-6 border-t border-outline/5">
                 {!showConfirmDelete ? (
                   <button 
                     onClick={() => setShowConfirmDelete(true)}
                     className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-red-500 font-bold text-[10px] uppercase tracking-widest hover:bg-red-50 border border-dashed border-red-200 transition-all active:scale-95 shadow-sm"
                   >
                     <span className="material-symbols-outlined text-base">delete</span>
                     Delete Group Activity
                   </button>
                 ) : (
                   <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col gap-3 animate-in slide-in-from-bottom-2">
                     <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider text-center">Are you sure? This cannot be undone.</p>
                     <div className="flex gap-2">
                       <button 
                         onClick={handleDelete}
                         disabled={deleting}
                         className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                       >
                         {deleting ? 'Deleting...' : 'Yes, Delete'}
                       </button>
                       <button 
                         onClick={() => setShowConfirmDelete(false)}
                         className="flex-1 bg-white text-on-surface py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border border-outline/10 hover:bg-secondary/10 transition-all active:scale-95 shadow-sm"
                       >
                         Cancel
                       </button>
                     </div>
                   </div>
                 )}
               </div>
            </div>
          ) : isMember ? (
            <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10 text-center space-y-6">
               <div>
                 <span className="material-symbols-outlined text-3xl text-primary mb-2">verified</span>
                 <h4 className="font-bold text-base text-primary">You're a member!</h4>
                 <p className="text-[9px] font-semibold text-primary/70 uppercase tracking-widest mt-1">Check the group chat for coordination</p>
               </div>
               
               <button 
                 onClick={() => onChat?.(activity)}
                 className="w-full bg-white text-on-surface border border-outline/20 py-3.5 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-surface transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm"
               >
                 <span className="material-symbols-outlined text-[16px]">forum</span>
                 Go to Group Chat
               </button>
            </div>
          ) : hasRequested ? (
            <div className="bg-secondary-container/20 p-6 rounded-3xl border border-secondary-container/40 text-center space-y-4">
               <div>
                 <span className="material-symbols-outlined text-3xl text-primary mb-2 animate-pulse">history</span>
                 <h4 className="font-bold text-base text-on-surface">Request Pending</h4>
                 <p className="text-[9px] font-semibold text-on-surface/40 uppercase tracking-widest mt-1">The host will review your request soon</p>
               </div>
               
               <button 
                 onClick={handleCancelRequest}
                 disabled={loading}
                 className="w-full py-3 rounded-xl text-red-500 font-bold text-[10px] uppercase tracking-widest hover:bg-red-50 border border-dashed border-red-200 transition-all active:scale-95 shadow-sm disabled:opacity-50"
               >
                 {loading ? 'Processing...' : 'Cancel Join Request'}
               </button>
            </div>
          ) : (
            <div className="pt-4">
               {status === 'idle' ? (
                 <button 
                   onClick={handleJoin}
                   disabled={loading}
                   className="w-full bg-primary text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-primary/90 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                 >
                   {loading ? (
                     <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                   ) : (
                     <>
                       <span className="material-symbols-outlined text-[16px]">person_add</span>
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
                    <button onClick={onClose} className="mt-6 bg-white/20 hover:bg-white/30 px-6 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all active:scale-95 shadow-sm">Close</button>
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
