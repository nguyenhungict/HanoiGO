'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/actions';

interface HeaderProps {
  username: string;
}

export default function Header({ username }: HeaderProps) {
  const pathname = usePathname();

  const navItems = [
    { name: 'Discovery', href: '/discovery', icon: 'explore' },
    { name: 'Trips', href: '/trips', icon: 'map' },
    { name: 'Activities', href: '/activities', icon: 'groups' },
  ];

  return (
    <header className="h-20 border-b border-outline-variant/30 bg-surface/80 backdrop-blur-xl px-8 flex items-center justify-between sticky top-0 z-50">
      {/* Left: Logo & Core Nav */}
      <div className="flex items-center gap-12">
        <Link href="/" className="text-2xl font-black text-primary tracking-tighter">HanoiGO</Link>
        
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-full transition-all duration-300 font-bold text-sm tracking-tight ${
                  isActive 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' 
                    : 'text-outline hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span className={`material-symbols-outlined text-[20px] ${isActive ? 'fill-1' : ''}`}>{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Right: Search & Profile */}
      <div className="flex items-center gap-6">
        {/* Discovery Filter Context - Show only if on Discovery */}
        {pathname === '/discovery' && (
          <div className="hidden xl:flex items-center gap-2 animate-in fade-in zoom-in duration-500 mr-4">
             
          </div>
        )}

        

        <div className="flex items-center gap-3 pl-4 border-l border-outline-variant/30">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] font-black text-on-surface uppercase tracking-tighter leading-none">{username}</p>
          </div>
          <Link href="/profile" className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden hover:rotate-12 transition-all shadow-inner">
             <span className="material-symbols-outlined text-primary text-2xl">account_circle</span>
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="material-symbols-outlined text-outline-variant hover:text-error transition-colors ml-1 text-xl">logout</button>
          </form>
        </div>
      </div>
    </header>
  );
}
