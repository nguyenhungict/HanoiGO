"use client";

import Link from "next/link";
import { useState } from "react";
import { forgotPasswordAction } from "@/lib/actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const result = await forgotPasswordAction({ email });

    if (result.success) {
      setMessage({ type: 'success', text: result.message });
      setEmail("");
    } else {
      setMessage({ type: 'error', text: result.error });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background font-body text-on-surface antialiased flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm transition-all glass-nav border-b border-outline/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-8 py-4">
          <Link href="/" className="text-2xl font-black text-primary tracking-tighter uppercase">HanoiGO</Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-on-surface-variant font-bold px-4 py-2 hover:text-primary transition-colors text-[10px] uppercase tracking-widest">Back to Auth</Link>
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-24 pb-12 px-6 flex items-center justify-center">
        <section className="w-full max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="bg-white rounded-[2.5rem] p-12 border border-outline/10 shadow-2xl shadow-rose-900/5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
            
            <header className="mb-10 text-center">
              <span className="text-primary font-black tracking-[0.4em] uppercase text-[10px] mb-4 block">Recovery</span>
              <h1 className="text-4xl font-black text-on-surface tracking-tighter mb-4 leading-tight">Forgot password?</h1>
              <p className="text-outline font-medium text-xs leading-relaxed px-4">
                Enter your email address to receive a secure recovery link.
              </p>
            </header>

            {message && (
              <div className={`mb-8 p-6 rounded-2xl text-[11px] font-black uppercase tracking-widest border flex items-center gap-3 ${
                message.type === 'success' 
                  ? 'bg-green-50 text-green-700 border-green-100' 
                  : 'bg-primary/5 text-primary border-primary/10'
              }`}>
                <span className="material-symbols-outlined text-xl">
                  {message.type === 'success' ? 'check_circle' : 'error'}
                </span>
                {message.text}
              </div>
            )}

            <form className="space-y-8" onSubmit={handleSubmit}>
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1" htmlFor="email">Email Address</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-6 top-1/2 -translate-y-1/2 text-outline/30">mail</span>
                  <input 
                    className="w-full bg-surface-container-low px-14 py-5 rounded-2xl text-on-surface placeholder:text-outline/40 border border-outline/10 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold" 
                    id="email" 
                    placeholder="name@example.com" 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <button 
                disabled={loading}
                className="w-full bg-primary text-white py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100" 
                type="submit"
              >
                {loading ? "Processing..." : "Send Link"}
              </button>
            </form>

            <footer className="mt-12 text-center">
              <Link className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-outline hover:text-primary transition-colors group" href="/login">
                <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-1">arrow_back</span>
                <span>Back to Login</span>
              </Link>
            </footer>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 px-8 bg-surface border-t border-outline/5 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="font-black text-primary text-2xl tracking-tighter uppercase">HanoiGO</div>
          <p className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">
            © 2024 HanoiGO. The Modern Archivist.
          </p>
        </div>
      </footer>
    </div>

  );
}
