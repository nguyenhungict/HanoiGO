'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SessionGuard from '@/components/SessionGuard';

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
    { name: 'Activity Reports', icon: 'flag', path: '/admin/reports' },
    { name: 'System Settings', icon: 'settings', path: '/admin/coming-soon' },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-body">
      <SessionGuard redirectTo="/admin/login" />
      {/* Sidebar - Glassmorphism style */}
      <aside 
        className={`bg-white/80 backdrop-blur-2xl border-r border-outline/10 flex flex-col transition-all duration-500 ease-out z-30 shadow-[4px_0_24px_rgba(0,0,0,0.02)]
        ${collapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Logo Section */}
        <div className="p-6 pb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-white text-base">map</span>
            </div>
            {!collapsed && (
              <span className="text-lg font-bold tracking-tighter text-on-surface">Hanoi<span className="text-primary">GO</span></span>
            )}
          </div>
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
            <p className="px-5 text-[10px] font-bold uppercase tracking-[0.2em] text-outline/50 mb-6">Management</p>
          )}
          {menuItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all relative group ${
                pathname === item.path 
                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                : 'text-outline hover:bg-background hover:text-primary'
              }`}
            >
              <span className={`material-symbols-outlined text-base ${pathname === item.path ? 'text-white' : 'text-outline group-hover:text-primary'}`}>
                {item.icon}
              </span>
              {!collapsed && (
                <span className="text-[11px] font-bold uppercase tracking-widest">{item.name}</span>
              )}
              {pathname === item.path && (
                <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-8 bg-white/20 rounded-full blur-sm" />
              )}
            </Link>
          ))}
        </nav>

        {/* User Quick Profile */}
        <div className="p-6 pt-8">
          <div className={`bg-white/50 border border-outline/10 rounded-2xl p-4 flex items-center gap-3 ${collapsed ? 'justify-center border-none bg-transparent' : ''}`}>
             <div className="w-10 h-10 rounded-xl bg-on-background flex items-center justify-center text-white font-bold text-sm shadow-xl shrink-0">
                A
             </div>
             {!collapsed && (
               <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-bold text-on-surface truncate">Admin Root</p>
                  <p className="text-[9px] font-bold text-primary uppercase tracking-widest">Master Access</p>
               </div>
             )}
          </div>
          
          <Link 
            href="/discovery"
            className={`mt-4 w-full flex items-center gap-4 px-5 py-3 rounded-xl text-outline hover:text-primary hover:bg-white hover:shadow-sm transition-all
            ${collapsed ? 'justify-center' : ''}`}
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            {!collapsed && <span className="text-[9px] font-bold uppercase tracking-widest">Exit Admin</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header */}
        <header className="h-20 bg-background/80 backdrop-blur-md px-8 flex items-center justify-between z-20">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-on-surface tracking-tighter uppercase">
              {menuItems.find(i => i.path === pathname)?.name || 'Control Panel'}
            </h2>
            <div className="h-6 w-[1px] bg-outline/20 mx-2" />
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
                <p className="text-[10px] font-bold text-outline/60 uppercase tracking-wider">
                  Server Live
                </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-outline/10 group focus-within:border-primary/30 transition-all">
                <span className="material-symbols-outlined text-outline group-focus-within:text-primary text-lg">search</span>
                <input type="text" placeholder="Global Search..." className="bg-transparent border-none text-[11px] font-bold text-on-surface focus:outline-none w-48" />
            </div>

            <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-outline/10 text-outline hover:text-primary hover:shadow-lg transition-all relative">
               <span className="material-symbols-outlined text-xl">notifications</span>
               <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary border-2 border-white rounded-full" />
            </button>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto bg-background px-8 pb-8 scroll-smooth h-full custom-scrollbar">
          {children}
        </div>
      </main>
    </div>
  );
}
