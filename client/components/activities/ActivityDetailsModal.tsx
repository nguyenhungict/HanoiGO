'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  requestToJoinAction, 
  deleteActivityAction, 
  cancelJoinRequestAction, 
  cloneActivityTripAction,
  getActivityDetailsAction 
} from '@/lib/actions';
import { useAuthStore } from '@/store/useAuthStore';
import { MemberManager } from './MemberManager';
import { Activity } from '@/types';
import { ReportActivityDialog } from './ReportActivityDialog';
import { useNotification } from '@/hooks/use-notification';

interface ActivityDetailsModalProps {
  activity: Activity;
  onClose: () => void;
  onJoined?: () => void;
  onChat?: (activity: Activity) => void;
}

const CATEGORY_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  'Nature & Outdoors':   { icon: 'park',             label: 'Nature & Outdoors',  color: '#43A047' },
  'Arts & Culture':      { icon: 'museum',           label: 'Arts & Culture',     color: '#3F51B5' },
  'Heritage & History':  { icon: 'account_balance',  label: 'Heritage & History', color: '#607D8B' },
  'Spiritual':           { icon: 'temple_buddhist',  label: 'Spiritual',          color: '#FF9800' },
  'Eat & Shop':          { icon: 'restaurant',       label: 'Eat & Shop',         color: '#F44336' },
  'Sightseeing':         { icon: 'location_on',      label: 'Sightseeing',        color: '#0288D1' },
};

const BACKEND_URL = process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8888';

