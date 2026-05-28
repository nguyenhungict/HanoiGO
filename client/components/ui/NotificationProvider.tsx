'use client';

import React from 'react';
import { useNotification } from '@/hooks/use-notification';
import { NotificationToast } from './NotificationToast';

export const NotificationProvider: React.FC = () => {
  const { notifications } = useNotification();

  return (
    <div 
      aria-live="assertive" 
      className="pointer-events-none fixed inset-0 z-[9999] flex flex-col items-end gap-4 p-6 sm:items-start md:p-10"
    >
      <div className="flex w-full flex-col items-end space-y-4 sm:items-end">
        {notifications.map((notification) => (
          <NotificationToast 
            key={notification.id} 
            {...notification} 
          />
        ))}
      </div>
    </div>
  );
};
