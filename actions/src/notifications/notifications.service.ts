import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  /**
   * Creates a notification, stores it in the database, and emits a real-time event.
   */
  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body?: string,
    entityType?: string,
    entityId?: string,
  ) {
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId,
          type,
          title,
          body,
          entityType,
          entityId,
        },
      });

      // Emit real-time update
      this.gateway.sendToUser(userId, 'new_notification', notification);

      return notification;
    } catch (error) {
      this.logger.error('Failed to create notification:', error);
      throw error;
    }
  }

  /**
   * Retrieves paginated notifications for a specific user using cursor-based pagination.
   */
  async findForUser(userId: string, cursor?: string, limit = 20) {
    try {
      const queryOptions: any = {
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit + 1, // Get one extra to determine next cursor
      };

      if (cursor) {
        queryOptions.cursor = { id: cursor };
        queryOptions.skip = 1; // Skip the cursor element itself
      }

      const notifications = await this.prisma.notification.findMany(queryOptions);

      let nextCursor: string | undefined = undefined;
      if (notifications.length > limit) {
        const nextItem = notifications.pop();
        nextCursor = nextItem?.id;
      }

      return {
        notifications,
        nextCursor,
      };
    } catch (error) {
      this.logger.error(`Failed to find notifications for user ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Marks a specific notification as read.
   */
  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification || notification.userId !== userId) {
      throw new NotFoundException('Notification not found or access denied');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  /**
   * Marks all notifications of a specific user as read.
   */
  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  /**
   * Fetches the number of unread notifications for a specific user.
   */
  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }
}
