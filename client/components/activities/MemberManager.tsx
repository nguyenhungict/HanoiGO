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
          <div key={i} className="h-16 bg-secondary/30 rounded-2xl animate-pulse" />
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
        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-outline/60 mb-4">Pending Requests ({requests.length})</h4>
        {requests.length === 0 ? (
          <p className="text-xs text-outline/40 font-medium bg-secondary/20 p-4 rounded-2xl border border-dashed border-outline/10 text-center">No pending requests</p>
        ) : (
          <div className="space-y-3">
            {requests.map(member => (
              <div key={member.userId} className="flex items-center justify-between p-4 bg-white border border-outline/10 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary">
                    {member.user.username.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-on-surface">{member.user.username}</p>
                    <p className="text-[10px] font-semibold text-outline/60 uppercase">{member.user.nationality || 'Traveler'}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleApprove(member.userId)}
                    className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center hover:bg-green-600 transition-all active:scale-90"
                  >
                    <span className="material-symbols-outlined text-xl">check</span>
                  </button>
                  <button 
                    onClick={() => handleReject(member.userId)}
                    className="w-10 h-10 rounded-xl bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all active:scale-90"
                  >
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved Members */}
      <div>
        <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-outline/60 mb-4">Approved Members ({approved.length})</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {approved.map(member => (
            <div key={member.userId} className="flex items-center gap-3 p-3 bg-secondary/20 rounded-2xl border border-outline/5">
              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center font-bold text-[10px] text-primary">
                {member.user.username.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-on-surface truncate">{member.user.username}</p>
                <p className="text-[9px] font-semibold text-outline/60 uppercase truncate">{member.user.nationality || 'Traveler'}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
