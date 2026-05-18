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
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-on-surface/15 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl border border-outline/10 flex flex-col animate-in zoom-in-95 duration-300 max-h-[92vh]">
        
        {/* ── Top Header Image Frame ─────────────────────── */}
        <div className="relative h-60 shrink-0 bg-secondary-container/30 border-b border-outline/5">
          {activityImageUrl ? (
            <img src={activityImageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-primary-container/20 to-secondary/30" />
          )}
          
          <button 
             onClick={onClose} 
             className="absolute top-5 right-5 w-10 h-10 rounded-lg bg-white/90 hover:bg-white flex items-center justify-center text-on-surface transition-colors border border-outline/25 shadow-sm active:scale-95 z-20"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>

          {/* Tag Overlays */}
          <div className="absolute top-5 left-5 flex gap-2 z-20">
            <span 
              className="px-2.5 py-1 text-white text-[9px] font-black uppercase tracking-widest rounded shadow-sm"
              style={{
                backgroundColor: {
                  'Nature & Outdoors': '#43A047',
                  'Arts & Culture': '#3F51B5',
                  'Heritage & History': '#607D8B',
                  'Spiritual': '#FF9800',
                  'Eat & Shop': '#F44336',
                  'Sightseeing': '#0288D1',
                }[activity.category || ''] || '#607D8B'
              }}
            >
              {activity.category || 'Culture'}
            </span>
            <span className="px-2.5 py-1 bg-secondary text-on-secondary text-[9px] font-black uppercase tracking-widest rounded border border-outline/10 shadow-sm">
              {activity.address?.split(',')[0] || 'Hanoi'}
            </span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Main Title Block */}
          <div>
            <h2 className="text-2xl font-extrabold tracking-tighter text-on-surface leading-tight mb-2">
              {activity.title}
            </h2>
            <div className="w-[40px] h-[3px] bg-primary rounded-full mt-2" />
          </div>

          {/* ── Editorial Details Grid ─────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-secondary-container/40 p-4.5 rounded-lg border border-outline/10 flex flex-col justify-between min-h-[90px]">
               <span className="material-symbols-outlined text-primary text-xl">person_pin</span>
               <div>
                 <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-0.5">Host</p>
                 <p className="text-xs font-extrabold text-on-surface">{host.username}</p>
               </div>
            </div>

            <div className="bg-secondary-container/40 p-4.5 rounded-lg border border-outline/10 flex flex-col justify-between min-h-[90px]">
               <span className="material-symbols-outlined text-tertiary text-xl">groups</span>
               <div>
                 <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-0.5">Space Left</p>
                 <p className="text-xs font-extrabold text-on-surface">{activity.maxMembers - memberCount} Spots Available</p>
               </div>
            </div>
            
            <div className="col-span-2 bg-secondary text-on-secondary p-5 rounded-lg flex items-center justify-between border border-outline/10 shadow-sm">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-white/60 flex items-center justify-center border border-outline/15 shrink-0">
                    <span className="material-symbols-outlined text-on-secondary text-lg">calendar_month</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-on-secondary/60 uppercase tracking-widest mb-0.5">Scheduled For</p>
                    <p className="text-xs font-extrabold">{new Date(activity.scheduledAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                  </div>
               </div>
               <div className="text-right shrink-0">
                  <p className="text-[9px] font-black text-on-secondary/60 uppercase tracking-widest mb-0.5">Time</p>
                  <p className="text-base font-black text-primary">{new Date(activity.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
               </div>
            </div>
          </div>

          {/* Description */}
          <div className="pt-2 border-t border-outline/5">
            <h4 className="text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-2.5">About Activity</h4>
            <p className="text-sm font-medium leading-relaxed text-on-surface opacity-90">
              {activity.description || 'No description provided for this activity.'}
            </p>
          </div>

          {/* Host Management or Join Button */}
          <div className="border-t border-outline/10 pt-6">
            {isHost ? (
              <div className="space-y-6">
                 <button 
                   onClick={() => onChat?.(activity)}
                   className="w-full bg-white text-on-surface border border-outline/20 py-3 rounded-lg font-bold uppercase tracking-widest text-[9px] hover:bg-secondary transition-colors active:scale-95 flex items-center justify-center gap-2 shadow-sm"
                 >
                   <span className="material-symbols-outlined text-sm">forum</span>
                   <span>Open Group Chat</span>
                 </button>
                 
                 <div className="border border-outline/10 rounded-lg p-4 bg-secondary-container/10">
                   <MemberManager activityId={activity.id} />
                 </div>
                 
                 <div className="pt-4 border-t border-outline/5">
                   {!showConfirmDelete ? (
                     <button 
                       onClick={() => setShowConfirmDelete(true)}
                       className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-red-500 font-bold text-[9px] uppercase tracking-widest hover:bg-red-50 border border-dashed border-red-200 transition-colors active:scale-95 shadow-sm"
                     >
                       <span className="material-symbols-outlined text-sm">delete</span>
                       <span>Delete Group Activity</span>
                     </button>
                   ) : (
                     <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex flex-col gap-3 animate-in slide-in-from-bottom-2">
                       <p className="text-[9px] font-black text-red-600 uppercase tracking-widest text-center">Are you sure? This cannot be undone.</p>
                       <div className="flex gap-2">
                         <button 
                           onClick={handleDelete}
                           disabled={deleting}
                           className="flex-1 bg-red-600 text-white py-2.5 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-red-700 transition-colors active:scale-95 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                         >
                           {deleting ? 'Deleting...' : 'Yes, Delete'}
                         </button>
                         <button 
                           onClick={() => setShowConfirmDelete(false)}
                           className="flex-1 bg-white text-on-surface py-2.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-outline/10 hover:bg-secondary transition-colors active:scale-95 shadow-sm"
                         >
                           Cancel
                         </button>
                       </div>
                     </div>
                   )}
                 </div>
              </div>
            ) : isMember ? (
              <div className="bg-secondary-container/20 p-5 rounded-lg border border-outline/15 text-center space-y-4">
                 <div>
                   <span className="material-symbols-outlined text-2xl text-tertiary mb-1">verified</span>
                   <h4 className="font-extrabold text-sm text-on-surface">You're a member!</h4>
                   <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest mt-0.5">Check the group chat for coordination</p>
                 </div>
                 
                 <button 
                   onClick={() => onChat?.(activity)}
                   className="w-full bg-white text-on-surface border border-outline/20 py-3 rounded-lg font-bold uppercase tracking-widest text-[9px] hover:bg-secondary transition-colors active:scale-95 flex items-center justify-center gap-2 shadow-sm"
                 >
                   <span className="material-symbols-outlined text-sm">forum</span>
                   <span>Go to Group Chat</span>
                 </button>
              </div>
            ) : hasRequested ? (
              <div className="bg-secondary-container/10 p-5 rounded-lg border border-outline/10 text-center space-y-4">
                 <div>
                   <span className="material-symbols-outlined text-2xl text-primary mb-1 animate-pulse">history</span>
                   <h4 className="font-extrabold text-sm text-on-surface">Request Pending</h4>
                   <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest mt-0.5">The host will review your request soon</p>
                 </div>
                 
                 <button 
                   onClick={handleCancelRequest}
                   disabled={loading}
                   className="w-full py-2.5 rounded-lg text-red-500 font-bold text-[9px] uppercase tracking-widest hover:bg-red-50 border border-dashed border-red-200 transition-colors active:scale-95 shadow-sm disabled:opacity-50"
                 >
                   {loading ? 'Processing...' : 'Cancel Join Request'}
                 </button>
              </div>
            ) : (
              <div className="pt-2">
                 {status === 'idle' ? (
                   <button 
                     onClick={handleJoin}
                     disabled={loading}
                     className="w-full bg-primary text-white py-3 rounded-lg font-bold uppercase tracking-widest text-[9px] hover:bg-primary-container transition-colors active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-primary/10 disabled:opacity-50"
                   >
                     {loading ? (
                       <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                     ) : (
                       <>
                         <span className="material-symbols-outlined text-sm">person_add</span>
                         <span>Join Group</span>
                       </>
                     )}
                   </button>
                 ) : (
                   <div className={`p-6 rounded-lg text-center animate-in zoom-in-95 duration-300 ${status === 'success' ? 'bg-tertiary text-white' : 'bg-red-500 text-white'}`}>
                      <span className="material-symbols-outlined text-3xl mb-2">
                        {status === 'success' ? 'check_circle' : 'error'}
                      </span>
                      <h4 className="text-sm font-extrabold uppercase tracking-wider mb-1">{status === 'success' ? 'Success' : 'Failed'}</h4>
                      <p className="text-xs opacity-90">{message}</p>
                      <button onClick={onClose} className="mt-4 bg-white/20 hover:bg-white/30 px-5 py-2 rounded-lg text-[8px] font-bold uppercase tracking-widest transition-colors active:scale-95 shadow-sm">Close</button>
                   </div>
                 )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
