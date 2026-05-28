import { useNotificationStore, type NotificationType } from '@/store/useNotificationStore';

export const useNotification = () => {
  const show = useNotificationStore((state) => state.show);
  const hide = useNotificationStore((state) => state.hide);
  const notifications = useNotificationStore((state) => state.notifications);

  return { show, hide, notifications };
};

export { type NotificationType };
