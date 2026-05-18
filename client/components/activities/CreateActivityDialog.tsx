'use client';

import React, { useState, useRef } from 'react';
import { createActivityAction, uploadImageAction } from '@/lib/actions';

interface CreateActivityDialogProps {
  onClose: () => void;
  onCreated: () => void;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8888';

export const CreateActivityDialog: React.FC<CreateActivityDialogProps> = ({ onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    lat: 21.0285,
    lng: 105.8542,
    scheduledAt: '',
    maxMembers: 10,
    category: 'Arts & Culture',
    imageUrl: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const objectUrl = URL.createObjectURL(file);
    setImagePreview(objectUrl);

    setUploadingImage(true);
    const fd = new FormData();
    fd.append('file', file);
    const result = await uploadImageAction(fd);
    setUploadingImage(false);

    if (result.success && result.url) {
      setFormData(prev => ({ ...prev, imageUrl: result.url! }));
    } else {
      setError(result.error || 'Image upload failed');
      setImagePreview(null);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setFormData(prev => ({ ...prev, imageUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await createActivityAction(formData);
    setLoading(false);

    if (result.success) {
      onCreated();
    } else {
      setError(result.error || 'Failed to create activity');
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-on-surface/5 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="bg-background/95 backdrop-blur-2xl w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-[0_32px_128px_rgba(65,48,16,0.1)] border border-outline/10 flex flex-col animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 max-h-[90vh]">
        {/* Header */}
        <div className="px-8 pt-8 pb-4 shrink-0 bg-secondary/30 border-b border-outline/10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-on-surface">Start a Group</h2>
              <p className="text-outline/60 text-[9px] font-bold uppercase tracking-[0.2em] mt-0.5">Build your community in Hanoi</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-all active:scale-90 text-on-secondary"
            >
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable form */}
        <div className="px-6 py-5 overflow-y-auto custom-scrollbar">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── Cover Photo ───────────────────────────── */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-outline/60">
                Cover Photo <span className="text-outline/40 normal-case font-normal tracking-normal">(optional)</span>
              </label>

              {imagePreview ? (
                <div className="relative w-full rounded-xl overflow-hidden border border-outline/10 group">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full object-cover"
                    style={{ maxHeight: 220 }}
                  />
                  {/* Upload overlay */}
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                  {/* Remove button */}
                  {!uploadingImage && (
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black/80"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  )}
                  {/* Change photo button */}
                  {!uploadingImage && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-black/60 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-xl hover:bg-black/80 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">photo_camera</span>
                      Change
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-36 flex flex-col items-center justify-center gap-3 bg-white border-2 border-dashed border-outline/20 rounded-xl hover:bg-secondary/50 hover:border-primary/50 transition-all group cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-xl bg-white shadow flex items-center justify-center group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-2xl text-primary">add_photo_alternate</span>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-on-surface-variant">Click to add a cover photo</p>
                    <p className="text-[10px] text-outline/50 mt-0.5">JPG, PNG, WebP · Max 10MB</p>
                  </div>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>

            {/* ── Activity Name ─────────────────────────── */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-outline/60">Activity Name</label>
              <input
                required
                type="text"
                placeholder="e.g., Street Food Crawl in Old Quarter"
                className="w-full px-5 py-3.5 bg-white border border-outline/10 rounded-xl focus:ring-8 focus:ring-primary/5 focus:bg-white focus:border-primary/40 transition-all outline-none font-bold placeholder:text-on-surface-variant/40 text-sm shadow-inner"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* ── Date + Max Members ────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline/60">Scheduled Date</label>
                <input
                  required
                  type="datetime-local"
                  className="w-full px-5 py-3.5 bg-white border border-outline/10 rounded-xl focus:ring-8 focus:ring-primary/5 focus:bg-white focus:border-primary/40 transition-all outline-none font-semibold text-on-surface text-sm shadow-inner"
                  value={formData.scheduledAt}
                  onChange={e => setFormData({ ...formData, scheduledAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-outline/60">Max Members</label>
                <input
                  required
                  type="number"
                  min="2"
                  max="50"
                  className="w-full px-5 py-3.5 bg-white border border-outline/10 rounded-xl focus:ring-8 focus:ring-primary/5 focus:bg-white focus:border-primary/40 transition-all outline-none font-bold text-sm shadow-inner text-on-surface"
                  value={formData.maxMembers}
                  onChange={e => setFormData({ ...formData, maxMembers: parseInt(e.target.value) })}
                />
              </div>
            </div>

            {/* ── Location ──────────────────────────────── */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-outline/60">Meeting Location</label>
              <input
                required
                type="text"
                placeholder="Where should everyone meet?"
                className="w-full px-5 py-3.5 bg-white border border-outline/10 rounded-xl focus:ring-8 focus:ring-primary/5 focus:bg-white focus:border-primary/40 transition-all outline-none font-bold placeholder:text-on-surface-variant/40 text-sm shadow-inner"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            {/* ── Category ──────────────────────────────── */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-outline/60">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Nature & Outdoors',   name: 'Nature',     icon: 'forest' },
                  { id: 'Arts & Culture',      name: 'Culture',    icon: 'theater_comedy' },
                  { id: 'Heritage & History',  name: 'History',    icon: 'history_edu' },
                  { id: 'Spiritual',           name: 'Spiritual',  icon: 'temple_buddhist' },
                  { id: 'Eat & Shop',          name: 'Eat & Shop', icon: 'restaurant' },
                  { id: 'Sightseeing',         name: 'Sightseeing',icon: 'photo_camera' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.id })}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all border-2 ${
                      formData.category === cat.id
                        ? 'bg-primary/10 border-primary text-primary shadow-lg shadow-primary/5 scale-[1.02]'
                        : 'bg-white/30 border-white/20 text-on-surface/60 hover:bg-white/50'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">{cat.icon}</span>
                    <span className="text-[9px] font-bold uppercase tracking-widest">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Description ───────────────────────────── */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-outline/60">Description</label>
              <textarea
                required
                placeholder="What's the plan? Give some details to attract members..."
                rows={3}
                className="w-full px-5 py-3.5 bg-white border border-outline/10 rounded-xl focus:ring-8 focus:ring-primary/5 focus:bg-white focus:border-primary/40 transition-all outline-none font-semibold placeholder:text-on-surface-variant/40 resize-none text-sm text-on-surface shadow-inner"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-500 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || uploadingImage}
              className="w-full bg-primary text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs hover:shadow-xl hover:shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">rocket_launch</span>
                  Launch Activity
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
