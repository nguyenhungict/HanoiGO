'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { name: 'Dashboard', icon: 'dashboard', path: '/admin/dashboard' },
    { name: 'User Management', icon: 'group', path: '/admin/users' },
    { name: 'Heritage Places', icon: 'account_balance', path: '/admin/places' },
    { name: 'Trips & Activities', icon: 'explore', path: '/admin/activities' },
    { name: 'Community Reviews', icon: 'rate_review', path: '/admin/reviews' },
    { name: 'System Settings', icon: 'settings', path: '/admin/settings' },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-body">
      {/* Sidebar - Glassmorphism style */}
      <aside 
        className={`bg-white/80 backdrop-blur-2xl border-r border-outline/10 flex flex-col transition-all duration-500 ease-out z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]
        ${collapsed ? 'w-24' : 'w-72'}`}
      >
        {/* Logo Section */}
        <div className="p-8 pb-12 flex items-center justify-between">
          {!collapsed && (
            <Link href="/admin/dashboard" className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 rotate-3 group-hover:rotate-0 transition-transform">
                <span className="text-white font-black text-sm tracking-tighter">H</span>
              </div>
              <span className="text-2xl font-black tracking-tighter text-on-surface">Hanoi<span className="text-primary">GO</span></span>
            </Link>
          )}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container-low hover:bg-primary/10 hover:text-primary transition-all text-outline"
          >
            <span className="material-symbols-outlined text-xl">
              {collapsed ? 'side_navigation' : 'menu'}
            </span>
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto hide-scrollbar">
          {!collapsed && (
            <p className="px-5 text-[10px] font-black uppercase tracking-[0.2em] text-outline mb-6 opacity-60">Management</p>
          )}
          {menuItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-4 px-5 py-4 rounded-[1.25rem] transition-all duration-300 group relative ${
                pathname === item.path 
                ? 'bg-primary text-white shadow-xl shadow-primary/30 scale-[1.02]' 
                : 'text-on-surface-variant hover:bg-white hover:shadow-md hover:text-primary'
              }`}
            >
              <span className={`material-symbols-outlined text-xl transition-colors ${pathname === item.path ? 'text-white' : 'group-hover:text-primary'}`}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="text-[11px] font-black uppercase tracking-widest">{item.name}</span>
              )}
              {pathname === item.path && (
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-8 bg-white/20 rounded-full blur-sm" />
              )}
            </Link>
          ))}
        </nav>

        {/* User Quick Profile */}
        <div className="p-6 pt-10">
          <div className={`bg-white/50 border border-outline/10 rounded-[2rem] p-4 flex items-center gap-3 ${collapsed ? 'justify-center border-none bg-transparent' : ''}`}>
             <div className="w-11 h-11 rounded-2xl bg-on-background flex items-center justify-center text-white font-black text-sm shadow-xl shrink-0">
                A
             </div>
             {!collapsed && (
               <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-black text-on-surface truncate">Admin Root</p>
                  <p className="text-[9px] font-black text-primary uppercase tracking-widest">Master Access</p>
               </div>
             )}
          </div>
          
          <Link 
            href="/discovery"
            className={`mt-4 w-full flex items-center gap-4 px-5 py-4 rounded-[1.25rem] text-outline hover:text-primary hover:bg-white hover:shadow-sm transition-all
            ${collapsed ? 'justify-center' : ''}`}
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            {!collapsed && <span className="text-[10px] font-black uppercase tracking-widest">Exit Admin</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header */}
        <header className="h-24 bg-background/80 backdrop-blur-md px-10 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-on-surface tracking-tighter uppercase">
              {menuItems.find(i => i.path === pathname)?.name || 'Control Panel'}
            </h2>
            <div className="h-6 w-[1px] bg-outline/20 mx-2" />
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                <p className="text-[10px] font-black text-outline uppercase tracking-wider">
                  Server Live
                </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 bg-white px-4 py-2.5 rounded-2xl border border-outline/10 group focus-within:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-outline group-focus-within:text-primary text-xl">search</span>
                <input type="text" placeholder="Global Search..." className="bg-transparent border-none text-[11px] font-bold text-on-surface focus:outline-none w-48" />
            </div>

            <button className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-outline/10 text-outline hover:text-primary hover:shadow-lg transition-all relative">
               <span className="material-symbols-outlined text-xl">notifications</span>
               <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-primary border-2 border-white rounded-full" />
            </button>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto bg-background px-10 pb-10 scroll-smooth h-full custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}
