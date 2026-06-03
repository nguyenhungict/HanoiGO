'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useChatNotificationStore } from '@/store/useChatNotificationStore';

export default function SideNav() {
  const pathname = usePathname();
  const totalUnreadCount = useChatNotificationStore((s) =>
    Object.values(s.unreadCounts).reduce((sum, count) => sum + count, 0)
  );

  const navItems = [
    { name: 'Discovery', href: '/discovery', icon: 'explore' },
    { name: 'Trips', href: '/trips', icon: 'map' },
    { name: 'Activities', href: '/activities', icon: 'groups' },
  ];

  return (
    <aside className="w-20 lg:w-64 border-r border-outline-variant/20 bg-surface-container-low flex flex-col py-6 shrink-0 transition-all">
      <nav className="space-y-2 px-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.name}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all group relative ${
                isActive 
                  ? 'bg-primary/10 text-primary font-bold' 
                  : 'text-outline hover:bg-surface-container-high'
              }`}
            >
              <span className={`material-symbols-outlined ${isActive ? 'fill-1' : ''}`}>{item.icon}</span>
              <span className="hidden lg:block text-sm tracking-tight">{item.name}</span>
              {isActive && <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />}
              
              {/* Badge for unread activities group chat messages */}
              {item.href === '/activities' && totalUnreadCount > 0 && !isActive && (
                <span className="absolute top-2 right-2 w-5 h-5 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md shadow-primary/30 animate-in zoom-in duration-300 lg:right-4 lg:top-3.5">
                  {totalUnreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
