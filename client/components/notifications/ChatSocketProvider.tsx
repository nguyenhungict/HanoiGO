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

  // Keep a stable ref of activeChatId for socket listeners to read without re-running the main useEffect
  const activeChatIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // Emit mark_read when user navigates to a different chat room
  useEffect(() => {
    if (activeChatId && socketRef.current?.connected) {
      socketRef.current.emit('mark_read', { activityId: activeChatId });
    }
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

    const joinedGroupIds: string[] = [];

    socket.on('connect', async () => {
      console.log('[ChatSocket] Connected to group-chat namespace');

      // Fetch user's activities to subscribe to rooms
      const result = await getMyActivitiesAction();
      const latestUser = useAuthStore.getState().user;
      if (result.success && Array.isArray(result.data) && latestUser) {
        const joinedGroups = (result.data as GroupActivity[]).filter(
          (act) => act.myStatus === 'APPROVED' || act.hostId === latestUser.id
        );

        // Track which groups we joined so message_history can be attributed correctly
        joinedGroupIds.length = 0;
        joinedGroups.forEach((group) => {
          joinedGroupIds.push(group.id);
          socket.emit('join_activity', { activityId: group.id });
        });
      }
    });

    // message_history fires once per join_activity — use a counter to attribute each response
    let historyResponseIndex = 0;
    socket.on('message_history', (data: { messages: Message[]; unreadCount: number }) => {
      const latestUser = useAuthStore.getState().user;
      if (!latestUser) return;

      // Try to get activityId from message data first, fallback to joinedGroupIds order
      let activityId: string | undefined;
      if (data.messages && data.messages.length > 0) {
        activityId = data.messages[0].activityId;
      } else if (joinedGroupIds[historyResponseIndex] !== undefined) {
        // For empty chat rooms, use the join order as a proxy
        activityId = joinedGroupIds[historyResponseIndex];
      }
      historyResponseIndex++;

      if (activityId) {
        setUnreadCount(activityId, data.unreadCount);
      }
    });

    socket.on('new_message', (msg: Message) => {
      const latestUser = useAuthStore.getState().user;
      if (!latestUser || msg.userId === latestUser.id) return; // Skip our own messages

      const currentActiveChatId = activeChatIdRef.current;
      if (msg.activityId === currentActiveChatId) {
        // User is actively viewing this chat — mark as read immediately
        if (socket.connected) {
          socket.emit('mark_read', { activityId: msg.activityId });
        }
        // Also reset local count to 0
        setUnreadCount(msg.activityId, 0);
      } else {
        // Increment unread count for background activity
        incrementUnreadCount(msg.activityId);
      }
    });

    socket.on('disconnect', () => {
      console.log('[ChatSocket] Disconnected from group-chat namespace');
      historyResponseIndex = 0;
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, setUnreadCount, incrementUnreadCount]);

  return null;
}
