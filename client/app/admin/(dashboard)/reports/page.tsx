'use client';

import React, { useState, useEffect } from 'react';
import { 
  getAdminReportsAction, 
  getAdminReportDetailAction, 
  resolveReportAction, 
  dismissReportAction 
} from '@/lib/actions';
import { useNotification } from '@/hooks/use-notification';
import { useConfirm } from '@/hooks/use-confirm';

interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  reporterEmail: string;
  entityType: string;
  entityId: string;
  reason: string;
  description: string | null;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  evidenceUrls: string[];
  adminNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
  entityDetails?: {
    id: string;
    title: string;
    hostName: string;
    hostId: string;
    status: string;
  };
}

const BACKEND_URL = process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8888';

function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${BACKEND_URL}${cleanUrl}`;
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'RESOLVED' | 'DISMISSED' | ''>('PENDING');
  const [loading, setLoading] = useState(true);
  const { show } = useNotification();
  const { confirm: openConfirm } = useConfirm();

  // Selection for sliding details panel
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [actionNotes, setActionNotes] = useState('');
  const [hideActivity, setHideActivity] = useState(true);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Lightbox modal for evidence screenshots
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const data = await getAdminReportsAction(page, limit, statusFilter || undefined);
      if (data) {
        setReports(data.reports || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      show({ type: 'error', title: 'Fetch Failed', message: 'Could not load reports list.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [page, statusFilter]);

  const handleSelectReport = async (reportId: string) => {
    setSelectedReportId(reportId);
    setLoadingDetails(true);
    setActionNotes('');
    setHideActivity(true);
    
    try {
      const reportData = await getAdminReportDetailAction(reportId);
      if (reportData) {
        setSelectedReport(reportData);
      } else {
        show({ type: 'error', title: 'Not Found', message: 'Could not load report details.' });
      }
    } catch (err) {
      show({ type: 'error', title: 'Error', message: 'An error occurred loading details.' });
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedReport) return;
    setSubmittingAction(true);
    
    try {
      const result = await resolveReportAction(selectedReport.id, actionNotes.trim(), hideActivity);
      if (result.success) {
        show({ 
          type: 'success', 
          title: 'Report Resolved', 
          message: hideActivity 
            ? 'Report marked as resolved and activity suspended.' 
            : 'Report marked as resolved.' 
        });
        setSelectedReport(null);
        setSelectedReportId(null);
        fetchReports();
      } else {
        show({ type: 'error', title: 'Resolution Failed', message: result.error || 'Could not resolve report.' });
      }
    } catch (err) {
      show({ type: 'error', title: 'Error', message: 'An unexpected error occurred.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleDismiss = async () => {
    if (!selectedReport) return;
    setSubmittingAction(true);
    
    try {
      const result = await dismissReportAction(selectedReport.id, actionNotes.trim());
      if (result.success) {
        show({ type: 'success', title: 'Report Dismissed', message: 'Report dismissed with no action taken.' });
        setSelectedReport(null);
        setSelectedReportId(null);
        fetchReports();
      } else {
        show({ type: 'error', title: 'Dismiss Failed', message: result.error || 'Could not dismiss report.' });
      }
    } catch (err) {
      show({ type: 'error', title: 'Error', message: 'An unexpected error occurred.' });
    } finally {
      setSubmittingAction(false);
    }
  };

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      SCAM: 'Scam & Fraud',
      SPAM: 'Spam & Noise',
      HATE_SPEECH: 'Hate Speech',
      FAKE_INFORMATION: 'Fake Info',
      INAPPROPRIATE_CONTENT: 'Inappropriate Content',
      OTHER: 'Other Violation',
    };
    return labels[reason] || reason;
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-primary/10 border-primary/20 text-primary';
      case 'RESOLVED':
        return 'bg-tertiary/10 border-tertiary/20 text-tertiary';
      case 'DISMISSED':
        return 'bg-on-surface-variant/10 border-outline/20 text-on-surface-variant';
      default:
        return 'bg-secondary border-outline/10 text-on-secondary';
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 relative min-h-screen pb-16">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 py-2">
        <div>
          <span className="text-[8px] font-bold text-primary/80 uppercase tracking-[0.4em] mb-1 block">Moderation Panel</span>
          <h1 className="text-xl font-bold tracking-tighter text-on-surface leading-none uppercase">
            Community Activity Reports
          </h1>
        </div>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        
        {/* Reports Table - 2 Columns wide on wide screens */}
        <div className="xl:col-span-2 bg-surface border border-outline/10 p-6 shadow-sm rounded-2xl">
          
          {/* Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <select 
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setPage(1);
                }}
                className="h-10 px-4 bg-white border border-outline/15 text-xs font-bold text-on-surface-variant outline-none rounded-xl focus:ring-8 focus:ring-primary/5 focus:border-primary/30 transition-all shadow-sm cursor-pointer"
              >
                <option value="PENDING">Pending Reports</option>
                <option value="RESOLVED">Resolved Reports</option>
                <option value="DISMISSED">Dismissed Reports</option>
                <option value="">All Reports</option>
              </select>
            </div>
            
            <span className="text-[10px] font-extrabold text-on-surface-variant/80 uppercase tracking-widest">
              Total: {total} Logs
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : reports.length === 0 ? (
            <div className="py-24 text-center border border-dashed border-outline/25 rounded-2xl">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">gavel</span>
              <p className="text-[10px] font-extrabold text-on-surface-variant/50 uppercase tracking-widest mt-2">
                No reports match the selected criteria.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline/10">
                    <th className="text-left py-4 px-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Reporter</th>
                    <th className="text-left py-4 px-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Offense Group</th>
                    <th className="text-left py-4 px-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Reason</th>
                    <th className="text-left py-4 px-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Evidence</th>
                    <th className="text-right py-4 px-2 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline/10">
                  {reports.map((report) => (
                    <tr 
                      key={report.id} 
                      className={`group hover:bg-primary/5 transition-all duration-300 cursor-pointer ${
                        selectedReportId === report.id ? 'bg-primary/5' : ''
                      }`}
                      onClick={() => handleSelectReport(report.id)}
                    >
                      <td className="py-4 px-2">
                        <div className="font-bold text-xs text-on-surface truncate max-w-[140px]">
                          {report.reporterName}
                        </div>
                        <div className="text-[9px] text-on-surface-variant/80 font-bold max-w-[140px] truncate">
                          {report.reporterEmail}
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <div className="font-bold text-xs text-on-surface truncate max-w-[180px]">
                          {report.entityDetails?.title || 'Unknown Activity'}
                        </div>
                        <div className="text-[9px] text-on-surface-variant/60 font-bold uppercase tracking-wide">
                          Host: {report.entityDetails?.hostName || 'Unknown'}
                        </div>
                      </td>
                      <td className="py-4 px-2">
                        <span className={`px-2.5 py-1 border rounded-full text-[9px] font-bold tracking-wider uppercase inline-block ${
                          getStatusBadgeStyles(report.status)
                        }`}>
                          {getReasonLabel(report.reason)}
                        </span>
                      </td>
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-on-surface-variant/60">image</span>
                          <span className="text-[10px] font-bold text-on-surface-variant/80">
                            {report.evidenceUrls.length} Files
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-2 text-right">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectReport(report.id);
                          }}
                          className={`h-8 w-8 rounded-xl border border-outline/15 bg-white text-on-surface hover:bg-primary hover:text-white hover:border-primary flex items-center justify-center transition-all duration-300 ${
                            selectedReportId === report.id ? 'bg-primary text-white border-primary shadow-sm shadow-primary/10' : ''
                          }`}
                        >
                          <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {reports.length > 0 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-outline/10">
              <p className="text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-wider">
                Showing {reports.length} of {total} items
              </p>
              <div className="flex gap-2.5">
                <button 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="h-8 px-3 bg-white border border-outline/20 rounded-xl text-[10px] font-bold uppercase disabled:opacity-30 active:scale-95 transition-all hover:bg-on-surface/5"
                >
                  Prev
                </button>
                <div className="h-8 px-3.5 flex items-center justify-center bg-primary/10 border border-primary/20 text-primary rounded-xl text-[10px] font-bold">
                  {page}
                </div>
                <button 
                  disabled={reports.length < limit}
                  onClick={() => setPage(p => p + 1)}
                  className="h-8 px-3 bg-white border border-outline/20 rounded-xl text-[10px] font-bold uppercase disabled:opacity-30 active:scale-95 transition-all hover:bg-on-surface/5"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sliding Detail & Action Panel */}
        <div className="xl:col-span-1">
          {selectedReportId ? (
            <div 
              className="bg-surface border border-outline/10 p-6 shadow-sm space-y-6 animate-in slide-in-from-right-10 duration-300 rounded-2xl"
            >
              {loadingDetails ? (
                <div className="py-24 flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-wider">
                    Retrieving evidence files...
                  </p>
                </div>
              ) : selectedReport ? (
                <>
                  {/* Panel Header */}
                  <div className="flex justify-between items-start border-b border-outline/10 pb-4">
                    <div>
                      <h3 className="text-sm font-bold text-on-surface uppercase tracking-wide">
                        Report Investigation
                      </h3>
                      <span className={`px-2.5 py-0.5 border rounded-full text-[9px] font-bold uppercase inline-block mt-1 ${
                        getStatusBadgeStyles(selectedReport.status)
                      }`}>
                        {selectedReport.status}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedReportId(null);
                        setSelectedReport(null);
                      }}
                      className="w-8 h-8 rounded-lg bg-white border border-outline/15 hover:bg-primary/10 hover:text-primary hover:border-primary/20 flex items-center justify-center transition-all duration-300"
                    >
                      <span className="material-symbols-outlined text-sm font-bold">close</span>
                    </button>
                  </div>

                  {/* Report Details */}
                  <div className="space-y-4 text-xs">
                    <div>
                      <span className="text-[9px] font-extrabold text-on-surface-variant/50 uppercase tracking-widest block mb-1">
                        Violation Reason
                      </span>
                      <p className="font-bold text-on-surface">
                        {getReasonLabel(selectedReport.reason)} ({selectedReport.reason})
                      </p>
                    </div>

                    <div>
                      <span className="text-[9px] font-extrabold text-on-surface-variant/50 uppercase tracking-widest block mb-1">
                        Reporter Context
                      </span>
                      <div className="bg-white border border-outline/10 p-4 rounded-xl shadow-sm space-y-0.5">
                        <p className="font-bold text-on-surface">{selectedReport.reporterName}</p>
                        <p className="text-[10px] text-on-surface-variant font-bold">{selectedReport.reporterEmail}</p>
                        <p className="text-[9px] text-on-surface-variant/50 mt-1 font-bold uppercase">
                          Reported: {new Date(selectedReport.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div>
                      <span className="text-[9px] font-extrabold text-on-surface-variant/50 uppercase tracking-widest block mb-1">
                        Reported Activity Group
                      </span>
                      <div className="bg-white border border-outline/10 p-4 rounded-xl space-y-1.5 shadow-sm">
                        <p className="font-bold text-on-surface">
                          {selectedReport.entityDetails?.title || 'Unknown Title'}
                        </p>
                        <p className="text-[9px] text-on-surface-variant/60 font-bold uppercase">
                          Host: {selectedReport.entityDetails?.hostName || 'Unknown'} (Status: {selectedReport.entityDetails?.status})
                        </p>
                        {selectedReport.entityDetails?.status === 'CANCELLED' && (
                          <span className="inline-block px-2 py-0.5 bg-primary/5 text-primary text-[9px] font-bold uppercase rounded-full border border-primary/10">
                            Activity Suspended
                          </span>
                        )}
                      </div>
                    </div>

                    {selectedReport.description && (
                      <div>
                        <span className="text-[9px] font-extrabold text-on-surface-variant/50 uppercase tracking-widest block mb-1">
                          Reporter Description
                        </span>
                        <p className="bg-white border border-outline/10 p-4 rounded-xl italic text-on-surface-variant shadow-sm">
                          &ldquo;{selectedReport.description}&rdquo;
                        </p>
                      </div>
                    )}

                    {/* Screenshot Evidence with Lightbox */}
                    <div>
                      <span className="text-[9px] font-extrabold text-on-surface-variant/50 uppercase tracking-widest block mb-1.5">
                        Screenshot Evidence ({selectedReport.evidenceUrls.length} files)
                      </span>
                      {selectedReport.evidenceUrls.length === 0 ? (
                        <p className="text-[10px] text-on-surface-variant/40 font-bold italic uppercase">
                          No images attached as evidence.
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2.5">
                          {selectedReport.evidenceUrls.map((url, idx) => {
                            const resolvedUrl = resolveImageUrl(url) ?? '';
                            return (
                              <button 
                                key={idx}
                                type="button"
                                onClick={() => setActiveLightboxImage(resolvedUrl)}
                                className="aspect-square bg-white border border-outline/10 hover:border-primary/40 rounded-xl overflow-hidden block relative group shadow-sm transition-all duration-300"
                              >
                                <img
                                  src={resolvedUrl}
                                  alt={`Evidence ${idx + 1}`}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                                  <span className="material-symbols-outlined text-white text-base">zoom_in</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Past Admin Action History */}
                    {selectedReport.status !== 'PENDING' && (
                      <div className="bg-primary/5 border border-primary/10 p-4 rounded-xl space-y-1.5 mt-4 shadow-sm">
                        <span className="text-[9px] font-bold text-primary uppercase tracking-wider block">
                          Moderation Outcome
                        </span>
                        <p className="font-bold text-on-surface text-[11px]">
                          Outcome: {selectedReport.status}
                        </p>
                        {selectedReport.adminNotes && (
                          <p className="text-on-surface-variant italic mt-1 font-medium bg-white p-3 rounded-lg border border-outline/10">
                            &ldquo;{selectedReport.adminNotes}&rdquo;
                          </p>
                        )}
                        {selectedReport.resolvedAt && (
                          <p className="text-[9px] text-on-surface-variant/50 font-bold uppercase mt-1">
                            Action Taken: {new Date(selectedReport.resolvedAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Admin Action Form */}
                    {selectedReport.status === 'PENDING' && (
                      <div className="border-t border-outline/10 pt-4 space-y-4">
                        <span className="text-[9px] font-bold text-on-surface uppercase tracking-wider block">
                          Moderation Verdict
                        </span>

                        <div className="space-y-1.5">
                          <label className="text-[9px] font-extrabold text-on-surface-variant/50 uppercase tracking-widest">
                            Moderator Notes / Rationale
                          </label>
                          <textarea
                            placeholder="State the findings (e.g. Scammer profiles, spam activity, group resolved)..."
                            rows={3}
                            value={actionNotes}
                            onChange={(e) => setActionNotes(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-white border border-outline/15 rounded-xl focus:ring-8 focus:ring-primary/5 focus:border-primary/30 transition-all outline-none text-xs text-on-surface placeholder:text-on-surface-variant/40"
                          />
                        </div>

                        {/* Suspension Toggle */}
                        <label className="flex items-center gap-3 cursor-pointer bg-white border border-outline/10 hover:border-primary/30 p-4 rounded-xl transition-all duration-300 shadow-sm">
                          <input
                            type="checkbox"
                            checked={hideActivity}
                            onChange={(e) => setHideActivity(e.target.checked)}
                            className="accent-primary w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <p className="font-bold text-xs text-on-surface uppercase tracking-wide leading-none">
                              Suspend Activity
                            </p>
                            <p className="text-[10px] text-on-surface-variant/70 mt-1 font-medium leading-tight">
                              Set activity status to CANCELLED and hide from all public feeds.
                            </p>
                          </div>
                        </label>

                        {/* Resolve / Dismiss buttons */}
                        <div className="flex gap-3">
                          <button
                            type="button"
                            disabled={submittingAction}
                            onClick={handleDismiss}
                            className="flex-1 bg-white border border-outline/30 text-on-surface py-2.5 rounded-xl font-bold text-xs hover:bg-on-surface/5 transition-all"
                          >
                            Dismiss Report
                          </button>
                          <button
                            type="button"
                            disabled={submittingAction}
                            onClick={handleResolve}
                            className="flex-1 bg-primary text-white py-2.5 rounded-xl font-bold text-xs hover:bg-primary-container shadow-md shadow-primary/10 hover:shadow-lg transition-all"
                          >
                            {submittingAction ? 'Saving...' : 'Resolve & Close'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            <div className="bg-surface/60 border border-dashed border-outline/25 p-12 text-center rounded-2xl">
              <span className="material-symbols-outlined text-3xl text-on-surface-variant/30">gavel</span>
              <p className="text-[10px] font-extrabold text-on-surface-variant/40 uppercase tracking-widest mt-2">
                Select a report to view evidence and launch moderation tools.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Lightbox Modal Component */}
      {activeLightboxImage && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-300 cursor-zoom-out"
          onClick={() => setActiveLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] p-2 animate-in zoom-in-95 duration-300">
            <img 
              src={activeLightboxImage} 
              alt="Evidence Zoom" 
              className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl border border-white/10"
            />
            <button 
              className="absolute -top-12 right-0 text-white/70 hover:text-white flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider transition-colors"
              onClick={() => setActiveLightboxImage(null)}
            >
              <span className="material-symbols-outlined text-lg">close</span>
              Close Preview
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
