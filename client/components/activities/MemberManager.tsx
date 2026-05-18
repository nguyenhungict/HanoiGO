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
      <div className="space-y-2">
        <div className="h-10 bg-secondary-container/50 rounded-lg animate-pulse" />
        <div className="h-10 bg-secondary-container/50 rounded-lg animate-pulse" />
      </div>
    );
  }

  const requests = members.filter(m => m.status === 'PENDING');
  const approved = members.filter(m => m.status === 'APPROVED');

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Join Requests */}
      <div>
        <div className="flex items-center justify-between mb-2">
           <h4 className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Join Requests</h4>
           <span className="px-2 py-0.5 bg-primary/10 text-primary text-[8px] font-bold rounded shadow-sm">{requests.length} Pending</span>
        </div>

        {requests.length === 0 ? (
          <div className="py-4 px-3 rounded-lg bg-secondary-container/20 border border-dashed border-outline/20 flex items-center justify-center gap-2">
             <span className="material-symbols-outlined text-outline/40 text-sm">inbox</span>
             <p className="text-[9px] text-on-surface-variant font-black uppercase tracking-widest">No new requests</p>
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map(member => (
              <div key={member.userId} className="flex items-center justify-between p-2.5 bg-white border border-outline/10 rounded-lg shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded shrink-0 bg-primary/10 text-primary flex items-center justify-center font-black text-xs shadow-inner">
                    {member.user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-on-surface truncate">{member.user.username}</p>
                    <p className="text-[8px] font-bold text-on-surface-variant uppercase tracking-widest truncate">{member.user.nationality || 'Traveler'}</p>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button 
                    onClick={() => handleApprove(member.userId)}
                    className="w-7 h-7 flex items-center justify-center bg-tertiary text-white rounded hover:bg-tertiary/90 transition-colors shadow-sm"
                    title="Approve"
                  >
                    <span className="material-symbols-outlined text-[14px]">check</span>
                  </button>
                  <button 
                    onClick={() => handleReject(member.userId)}
                    className="w-7 h-7 flex items-center justify-center bg-white border border-outline/20 text-on-surface rounded hover:bg-secondary transition-colors shadow-sm"
                    title="Reject"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved Members */}
      {approved.length > 0 && (
        <div className="pt-2">
          <div className="flex items-center justify-between mb-2">
             <h4 className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">Squad Members</h4>
             <span className="px-2 py-0.5 bg-tertiary/10 text-tertiary text-[8px] font-bold rounded shadow-sm">{approved.length} Active</span>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {approved.map(member => (
              <div key={member.userId} className="flex items-center gap-2.5 p-2 bg-secondary-container/30 rounded-lg border border-outline/10">
                <div className="w-6 h-6 rounded shrink-0 bg-white flex items-center justify-center font-black text-[10px] text-primary shadow-sm border border-outline/10">
                  {member.user.username.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-on-surface truncate">{member.user.username}</p>
                  <p className="text-[7px] font-bold text-on-surface-variant uppercase tracking-widest truncate">{member.user.nationality || 'Traveler'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
