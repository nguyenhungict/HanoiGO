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
    <div className="min-h-screen bg-surface font-body text-on-surface antialiased flex flex-col">
      <main className="flex-grow flex flex-col md:flex-row overflow-hidden">
        {/* Left Side: Form Section */}
        <section className="flex-1 bg-surface-container-lowest px-8 py-12 md:px-24 md:py-20 flex flex-col justify-center">
          <div className="max-w-md w-full mx-auto">
            <header className="mb-12">
              <h1 className="text-stone-900 font-bold tracking-tighter text-4xl mb-2">HanoiGO</h1>
              <p className="text-on-surface-variant font-medium text-lg leading-relaxed">Begin your journey through time. Join our community of heritage explorers.</p>
            </header>
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-error/10 text-error text-sm p-4 rounded-xl border border-error/20">
                  {error}
                </div>
              )}
              <div className="space-y-1 text-left">
                <label className="block font-label text-xs font-medium uppercase tracking-[0.04em] text-on-surface-variant" htmlFor="username">Username</label>
                <input 
                  className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3.5 text-on-surface placeholder:text-stone-400 focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all duration-200 outline-none" 
                  id="username" 
                  name="username" 
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="anh_travel_99" 
                  type="text"
                  required
                />
              </div>
              <div className="space-y-1 text-left">
                <label className="block font-label text-xs font-medium uppercase tracking-[0.04em] text-on-surface-variant" htmlFor="email">Email Address</label>
                <input 
                  className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3.5 text-on-surface placeholder:text-stone-400 focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all duration-200 outline-none" 
                  id="email" 
                  name="email" 
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="explorer@hanoigo.vn" 
                  type="email"
                  required
                />
              </div>
              <div className="space-y-1 text-left">
                <label className="block font-label text-xs font-medium uppercase tracking-[0.04em] text-on-surface-variant" htmlFor="password">Password</label>
                <input 
                  className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3.5 text-on-surface placeholder:text-stone-400 focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all duration-200 outline-none" 
                  id="password" 
                  name="password" 
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••" 
                  type="password"
                  required
                />
              </div>
              <div className="space-y-1 text-left">
                <label className="block font-label text-xs font-medium uppercase tracking-[0.04em] text-on-surface-variant" htmlFor="confirm_password">Confirm Password</label>
                <input 
                  className="w-full bg-surface-container-high border-none rounded-xl px-4 py-3.5 text-on-surface placeholder:text-stone-400 focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all duration-200 outline-none" 
                  id="confirm_password" 
                  name="confirm_password" 
                  value={formData.confirm_password}
                  onChange={handleChange}
                  placeholder="••••••••" 
                  type="password"
                  required
                />
              </div>
              <div className="pt-4">
                <button 
                  className="w-full bg-gradient-to-br from-primary to-primary-container text-white font-semibold py-5 rounded-xl shadow-lg shadow-primary/10 active:scale-[0.98] transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed" 
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>
              </div>
            </form>
            <footer className="mt-8 text-center text-left">
              <p className="text-on-surface-variant text-sm text-left">
                Already have an account? 
                <Link className="text-primary font-bold hover:underline decoration-primary underline-offset-4 ml-1" href="/login">Log In</Link>
              </p>
            </footer>
          </div>
        </section>

        {/* Right Side: Immersive Imagery Section */}
        <section className="hidden md:flex flex-1 relative items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img 
              alt="Hanoi Old Quarter Heritage" 
              className="w-full h-full object-cover" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBTC1yLpiKQoH9Hd25hCqgyA8TSx-qKS-ojmE-gUvwOm0E-ySF-VHOAxdwaH5Uqf2CuHvwDss2eId6mePXyF_F6XR0rWBcHUX5fLoZgfyk3axrCqNKJiUNu9f0t_ymQt1-eE9kwwtROGqnX-nNcD-EqcPdLIJsohyo8uBF_MD554fU6pNkYO_XVzGtsovhqQ398kOSmSoc0q7rSqnlfZLz5YO3sphe0R76UuD5QfUsoXPoL2ljYif87peq4thBcpS-dIlprYqwDgRKr"
            />
            <div className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px]"></div>
          </div>
          <div className="relative z-10 px-12 lg:px-20 text-center text-white max-w-2xl">
            <span className="font-label text-xs font-medium uppercase tracking-[0.2em] text-primary-fixed mb-6 block">Legacy & Culture</span>
            <blockquote className="text-4xl lg:text-5xl font-bold tracking-tight mb-8 leading-tight">
              "Hanoi is a city of layers—ancient stone, colonial ochre, and vibrant modern energy."
            </blockquote>
            <div className="h-1 w-20 bg-primary mx-auto rounded-full"></div>
            <p className="mt-8 text-lg font-light italic text-stone-200">The heart of Vietnam's eternal soul.</p>
          </div>
        </section>
      </main>

      {/* Footer Component */}
      <footer className="bg-stone-50 w-full py-12 px-8 flex flex-col md:flex-row justify-between items-center gap-6 mt-auto">
        <div className="flex flex-col items-center md:items-start text-left">
          <span className="font-bold text-stone-900 text-xl tracking-tighter">HanoiGO</span>
          <p className="font-inter text-xs tracking-wide uppercase text-stone-500 mt-2 text-left">© 2024 HanoiGO. A Curated Heritage Experience.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-8">
          <Link className="font-inter text-sm tracking-wide uppercase text-stone-500 hover:underline decoration-red-500 underline-offset-4 transition-opacity" href="#">Privacy Policy</Link>
          <Link className="font-inter text-sm tracking-wide uppercase text-stone-500 hover:underline decoration-red-500 underline-offset-4 transition-opacity" href="#">Terms of Service</Link>
          <Link className="font-inter text-sm tracking-wide uppercase text-stone-500 hover:underline decoration-red-500 underline-offset-4 transition-opacity" href="#">Cultural Guidelines</Link>
          <Link className="font-inter text-sm tracking-wide uppercase text-stone-500 hover:underline decoration-red-500 underline-offset-4 transition-opacity" href="#">Contact</Link>
        </div>
      </footer>
    </div>
  );
}
