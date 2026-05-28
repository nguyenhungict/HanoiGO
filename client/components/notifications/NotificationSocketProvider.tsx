'use client';

import React, { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationBellStore } from '@/store/useNotificationBellStore';
import { useNotificationStore } from '@/store/useNotificationStore';
import { Notification } from '@/types/notification';

export function NotificationSocketProvider() {
  const { token } = useAuthStore();
  const { prependNotification } = useNotificationBellStore();
  const { show: showToast } = useNotificationStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const actionsUrl = process.env.NEXT_PUBLIC_ACTIONS_URL || 'http://localhost:8888';
    const socket = io(`${actionsUrl}/notifications`, {
      auth: { token },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      console.log('[NotificationSocket] Connected to notifications namespace');
    });

    socket.on('new_notification', (notification: Notification) => {
      console.log('[NotificationSocket] Received new notification:', notification);
      
      // 1. Add to Zustand bell store list
      prependNotification(notification);

      // 2. Map notification type to visual toast alert type
      let toastType: 'info' | 'success' | 'warning' | 'error' = 'info';
      if (notification.type === 'ADMIN_WARNING') {
        toastType = 'error';
      } else if (notification.type === 'ACTIVITY_APPROVED') {
        toastType = 'success';
      } else if (notification.type === 'ACTIVITY_REJECTED') {
        toastType = 'warning';
      }

      // 3. Trigger UI Toast
      showToast({
        type: toastType,
        title: notification.title,
        message: notification.body || undefined,
        duration: 6000,
      });
    });

    socket.on('disconnect', () => {
      console.log('[NotificationSocket] Disconnected from notifications namespace');
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, prependNotification, showToast]);

  return null;
}
