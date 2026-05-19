'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createActivityAction, uploadImageAction } from '@/lib/actions';
import { LocationPickerMap } from './LocationPickerMap';

interface DbPlace {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
}

interface CreateActivityDialogProps {
  onClose: () => void;
  onCreated: () => void;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8888';

function translateAddressToEnglish(address: string): string {
  if (!address) return '';
  
  const customMappings: { [key: string]: string } = {
    'Hồ Hoàn Kiếm': 'Hoan Kiem Lake',
    'Hồ Tây': 'West Lake',
    'Đền Ngọc Sơn': 'Ngoc Son Temple',
    'Văn Miếu': 'Temple of Literature',
    'Nhà thờ Lớn': 'St. Joseph\'s Cathedral',
    'Chùa Trấn Quốc': 'Tran Quoc Pagoda',
    'Lăng Bác': 'Ho Chi Minh Mausoleum',
    'Hoàng thành Thăng Long': 'Imperial Citadel of Thang Long',
    'Nhà hát Lớn': 'Hanoi Opera House',
    'Việt Nam': 'Vietnam',
    'Viet Nam': 'Vietnam',
    'Hà Nội': 'Hanoi',
    'Thành phố Hà Nội': 'Hanoi',
  };

  let result = address;

  Object.entries(customMappings).forEach(([vi, en]) => {
    const regex = new RegExp(vi, 'gi');
    result = result.replace(regex, en);
  });

  result = result.replace(/Phường\s+([^,]+)/gi, '$1 Ward');
  result = result.replace(/Quận\s+([^,]+)/gi, '$1 District');
  result = result.replace(/Thành phố\s+([^,]+)/gi, '$1 City');
  result = result.replace(/(Đường|Phố)\s+([^,]+)/gi, '$2 Street');
  result = result.replace(/Ngõ\s+([^,]+)/gi, 'Alley $1');

  result = result
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

  result = result.replace(/\s+/g, ' ').trim();

  return result;
}

export const CreateActivityDialog: React.FC<CreateActivityDialogProps> = ({ onClose, onCreated }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    placeId: '',
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

  const [localPlaces, setLocalPlaces] = useState<DbPlace[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);

  const goongApiKey = process.env.NEXT_PUBLIC_GOONG_API_KEY || 'f0qiwWG2eG9iYtk4pEL3AaeIMkzDNGrKNMCHwAoN';

  // Load places directly from DB on mount
  useEffect(() => {
    fetch(`${BACKEND_URL}/places`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then(res => res.json())
      .then((data: any[]) => {
        const mapped: DbPlace[] = data.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category || 'Place',
          lat: p.lat,
          lng: p.lng,
        }));
        setLocalPlaces(mapped);
      })
      .catch(err => console.error('Failed to load places from DB:', err));
  }, []);

  // Get user location on mount to center the map initially
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          setFormData(prev => ({
            ...prev,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          }));
        },
        err => console.warn('Geolocation error:', err)
      );
    }
  }, []);

  const handleSearchChange = async (val: string) => {
    setFormData(prev => ({ ...prev, address: val }));
    
    if (val.trim().length < 2) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }

    setSearching(true);
    try {
      // 1. Search local heritage places first
      const query = val.toLowerCase();
      const matchedLocal = localPlaces.filter(
        p => p.name.toLowerCase().includes(query) || (p.category && p.category.toLowerCase().includes(query))
      );

      const localPredictions = matchedLocal.map(p => ({
        place_id: p.id,
        description: p.name,
        isLocal: true,
        landmark: p,
      }));

      // 2. Fetch external suggestions from Goong API
      const res = await fetch(
        `https://rsapi.goong.io/Place/AutoComplete?api_key=${goongApiKey}&input=${encodeURIComponent(val)}&location=21.0285,105.8542&limit=5`
      );
      const data = await res.json();
      
      const externalPredictions = (data.status === 'OK' && data.predictions) ? data.predictions : [];

      // Combine: Put local highlights first
      setPredictions([...localPredictions, ...externalPredictions]);
      setShowPredictions(true);
    } catch (err) {
      console.error('Autocomplete search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPrediction = async (prediction: any) => {
    setShowPredictions(false);

    if (prediction.isLocal) {
      // Local place matched! No need to hit Goong Place Detail API
      const p = prediction.landmark;
      setFormData(prev => ({
        ...prev,
        placeId: p.id,
        address: translateAddressToEnglish(p.name),
        lat: p.lat,
        lng: p.lng,
      }));
      return;
    }

    // External Goong place chosen - reset placeId to empty string
    setFormData(prev => ({ ...prev, placeId: '', address: translateAddressToEnglish(prediction.description) }));

    try {
      const res = await fetch(
        `https://rsapi.goong.io/Place/Detail?api_key=${goongApiKey}&place_id=${prediction.place_id}`
      );
      const data = await res.json();
      if (data.status === 'OK' && data.result) {
        const { lat, lng } = data.result.geometry.location;
        setFormData(prev => ({
          ...prev,
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          address: translateAddressToEnglish(data.result.formatted_address || prediction.description),
        }));
      }
    } catch (err) {
      console.error('Goong Place Detail error:', err);
    }
  };

  const handleMapLocationChange = (newLat: number, newLng: number) => {
    // Pin dragged or map clicked -> reset placeId as it's a custom location selection
    setFormData(prev => ({ ...prev, lat: newLat, lng: newLng, placeId: '' }));

    // Softly fetch reverse geocode so we don't block the user but still provide beautiful address autofill
    fetch(`https://rsapi.goong.io/Geocode?latlng=${newLat},${newLng}&api_key=${goongApiKey}`)
      .then(res => res.json())
      .then(data => {
        if (data.results && data.results.length > 0) {
          setFormData(prev => ({
            ...prev,
            address: translateAddressToEnglish(data.results[0].formatted_address),
          }));
        }
      })
      .catch(err => console.error('Goong Geocoding error:', err));
  };


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
            <div className="space-y-2 relative">
              <label className="text-[10px] font-bold uppercase tracking-widest text-outline/60">Meeting Location</label>
              <div className="relative">
                <input
                  required
                  type="text"
                  placeholder="Search location or meeting point..."
                  className="w-full px-5 py-3.5 bg-white border border-outline/10 rounded-xl focus:ring-8 focus:ring-primary/5 focus:bg-white focus:border-primary/40 transition-all outline-none font-bold placeholder:text-on-surface-variant/40 text-sm shadow-inner"
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

              {/* Predictions Dropdown */}
              {showPredictions && predictions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-outline/10 rounded-2xl shadow-xl z-[130] overflow-hidden flex flex-col p-1.5 animate-in fade-in duration-200">
                  {predictions.map((p, idx) => (
                    <button
                      key={p.place_id || idx}
                      type="button"
                      onClick={() => handleSelectPrediction(p)}
                      className="flex items-center justify-between text-left px-4 py-2.5 rounded-xl hover:bg-secondary/40 transition-colors w-full"
                    >
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-on-surface">{p.structured_formatting?.main_text || p.description}</span>
                        <span className="text-[9px] text-outline/60 font-medium truncate mt-0.5">
                          {p.isLocal ? `${p.landmark?.category || 'HanoiGO Site'}` : (p.structured_formatting?.secondary_text || '')}
                        </span>
                      </div>
                      {p.isLocal && (
                        <span className="shrink-0 ml-2 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[8px] font-extrabold uppercase tracking-widest text-primary flex items-center gap-0.5 shadow-sm">
                          <span className="material-symbols-outlined text-[10px] text-primary">grade</span>
                          Highlight
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Mini Leaflet location picker map */}
              <div className="mt-2">
                <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-outline/50 px-1 mb-1">
                  <span>Pinpoint Exact Location</span>
                  <span>Drag pin to adjust</span>
                </div>
                <LocationPickerMap
                  lat={formData.lat}
                  lng={formData.lng}
                  onChange={handleMapLocationChange}
                />
              </div>
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
