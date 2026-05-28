import { create } from 'zustand';
import { Notification } from '@/types/notification';

interface NotificationBellState {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  setNotifications: (notifications: Notification[]) => void;
  prependNotification: (notification: Notification) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  setUnreadCount: (count: number) => void;
  setIsOpen: (isOpen: boolean) => void;
  toggleOpen: () => void;
}

export const useNotificationBellStore = create<NotificationBellState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,
  setNotifications: (notifications) => set({ notifications }),
  prependNotification: (notification) =>
    set((state) => {
      // Avoid duplicate prepends
      if (state.notifications.some((n) => n.id === notification.id)) {
        return state;
      }
      return {
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
      };
    }),
  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  setIsOpen: (isOpen) => set({ isOpen }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),
}));
