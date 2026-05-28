'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { reportActivityAction, uploadImageAction } from '@/lib/actions';

interface ReportActivityDialogProps {
  activityId: string;
  activityTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

const VIOLATION_TYPES = [
  { id: 'SCAM', name: 'Scam & Fraud', icon: 'gavel', desc: 'Fraudulent group or financial trap' },
  { id: 'SPAM', name: 'Spam & Noise', icon: 'mail', desc: 'Irrelevant messages or mass ads' },
  { id: 'HATE_SPEECH', name: 'Hate Speech', icon: 'campaign', desc: 'Harassment, hate, or abuse' },
  { id: 'FAKE_INFORMATION', name: 'Fake Info', icon: 'error', desc: 'Misleading or false statements' },
  { id: 'INAPPROPRIATE_CONTENT', name: 'Inappropriate', icon: 'visibility_off', desc: 'Violent or explicit contents' },
  { id: 'OTHER', name: 'Other Violations', icon: 'help_outline', desc: 'Other types of violations' },
];

const BACKEND_URL = process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8888';

function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${BACKEND_URL}${cleanUrl}`;
}

export const ReportActivityDialog: React.FC<ReportActivityDialogProps> = ({
  activityId,
  activityTitle,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (evidenceUrls.length >= 3) {
      setError('You can upload up to 3 screenshots only.');
      return;
    }

    const file = files[0];

    // Client-side image validation (Option A: PNG, JPG, WEBP, Max 5MB)
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Only PNG, JPG, or WEBP screenshot images are allowed.');
      return;
    }

    const maxSizeInBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeInBytes) {
      setError('Screenshot file size must be less than 5MB.');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const result = await uploadImageAction(fd);

      if (result.success && result.url) {
        setEvidenceUrls((prev) => [...prev, result.url!]);
      } else {
        setError(result.error || 'Failed to upload screenshot.');
      }
    } catch {
      setError('An error occurred during upload.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setEvidenceUrls((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setError('Please select a violation category.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await reportActivityAction(
        activityId,
        reason,
        description.trim(),
        evidenceUrls
      );

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        setError(result.error || 'Failed to submit report. Please try again.');
      }
    } catch {
      setError('An error occurred while submitting.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#261817]/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className="bg-background w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-outline/10 flex flex-col animate-in zoom-in-95 slide-in-from-bottom-6 duration-300 max-h-[90vh]"
      >
        {/* Header - Premium Minimalist */}
        <div className="px-6 py-4 shrink-0 bg-background border-b border-outline/10 flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold tracking-tight text-on-surface uppercase">
              Report Community Activity
            </h2>
            <p className="text-on-surface-variant text-[10px] font-semibold uppercase tracking-wider mt-0.5 truncate max-w-[320px]">
              Flagging: &ldquo;{activityTitle}&rdquo;
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface/50 text-on-surface hover:bg-primary/10 hover:text-primary border border-outline/15 hover:border-primary/20 flex items-center justify-center transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-sm font-bold">close</span>
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="flex-1 px-8 py-16 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-bounce">
              <span className="material-symbols-outlined text-3xl text-primary font-bold">verified</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-on-surface uppercase tracking-tight">Report Submitted</h3>
              <p className="text-xs text-on-surface-variant max-w-[320px] mx-auto">
                Thank you for keeping HanoiGO safe. Admins will review your report and evidence shortly.
              </p>
            </div>
          </div>
        ) : (
          /* Form container */
          <div className="px-6 py-5 overflow-y-auto custom-scrollbar flex-1">
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Category selector */}
              <div className="space-y-2.5">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant">
                  Why are you reporting this? <span className="text-primary">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {VIOLATION_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setReason(type.id);
                        setError('');
                      }}
                      className={`flex flex-col items-start text-left p-3.5 rounded-xl border transition-all duration-300 ${
                        reason === type.id
                          ? 'bg-primary/5 border-primary text-primary shadow-sm shadow-primary/5'
                          : 'bg-white border-outline/15 hover:border-outline/40 hover:bg-secondary-container/10 text-on-surface-variant'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs tracking-wide">
                        <span className="material-symbols-outlined text-sm">{type.icon}</span>
                        {type.name}
                      </div>
                      <span className="text-[10px] text-on-surface-variant/70 mt-1 font-medium leading-tight">
                        {type.desc}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant">
                  Detailed Context <span className="text-on-surface-variant/40 font-bold normal-case tracking-normal">(optional)</span>
                </label>
                <textarea
                  placeholder="Provide details about scams, inappropriate behavior, fake information..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-outline/15 rounded-xl focus:ring-8 focus:ring-primary/5 focus:border-primary/30 transition-all outline-none font-medium placeholder:text-on-surface-variant/40 text-xs text-on-surface resize-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Screenshots (Max 3) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant">
                    Screenshots / Evidence
                  </label>
                  <span className="text-[10px] font-bold text-on-surface-variant/80 uppercase">
                    {evidenceUrls.length} / 3 Uploaded
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2.5">
                  {evidenceUrls.map((url, idx) => (
                    <div 
                      key={idx} 
                      className="relative aspect-square bg-white border border-outline/15 rounded-xl overflow-hidden group shadow-sm"
                    >
                      <img
                        src={resolveImageUrl(url) ?? ''}
                        alt={`Evidence ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute inset-0 bg-primary/95 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        <span className="material-symbols-outlined text-lg font-bold">delete</span>
                      </button>
                    </div>
                  ))}

                  {evidenceUrls.length < 3 && (
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square bg-white border border-dashed border-outline/30 hover:border-primary hover:bg-primary/5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all duration-300 shadow-sm"
                    >
                      {uploading ? (
                        <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-lg text-on-surface-variant/60">add_photo_alternate</span>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-on-surface-variant/70">
                            Upload
                          </span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <p className="text-[9px] text-on-surface-variant/60 font-bold uppercase tracking-wide mt-1.5">
                  Supports PNG, JPG, WEBP · Max 5MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {error && (
                <div className="p-3 bg-primary/5 text-primary rounded-xl text-xs font-semibold text-center border border-primary/10">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-outline/10 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="flex-1 bg-white border border-outline/30 text-on-surface py-3 rounded-xl font-bold text-xs hover:bg-on-surface/5 transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploading || !reason}
                  className="flex-1 bg-primary text-white py-3 rounded-xl font-bold text-xs hover:bg-primary-container shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/15 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {submitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                  ) : (
                    'Submit Report'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
