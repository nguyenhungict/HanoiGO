'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useNotificationBellStore } from '@/store/useNotificationBellStore';
import {
  getNotificationsAction,
  getUnreadCountAction,
  markAllReadAction,
  markReadAction,
} from '@/lib/actions';
import { Notification } from '@/types/notification';

export function NotificationBell() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    isOpen,
    setNotifications,
    setUnreadCount,
    markRead,
    markAllRead,
    toggleOpen,
    setIsOpen,
  } = useNotificationBellStore();

  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch initial notifications and unread count
  useEffect(() => {
    async function initNotifications() {
      const [countRes, listRes] = await Promise.all([
        getUnreadCountAction(),
        getNotificationsAction(undefined, 20),
      ]);

      if (countRes.success && countRes.data) {
        setUnreadCount(countRes.data.count);
      }
      if (listRes.success && listRes.data) {
        setNotifications(listRes.data.notifications);
      }
    }

    void initNotifications();
  }, [setNotifications, setUnreadCount]);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  const handleMarkAllRead = async () => {
    markAllRead();
    await markAllReadAction();
  };

  const handleItemClick = async (item: Notification) => {
    setIsOpen(false);
    if (!item.isRead) {
      markRead(item.id);
      await markReadAction(item.id);
    }

    // Redirect user based on notification source entity
    if (item.entityType === 'ACTIVITY' && item.entityId) {
      router.push('/activities');
    }
  };

  const formatRelativeTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ACTIVITY_REQUEST':
        return { icon: 'person_add', color: 'text-amber-500 bg-amber-50' };
      case 'ACTIVITY_APPROVED':
        return { icon: 'check_circle', color: 'text-green-500 bg-green-50' };
      case 'ACTIVITY_REJECTED':
        return { icon: 'cancel', color: 'text-red-500 bg-red-50' };
      case 'ADMIN_WARNING':
        return { icon: 'warning', color: 'text-red-600 bg-red-100 animate-pulse' };
      default:
        return { icon: 'notifications', color: 'text-primary bg-primary/5' };
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell Toggle Button */}
      <button
        onClick={toggleOpen}
        className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all duration-500 relative select-none ${
          isOpen
            ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20 scale-105'
            : 'bg-surface-container-high border-outline/10 text-outline hover:text-primary hover:border-primary/30 active:scale-95'
        }`}
      >
        <span className={`material-symbols-outlined text-2xl ${isOpen ? 'fill-1' : ''}`}>
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-md shadow-primary/30 animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Box */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white/95 backdrop-blur-2xl border border-outline/10 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300">
          {/* Header */}
          <div className="px-6 py-4 border-b border-outline/5 flex items-center justify-between bg-white/50">
            <span className="text-[10px] font-black text-on-surface uppercase tracking-[0.2em]">
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[9px] font-black text-primary hover:text-primary-container uppercase tracking-widest transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List Wrapper */}
          <div className="flex-1 overflow-y-auto max-h-96 divide-y divide-outline/5 py-1">
            {notifications.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                <div className="w-14 h-14 rounded-2xl bg-secondary-container flex items-center justify-center mb-4 border border-outline/5">
                  <span className="material-symbols-outlined text-outline/40 text-2xl">
                    notifications_off
                  </span>
                </div>
                <p className="text-xs font-black text-on-surface uppercase tracking-wider mb-1">
                  All Caught Up!
                </p>
                <p className="text-[10px] text-outline leading-normal font-semibold max-w-xs">
                  No notifications yet. We'll alert you when something fun happens.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const config = getNotificationIcon(item.type);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`w-full flex gap-4 p-5 text-left transition-colors relative hover:bg-secondary-container/40 ${
                      !item.isRead ? 'bg-primary/[0.02]' : ''
                    }`}
                  >
                    {/* Unread Indicator Bar */}
                    {!item.isRead && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-md" />
                    )}

                    {/* Icon Container */}
                    <div
                      className={`w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center border border-outline/5 shadow-sm ${config.color}`}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {config.icon}
                      </span>
                    </div>

                    {/* Content Section */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-black text-on-surface tracking-tight truncate">
                          {item.title}
                        </span>
                        <span className="text-[9px] text-outline/60 font-black uppercase tracking-wider flex-shrink-0">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-on-surface-variant font-medium leading-relaxed line-clamp-2">
                        {item.body}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
