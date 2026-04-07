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
    <div className="bg-surface text-on-surface min-h-screen flex flex-col font-body">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-2xl font-black text-primary tracking-tighter">HanoiGO</Link>
          </div>
          <div className="flex items-center gap-4">
            <button className="hover:opacity-80 transition-opacity p-2 rounded-full">
              <span className="material-symbols-outlined text-on-surface">help_outline</span>
            </button>
          </div>
        </div>
        <div className="bg-outline-variant/30 h-[1px] w-full"></div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-6">
        <section className="w-full max-w-md mx-auto">
          {/* Reset Password Card */}
          <div className="bg-surface-container-lowest shadow-[0px_20px_40px_rgba(104,93,74,0.08)] rounded-2xl p-10 md:p-12 relative overflow-hidden border border-outline-variant/10">
            {/* Subtle Tonal Wash at the top */}
            <div className="absolute top-0 left-0 w-full h-2 bg-primary"></div>
            
            <div className="flex flex-col gap-8">
              {/* Heading & Description */}
              <div className="space-y-3">
                <h1 className="text-[2rem] font-black tracking-tighter leading-tight text-on-surface text-left italic underline decoration-primary/30">Forgot Password?</h1>
                <p className="text-on-surface-variant text-sm leading-relaxed font-medium text-left">
                  Enter your email address and we'll send you a secure link to reset your password.
                </p>
              </div>

              {/* Status Message */}
              {message && (
                <div className={`p-4 rounded-xl text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${
                  message.type === 'success' 
                    ? 'bg-green-50 text-green-700 border border-green-100' 
                    : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                  <span className="material-symbols-outlined text-lg">
                    {message.type === 'success' ? 'check_circle' : 'error'}
                  </span>
                  {message.text}
                </div>
              )}

              {/* Input Form */}
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-2 text-left">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-outline ml-1" htmlFor="email">
                    Email Address
                  </label>
                  <div className="group relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors">mail</span>
                    <input 
                      className="w-full bg-surface-container-low border border-transparent rounded-2xl pl-12 pr-4 py-4 text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary/30 transition-all outline-none font-medium" 
                      id="email" 
                      placeholder="name@example.com" 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                {/* Action Button */}
                <button 
                  disabled={loading}
                  className="bg-primary w-full py-5 rounded-full text-white font-black text-xs uppercase tracking-widest active:scale-95 duration-150 transition-all shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <span>Send Recovery Link</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>

              {/* Back to Login */}
              <div className="flex justify-center pt-2">
                <Link className="flex items-center gap-2 text-outline font-bold text-xs uppercase tracking-widest hover:text-primary transition-colors group" href="/login">
                  <span className="material-symbols-outlined text-lg transition-transform group-hover:-translate-x-1">arrow_back</span>
                  <span>Back to Login</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] font-bold text-outline uppercase tracking-widest">© 2024 HanoiGO. The Modern Archivist.</p>
          <div className="flex gap-8">
            <Link className="text-outline text-[10px] font-black uppercase tracking-widest hover:text-primary transition-colors" href="#">Privacy</Link>
            <Link className="text-outline text-[10px] font-black uppercase tracking-widest hover:text-primary transition-colors" href="#">Terms</Link>
            <Link className="text-outline text-[10px] font-black uppercase tracking-widest hover:text-primary transition-colors" href="#">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
