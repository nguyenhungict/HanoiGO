"use client";

import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-surface font-body text-on-surface antialiased flex flex-col">
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl shadow-sm shadow-rose-900/5 transition-all glass-nav">
        <div className="max-w-7xl mx-auto flex justify-between items-center px-8 py-4">
          <Link href="/" className="text-2xl font-black text-rose-500 tracking-tighter">HanoiGO</Link>
          <div className="hidden md:flex items-center gap-8 font-['Inter'] tracking-tight font-medium">
            <a className="text-neutral-600 hover:text-rose-500 transition-colors duration-300" href="#destinations">Destinations</a>
            <a className="text-neutral-600 hover:text-rose-500 transition-colors duration-300" href="#itineraries">Itineraries</a>
            <a className="text-neutral-600 hover:text-rose-500 transition-colors duration-300" href="#experiences">Experiences</a>
            <a className="text-neutral-600 hover:text-rose-500 transition-colors duration-300" href="#">Bookings</a>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <button className="text-neutral-600 font-medium px-4 py-2 hover:text-rose-500 transition-all">Log In</button>
            </Link>
            <Link href="/register">
              <button className="bg-gradient-to-br from-primary to-primary-container text-white font-bold px-6 py-2.5 rounded-md hover:opacity-90 transition-all shadow-md">Sign Up</button>
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
            className="absolute inset-0 w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4-iPwl61wIu2fTOvlPGHdynooI11BBN20UA0Lh_jjmsGeVSnz84vQb18GYamR1CDOncYAkiZOtfiP_TGbK0OMR39ZsGmTsSKr2KvjOBSmNn8m4JnEeijwB-NrfhFQyccJJWrO60ItlhNRLQgroYS6pjSQkJG2zyGTDgBbVjInVcCYocOHECqFYmZ-I7XU7sqZ6ux_4H9tqis2Qs1N-dygzHhIFkFeZboQ7m3_048PWQVBMAkVpfDQMvojSauf_65O5V2TTO-eSdwq"
          />
          <div className="absolute inset-0 bg-black/10"></div>
          {/* Glassmorphic Overlay */}
          <div className="glass-card p-12 rounded-3xl relative z-10 max-w-md border border-white/20">
            <div className="text-white">
              <h2 className="text-5xl font-black tracking-tighter mb-4 font-headline uppercase leading-none">Hanoi<br/>GO.</h2>
              <p className="text-lg font-light leading-relaxed opacity-90 mb-8">
                Experience the soul of Vietnam through curated journeys that blend timeless heritage with modern luxury.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex -space-x-3">
                  <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-neutral-200">
                    <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBS6b92EyHcnxNeXz_VuUVdBhOGbY0U1p20ztvsYraHcQgwBWkOV3MGDMBMiRJjB73lDLFk_mL2aTNyRTbevMFwiBxEbOfyeamd296xaZM5MqDWofZLafllT67TOi2UIoSNFl2rOMjDGM3l3L-4aBBQvSKqpiC0Gi4E3-GJS-nGidgnY1Wb8siJIGHY4wl2oocysO9Pmhb_P8sAJDAdIcsO69CXTa-BkPTmdPekdAIHJrDZpZzvUKIyCJe1ZlQ7MO4gsbzI9wSgovoD" alt="Traveler 1" />
                  </div>
                  <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-neutral-200">
                    <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCAu-bsocWiyWuntmqkceDix7iu9B_lCjqkd8THoMPAYyySq06xkjoN8ab1KWyc0bQ76lBdutb9EhKJnMFPbUJctc_RfKLXOD1gVPwJFhmp7deSURHzJrDSnTiru3q0YixUdcScUuKkOgaC1PyfI8PsrOvrlURK9aiaNfAMqR-uchBx5F6tQDo66Lt6MweYl8naUC0TwXxnKhD3blcui1INTjX2FmJan50Hw27diuXiATAUNwthyZCDCS2-0MkG9XJsb0DoR635pV7x" alt="Traveler 2" />
                  </div>
                  <div className="w-10 h-10 rounded-full border-2 border-white overflow-hidden bg-neutral-200">
                    <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCUcb09-OU-PKqF4hvCUG86LA-QniQbew0tz6sYH3KwrgrghSMScD7PcAW6AJSwPPUhRHwi_o-_wtPIGJuqQBSMOA5QxY4uxJTH4eQ6avu5HSv8cH60MSyxiMdllftlWnvqzRHmJEArbUZkHMmgBt8OYncNWfaDsTCuh6Riz2tx18jAGp0I4s3mihAjvT28FKz0jbp9UDWzCI7qGn4ElHL4PeqW14p_jafw3-mWVwu2UbLoEjNmF6OJvKkUF85f74mqsVhs9PUJZKGu" alt="Traveler 3" />
                  </div>
                </div>
                <span className="text-sm font-medium tracking-wide">Join 12k+ travelers</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Half: Clean Login Container */}
        <section className="w-full lg:w-1/2 bg-surface-container-lowest flex items-center justify-center p-8 lg:p-24 overflow-y-auto">
          <div className="w-full max-w-md">
            <header className="mb-12">
              <span className="text-primary font-bold tracking-[0.2em] uppercase text-xs mb-3 block">Welcome Back</span>
              <h1 className="text-4xl font-extrabold text-on-surface tracking-tight mb-2 font-headline leading-tight">Access your journey.</h1>
              <p className="text-on-surface-variant font-body">Don't have an account? <Link className="text-primary font-semibold hover:underline" href="/register">Create an account</Link></p>
            </header>
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1" htmlFor="email">Email Address</label>
                <input 
                  className="ghost-input w-full px-6 py-4 rounded-xl text-on-surface placeholder:text-outline/50 border border-outline-variant/30 focus:border-primary/50 outline-none transition-all" 
                  id="email" 
                  placeholder="name@hanoigo.com" 
                  type="email"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant ml-1" htmlFor="password">Password</label>
                <div className="relative">
                  <input 
                    className="ghost-input w-full px-6 py-4 rounded-xl text-on-surface placeholder:text-outline/50 border border-outline-variant/30 focus:border-primary/50 outline-none transition-all" 
                    id="password" 
                    placeholder="••••••••" 
                    type="password"
                  />
                  <button className="absolute right-6 top-1/2 -translate-y-1/2 text-outline-variant hover:text-primary transition-colors" type="button">
                    <span className="material-symbols-outlined text-lg">visibility</span>
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input className="w-4 h-4 rounded-md border-outline-variant text-primary focus:ring-primary/20" type="checkbox" />
                  <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">Keep me signed in</span>
                </label>
                <Link className="text-sm text-primary font-medium hover:underline" href="/forgot-password">Forgot password?</Link>
              </div>
              <button 
                className="w-full bg-primary text-white py-5 rounded-xl font-bold text-lg shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all" 
                type="submit"
              >
                Continue
              </button>
            </form>
            <footer className="mt-12 text-center">
              <p className="text-[11px] text-outline leading-relaxed px-8">
                By continuing, you agree to HanoiGO's <Link className="underline hover:text-primary" href="#">Terms of Service</Link> and <Link className="underline hover:text-primary" href="#">Privacy Policy</Link>.
              </p>
            </footer>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full py-12 px-8 bg-neutral-100 border-t border-outline-variant/5 mt-auto">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-4">
            <div className="font-bold text-primary text-xl tracking-tighter">HanoiGO</div>
            <p className="text-sm leading-relaxed text-neutral-500 max-w-xs">
              Curating the heritage of Hanoi into unforgettable journeys for the modern traveler.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <h4 className="font-bold text-on-surface text-sm uppercase tracking-widest">Platform</h4>
            <Link className="text-neutral-500 hover:text-primary transition-colors text-sm" href="#">About</Link>
            <Link className="text-neutral-500 hover:text-primary transition-colors text-sm" href="#">Community</Link>
            <Link className="text-neutral-500 hover:text-primary transition-colors text-sm" href="#">Support</Link>
          </div>
          <div className="flex flex-col justify-between items-start md:items-end">
            <div className="flex gap-4">
              <span className="material-symbols-outlined text-neutral-400 hover:text-primary cursor-pointer">public</span>
              <span className="material-symbols-outlined text-neutral-400 hover:text-primary cursor-pointer">share</span>
              <span className="material-symbols-outlined text-neutral-400 hover:text-primary cursor-pointer">mail</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
