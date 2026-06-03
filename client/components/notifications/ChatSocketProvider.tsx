'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/useAuthStore';
import { useChatNotificationStore } from '@/store/useChatNotificationStore';
import { getMyActivitiesAction } from '@/lib/actions';

interface Message {
  id: string;
  activityId: string;
  userId: string;
  createdAt: string;
}

interface GroupActivity {
  id: string;
  hostId: string;
  myStatus?: string | null;
}

export function ChatSocketProvider() {
  const token = useAuthStore((s) => s.token);
  const { setUnreadCount, incrementUnreadCount, activeChatId } = useChatNotificationStore();
  const socketRef = useRef<Socket | null>(null);

  // Keep a ref of activeChatId for socket listeners to read without re-running useEffect
  const activeChatIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  useEffect(() => {
    const currentUser = useAuthStore.getState().user;
    if (!token || !currentUser) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const actionsUrl = process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8888';
    const socket = io(`${actionsUrl}/group-chat`, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', async () => {
      console.log('[ChatSocket] Connected to group-chat namespace');
      
      // Fetch user's activities to subscribe to rooms
      const result = await getMyActivitiesAction();
      const latestUser = useAuthStore.getState().user;
      if (result.success && Array.isArray(result.data) && latestUser) {
        // Filter approved activities or hosted activities
        const joinedGroups = (result.data as GroupActivity[]).filter(
          (act) => act.myStatus === 'APPROVED' || act.hostId === latestUser.id
        );

        joinedGroups.forEach((group) => {
          socket.emit('join_activity', { activityId: group.id });
        });
      }
    });

    socket.on('message_history', (history: Message[]) => {
      const latestUser = useAuthStore.getState().user;
      if (!latestUser) return;

      if (Array.isArray(history) && history.length > 0) {
        const activityId = history[0].activityId;
        const lastRead = localStorage.getItem(`hanoigo_last_read_activity_${activityId}`);
        
        if (!lastRead) {
          // If no read history, count other people's messages as unread (limit to 30 from history)
          const otherMsgsCount = history.filter((m) => m.userId !== latestUser.id).length;
          setUnreadCount(activityId, otherMsgsCount);
        } else {
          const lastReadTime = new Date(lastRead).getTime();
          const unreadMsgs = history.filter(
            (m) => new Date(m.createdAt).getTime() > lastReadTime && m.userId !== latestUser.id
          );
          setUnreadCount(activityId, unreadMsgs.length);
        }
      }
    });

    socket.on('new_message', (msg: Message) => {
      const latestUser = useAuthStore.getState().user;
      if (!latestUser || msg.userId === latestUser.id) return; // Skip our own messages
      
      const currentActiveChatId = activeChatIdRef.current;
      if (msg.activityId === currentActiveChatId) {
        // If user has this chat actively open, save read time to LocalStorage instantly
        localStorage.setItem(`hanoigo_last_read_activity_${msg.activityId}`, msg.createdAt);
      } else {
        // Increment unread count globally
        incrementUnreadCount(msg.activityId);
      }
    });

    socket.on('disconnect', () => {
      console.log('[ChatSocket] Disconnected from group-chat namespace');
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, setUnreadCount, incrementUnreadCount]);

  return null;
}
