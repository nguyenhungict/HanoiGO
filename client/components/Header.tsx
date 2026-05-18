'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/actions';
import { useTripStore } from '@/store/useTripStore';
import Logo from '@/components/Logo';

interface HeaderProps {
  username: string;
}

export default function Header({ username }: HeaderProps) {
  const pathname = usePathname();
  const placeCount = useTripStore((s) => Object.keys(s.selectedPlaces).length);

  const navItems = [
    { name: 'Discovery', href: '/discovery', icon: 'explore' },
    { name: 'Trips', href: '/trips', icon: 'map' },
    { name: 'Activities', href: '/activities', icon: 'groups' },
    { name: 'Places', href: '/places', icon: 'account_balance' },
  ];

  return (
    <header className="h-20 border-b border-outline/5 bg-white/80 backdrop-blur-2xl px-8 flex items-center justify-between sticky top-0 z-50 transition-all">
      {/* Left: Logo & Core Nav */}
      <div className="flex items-center gap-14">
        <Link href="/" className="flex items-center gap-3 transition-transform duration-500 hover:scale-[1.03] active:scale-[0.98]">
          <Logo className="h-8 w-auto text-on-surface" />
        </Link>
        
        <nav className="hidden lg:flex items-center gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const showBadge = item.href === '/trips' && placeCount > 0 && !isActive;
            return (
              <Link 
                key={item.name}
                href={item.href}
                className={`relative flex items-center gap-2.5 px-6 py-2.5 rounded-[1.25rem] transition-all duration-500 text-[10px] font-black uppercase tracking-[0.2em] ${
                  isActive 
                    ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105' 
                    : 'text-outline hover:text-primary hover:bg-primary/5'
                }`}
              >
                <span className={`material-symbols-outlined text-[18px] ${isActive ? 'fill-1' : ''}`}>{item.icon}</span>
                {item.name}
                {/* Badge for saved places count */}
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md shadow-primary/30 animate-in zoom-in duration-300">
                    {placeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right: Search & Profile */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 pl-8 border-l border-outline/10">
          <div className="text-right hidden sm:block">
            <p className="text-[9px] font-black text-outline uppercase tracking-widest leading-none mb-1">Explorer</p>
            <p className="text-xs font-black text-on-surface tracking-tighter leading-none">{username}</p>
          </div>
          <Link href="/profile" className="group">
            <div className="w-11 h-11 rounded-2xl bg-surface-container-high border border-outline/10 flex items-center justify-center overflow-hidden hover:rotate-[15deg] transition-all duration-500 shadow-inner group-hover:border-primary/30">
               <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-2xl">person</span>
            </div>
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="w-10 h-10 rounded-2xl flex items-center justify-center text-outline/30 hover:text-primary hover:bg-primary/5 transition-all ml-1 active:scale-90">
              <span className="material-symbols-outlined text-xl">logout</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
