'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getProfileAction, updateProfileAction } from '@/lib/actions';
import { useRouter } from 'next/navigation';

export default function EditProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    username: '',
    email: '',
    nationality: '',
    languages: '',
    bio: '',
    avatar: 'H'
  });

  useEffect(() => {
    async function loadProfile() {
      const res = await getProfileAction();
      if (res.success && res.data) {
        const u = res.data;
        setProfile({
          name: u.fullName || '',
          username: u.username || '',
          email: u.email || '',
          nationality: u.nationality || '',
          languages: u.languages?.join(', ') || '',
          bio: u.bio || '',
          avatar: u.username?.charAt(0).toUpperCase() || 'H'
        });
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Chuẩn bị dữ liệu gửi đi (chuyển languages string thành array)
    const payload = {
      fullName: profile.name,
      username: profile.username,
      nationality: profile.nationality,
      languages: profile.languages.split(',').map(l => l.trim()).filter(l => l),
      bio: profile.bio,
    };

    const res = await updateProfileAction(payload);
    setSaving(false);
    
    if (res.success) {
      alert('Hồ sơ đã được cập nhật thành công!');
      router.push('/profile');
    } else {
      alert(res.error || 'Có lỗi xảy ra khi lưu hồ sơ');
    }
  };

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-surface-container-lowest">
      <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-background animate-in fade-in duration-700">
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-10">
          <Link 
            href="/profile" 
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-outline/10 text-on-surface hover:bg-primary/5 transition-all"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-on-surface">Edit Profile</h1>
            <p className="text-sm text-outline font-medium uppercase tracking-widest">Update your personal information</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Avatar Section */}
          <aside className="md:col-span-1 space-y-6">
            <div className="bg-white rounded-[2.5rem] p-8 border border-outline/10 shadow-xl shadow-rose-900/5 text-center">
              <div className="relative group w-32 h-32 mx-auto mb-6">
                <div className="w-full h-full rounded-full bg-primary flex items-center justify-center text-white text-5xl font-black border-[6px] border-surface-container-high overflow-hidden shadow-inner uppercase">
                  {profile.avatar}
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer">
                  <span className="material-symbols-outlined">photo_camera</span>
                </div>
              </div>
              <h3 className="font-black text-on-surface">{profile.name || 'Your Name'}</h3>
              <p className="text-xs text-outline mt-1 font-medium">@{profile.username}</p>
              
              <div className="pt-6 border-t border-outline/5 mt-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-outline mb-2">Member Since</p>
                <p className="text-on-surface font-bold">Oct 2023</p>
              </div>
            </div>
          </aside>

          {/* Form Section */}
          <main className="md:col-span-2">
            <div className="bg-white rounded-[2.5rem] p-10 border border-outline/10 shadow-xl shadow-rose-900/5 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Full Name</label>
                  <input 
                    type="text" 
                    name="name"
                    value={profile.name}
                    onChange={handleChange}
                    className="w-full bg-surface-container-low border border-outline/10 rounded-2xl px-6 py-4 text-on-surface font-bold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all"
                    placeholder="Enter your name"
                  />
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Username</label>
                  <input 
                    type="text" 
                    name="username"
                    value={profile.username}
                    onChange={handleChange}
                    className="w-full bg-surface-container-low border border-outline/10 rounded-2xl px-6 py-4 text-on-surface font-bold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all font-mono"
                    placeholder="username"
                  />
                </div>
              </div>

              {/* Email (Disabled/Locked) */}
              <div className="space-y-2 opacity-70">
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Email Address</label>
                <div className="relative">
                  <input 
                    type="email" 
                    value={profile.email}
                    disabled
                    className="w-full bg-surface-container-high border border-outline/10 rounded-2xl px-6 py-4 text-on-surface font-semibold cursor-not-allowed"
                  />
                  <span className="material-symbols-outlined absolute right-6 top-1/2 -translate-y-1/2 text-outline text-lg">lock</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                {/* Nationality */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Nationality</label>
                  <input 
                    type="text" 
                    name="nationality"
                    value={profile.nationality}
                    onChange={handleChange}
                    className="w-full bg-surface-container-low border border-outline/10 rounded-2xl px-6 py-4 text-on-surface font-bold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all"
                    placeholder="Vietnam"
                  />
                </div>

                {/* Languages */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Languages</label>
                  <input 
                    type="text" 
                    name="languages"
                    value={profile.languages}
                    onChange={handleChange}
                    className="w-full bg-surface-container-low border border-outline/10 rounded-2xl px-6 py-4 text-on-surface font-bold focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all"
                    placeholder="e.g. Vietnamese, English"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-outline ml-1">Bio</label>
                <textarea 
                  name="bio"
                  value={profile.bio}
                  onChange={handleChange}
                  rows={4}
                  className="w-full bg-surface-container-low border border-outline/10 rounded-2xl px-6 py-4 text-on-surface font-medium leading-relaxed focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/20 transition-all resize-none"
                  placeholder="Tell us about your travel style..."
                />
                <p className="text-[10px] text-outline text-right font-medium">{profile.bio.length}/150 characters</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4">
                <button 
                  type="submit"
                  disabled={saving}
                  className={`flex-1 bg-primary text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 ${saving ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : 'Save Changes'}
                </button>
                <Link href="/profile" className="px-8 flex items-center justify-center bg-surface-container-high text-on-surface py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-outline/5 transition-all">
                  Cancel
                </Link>
              </div>
            </div>
          </main>
        </form>
      </div>
    </div>
  );
}
