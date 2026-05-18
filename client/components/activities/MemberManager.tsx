'use client';

import React, { useState, useEffect } from 'react';
import { getActivityMembersAction, approveMemberAction, rejectMemberAction } from '@/lib/actions';

interface Member {
  userId: string;
  activityId: string;
  status: string;
  user: {
    username: string;
    avatarUrl: string | null;
    nationality: string | null;
  };
}

interface MemberManagerProps {
  activityId: string;
}

export const MemberManager: React.FC<MemberManagerProps> = ({ activityId }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    setLoading(true);
    const result = await getActivityMembersAction(activityId);
    if (result.success) {
      setMembers(result.data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMembers();
  }, [activityId]);

  const handleApprove = async (userId: string) => {
    const result = await approveMemberAction(activityId, userId);
    if (result.success) {
      fetchMembers();
    }
  };

  const handleReject = async (userId: string) => {
    const result = await rejectMemberAction(activityId, userId);
    if (result.success) {
      fetchMembers();
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-secondary/30 rounded-[2rem] animate-pulse" />
        ))}
      </div>
    );
  }

  const requests = members.filter(m => m.status === 'PENDING');
  const approved = members.filter(m => m.status === 'APPROVED');

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Pending Requests */}
      <div>
        <div className="flex items-center justify-between mb-6">
           <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Join Requests</h4>
           <span className="px-2.5 py-1 bg-primary/10 text-primary text-[9px] font-bold rounded-full">{requests.length} Pending</span>
        </div>

        {requests.length === 0 ? (
          <div className="p-10 rounded-[2.5rem] bg-secondary/20 border border-dashed border-outline/20 text-center">
             <span className="material-symbols-outlined text-outline/30 text-4xl mb-2">inbox</span>
             <p className="text-xs text-on-surface-variant font-bold uppercase tracking-widest">No new requests</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map(member => (
              <div key={member.userId} className="flex items-center justify-between p-5 bg-white border border-outline/10 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary text-white flex items-center justify-center font-black text-lg shadow-xl shadow-primary/10 transition-transform group-hover:scale-110">
                    {member.user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-black text-on-surface">{member.user.username}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                       <span className="material-symbols-outlined text-[12px] text-on-surface-variant">public</span>
                       <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{member.user.nationality || 'Traveler'}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleApprove(member.userId)}
                    className="px-4 py-2 bg-tertiary text-white flex items-center gap-1.5 rounded-xl hover:bg-tertiary/90 transition-all active:scale-95 font-bold text-[10px] uppercase tracking-widest shadow-sm"
                    title="Approve"
                  >
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    Approve
                  </button>
                  <button 
                    onClick={() => handleReject(member.userId)}
                    className="px-4 py-2 bg-secondary text-on-secondary flex items-center gap-1.5 rounded-xl hover:bg-secondary/90 transition-all active:scale-95 font-bold text-[10px] uppercase tracking-widest shadow-sm"
                    title="Reject"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved Members */}
      <div>
        <div className="flex items-center justify-between mb-6">
           <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant">Squad Members</h4>
           <span className="px-2.5 py-1 bg-tertiary/10 text-tertiary text-[9px] font-bold rounded-full">{approved.length} Active</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {approved.map(member => (
            <div key={member.userId} className="flex items-center gap-4 p-4 bg-secondary/30 rounded-[2rem] border border-outline/10 group transition-all hover:bg-white hover:shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center font-black text-xs text-primary shadow-sm border border-outline/10 group-hover:scale-110 transition-transform">
                {member.user.username.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="text-[13px] font-black text-on-surface truncate">{member.user.username}</p>
                <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-widest truncate">{member.user.nationality || 'Traveler'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
