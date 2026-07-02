'use client';

import React, { useState, useRef, useEffect } from 'react';
import { updateActivityAction, uploadImageAction } from '@/lib/actions';
import { LocationPickerMap } from './LocationPickerMap';
import { Activity } from '@/types';

interface EditActivityDialogProps {
  activity: Activity;
  onClose: () => void;
  onUpdated: (updated: Activity) => void;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8888';

const CATEGORY_META: Record<string, { icon: string; label: string }> = {
  'Food & Drink':       { icon: 'restaurant',      label: 'Food & Drink' },
  'Sports & Active':    { icon: 'directions_bike', label: 'Sports & Active' },
  'Arts & Culture':     { icon: 'theater_comedy',  label: 'Arts & Culture' },
  'Social & Nightlife': { icon: 'local_bar',        label: 'Social & Nightlife' },
  'Sightseeing':        { icon: 'photo_camera',    label: 'Sightseeing' },
};

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function resolveImageUrl(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${BACKEND_URL}${url.startsWith('/') ? url : `/${url}`}`;
}

export const EditActivityDialog: React.FC<EditActivityDialogProps> = ({ activity, onClose, onUpdated }) => {
  const [formData, setFormData] = useState({
    title:       activity.title ?? '',
    description: activity.description ?? '',
    address:     activity.address ?? '',
    placeId:     activity.placeId ?? '',
    lat:         activity.lat ?? 21.0285,
    lng:         activity.lng ?? 105.8542,
    scheduledAt: activity.scheduledAt ? toDatetimeLocal(activity.scheduledAt) : '',
    maxMembers:  activity.maxMembers ?? 10,
    category:    activity.category ?? 'Sightseeing',
    imageUrl:    activity.imageUrl ?? '',
  });
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview]     = useState<string | null>(resolveImageUrl(activity.imageUrl));
  const fileInputRef                        = useRef<HTMLInputElement>(null);

  const [predictions, setPredictions]       = useState<any[]>([]);
  const [searching, setSearching]           = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);

  const goongApiKey = process.env.NEXT_PUBLIC_GOONG_API_KEY || '';
  const isTripActivity = !!activity.tripId;

  const handleSearchChange = async (val: string) => {
    setFormData(prev => ({ ...prev, address: val }));
    if (val.trim().length < 2) { setPredictions([]); setShowPredictions(false); return; }

    setSearching(true);
    try {
      const res = await fetch(
        `https://rsapi.goong.io/Place/AutoComplete?api_key=${goongApiKey}&input=${encodeURIComponent(val)}&location=21.0285,105.8542&limit=5`
      );
      const data = await res.json();
      setPredictions(data.status === 'OK' ? data.predictions : []);
      setShowPredictions(true);
    } catch { /* ignore */ } finally {
      setSearching(false);
    }
  };

  const handleSelectPrediction = async (prediction: any) => {
    setShowPredictions(false);
    setFormData(prev => ({ ...prev, placeId: '', address: prediction.description }));
    try {
      const res  = await fetch(`https://rsapi.goong.io/Place/Detail?api_key=${goongApiKey}&place_id=${prediction.place_id}`);
      const data = await res.json();
      if (data.status === 'OK' && data.result) {
        const { lat, lng } = data.result.geometry.location;
        setFormData(prev => ({
          ...prev,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          address: data.result.formatted_address || prediction.description,
        }));
      }
    } catch { /* ignore */ }
  };

  const handleMapLocationChange = (newLat: number, newLng: number) => {
    setFormData(prev => ({ ...prev, lat: newLat, lng: newLng, placeId: '' }));
    fetch(`https://rsapi.goong.io/Geocode?latlng=${newLat},${newLng}&api_key=${goongApiKey}`)
      .then(r => r.json())
      .then(data => {
        if (data.results?.[0]) {
          setFormData(prev => ({ ...prev, address: data.results[0].formatted_address }));
        }
      })
      .catch(() => {});
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setUploadingImage(true);
    const fd = new FormData();
    fd.append('file', file);
    const result = await uploadImageAction(fd);
    setUploadingImage(false);
    if (result.success && result.url) {
      setFormData(prev => ({ ...prev, imageUrl: result.url! }));
    } else {
      setError(result.error || 'Image upload failed');
      setImagePreview(resolveImageUrl(activity.imageUrl));
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

    const payload: any = {
      title:       formData.title,
      description: formData.description,
      scheduledAt: formData.scheduledAt,
      maxMembers:  formData.maxMembers,
      category:    formData.category,
      imageUrl:    formData.imageUrl,
    };

    if (!isTripActivity) {
      payload.address = formData.address;
      payload.lat     = formData.lat;
      payload.lng     = formData.lng;
      if (formData.placeId) payload.placeId = formData.placeId;
    }

    const result = await updateActivityAction(activity.id, payload);
    setLoading(false);

    if (result.success && result.data) {
      onUpdated(result.data);
    } else {
      setError(result.error || 'Failed to update activity');
    }
  };

  const selectedCategory = CATEGORY_META[formData.category] ?? CATEGORY_META['Sightseeing'];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-on-surface/15 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-background w-full max-w-xl rounded-xl overflow-hidden shadow-xl border border-outline/15 flex flex-col animate-in zoom-in-95 slide-in-from-bottom-10 duration-300 max-h-[90vh]">

        {/* Header */}
        <div className="px-8 pt-6 pb-5 shrink-0 bg-secondary-container/40 border-b border-outline/10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-on-surface">Edit Activity</h2>
              <p className="text-on-surface-variant text-[10px] font-bold mt-1.5">Update your activity details</p>
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-white/85 hover:bg-white flex items-center justify-center transition-all border border-outline/20 active:scale-90 text-on-surface shadow-sm"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable form */}
        <div className="px-8 py-6 overflow-y-auto custom-scrollbar space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Cover Photo */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">
                Cover Photo <span className="text-outline/60 normal-case font-medium tracking-normal">(optional)</span>
              </label>
              {imagePreview ? (
                <div className="relative w-full rounded-xl overflow-hidden border border-outline/15 group shadow-sm">
                  <img src={imagePreview} alt="Preview" className="w-full object-cover" style={{ maxHeight: 200 }} />
                  {uploadingImage && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                    </div>
                  )}
                  {!uploadingImage && (
                    <>
                      <button
                        type="button" onClick={removeImage}
                        className="absolute top-2.5 right-2.5 w-8 h-8 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-black/80 shadow"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                      <button
                        type="button" onClick={() => fileInputRef.current?.click()}
                        className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 bg-black/60 text-white text-[9px] font-black uppercase tracking-widest px-3.5 py-2 rounded-xl hover:bg-black/80 transition-all shadow"
                      >
                        <span className="material-symbols-outlined text-sm">photo_camera</span>
                        Change
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <button
                  type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full min-h-28 text-left bg-secondary-container border border-outline/15 rounded-xl hover:border-primary/40 hover:bg-secondary transition-all group cursor-pointer p-4 flex items-center justify-between gap-5"
                >
                  <p className="text-xs font-bold text-on-surface-variant">No photo. Click to upload a cover image.</p>
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-white border border-outline/15 flex items-center justify-center group-hover:border-primary/30 transition-colors">
                    <span className="material-symbols-outlined text-xl text-primary">add_photo_alternate</span>
                  </div>
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>

            {/* Activity Name */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Activity Name</label>
              <input
                required type="text"
                className="w-full px-5 py-3.5 bg-white border border-outline/10 rounded-xl focus:ring-8 focus:ring-primary/5 focus:border-primary/40 transition-all outline-none font-bold text-sm shadow-inner"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            {/* Date + Max Members */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Scheduled Date</label>
                <input
                  required type="datetime-local"
                  className="w-full px-5 py-3.5 bg-white border border-outline/10 rounded-xl focus:ring-8 focus:ring-primary/5 focus:border-primary/40 transition-all outline-none font-semibold text-sm shadow-inner text-on-surface"
                  value={formData.scheduledAt}
                  onChange={e => setFormData({ ...formData, scheduledAt: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Max Members</label>
                <input
                  required type="number" min="2" max="50"
                  className="w-full px-5 py-3.5 bg-white border border-outline/10 rounded-xl focus:ring-8 focus:ring-primary/5 focus:border-primary/40 transition-all outline-none font-bold text-sm shadow-inner text-on-surface"
                  value={formData.maxMembers}
                  onChange={e => setFormData({ ...formData, maxMembers: parseInt(e.target.value) })}
                />
              </div>
            </div>

            {/* Location — only for non-trip activities */}
            {!isTripActivity && (
              <div className="space-y-2.5 relative">
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Meeting Location</label>
                <div className="relative">
                  <input
                    required type="text"
                    placeholder="Search location..."
                    className="w-full px-5 py-3.5 bg-white border border-outline/10 rounded-xl focus:ring-8 focus:ring-primary/5 focus:border-primary/40 transition-all outline-none font-bold text-sm shadow-inner placeholder:text-on-surface-variant/30"
                    value={formData.address}
                    onChange={e => handleSearchChange(e.target.value)}
                    onFocus={() => setShowPredictions(predictions.length > 0)}
                  />
                  {searching && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {showPredictions && predictions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-outline/10 rounded-2xl shadow-2xl z-[160] overflow-hidden flex flex-col p-1.5 animate-in fade-in duration-200">
                    {predictions.map((p, idx) => (
                      <button
                        key={p.place_id || idx} type="button"
                        onClick={() => handleSelectPrediction(p)}
                        className="flex flex-col text-left px-4 py-2.5 rounded-xl hover:bg-[#FAF0E1]/80 transition-colors w-full"
                      >
                        <span className="text-xs font-bold text-on-surface">{p.structured_formatting?.main_text || p.description}</span>
                        <span className="text-[9px] text-outline/60 font-medium mt-0.5">{p.structured_formatting?.secondary_text || ''}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-3">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-outline/60 px-1 mb-1.5">
                    <span>Pinpoint Exact Location</span>
                    <span>Drag pin to adjust</span>
                  </div>
                  <LocationPickerMap lat={formData.lat} lng={formData.lng} onChange={handleMapLocationChange} />
                </div>
              </div>
            )}

            {/* Category */}
            <div className="space-y-2.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Category</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'Food & Drink',       name: 'Food & Drink',       icon: 'restaurant' },
                  { id: 'Sports & Active',    name: 'Sports & Active',    icon: 'directions_bike' },
                  { id: 'Arts & Culture',     name: 'Arts & Culture',     icon: 'theater_comedy' },
                  { id: 'Social & Nightlife', name: 'Social & Nightlife', icon: 'local_bar' },
                  { id: 'Sightseeing',        name: 'Sightseeing',        icon: 'photo_camera' },
                ].map(cat => (
                  <button
                    key={cat.id} type="button"
                    onClick={() => setFormData({ ...formData, category: cat.id })}
                    className={`flex items-center gap-2 px-3 py-3 rounded-xl transition-all border-2 ${
                      formData.category === cat.id
                        ? 'bg-primary/5 border-primary text-primary shadow-md shadow-primary/5 scale-[1.02]'
                        : 'bg-white border-outline/10 text-on-surface/60 hover:bg-secondary/40 hover:text-on-surface'
                    }`}
                  >
                    <span className="material-symbols-outlined text-base shrink-0">{cat.icon}</span>
                    <span className="text-[9px] font-black uppercase tracking-widest truncate">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Description</label>
              <textarea
                required rows={3}
                className="w-full px-5 py-3.5 bg-white border border-outline/10 rounded-xl focus:ring-8 focus:ring-primary/5 focus:border-primary/40 transition-all outline-none font-semibold resize-none text-sm text-on-surface shadow-inner placeholder:text-on-surface-variant/30"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-center border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || uploadingImage}
              className="w-full bg-primary text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-primary-container hover:shadow-xl hover:shadow-primary/10 transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">save</span>
                  Save Changes
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
