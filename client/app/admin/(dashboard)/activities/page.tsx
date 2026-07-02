'use client';

import React, { useState, useEffect } from 'react';
import {
  getAdminActivitiesAction,
  cancelAdminActivityAction,
  deleteAdminActivityAction,
  resolveImageUrl,
} from '@/lib/actions';
import { useNotification } from '@/hooks/use-notification';
import { useConfirm } from '@/hooks/use-confirm';

const BACKEND_URL = process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8888';

const CATEGORY_COLORS: Record<string, string> = {
  'Food & Drink':       '#E53535',
  'Sports & Active':    '#43A047',
  'Arts & Culture':     '#3F51B5',
  'Social & Nightlife': '#9C27B0',
  'Sightseeing':        '#0288D1',
};

function resolveActivityImage(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

export default function ActivityManagement() {
  const [activities, setActivities] = useState<any[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [limit]                     = useState(10);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const [loading, setLoading]       = useState(true);
  const { show }                    = useNotification();
  const { confirm: openConfirm }    = useConfirm();

  // Detail modal
  const [selected, setSelected]         = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen]   = useState(false);

  const fetchActivities = async () => {
    setLoading(true);
    const data = await getAdminActivitiesAction(page, limit, search, statusFilter);
    if (data) {
      setActivities(data.activities || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  };

  useEffect(() => { fetchActivities(); }, [page, search, statusFilter]);

  const handleCancel = async (id: string, title: string) => {
    const ok = await openConfirm({
      title: 'Hide Activity',
      message: `Set "${title}" to CANCELLED? It will be hidden from the public feed but data is preserved.`,
      confirmText: 'Hide Activity',
      type: 'warning',
    });
    if (!ok) return;

    const res = await cancelAdminActivityAction(id);
    if (res.success) {
      show({ type: 'success', title: 'Activity Hidden', message: 'Activity status set to CANCELLED.' });
      fetchActivities();
      if (selected?.id === id) setSelected((prev: any) => ({ ...prev, status: 'CANCELLED' }));
    } else {
      show({ type: 'error', title: 'Failed', message: res.error || 'Could not cancel activity.' });
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const ok = await openConfirm({
      title: 'Delete Activity',
      message: `PERMANENTLY delete "${title}" and all its members, messages, and likes? This cannot be undone.`,
      confirmText: 'Delete Forever',
      type: 'danger',
    });
    if (!ok) return;

    const res = await deleteAdminActivityAction(id);
    if (res.success) {
      show({ type: 'success', title: 'Activity Deleted', message: 'Activity has been permanently removed.' });
      setIsModalOpen(false);
      setSelected(null);
      fetchActivities();
    } else {
      show({ type: 'error', title: 'Delete Failed', message: res.error || 'Could not delete activity.' });
    }
  };

  const handleViewDetails = (activity: any) => {
    setSelected(activity);
    setIsModalOpen(true);
  };

  const statusBadge = (status: string) => {
    if (status === 'OPEN')
      return <span className="px-3 py-1.5 rounded-full text-[9px] font-bold tracking-widest inline-flex items-center gap-2 bg-green-50 text-green-600 border border-green-100"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />OPEN</span>;
    if (status === 'CANCELLED')
      return <span className="px-3 py-1.5 rounded-full text-[9px] font-bold tracking-widest inline-flex items-center gap-2 bg-red-50 text-red-500 border border-red-100"><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />CANCELLED</span>;
    return <span className="px-3 py-1.5 rounded-full text-[9px] font-bold tracking-widest inline-flex items-center gap-2 bg-secondary text-outline border border-outline/10"><span className="w-1.5 h-1.5 rounded-full bg-outline" />{status}</span>;
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 py-2">
        <div>
          <span className="text-[8px] font-bold text-primary/80 uppercase tracking-[0.4em] mb-1 block">Moderation Panel</span>
          <h1 className="text-xl font-bold tracking-tighter text-on-surface leading-none">Activity Repository</h1>
        </div>
        <span className="text-[10px] font-bold text-outline/60 uppercase tracking-widest">{total} Activities Total</span>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-3xl border border-outline/5 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
          <div className="relative group flex-1 max-w-sm">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">search</span>
            <input
              type="text"
              placeholder="Search title, address, host..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-12 pl-12 pr-6 w-full bg-background rounded-2xl border border-transparent focus:border-primary/20 focus:bg-white transition-all text-[11px] font-bold outline-none"
            />
          </div>
          <select
            value={statusFilter || ''}
            onChange={e => { setStatusFilter(e.target.value || undefined); setPage(1); }}
            className="h-12 px-4 bg-background rounded-2xl border border-transparent text-[10px] font-bold uppercase tracking-widest text-outline/70 outline-none"
          >
            <option value="">All Status</option>
            <option value="OPEN">Open</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <span className="material-symbols-outlined text-5xl text-outline/30">event_busy</span>
            <p className="text-[11px] font-bold text-outline/50 uppercase tracking-widest">No activities found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline/5">
                    <th className="text-left py-6 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-outline/60">Activity</th>
                    <th className="text-left py-6 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-outline/60">Host</th>
                    <th className="text-left py-6 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-outline/60">Status</th>
                    <th className="text-left py-6 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-outline/60">Scheduled</th>
                    <th className="text-left py-6 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-outline/60">Members</th>
                    <th className="text-left py-6 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-outline/60">Reports</th>
                    <th className="text-right py-6 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-outline/60">Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline/5">
                  {activities.map((activity) => {
                    const catColor = CATEGORY_COLORS[activity.category] ?? '#607D8B';
                    return (
                      <tr key={activity.id} className="group hover:bg-background/50 transition-colors">
                        <td className="py-5 px-4">
                          <div className="flex items-center gap-3 max-w-xs">
                            <div
                              className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white text-[9px] font-black uppercase overflow-hidden"
                              style={{ backgroundColor: catColor + '22', border: `1px solid ${catColor}33` }}
                            >
                              {activity.imageUrl ? (
                                <img src={resolveActivityImage(activity.imageUrl) ?? ''} alt="" className="w-full h-full object-cover rounded-xl" />
                              ) : (
                                <span className="material-symbols-outlined text-base" style={{ color: catColor }}>event</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-[12px] font-bold text-on-surface truncate leading-snug">{activity.title}</p>
                              <p className="text-[9px] text-outline/60 font-bold uppercase tracking-widest mt-0.5" style={{ color: catColor }}>{activity.category}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-secondary/30 flex items-center justify-center text-[10px] font-bold text-primary overflow-hidden shrink-0">
                              {activity.host?.avatarUrl ? (
                                <img src={resolveImageUrl(activity.host.avatarUrl) ?? ''} alt="" className="w-full h-full object-cover" />
                              ) : (
                                (activity.host?.username || 'H')[0].toUpperCase()
                              )}
                            </div>
                            <span className="text-[11px] font-bold text-on-surface truncate max-w-[100px]">{activity.host?.username || '—'}</span>
                          </div>
                        </td>
                        <td className="py-5 px-4">{statusBadge(activity.status)}</td>
                        <td className="py-5 px-4 text-[11px] font-bold text-outline uppercase whitespace-nowrap">
                          {new Date(activity.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="py-5 px-4">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-on-surface">
                            <span className="material-symbols-outlined text-sm text-outline">group</span>
                            {activity._count?.activityMembers ?? 0}
                          </div>
                        </td>
                        <td className="py-5 px-4">
                          {activity.reportCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-600 text-[9px] font-black border border-red-100">
                              <span className="material-symbols-outlined text-[11px]">flag</span>
                              {activity.reportCount}
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-outline/40">—</span>
                          )}
                        </td>
                        <td className="py-5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewDetails(activity)}
                              className="h-9 w-9 flex items-center justify-center rounded-xl bg-background text-outline hover:text-primary hover:bg-white hover:shadow-md transition-all"
                              title="View Details"
                            >
                              <span className="material-symbols-outlined text-base">visibility</span>
                            </button>
                            {activity.status === 'OPEN' && (
                              <button
                                onClick={() => handleCancel(activity.id, activity.title)}
                                className="h-9 px-3 rounded-xl text-[9px] font-bold uppercase tracking-widest bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white transition-all"
                                title="Hide Activity"
                              >
                                Hide
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(activity.id, activity.title)}
                              className="h-9 w-9 flex items-center justify-center rounded-xl bg-red-50 text-red-400 hover:text-white hover:bg-red-600 transition-all"
                              title="Delete Activity"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-outline/5">
              <p className="text-[10px] font-bold text-outline/60 uppercase tracking-widest">
                Showing {activities.length} of {total} activities
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="h-8 px-3 bg-background rounded-lg text-[9px] font-bold uppercase disabled:opacity-30 transition-all"
                >
                  Prev
                </button>
                <div className="h-8 px-3 flex items-center justify-center bg-primary/10 text-primary rounded-lg text-[9px] font-bold">{page}</div>
                <button
                  disabled={activities.length < limit}
                  onClick={() => setPage(p => p + 1)}
                  className="h-8 px-3 bg-background rounded-lg text-[9px] font-bold uppercase disabled:opacity-30 transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {isModalOpen && selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-on-background/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 max-h-[90vh]">

            {/* Modal Header */}
            <div className="bg-background/50 p-8 relative shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center rounded-2xl bg-white shadow-xl text-outline hover:text-primary transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>

              <div className="flex items-start gap-5">
                <div
                  className="w-16 h-16 rounded-2xl shrink-0 overflow-hidden flex items-center justify-center"
                  style={{ backgroundColor: (CATEGORY_COLORS[selected.category] ?? '#607D8B') + '22' }}
                >
                  {selected.imageUrl ? (
                    <img src={resolveActivityImage(selected.imageUrl) ?? ''} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-3xl" style={{ color: CATEGORY_COLORS[selected.category] ?? '#607D8B' }}>event</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 pr-16">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {statusBadge(selected.status)}
                    <span className="px-2.5 py-1 rounded-full text-[9px] font-bold text-outline border border-outline/15 bg-background">
                      {selected.category}
                    </span>
                    {selected.tripId && (
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                        Shared Trip
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-black tracking-tighter text-on-surface leading-tight">{selected.title}</h2>
                  {selected.address && (
                    <p className="text-[11px] font-bold text-outline mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">location_on</span>
                      {selected.address}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar flex-1">
              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-background p-4 rounded-2xl text-center">
                  <p className="text-xl font-black text-on-surface">{selected._count?.activityMembers ?? 0}</p>
                  <p className="text-[8px] font-black text-outline uppercase tracking-[0.2em] mt-1">Members</p>
                </div>
                <div className="bg-background p-4 rounded-2xl text-center">
                  <p className="text-xl font-black text-on-surface">{selected._count?.likes ?? 0}</p>
                  <p className="text-[8px] font-black text-outline uppercase tracking-[0.2em] mt-1">Likes</p>
                </div>
                <div className="bg-background p-4 rounded-2xl text-center">
                  <p className="text-xl font-black text-on-surface">{selected.maxMembers ?? '—'}</p>
                  <p className="text-[8px] font-black text-outline uppercase tracking-[0.2em] mt-1">Capacity</p>
                </div>
                <div className={`p-4 rounded-2xl text-center ${selected.reportCount > 0 ? 'bg-red-50' : 'bg-background'}`}>
                  <p className={`text-xl font-black ${selected.reportCount > 0 ? 'text-red-600' : 'text-on-surface'}`}>{selected.reportCount}</p>
                  <p className="text-[8px] font-black text-outline uppercase tracking-[0.2em] mt-1">Reports</p>
                </div>
              </div>

              {/* Info rows */}
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-background rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-outline overflow-hidden shrink-0">
                    {selected.host?.avatarUrl ? (
                      <img src={resolveImageUrl(selected.host.avatarUrl) ?? ''} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="material-symbols-outlined text-lg">person</span>
                    )}
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-outline uppercase tracking-widest">Host</p>
                    <p className="text-[13px] font-bold text-on-surface">{selected.host?.username || 'Unknown'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-background rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-outline shrink-0">
                    <span className="material-symbols-outlined text-lg">calendar_month</span>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-outline uppercase tracking-widest">Scheduled</p>
                    <p className="text-[13px] font-bold text-on-surface">
                      {new Date(selected.scheduledAt).toLocaleString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-background rounded-2xl">
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-outline shrink-0">
                    <span className="material-symbols-outlined text-lg">schedule</span>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-outline uppercase tracking-widest">Created</p>
                    <p className="text-[13px] font-bold text-on-surface">
                      {new Date(selected.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>

              {selected.description && (
                <div className="pt-2">
                  <h3 className="text-[9px] font-black text-outline uppercase tracking-widest mb-3">Description</h3>
                  <p className="text-[13px] font-medium text-on-surface leading-relaxed bg-background/50 p-4 rounded-2xl italic">
                    {selected.description}
                  </p>
                </div>
              )}

              {selected.reportCount > 0 && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3">
                  <span className="material-symbols-outlined text-red-500 text-xl">warning</span>
                  <div>
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Flagged Content</p>
                    <p className="text-[12px] font-bold text-red-500 mt-0.5">
                      This activity has {selected.reportCount} user report{selected.reportCount > 1 ? 's' : ''}. Review in Activity Reports.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-8 bg-background/20 border-t border-outline/5 flex items-center justify-between gap-4 shrink-0">
              <p className="text-[9px] font-black text-outline/50 uppercase tracking-widest truncate">ID: {selected.id}</p>
              <div className="flex items-center gap-3">
                {selected.status === 'OPEN' && (
                  <button
                    onClick={() => handleCancel(selected.id, selected.title)}
                    className="h-12 px-6 rounded-2xl bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-[0.15em] hover:bg-amber-600 hover:text-white transition-all shadow-sm"
                  >
                    Hide Activity
                  </button>
                )}
                <button
                  onClick={() => handleDelete(selected.id, selected.title)}
                  className="h-12 w-12 flex items-center justify-center rounded-2xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-xl"
                  title="Delete Forever"
                >
                  <span className="material-symbols-outlined">delete_forever</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
