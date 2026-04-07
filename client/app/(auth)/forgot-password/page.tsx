"use client";

import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <div className="bg-surface text-on-surface min-h-screen flex flex-col font-body">
      {/* TopAppBar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface">
        <div className="flex justify-between items-center w-full px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-[#1c1c18]">HanoiGO</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link className="text-[#1c1c18] font-medium hover:opacity-80 transition-opacity" href="#">Explore</Link>
            <Link className="text-[#1c1c18] font-medium hover:opacity-80 transition-opacity" href="#">Trips</Link>
            <Link className="text-[#1c1c18] font-medium hover:opacity-80 transition-opacity" href="#">Profile</Link>
          </nav>
          <div className="flex items-center gap-4">
            <button className="hover:opacity-80 transition-opacity p-2 rounded-full">
              <span className="material-symbols-outlined text-[#1c1c18]">help_outline</span>
            </button>
          </div>
        </div>
        <div className="bg-[#f1ede7] h-[1px] w-full"></div>
      </header>

      {/* Main Content Canvas */}
      <main className="flex-grow flex items-center justify-center pt-24 pb-12 px-6">
        <section className="w-full max-w-md mx-auto">
          {/* Reset Password Card */}
          <div className="bg-surface-container-lowest shadow-[0px_20px_40px_rgba(104,93,74,0.08)] rounded-2xl p-10 md:p-12 relative overflow-hidden">
            {/* Subtle Tonal Wash at the top */}
            <div className="absolute top-0 left-0 w-full h-2 bg-surface-container"></div>
            <div className="flex flex-col gap-8">
              {/* Heading & Description */}
              <div className="space-y-3">
                <h1 className="text-[2rem] font-bold tracking-[-0.02em] leading-tight text-on-surface text-left">Reset Password</h1>
                <p className="text-on-surface-variant text-lg leading-relaxed font-normal text-left">
                  Enter the email address associated with your account and we’ll send you a link to reset your password.
                </p>
              </div>
              {/* Input Form */}
              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="space-y-2 text-left">
                  <label className="block text-[0.75rem] font-bold uppercase tracking-[0.05em] text-on-surface-variant ml-1" htmlFor="email">
                    Email Address
                  </label>
                  <div className="group relative">
                    <input 
                      className="w-full bg-surface-container border-0 rounded-xl px-4 py-4 text-on-surface placeholder:text-on-surface-variant/50 focus:ring-2 focus:ring-primary-container/30 focus:bg-surface-container-highest transition-all outline-none" 
                      id="email" 
                      placeholder="name@hanoigo.com" 
                      type="email" 
                    />
                  </div>
                </div>
                {/* Action Button */}
                <button className="bg-gradient-to-br from-[#ff5a5f] to-[#b52330] w-full py-5 rounded-full text-white font-bold text-lg active:scale-95 duration-150 transition-transform shadow-lg shadow-primary/20">
                  Send Link
                </button>
              </form>
              {/* Back to Login */}
              <div className="flex justify-center pt-2">
                <Link className="flex items-center gap-2 text-on-surface-variant font-medium hover:text-primary transition-colors group" href="/login">
                  <span className="material-symbols-outlined text-xl">arrow_back</span>
                  <span>Back to Login</span>
                </Link>
              </div>
            </div>
          </div>
          {/* Trust Indicator / Additional Help */}
          <div className="mt-8 text-center px-4">
            <p className="text-sm text-on-secondary-container">
              Having trouble? <Link className="font-semibold underline decoration-primary/30 hover:decoration-primary transition-all" href="#">Contact our concierge support</Link>
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-surface">
        <div className="bg-[#f1ede7] h-[1px] w-full"></div>
        <div className="flex flex-col md:flex-row justify-between items-center w-full px-8 py-12 gap-6 max-w-7xl mx-auto">
          <div className="flex gap-8 order-1 md:order-2">
            <Link className="text-[#5a403f] text-sm tracking-tight hover:text-primary transition-colors rounded px-1" href="#">Privacy Policy</Link>
            <Link className="text-[#5a403f] text-sm tracking-tight hover:text-primary transition-colors rounded px-1" href="#">Terms of Service</Link>
            <Link className="text-[#5a403f] text-sm tracking-tight hover:text-primary transition-colors rounded px-1" href="#">Contact Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
