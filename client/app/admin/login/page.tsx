'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/lib/actions';

export default function AdminLoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('admin');
  const [password, setPassword] = useState('hung2004');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await loginAction({ email: identifier, password });

      if (res.error) {
        setError(res.error);
      } else {
        // Kiểm tra xem có phải ADMIN không
        if (res.user?.role !== 'ADMIN') {
          setError('Tài khoản không có quyền truy cập khu vực Admin.');
        } else {
          router.push('/admin/dashboard');
          router.refresh();
        }
      }
    } catch (err) {
      setError('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-on-background flex items-center justify-center p-6 relative overflow-hidden font-body">
      {/* Background patterns */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] -ml-32 -mb-32" />
      
      {/* Login Card */}
      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-12 shadow-2xl relative z-10 animate-in fade-in zoom-in duration-700">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-16 h-16 bg-primary rounded-3xl flex items-center justify-center mb-6 shadow-2xl shadow-primary/40 rotate-12">
             <span className="text-white font-black text-2xl tracking-tighter">H</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase mb-2">Authority Access</h1>
          <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">HanoiGO Management Node</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-4">Identifier</label>
            <input 
              type="text" 
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="admin" 
              className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm font-bold focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/20"
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-white/60 uppercase tracking-widest ml-4">Credential Key</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" 
              className="w-full h-16 bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm font-bold focus:outline-none focus:border-primary/50 transition-all placeholder:text-white/20"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-primary/20 border border-primary/30 p-4 rounded-xl text-primary text-[11px] font-black text-center animate-shake">
              {error}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full h-16 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              'Initialize Session'
            )}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-white/10 text-center">
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest leading-relaxed">
               Secure Terminal Protocol v4.2<br/>
               Authorized Personnel Only
            </p>
        </div>
      </div>
    </div>
  );
}