export const ActivityDetailsModal: React.FC<ActivityDetailsModalProps> = ({ activity, onClose, onJoined, onChat }) => {
  const [detailActivity, setDetailActivity] = useState<Activity | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const { user } = useAuthStore();
  const router = useRouter();
  const { show } = useNotification();

  const currentActivity = detailActivity || activity;

  const resolveImageUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    return `${BACKEND_URL}${cleanUrl}`;
  };

  const activityImageUrl = resolveImageUrl(currentActivity.imageUrl);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoadingDetails(true);
      const result = await getActivityDetailsAction(activity.id);
      if (result.success && result.data) {
        setDetailActivity(result.data);
      }
      setLoadingDetails(false);
    };
    fetchDetails();
  }, [activity.id]);

  const isHost = !!(user?.id && user.id === currentActivity.hostId);
  const isMember = currentActivity.myStatus === 'APPROVED' && !isHost;
  const hasRequested = currentActivity.myStatus === 'PENDING';

  const host = { 
    username: currentActivity.hostName, 
    nationality: currentActivity.hostNationality, 
    avatarUrl: currentActivity.hostAvatar 
  };
  const memberCount = currentActivity.memberCount || 1;
  const cat = CATEGORY_CONFIG[currentActivity.category] ?? CATEGORY_CONFIG['Arts & Culture'];
  const maxMembers = currentActivity.maxMembers || memberCount;
  const spaceLeft = Math.max(0, maxMembers - memberCount);
  const occupancyPercent = Math.min(100, Math.round((memberCount / Math.max(maxMembers, 1)) * 100));

  const handleJoin = async () => {
    setLoading(true);
    setStatus('idle');
    const result = await requestToJoinAction(currentActivity.id);
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
    const result = await deleteActivityAction(currentActivity.id);
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
    const result = await cancelJoinRequestAction(currentActivity.id);
    setLoading(false);
    if (result.success) {
      onClose();
      if (onJoined) onJoined();
    } else {
      setStatus('error');
      setMessage(result.error || 'Failed to cancel request.');
    }
  };

  const handleCloneTrip = async () => {
    setCloning(true);
    const result = await cloneActivityTripAction(currentActivity.id);
    setCloning(false);
    if (result.success) {
      show({
        type: 'success',
        title: 'Trip Saved!',
        message: 'The trip has been saved to your account successfully.',
      });
      onClose();
      router.push('/trips');
    } else {
      setStatus('error');
      setMessage(result.error || 'Failed to save trip plan.');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-on-surface/15 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-2xl overflow-hidden shadow-xl border border-outline/15 flex flex-col animate-in zoom-in-95 duration-300 max-h-[92vh]">
        
        {/* Top Control Bar (Inside the Card) */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2 shrink-0 select-none">
          {/* Category Badge & Address on the Left */}
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-md border shrink-0"
              style={{ backgroundColor: `${cat.color}1A`, color: cat.color, borderColor: `${cat.color}33` }}
            >
              <span className="material-symbols-outlined text-sm" style={{ color: cat.color }}>{cat.icon}</span>
              {cat.label}
            </span>
            <span className="truncate text-xs font-bold text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-sm text-outline shrink-0">location_on</span>
              {currentActivity.address || 'Hanoi'}
            </span>
          </div>

          {/* Action buttons (Dropdown Menu & Close) on the Right */}
          <div className="flex items-center gap-2 shrink-0">
            {/* More / Report button */}
            {!isHost && user && (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary hover:bg-secondary flex items-center justify-center transition-all border border-outline/10 shadow-sm active:scale-95"
                >
                  <span className="material-symbols-outlined text-lg">more_horiz</span>
                </button>
                {showDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-[130]" 
                      onClick={() => setShowDropdown(false)}
                    />
                    <div className="absolute right-0 mt-1.5 w-36 bg-surface border border-outline/10 shadow-lg z-[140] overflow-hidden flex flex-col p-1.5 animate-in fade-in slide-in-from-top-1 duration-150 rounded-xl">
                      <button
                        onClick={() => {
                          setShowDropdown(false);
                          setShowReportDialog(true);
                        }}
                        className="flex items-center gap-2 text-left px-3 py-2 hover:bg-primary/5 text-on-surface hover:text-primary transition-all duration-300 w-full font-bold text-xs rounded-lg"
                      >
                        <span className="material-symbols-outlined text-sm">flag</span>
                        Report Group
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            <button 
               onClick={onClose} 
               className="w-10 h-10 rounded-xl bg-secondary-container text-on-secondary hover:bg-secondary flex items-center justify-center transition-all border border-outline/10 shadow-sm active:scale-95"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2 space-y-6 custom-scrollbar">
          
          {/* Main Title Block */}
          <div>
            <h2 className="text-2xl font-extrabold tracking-tighter text-on-surface leading-tight mb-2">
              {currentActivity.title}
            </h2>
            <div className="w-[40px] h-[3px] bg-primary rounded-full mt-2" />
          </div>

          {/* Optional Premium Rounded Event Image Banner */}
          {activityImageUrl && (
            <div className="relative w-full aspect-[21/9] rounded-xl overflow-hidden border border-outline/10 group select-none shadow-sm">
              <img src={activityImageUrl} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
            </div>
          )}

          {/* ── Editorial Details Grid ─────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-outline/10 flex items-center gap-3 min-h-[86px]">
              <div className="w-11 h-11 rounded-full bg-secondary-container border border-outline/15 overflow-hidden flex items-center justify-center shrink-0">
                {host.avatarUrl ? (
                  <img src={resolveImageUrl(host.avatarUrl) ?? ''} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-extrabold text-on-surface-variant">
                    {(host.username || 'H')[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Host</p>
                <p className="text-sm font-extrabold text-on-surface truncate">{host.username || 'Host'}</p>
                <p className="text-[11px] font-medium text-on-surface-variant truncate">
                  {host.nationality || 'HanoiGO member'}
                </p>
              </div>
            </div>

            {!currentActivity.tripId ? (
              <div className="bg-white p-4 rounded-xl border border-outline/10 min-h-[86px]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Group Capacity</p>
                    <p className="text-sm font-extrabold text-on-surface">
                      {spaceLeft} {spaceLeft === 1 ? 'spot' : 'spots'} left
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-secondary-container border border-outline/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-lg text-primary">groups</span>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="h-1.5 rounded-full bg-secondary-container overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${occupancyPercent}%` }}
                    />
                  </div>
                  <p className="mt-1.5 text-[10px] font-semibold text-on-surface-variant">
                    {memberCount}/{maxMembers} joined
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-xl border border-outline/10 flex items-center justify-between gap-3 min-h-[86px]">
                <div>
                  <p className="text-[9px] font-black text-on-surface-variant uppercase tracking-widest mb-1">Saved By</p>
                  <p className="text-sm font-extrabold text-on-surface">{currentActivity.savesCount || 0} users</p>
                  <p className="text-[11px] font-medium text-on-surface-variant">Copied to personal trips</p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-secondary-container border border-outline/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-lg text-primary">bookmark_added</span>
                </div>
              </div>
            )}
            
            <div className="col-span-2 bg-[#FAF0E1] text-on-secondary p-5 rounded-xl flex items-center justify-between border border-outline/10 shadow-sm">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/60 flex items-center justify-center border border-outline/15 shrink-0">
                    <span className="material-symbols-outlined text-on-secondary text-lg">calendar_month</span>
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-on-secondary/60 uppercase tracking-widest mb-0.5">Scheduled For</p>
                    <p className="text-xs font-extrabold">{new Date(currentActivity.scheduledAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
                  </div>
               </div>
               <div className="text-right shrink-0">
                  <p className="text-[9px] font-black text-on-secondary/60 uppercase tracking-widest mb-0.5">Time</p>
                  <p className="text-base font-black text-primary">{new Date(currentActivity.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
               </div>
            </div>
          </div>

          {/* Description */}
          <div className="pt-2 border-t border-outline/5">
            <h4 className="text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-2.5">About Activity</h4>
            <p className="text-sm font-medium leading-relaxed text-on-surface opacity-90">
              {currentActivity.description || 'No description provided for this activity.'}
            </p>
          </div>

          {/* ── Trip Itinerary Section ─────────────────────── */}
          {currentActivity.tripId && (
            <div className="border-t border-outline/5 pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-[9px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-1">Shared Trip Plan</h4>
                  {loadingDetails ? (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <span className="text-xs font-bold text-outline">Loading itinerary details...</span>
                    </div>
                  ) : currentActivity.trip ? (
                    <>
                      <p className="text-lg font-extrabold text-on-surface">{currentActivity.trip.title}</p>
                      <p className="text-[10px] text-outline font-bold mt-0.5">
                        {currentActivity.trip.numDays} days • {currentActivity.trip.tripDays?.reduce((acc: number, day: any) => acc + (day.tripStops?.length || 0), 0) || 0} places
                      </p>
                    </>
                  ) : (
                    <p className="text-xs font-bold text-red-500">Failed to load itinerary.</p>
                  )}
                </div>
              </div>

              {/* Dynamic Timeline */}
              {!loadingDetails && currentActivity.trip && currentActivity.trip.tripDays && (
                <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-2 mt-4 bg-secondary-container/15 p-4 rounded-xl border border-outline/10">
                  {currentActivity.trip.tripDays.map((day: any) => (
                    <div key={day.id} className="space-y-2">
                      <h5 className="text-xs font-black text-on-surface mb-2 sticky top-0 bg-[#FCF8F2] py-1 z-10">Day {day.dayNumber}</h5>
                      <div className="pl-3 space-y-3 border-l-2 border-outline/15 ml-2">
                        {day.tripStops && day.tripStops.length > 0 ? (
                          day.tripStops.map((stop: any) => {
                            const date = new Date(stop.arriveAt);
                            const timeStr = `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
                            return (
                              <div key={stop.id} className="relative flex items-start gap-3">
                                <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-white" />
                                <div className="flex-1 min-w-0 bg-white p-2.5 rounded-xl border border-outline/10 shadow-sm">
                                  <p className="text-xs font-bold text-on-surface truncate">{stop.place?.name || 'Unknown Place'}</p>
                                  <div className="flex items-center gap-2 mt-1 text-[9px] font-bold uppercase tracking-widest text-outline">
                                    <span className="text-primary">{timeStr}</span>
                                    <span>•</span>
                                    <span className="truncate">{stop.place?.district || 'Hanoi'}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-[10px] text-outline italic pl-2">No stops planned for this day.</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Host Management or Join Button */}
          <div className="border-t border-outline/10 pt-6">
            {currentActivity.tripId ? (
              <div className="pt-2">
                {status === 'idle' ? (
                  !isHost ? (
                    <button
                      onClick={handleCloneTrip}
                      disabled={cloning || loadingDetails}
                      className="w-full flex items-center justify-center gap-2 bg-[#261817] text-white hover:bg-primary px-4 py-3.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-md shadow-on-surface/10 active:scale-95 disabled:opacity-50"
                    >
                      {cloning ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[14px]">download</span>
                          <span>Save Trip</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="pt-2">
                      {!showConfirmDelete ? (
                        <button 
                          onClick={() => setShowConfirmDelete(true)}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-red-500 font-bold text-[9px] uppercase tracking-widest hover:bg-red-50 border border-dashed border-red-200 transition-colors active:scale-95 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          <span>Delete Shared Trip</span>
                        </button>
                      ) : (
                        <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col gap-3 animate-in slide-in-from-bottom-2">
                          <p className="text-[9px] font-black text-red-600 uppercase tracking-widest text-center">Are you sure? This cannot be undone.</p>
                          <div className="flex gap-2">
                            <button 
                              onClick={handleDelete}
                              disabled={deleting}
                              className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-red-700 transition-colors active:scale-95 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                            >
                              {deleting ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                            <button 
                              onClick={() => setShowConfirmDelete(false)}
                              className="flex-1 bg-white text-on-surface py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border border-outline/15 hover:bg-secondary transition-colors active:scale-95 shadow-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  <div className={`p-6 rounded-xl text-center animate-in zoom-in-95 duration-300 ${status === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                     <span className="material-symbols-outlined text-3xl mb-2">
                       {status === 'success' ? 'check_circle' : 'error'}
                     </span>
                     <h4 className="text-sm font-extrabold uppercase tracking-wider mb-1">{status === 'success' ? 'Success' : 'Failed'}</h4>
                     <p className="text-xs opacity-90">{message}</p>
                     <button onClick={onClose} className="mt-4 bg-white/20 hover:bg-white/30 px-5 py-2 rounded-xl text-[8px] font-bold uppercase tracking-widest transition-colors active:scale-95 shadow-sm">Close</button>
                  </div>
                )}
              </div>
            ) : isHost ? (
              <div className="space-y-6">
                 <button 
                   onClick={() => onChat?.(currentActivity)}
                   className="w-full bg-white text-on-surface border border-outline/20 py-3.5 rounded-xl font-bold uppercase tracking-widest text-[9px] hover:bg-secondary transition-colors active:scale-95 flex items-center justify-center gap-2 shadow-sm"
                 >
                   <span className="material-symbols-outlined text-sm">forum</span>
                   <span>Open Group Chat</span>
                 </button>
                 
                 <div className="border border-outline/10 rounded-xl p-4 bg-secondary-container/10">
                   <MemberManager activityId={currentActivity.id} />
                 </div>
                 
                 <div className="pt-2">
                   {!showConfirmDelete ? (
                     <button 
                       onClick={() => setShowConfirmDelete(true)}
                       className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-red-500 font-bold text-[9px] uppercase tracking-widest hover:bg-red-50 border border-dashed border-red-200 transition-colors active:scale-95 shadow-sm"
                     >
                       <span className="material-symbols-outlined text-sm">delete</span>
                       <span>Delete Group Activity</span>
                     </button>
                   ) : (
                     <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col gap-3 animate-in slide-in-from-bottom-2">
                       <p className="text-[9px] font-black text-red-600 uppercase tracking-widest text-center">Are you sure? This cannot be undone.</p>
                       <div className="flex gap-2">
                         <button 
                           onClick={handleDelete}
                           disabled={deleting}
                           className="flex-1 bg-red-600 text-white py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest hover:bg-red-700 transition-colors active:scale-95 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                         >
                           {deleting ? 'Deleting...' : 'Yes, Delete'}
                         </button>
                         <button 
                           onClick={() => setShowConfirmDelete(false)}
                           className="flex-1 bg-white text-on-surface py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest border border-outline/15 hover:bg-secondary transition-colors active:scale-95 shadow-sm"
                         >
                           Cancel
                         </button>
                       </div>
                     </div>
                   )}
                 </div>
              </div>
            ) : isMember ? (
              <div className="bg-secondary-container/20 p-5 rounded-xl border border-outline/15 text-center space-y-4">
                 <div>
                   <span className="material-symbols-outlined text-2xl text-emerald-500 mb-1">verified</span>
                   <h4 className="font-extrabold text-sm text-on-surface">You're a member!</h4>
                   <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest mt-0.5">Check the group chat for coordination</p>
                 </div>
                 
                 <button 
                   onClick={() => onChat?.(currentActivity)}
                   className="w-full bg-white text-on-surface border border-outline/20 py-3.5 rounded-xl font-bold uppercase tracking-widest text-[9px] hover:bg-secondary transition-colors active:scale-95 flex items-center justify-center gap-2 shadow-sm"
                 >
                   <span className="material-symbols-outlined text-sm">forum</span>
                   <span>Go to Group Chat</span>
                 </button>
              </div>
            ) : hasRequested ? (
              <div className="bg-secondary-container/10 p-5 rounded-xl border border-outline/10 text-center space-y-4">
                 <div>
                   <span className="material-symbols-outlined text-2xl text-primary mb-1 animate-pulse">history</span>
                   <h4 className="font-extrabold text-sm text-on-surface">Request Pending</h4>
                   <p className="text-[8px] font-black text-on-surface-variant uppercase tracking-widest mt-0.5">The host will review your request soon</p>
                 </div>
                 
                 <button 
                   onClick={handleCancelRequest}
                   disabled={loading}
                   className="w-full py-3 rounded-xl text-red-500 font-bold text-[9px] uppercase tracking-widest hover:bg-red-50 border border-dashed border-red-200 transition-colors active:scale-95 shadow-sm disabled:opacity-50"
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
                     className="w-full bg-primary text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-[9px] hover:bg-primary-container transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
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
                   <div className={`p-6 rounded-xl text-center animate-in zoom-in-95 duration-300 ${status === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                      <span className="material-symbols-outlined text-3xl mb-2">
                        {status === 'success' ? 'check_circle' : 'error'}
                      </span>
                      <h4 className="text-sm font-extrabold uppercase tracking-wider mb-1">{status === 'success' ? 'Success' : 'Failed'}</h4>
                      <p className="text-xs opacity-90">{message}</p>
                      <button onClick={onClose} className="mt-4 bg-white/20 hover:bg-white/30 px-5 py-2 rounded-xl text-[8px] font-bold uppercase tracking-widest transition-colors active:scale-95 shadow-sm">Close</button>
                   </div>
                 )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showReportDialog && (
        <ReportActivityDialog
          activityId={currentActivity.id}
          activityTitle={currentActivity.title}
          onClose={() => setShowReportDialog(false)}
          onSuccess={() => {
            show({
              type: 'success',
              title: 'Report Submitted',
              message: 'Your report has been sent successfully.',
            });
          }}
        />
      )}
    </div>
  );
};
