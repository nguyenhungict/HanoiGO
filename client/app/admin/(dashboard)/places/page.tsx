'use client';

import React, { useState, useEffect } from 'react';
import { 
  getAdminPlacesAction, 
  createAdminPlaceAction, 
  updateAdminPlaceAction, 
  deleteAdminPlaceAction,
  uploadImageAction
} from '@/lib/actions';
import { useNotification } from '@/hooks/use-notification';
import { useConfirm } from '@/hooks/use-confirm';

import { Place, PLACE_CATEGORIES as CATEGORIES } from '@/types';

const DISTRICTS = [
  'Hoàn Kiếm', 'Ba Đình', 'Tây Hồ', 'Đống Đa', 'Hai Bà Trưng', 'Cầu Giấy', 'Thanh Xuân', 'Long Biên', 'Nam Từ Liêm', 'Bắc Từ Liêm'
];

// Helper to format time from Date or string to HH:mm
const formatTimeForInput = (time: any) => {
  if (!time) return '';
  if (typeof time === 'string' && time.length === 5 && time.includes(':')) return time; // Already HH:mm
  const date = new Date(time);
  if (isNaN(date.getTime())) return '';
  return date.toTimeString().slice(0, 5);
};

export default function PlaceManagement() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { show } = useNotification();
  const { confirm: openConfirm } = useConfirm();

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [formData, setFormData] = useState<any>({
    name: '',
    category: CATEGORIES[0],
    district: DISTRICTS[0],
    address: '',
    lat: 21.0285,
    lng: 105.8542,
    imageUrl: '',
    tags: [],
    alwaysOpen: false,
    openTimeStart: '08:00',
    openTimeEnd: '17:00'
  });

  const fetchPlaces = async () => {
    setLoading(true);
    const data = await getAdminPlacesAction(page, limit, search, categoryFilter);
    if (data) {
      setPlaces(data.places || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlaces();
  }, [page, search, categoryFilter]);

  const handleOpenModal = (place?: Place) => {
    if (place) {
      setEditingPlace(place);
      setFormData({ 
        ...place,
        openTimeStart: formatTimeForInput(place.openTimeStart) || '08:00',
        openTimeEnd: formatTimeForInput(place.openTimeEnd) || '17:00'
      });
    } else {
      setEditingPlace(null);
      setFormData({
        name: '',
        category: CATEGORIES[0],
        district: DISTRICTS[0],
        address: '',
        lat: 21.0285,
        lng: 105.8542,
        imageUrl: '',
        tags: [],
        alwaysOpen: false,
        openTimeStart: '08:00',
        openTimeEnd: '17:00'
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPlace(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const uploadData = new FormData();
    uploadData.append('file', file);

    const res = await uploadImageAction(uploadData);
    if (res.success && res.url) {
      // Base URL should be the actions URL
      const actionsUrl = process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8888';
      setFormData({ ...formData, imageUrl: `${actionsUrl}${res.url}` });
      show({ type: 'success', title: 'Asset Captured', message: 'The visual representation has been archived.' });
    } else {
      show({ type: 'error', title: 'Transmission Error', message: res.error || 'Failed to capture visual asset.' });
    }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    let res;
    if (editingPlace) {
      res = await updateAdminPlaceAction(editingPlace.id, formData);
    } else {
      res = await createAdminPlaceAction(formData);
    }

    if (res.success) {
      handleCloseModal();
      fetchPlaces();
      show({ 
        type: 'success', 
        title: editingPlace ? 'Registry Updated' : 'Landmark Registered', 
        message: editingPlace ? 'Heritage record has been successfully modified.' : 'New cultural asset has been added to the database.' 
      });
    } else {
      show({ type: 'error', title: 'Archive Error', message: res.error || 'Could not commit data to registry.' });
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await openConfirm({
      title: 'Erase Landmark',
      message: 'Are you sure you want to delete this heritage site? This will remove it from the global map permanently.',
      confirmText: 'Delete Site',
      type: 'danger'
    });
    if (!isConfirmed) return;
    setLoading(true);
    const res = await deleteAdminPlaceAction(id);
    if (res.success) {
      fetchPlaces();
      show({ type: 'success', title: 'Asset Purged', message: 'The landmark record has been erased from history.' });
    } else {
      show({ type: 'error', title: 'Purge Failed', message: res.error || 'The system could not erase the record.' });
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 py-2">
        <div>
          <span className="text-[8px] font-bold text-primary/80 uppercase tracking-[0.4em] mb-1 block">Cultural Inventory</span>
          <h1 className="text-xl font-bold tracking-tighter text-on-surface leading-none">Heritage Places</h1>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="h-10 px-6 bg-primary text-white rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-base">add_location</span>
          New Landmark
        </button>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-outline/5 p-8 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
        {/* Filters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="relative group">
               <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">search</span>
               <input 
                 type="text" 
                 placeholder="Search landmarks..." 
                 value={search}
                 onChange={(e) => setSearch(e.target.value)}
                 className="h-12 pl-12 pr-6 bg-background rounded-2xl border border-transparent focus:border-primary/20 focus:bg-white transition-all text-[11px] font-bold outline-none w-80"
               />
            </div>
            <select 
              value={categoryFilter || ''}
              onChange={(e) => setCategoryFilter(e.target.value || undefined)}
              className="h-12 px-4 bg-background rounded-2xl border border-transparent text-[10px] font-bold uppercase tracking-widest text-outline/70 outline-none"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-bold text-outline/60 uppercase tracking-widest mr-2">Total Inventory: {total}</span>
          </div>
        </div>

        {loading && places.length === 0 ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-outline/5">
                    <th className="text-left py-6 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-outline/60">Place Identity</th>
                    <th className="text-left py-6 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-outline/60">Classification</th>
                    <th className="text-left py-6 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-outline/60">District</th>
                    <th className="text-left py-6 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-outline/60">Location</th>
                    <th className="text-left py-6 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-outline/60">Usage</th>
                    <th className="text-right py-6 px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-outline/60">Control</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline/5">
                  {places.map((place) => (
                    <tr key={place.id} className="group hover:bg-background/50 transition-colors">
                      <td className="py-6 px-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-12 rounded-xl bg-secondary/30 overflow-hidden shrink-0 border border-outline/5">
                            {place.imageUrl ? (
                              <img src={place.imageUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-primary/30">
                                <span className="material-symbols-outlined">image</span>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-[13px] font-bold text-on-surface uppercase tracking-tight truncate">{place.name}</h4>
                            <p className="text-[10px] text-outline/70 font-bold truncate">{place.address || 'No specific address'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-6 px-4">
                        <span className="px-3 py-1.5 rounded-full bg-surface-container-low text-primary text-[9px] font-bold tracking-widest uppercase border border-primary/10">
                          {place.category}
                        </span>
                      </td>
                      <td className="py-6 px-4 text-[11px] font-bold text-on-surface uppercase">
                        {place.district}
                      </td>
                      <td className="py-6 px-4">
                        <p className="text-[9px] font-bold text-outline tracking-tighter">LAT: {place.lat.toFixed(4)}</p>
                        <p className="text-[9px] font-bold text-outline tracking-tighter">LNG: {place.lng.toFixed(4)}</p>
                      </td>
                      <td className="py-6 px-4">
                        <div className="flex items-center gap-2">
                           <span className="material-symbols-outlined text-xs text-outline">route</span>
                           <span className="text-[11px] font-bold text-on-surface">{place._count?.tripStops || 0}</span>
                        </div>
                      </td>
                      <td className="py-6 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleOpenModal(place)}
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-background text-outline hover:text-primary hover:bg-white hover:shadow-md transition-all"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-base">edit</span>
                          </button>
                          <button 
                            onClick={() => handleDelete(place.id)}
                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-base">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-outline/5">
              <p className="text-[10px] font-bold text-outline/60 uppercase tracking-widest">
                Showing {places.length} of {total} landmarks
              </p>
              <div className="flex gap-2">
                <button 
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="h-8 px-3 bg-background rounded-lg text-[9px] font-bold uppercase disabled:opacity-30 transition-all"
                >
                  Prev
                </button>
                <div className="h-8 px-3 flex items-center justify-center bg-primary/10 text-primary rounded-lg text-[9px] font-bold">
                  {page}
                </div>
                <button 
                  disabled={places.length < limit}
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

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-12 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-on-background/40 backdrop-blur-sm" onClick={handleCloseModal} />
          
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 max-h-[90vh]">
             <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                <div className="p-6 sm:p-8 bg-background/50 border-b border-outline/5 flex items-center justify-between shrink-0">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tighter text-on-surface">{editingPlace ? 'Edit Landmark' : 'Register New Landmark'}</h2>
                    <p className="text-[9px] font-bold text-outline uppercase tracking-widest mt-1">Geospatial Content Repository</p>
                  </div>
                  <button type="button" onClick={handleCloseModal} className="w-10 h-10 rounded-xl bg-white shadow-lg flex items-center justify-center text-outline hover:text-primary transition-all">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 sm:p-10 custom-scrollbar min-h-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8">
                    <div className="space-y-3">
                      <label className="text-[9px] font-bold text-outline uppercase tracking-widest ml-1">Landmark Name</label>
                      <input 
                        required
                        type="text" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full h-12 px-5 bg-background rounded-xl border border-transparent focus:border-primary/20 outline-none text-[12px] font-bold"
                        placeholder="e.g., Ho Chi Minh Mausoleum"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[9px] font-bold text-outline uppercase tracking-widest ml-1">Category Classification</label>
                      <select 
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                        className="w-full h-12 px-5 bg-background rounded-xl border border-transparent focus:border-primary/20 outline-none text-[11px] font-bold uppercase tracking-widest"
                      >
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[9px] font-bold text-outline uppercase tracking-widest ml-1">District</label>
                      <select 
                        required
                        value={formData.district}
                        onChange={(e) => setFormData({...formData, district: e.target.value})}
                        className="w-full h-12 px-5 bg-background rounded-xl border border-transparent focus:border-primary/20 outline-none text-[11px] font-bold uppercase tracking-widest"
                      >
                        {DISTRICTS.map(dist => <option key={dist} value={dist}>{dist}</option>)}
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[9px] font-bold text-outline uppercase tracking-widest ml-1">Specific Address</label>
                      <input 
                        type="text" 
                        value={formData.address || ''}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                        className="w-full h-12 px-5 bg-background rounded-xl border border-transparent focus:border-primary/20 outline-none text-[12px] font-bold"
                        placeholder="e.g., 2 Hung Vuong, Ba Dinh"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[9px] font-bold text-outline uppercase tracking-widest ml-1">Latitude</label>
                      <input 
                        required
                        type="number" 
                        step="any"
                        value={formData.lat}
                        onChange={(e) => setFormData({...formData, lat: parseFloat(e.target.value)})}
                        className="w-full h-12 px-5 bg-background rounded-xl border border-transparent focus:border-primary/20 outline-none text-[12px] font-bold"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[9px] font-bold text-outline uppercase tracking-widest ml-1">Longitude</label>
                      <input 
                        required
                        type="number" 
                        step="any"
                        value={formData.lng}
                        onChange={(e) => setFormData({...formData, lng: parseFloat(e.target.value)})}
                        className="w-full h-12 px-5 bg-background rounded-xl border border-transparent focus:border-primary/20 outline-none text-[12px] font-bold"
                      />
                    </div>

                    {!formData.alwaysOpen && (
                      <>
                        <div className="space-y-3">
                          <label className="text-[9px] font-bold text-outline uppercase tracking-widest ml-1">Open Time</label>
                          <input 
                            type="time" 
                            value={formData.openTimeStart || '08:00'}
                            onChange={(e) => setFormData({...formData, openTimeStart: e.target.value})}
                            className="w-full h-12 px-5 bg-background rounded-xl border border-transparent focus:border-primary/20 outline-none text-[12px] font-bold"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[9px] font-bold text-outline uppercase tracking-widest ml-1">Close Time</label>
                          <input 
                            type="time" 
                            value={formData.openTimeEnd || '17:00'}
                            onChange={(e) => setFormData({...formData, openTimeEnd: e.target.value})}
                            className="w-full h-12 px-5 bg-background rounded-xl border border-transparent focus:border-primary/20 outline-none text-[12px] font-bold"
                          />
                        </div>
                      </>
                    )}

                    <div className="space-y-3 md:col-span-2">
                      <label className="text-[9px] font-bold text-outline uppercase tracking-widest ml-1">Landmark Photography</label>
                      <div className="flex flex-col sm:flex-row gap-6 items-start">
                        <div className="flex-1 w-full">
                          <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-outline/20 rounded-2xl bg-background/50 hover:bg-background hover:border-primary/40 transition-all cursor-pointer group relative overflow-hidden">
                            {uploading ? (
                              <div className="flex flex-col items-center gap-2">
                                <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-outline">Uploading...</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1.5">
                                <span className="material-symbols-outlined text-2xl text-outline group-hover:text-primary transition-colors">cloud_upload</span>
                                <span className="text-[9px] font-bold uppercase tracking-widest text-outline group-hover:text-on-surface">Click to upload image</span>
                              </div>
                            )}
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                          </label>
                          <div className="mt-3 flex gap-2 items-center">
                            <input 
                              type="text" 
                              value={formData.imageUrl || ''}
                              onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                              className="flex-1 h-10 px-4 bg-background rounded-lg border border-transparent focus:border-primary/20 outline-none text-[10px] font-bold text-outline"
                              placeholder="Or paste external image URL..."
                            />
                          </div>
                        </div>
                        {formData.imageUrl && (
                          <div className="w-28 h-28 rounded-2xl bg-secondary overflow-hidden border border-outline/10 shrink-0 shadow-xl relative group">
                            <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button 
                              type="button"
                              onClick={() => setFormData({...formData, imageUrl: ''})}
                              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                            >
                              <span className="material-symbols-outlined text-xl">delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 md:col-span-2 bg-background/30 p-4 rounded-2xl">
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, alwaysOpen: !formData.alwaysOpen})}
                        className={`w-10 h-5 rounded-full relative transition-all duration-300 ${formData.alwaysOpen ? 'bg-primary' : 'bg-outline/20'}`}
                      >
                        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${formData.alwaysOpen ? 'left-5.5' : 'left-0.5'}`} />
                      </button>
                      <span className="text-[10px] font-bold text-on-surface uppercase tracking-widest">Mark as Always Accessible (24/7)</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 sm:p-8 bg-background/50 border-t border-outline/5 flex justify-end gap-3 shrink-0">
                  <button 
                    type="button"
                    onClick={handleCloseModal}
                    className="h-10 px-4 bg-surface-container-low text-outline hover:text-primary rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                  >
                    Discard
                  </button>
                  <button 
                    type="submit"
                    disabled={uploading || loading}
                    className="h-10 px-8 bg-primary text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:shadow-2xl hover:shadow-primary/40 transition-all shadow-xl shadow-primary/20 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-base">save</span>
                    {editingPlace ? 'Apply Changes' : 'Finalize Registration'}
                  </button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
