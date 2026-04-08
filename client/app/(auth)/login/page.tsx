"use client";

import Link from "next/link";
import { useState } from "react";
import { loginAction } from "@/lib/actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    const result = await loginAction({ email, password });
    
    if (result?.error) {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background font-body text-on-surface antialiased flex flex-col">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-xl shadow-sm shadow-rose-900/5 transition-all glass-nav border-b border-outline/5">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-8 py-4">
          <Link href="/" className="text-2xl font-black text-primary tracking-tighter uppercase">HanoiGO</Link>
          <div className="hidden md:flex items-center gap-8 font-headline tracking-tight font-black text-[10px] uppercase">
            <Link className="text-outline hover:text-primary transition-colors duration-300 tracking-widest" href="/discovery">Discovery</Link>
            <Link className="text-outline hover:text-primary transition-colors duration-300 tracking-widest" href="/trips">Trips</Link>
            <Link className="text-outline hover:text-primary transition-colors duration-300 tracking-widest" href="/activities">Activities</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/register">
              <button className="bg-primary text-white font-black px-6 py-2.5 rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-primary/20 text-[10px] uppercase tracking-widest">Sign Up</button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content: Split Screen */}
      <main className="flex-grow pt-16 flex overflow-hidden">
        {/* Left Half: Photography & Branding Overlay */}
        <section className="relative w-1/2 hidden lg:flex items-center justify-center overflow-hidden">
          <img 
            alt="Hanoi Streets" 
            className="absolute inset-0 w-full h-full object-cover scale-110" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4-iPwl61wIu2fTOvlPGHdynooI11BBN20UA0Lh_jjmsGeVSnz84vQb18GYamR1CDOncYAkiZOtfiP_TGbK0OMR39ZsGmTsSKr2KvjOBSmNn8m4JnEeijwB-NrfhFQyccJJWrO60ItlhNRLQgroYS6pjSQkJG2zyGTDgBbVjInVcCYocOHECqFYmZ-I7XU7sqZ6ux_4H9tqis2Qs1N-dygzHhIFkFeZboQ7m3_048PWQVBMAkVpfDQMvojSauf_65O5V2TTO-eSdwq"
          />
          <div className="absolute inset-0 bg-black/20"></div>
          {/* Glassmorphic Overlay */}
          <div className="bg-white/10 backdrop-blur-2xl p-16 rounded-[3rem] relative z-10 max-w-md border border-white/20 shadow-2xl">
            <div className="text-white">
              <h2 className="text-6xl font-black tracking-tighter mb-6 leading-none lowercase">Access your <br/>journey.</h2>
              <p className="text-lg font-medium leading-relaxed opacity-90 mb-10">
                Experience the soul of Vietnam through curated journeys that blend timeless heritage with modern luxury.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="w-12 h-12 rounded-full border-4 border-white/20 overflow-hidden bg-white/10 backdrop-blur-md">
                      <div className="w-full h-full bg-primary/20 flex items-center justify-center text-xs font-black">H</div>
                    </div>
                  ))}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Join 12k+ travelers</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Half: Clean Login Container */}
        <section className="w-full lg:w-1/2 bg-surface flex items-center justify-center p-8 lg:p-24 overflow-y-auto">
          <div className="w-full max-w-sm">
            <header className="mb-14">
              <span className="text-primary font-black tracking-[0.4em] uppercase text-[10px] mb-4 block">Welcome Back</span>
              <h1 className="text-5xl font-black text-on-surface tracking-tighter mb-4 leading-tight">Authentic Login.</h1>
              <p className="text-outline font-medium text-sm leading-relaxed">Don't have an account? <Link className="text-primary font-black uppercase tracking-widest text-[10px] ml-2 hover:underline" href="/register">Join the guild</Link></p>
            </header>
            
            {error && (
              <div className="mb-8 p-6 bg-primary/5 text-primary rounded-[2rem] text-[11px] font-black uppercase tracking-widest border border-primary/10 animate-in shake duration-500">
                {error}
              </div>
            )}

            <form className="space-y-8" onSubmit={handleSubmit}>
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1" htmlFor="email">Email Address</label>
                <input 
                  className="w-full bg-surface-container-low px-8 py-5 rounded-2xl text-on-surface placeholder:text-outline/40 border border-outline/10 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold" 
                  id="email" 
                  name="email"
                  placeholder="name@hanoigo.com" 
                  type="email"
                  required
                />
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1" htmlFor="password">Password</label>
                <div className="relative">
                  <input 
                    className="w-full bg-surface-container-low px-8 py-5 rounded-2xl text-on-surface placeholder:text-outline/40 border border-outline/10 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold" 
                    id="password" 
                    name="password"
                    placeholder="••••••••" 
                    type={showPassword ? "text" : "password"}
                    required
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-8 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors" 
                    type="button"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input className="w-5 h-5 rounded-lg border-outline/20 text-primary focus:ring-primary/20 transition-all cursor-pointer" type="checkbox" />
                  <span className="text-[11px] font-black uppercase tracking-widest text-outline group-hover:text-on-surface transition-colors">Remember me</span>
                </label>
                <Link className="text-[11px] font-black uppercase tracking-widest text-primary hover:underline" href="/forgot-password">Forgot?</Link>
              </div>
              <button 
                disabled={loading}
                className="w-full bg-primary text-white py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 mt-4" 
                type="submit"
              >
                {loading ? "Verifying..." : "Sign In"}
              </button>
            </form>
            <footer className="mt-16 text-center">
              <p className="text-[9px] font-black text-outline uppercase tracking-[0.2em] leading-relaxed">
                By continuing, you agree to HanoiGO's <br/> <Link className="underline hover:text-primary" href="#">Terms</Link> and <Link className="underline hover:text-primary" href="#">Privacy</Link>.
              </p>
            </footer>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 px-8 bg-surface border-t border-outline/5 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="font-black text-primary text-2xl tracking-tighter uppercase">HanoiGO</div>
          <p className="text-[10px] font-black text-outline uppercase tracking-[0.2em]">
            Curating the heritage of Hanoi into unforgettable journeys.
          </p>
          <div className="flex gap-8">
            <span className="material-symbols-outlined text-outline hover:text-primary cursor-pointer text-xl">public</span>
            <span className="material-symbols-outlined text-outline hover:text-primary cursor-pointer text-xl">share</span>
            <span className="material-symbols-outlined text-outline hover:text-primary cursor-pointer text-xl">mail</span>
          </div>
        </div>
      </footer>
    </div>

  );
}
