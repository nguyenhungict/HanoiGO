"use client";

import { useState } from "react";
import Link from "next/link";
import { registerAction } from "@/lib/actions";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (formData.password !== formData.confirm_password) {
      setError("Mật khẩu không khớp");
      setLoading(false);
      return;
    }

    try {
      const result = await registerAction({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      }
    } catch (err: any) {
      setError("Có lỗi hệ thống xảy ra");
      setLoading(false);
    }
  };

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
            <Link href="/login">
              <button className="text-on-surface-variant font-bold px-4 py-2 hover:text-primary transition-all">Log In</button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-16 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side: Form Section */}
        <section className="w-full lg:w-1/2 bg-surface flex items-center justify-center p-8 lg:p-24 overflow-y-auto">
          <div className="max-w-sm w-full">
            <header className="mb-14 text-left">
              <span className="text-primary font-black tracking-[0.4em] uppercase text-[10px] mb-4 block">New Chapter</span>
              <h1 className="text-5xl font-black text-on-surface tracking-tighter mb-4 leading-tight">Join the guild.</h1>
              <p className="text-outline font-medium text-sm leading-relaxed">Already have an account? <Link className="text-primary font-black uppercase tracking-widest text-[10px] ml-2 hover:underline" href="/login">Auth Access</Link></p>
            </header>

            {error && (
              <div className="mb-8 p-6 bg-primary/5 text-primary rounded-[2rem] text-[11px] font-black uppercase tracking-widest border border-primary/10 animate-in shake duration-500">
                {error}
              </div>
            )}

            <form className="space-y-8" onSubmit={handleSubmit}>
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1" htmlFor="username">Username</label>
                <input 
                  className="w-full bg-surface-container-low px-8 py-5 rounded-2xl text-on-surface placeholder:text-outline/40 border border-outline/10 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold" 
                  id="username" 
                  name="username" 
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="anh_travel_99" 
                  type="text"
                  required
                />
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1" htmlFor="email">Email Address</label>
                <input 
                  className="w-full bg-surface-container-low px-8 py-5 rounded-2xl text-on-surface placeholder:text-outline/40 border border-outline/10 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold" 
                  id="email" 
                  name="email" 
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="explorer@hanoigo.vn" 
                  type="email"
                  required
                />
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1" htmlFor="password">Password</label>
                <input 
                  className="w-full bg-surface-container-low px-8 py-5 rounded-2xl text-on-surface placeholder:text-outline/40 border border-outline/10 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold" 
                  id="password" 
                  name="password" 
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••" 
                  type="password"
                  required
                />
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-outline ml-1" htmlFor="confirm_password">Confirm Password</label>
                <input 
                  className="w-full bg-surface-container-low px-8 py-5 rounded-2xl text-on-surface placeholder:text-outline/40 border border-outline/10 focus:border-primary/50 focus:ring-4 focus:ring-primary/5 outline-none transition-all font-bold" 
                  id="confirm_password" 
                  name="confirm_password" 
                  value={formData.confirm_password}
                  onChange={handleChange}
                  placeholder="••••••••" 
                  type="password"
                  required
                />
              </div>
              <button 
                className="w-full bg-primary text-white py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] shadow-2xl shadow-primary/20 hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:active:scale-100 mt-4" 
                type="submit"
                disabled={loading}
              >
                {loading ? "Creating..." : "Establish Account"}
              </button>
            </form>
          </div>
        </section>

        {/* Right Side: Immersive Imagery Section */}
        <section className="hidden lg:flex flex-1 relative items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              alt="Hanoi Old Quarter Heritage" 
              className="w-full h-full object-cover scale-110" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTC1yLpiKQoH9Hd25hCqgyA8TSx-qKS-ojmE-gUvwOm0E-ySF-VHOAxdwaH5Uqf2CuHvwDss2eId6mePXyF_F6XR0rWBcHUX5fLoZgfyk3axrCqNKJiUNu9f0t_ymQt1-eE9kwwtROGqnX-nNcD-EqcPdLIJsohyo8uBF_MD554fU6pNkYO_XVzGtsovhqQ398kOSmSoc0q7rSqnlfZLz5YO3sphe0R76UuD5QfUsoXPoL2ljYif87peq4thBcpS-dIlprYqwDgRKr"
            />
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"></div>
          </div>
          <div className="relative z-10 px-12 lg:px-20 text-center text-white max-w-2xl">
            <span className="text-secondary text-[10px] font-black tracking-[0.4em] uppercase mb-6 block drop-shadow-md">Legacy & Culture</span>
            <blockquote className="text-5xl lg:text-6xl font-black tracking-tighter mb-10 leading-tight drop-shadow-2xl">
              "Hanoi is a city of layers—ancient stone, colonial ochre, and vibrant energy."
            </blockquote>
            <div className="h-1.5 w-24 bg-primary mx-auto rounded-full shadow-lg"></div>
            <p className="mt-10 text-lg font-medium italic text-white/90 drop-shadow-md tracking-tight">The heart of Vietnam's eternal soul.</p>
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
