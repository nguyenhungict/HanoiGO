export type NotificationType =
  | 'ACTIVITY_REQUEST'
  | 'ACTIVITY_APPROVED'
  | 'ACTIVITY_REJECTED'
  | 'NEW_MESSAGE'
  | 'ADMIN_WARNING';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string | null;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
}
