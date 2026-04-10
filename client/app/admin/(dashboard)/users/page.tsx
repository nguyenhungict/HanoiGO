'use client';

import React, { useState, useEffect } from 'react';
import { 
  getAdminUsersAction, 
  banUserAction, 
  unbanUserAction, 
  getAdminUserDetailsAction 
} from '@/lib/actions';

interface User {
  id: string;
  username: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  role: string;
  status: string;
  createdAt: string;
  _count: {
    trips: number;
  };
}

interface UserDetail extends User {
  bio: string | null;
  nationality: string | null;
  languages: string[];
  _count: {
    trips: number;
    reportsCreated: number;
    reportsAgainst: number;
  };
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  
  // User selection for details
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    const data = await getAdminUsersAction(page, limit, search, statusFilter);
    if (data) {
      setUsers(data.users || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search, statusFilter]);

  // Ban dialog state
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [banTargetId, setBanTargetId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState('SPAM');

  const handleBanClick = (userId: string) => {
    setBanTargetId(userId);
    setBanReason('SPAM');
    setBanDialogOpen(true);
  };

  const handleConfirmBan = async () => {
    if (!banTargetId) return;
    const res = await banUserAction(banTargetId, banReason);
    setBanDialogOpen(false);
    setBanTargetId(null);
    if (res.success) {
      fetchUsers();
      if (selectedUser && selectedUser.id === banTargetId) {
        setSelectedUser({ ...selectedUser, status: 'BANNED' });
      }
    } else {
      alert(res.error || 'Failed to ban user');
    }
  };

  const handleUnban = async (userId: string) => {
    if (!confirm('Are you sure you want to unban this user?')) return;
    const res = await unbanUserAction(userId);
    if (res.success) {
      fetchUsers();
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, status: 'ACTIVE' });
      }
    } else {
      alert(res.error || 'Failed to unban user');
    }
  };

  const handleViewDetails = async (userId: string) => {
    setLoadingDetails(true);
    setIsModalOpen(true);
    const data = await getAdminUserDetailsAction(userId);
    if (data) {
      setSelectedUser(data);
    }
    setLoadingDetails(false);
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 py-4">
        <div>
          <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] mb-2 block">Moderation Panel</span>
          <h1 className="text-5xl font-black tracking-tighter text-on-surface leading-none">User Repository</h1>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-[3rem] border border-outline/5 p-12 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-4">
            <div className="relative group">
               <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">search</span>
               <input 
                 type="text" 
                 placeholder="Search username, email, name..." 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="h-12 pl-12 pr-6 bg-background rounded-2xl border border-transparent focus:border-primary/20 focus:bg-white transition-all text-[11px] font-bold outline-none w-80"
               />
            </div>
            <select 
              value={statusFilter || ''}
              onChange={(e) => setStatusFilter(e.target.value || undefined)}
              className="h-12 px-4 bg-background rounded-2xl border border-transparent text-[10px] font-black uppercase tracking-widest text-outline outline-none"
            >
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="BANNED">Banned</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-black text-outline uppercase tracking-widest mr-2">Total: {total} Users</span>
          </div>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline/5">
                    <th className="text-left py-6 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-outline">User Identity</th>
                    <th className="text-left py-6 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-outline">Status</th>
                    <th className="text-left py-6 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-outline">Registration</th>
                    <th className="text-left py-6 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-outline">Trips</th>
                    <th className="text-right py-6 px-4 text-[10px] font-black uppercase tracking-[0.2em] text-outline">Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline/5">
                  {users.map((user) => (
                    <tr key={user.id} className="group hover:bg-background/50 transition-colors">
                      <td className="py-6 px-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-secondary/30 flex items-center justify-center text-primary font-black text-sm group-hover:bg-primary group-hover:text-white transition-all overflow-hidden">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              (user.fullName || user.username).charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <h4 className="text-[13px] font-black text-on-surface uppercase tracking-tight">{user.fullName || user.username}</h4>
                            <p className="text-[10px] text-outline font-black">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-6 px-4">
                        <span className={`px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest inline-flex items-center gap-2 ${
                          user.status === 'ACTIVE' 
                          ? 'bg-green-50 text-green-600 border border-green-100' 
                          : 'bg-red-50 text-red-600 border border-red-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${user.status === 'ACTIVE' ? 'bg-green-600' : 'bg-red-600 animate-pulse'}`} />
                          {user.status}
                        </span>
                      </td>
                      <td className="py-6 px-4 text-[11px] font-bold text-outline uppercase">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-6 px-4 text-[11px] font-black text-on-surface">{user._count.trips}</td>
                      <td className="py-6 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleViewDetails(user.id)}
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-background text-outline hover:text-primary hover:bg-white hover:shadow-md transition-all"
                            title="View Details"
                          >
                            <span className="material-symbols-outlined text-lg">visibility</span>
                          </button>
                          <button 
                            onClick={() => user.status === 'ACTIVE' ? handleBanClick(user.id) : handleUnban(user.id)}
                            className={`h-10 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                              user.status === 'ACTIVE'
                              ? 'bg-red-50 text-red-600 hover:bg-red-600 hover:text-white'
                              : 'bg-green-50 text-green-600 hover:bg-green-600 hover:text-white'
                            }`}
                          >
                            {user.status === 'ACTIVE' ? 'Ban' : 'Restore'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            <div className="flex items-center justify-between mt-12 pt-8 border-t border-outline/5">
              <p className="text-[10px] font-black text-outline uppercase tracking-widest">
                Showing {users.length} of {total} users
              </p>
              <div className="flex gap-2">
                <button 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="h-10 px-4 bg-background rounded-xl text-[10px] font-black uppercase disabled:opacity-30 hover:shadow-md transition-all"
                >
                  Prev
                </button>
                <div className="h-10 px-4 flex items-center justify-center bg-primary/10 text-primary rounded-xl text-[10px] font-black">
                  {page}
                </div>
                <button 
                  disabled={users.length < limit}
                  onClick={() => setPage(p => p + 1)}
                  className="h-10 px-4 bg-background rounded-xl text-[10px] font-black uppercase disabled:opacity-30 hover:shadow-md transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* User Details Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-on-background/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            {loadingDetails ? (
              <div className="p-24 flex flex-col items-center gap-6">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">Acquiring Citizen Profile...</p>
              </div>
            ) : selectedUser ? (
              <>
                {/* Modal Header/Top Area */}
                <div className="bg-background/50 p-12 relative">
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center rounded-2xl bg-white shadow-xl text-outline hover:text-primary transition-all active:scale-95"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                  
                  <div className="flex items-center gap-8">
                    <div className="w-24 h-24 rounded-[2rem] bg-white shadow-2xl overflow-hidden p-2">
                      <div className="w-full h-full rounded-[1.5rem] bg-secondary flex items-center justify-center text-primary text-3xl font-black overflow-hidden">
                        {selectedUser.avatarUrl ? (
                          <img src={selectedUser.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          selectedUser.username.charAt(0).toUpperCase()
                        )}
                      </div>
                    </div>
                    <div>
                      <span className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest inline-flex items-center gap-2 mb-4 ${
                        selectedUser.status === 'ACTIVE' 
                        ? 'bg-green-50 text-green-600' 
                        : 'bg-red-50 text-red-600'
                      }`}>
                        {selectedUser.status}
                      </span>
                      <h2 className="text-3xl font-black tracking-tighter text-on-surface leading-none mb-2">
                        {selectedUser.fullName || selectedUser.username}
                      </h2>
                      <p className="text-[12px] font-black text-outline uppercase tracking-widest">@{selectedUser.username}</p>
                    </div>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-12 space-y-10 overflow-y-auto max-h-[60vh]">
                  {/* Bio Section */}
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-outline uppercase tracking-widest opacity-50">Biography</h3>
                    <p className="text-on-surface text-[14px] leading-relaxed font-medium bg-background/30 p-6 rounded-3xl italic">
                      {selectedUser.bio || 'This user prefers to keep their identity mysterious. No biography provided.'}
                    </p>
                  </div>

                  {/* Grid Stats */}
                  <div className="grid grid-cols-3 gap-6">
                    <div className="bg-background p-6 rounded-[2rem] text-center">
                       <p className="text-2xl font-black text-on-surface">{selectedUser._count.trips}</p>
                       <p className="text-[8px] font-black text-outline uppercase tracking-[0.2em] mt-1">Expeditions</p>
                    </div>
                    <div className="bg-background p-6 rounded-[2rem] text-center">
                       <p className="text-2xl font-black text-green-600">{selectedUser._count.reportsCreated}</p>
                       <p className="text-[8px] font-black text-outline uppercase tracking-[0.2em] mt-1">Contributions</p>
                    </div>
                    <div className="bg-background p-6 rounded-[2rem] text-center">
                       <p className="text-2xl font-black text-red-600">{selectedUser._count.reportsAgainst}</p>
                       <p className="text-[8px] font-black text-outline uppercase tracking-[0.2em] mt-1">Violations</p>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="grid grid-cols-2 gap-8 pt-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-outline">
                         <span className="material-symbols-outlined text-lg">mail</span>
                      </div>
                      <div>
                         <p className="text-[8px] font-black text-outline uppercase tracking-widest italic">Email Address</p>
                         <p className="text-[12px] font-bold text-on-surface">{selectedUser.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-outline">
                         <span className="material-symbols-outlined text-lg">public</span>
                      </div>
                      <div>
                         <p className="text-[8px] font-black text-outline uppercase tracking-widest italic">Nationality</p>
                         <p className="text-[12px] font-bold text-on-surface">{selectedUser.nationality || 'Not specified'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-outline">
                         <span className="material-symbols-outlined text-lg">calendar_today</span>
                      </div>
                      <div>
                         <p className="text-[8px] font-black text-outline uppercase tracking-widest italic">Enrolled Since</p>
                         <p className="text-[12px] font-bold text-on-surface">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {selectedUser.languages && selectedUser.languages.length > 0 && (
                      <div className="flex items-center gap-4 col-span-2 mt-4 pt-4 border-t border-outline/5">
                        <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-outline">
                           <span className="material-symbols-outlined text-lg">translate</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                           {selectedUser.languages.map((lang, idx) => (
                             <span key={idx} className="px-3 py-1 bg-on-surface text-white text-[9px] font-black uppercase tracking-widest rounded-lg">
                               {lang}
                             </span>
                           ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-8 bg-background/20 mt-auto border-t border-outline/5 flex items-center justify-between gap-4">
                   <p className="text-[9px] font-black text-outline uppercase tracking-widest px-4">Identification Matrix: {selectedUser.id}</p>
                   <button 
                     onClick={() => {
                        if (selectedUser.status === 'ACTIVE') {
                          setIsModalOpen(false);
                          handleBanClick(selectedUser.id);
                        } else {
                          setIsModalOpen(false);
                          handleUnban(selectedUser.id);
                        }
                     }}
                     className={`h-12 px-8 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl ${
                       selectedUser.status === 'ACTIVE'
                       ? 'bg-red-600 text-white hover:bg-red-700'
                       : 'bg-green-600 text-white hover:bg-green-700'
                     }`}
                   >
                     {selectedUser.status === 'ACTIVE' ? 'Ban Access' : 'Restore Access'}
                   </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Ban Reason Dialog */}
      {banDialogOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-on-background/50 backdrop-blur-sm" onClick={() => setBanDialogOpen(false)} />
          <div className="bg-white w-full max-w-md rounded-[2rem] shadow-2xl relative z-10 p-10 space-y-8 animate-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-2xl font-black tracking-tighter text-on-surface">Ban User</h3>
              <p className="text-[11px] text-outline font-bold mt-2">Select a reason for banning this user. This action will be logged.</p>
            </div>
            <div className="space-y-3">
              <label className="text-[9px] font-black text-outline uppercase tracking-[0.2em]">Violation Type</label>
              <select
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="w-full h-14 px-5 bg-background rounded-2xl border border-transparent focus:border-primary/20 text-[12px] font-bold outline-none appearance-none"
              >
                <option value="SPAM">Spam</option>
                <option value="HATE_SPEECH">Hate Speech</option>
                <option value="SCAM">Scam</option>
                <option value="FAKE_INFORMATION">Fake Information</option>
                <option value="INAPPROPRIATE_CONTENT">Inappropriate Content</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setBanDialogOpen(false)}
                className="flex-1 h-12 rounded-2xl bg-background text-[10px] font-black uppercase tracking-widest hover:shadow-md transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBan}
                className="flex-1 h-12 rounded-2xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl"
              >
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
