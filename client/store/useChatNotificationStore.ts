import { create } from 'zustand';

interface ChatNotificationState {
  unreadCounts: Record<string, number>;
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  setUnreadCount: (activityId: string, count: number) => void;
  incrementUnreadCount: (activityId: string) => void;
  markAsRead: (activityId: string, timestamp?: string) => void;
  getTotalUnreadCount: () => number;
}

export const useChatNotificationStore = create<ChatNotificationState>((set, get) => ({
  unreadCounts: {},
  activeChatId: null,

  setActiveChatId: (id) => {
    set({ activeChatId: id });
    if (id) {
      get().markAsRead(id);
    }
  },

  setUnreadCount: (activityId, count) => {
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [activityId]: Math.max(0, count),
      },
    }));
  },

  incrementUnreadCount: (activityId) => {
    const { activeChatId } = get();
    // Do not increment if the chat is actively open
    if (activeChatId === activityId) return;

    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [activityId]: (state.unreadCounts[activityId] || 0) + 1,
      },
    }));
  },

  markAsRead: (activityId, timestamp) => {
    // 1. Reset count in state
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [activityId]: 0,
      },
    }));

    // 2. Save last read timestamp to LocalStorage
    const readTime = timestamp || new Date().toISOString();
    localStorage.setItem(`hanoigo_last_read_activity_${activityId}`, readTime);
  },

  getTotalUnreadCount: () => {
    const { unreadCounts } = get();
    return Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);
  },
}));
