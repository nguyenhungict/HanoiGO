import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RedisService } from '../redis/redis.service';
import { NotificationType } from '@prisma/client';

const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
const MSG_PAGE_SIZE = 30;

export type MessageType = 'TEXT' | 'IMAGE' | 'FILE';

interface SendMessageInput {
  activityId: string;
  userId: string;
  content?: string;
  mediaUrl?: string;
  fileName?: string;
  fileSize?: number;
  type: MessageType;
}

@Injectable()
export class GroupChatService {
  private readonly logger = new Logger('GroupChatService');

  // Presence lives in Redis (not Postgres — it's worthless after a restart, so
  // persisting it would cost writes for nothing) so that it stays correct once
  // this gateway is scaled to multiple instances: `isOnline` drives whether a
  // DB notification is sent, so a per-process view would wrongly notify users
  // who are actually online on a sibling instance.
  //
  // Typing indicators stay in an in-memory Map: they're a soft, best-effort UI
  // hint (self-corrects within 3s either way), not worth the extra Redis
  // round-trips. The only cross-instance gap is a "user is typing" bubble not
  // reaching someone connected to a different instance — acceptable for now.

  /** Map<activityId, Map<userId, timeout>> — typing debounce */
  private readonly typingMap = new Map<string, Map<string, NodeJS.Timeout>>();

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private redis: RedisService,
  ) { }

  private onlineKey(activityId: string) {
    return `chat:online:${activityId}`;
  }

  private onlineByUserKey(userId: string) {
    return `chat:online:byUser:${userId}`;
  }

  // ─────────────────────────────── Membership ──────────────────────────────

  // Chat access control. Reads the same ActivityMember status that the
  // activities module writes, so approving a member there is what admits them
  // here — there is no separate chat membership to keep in sync.
  async isApprovedMember(activityId: string, userId: string): Promise<boolean> {
    const member = await this.prisma.activityMember.findUnique({
      where: { activityId_userId: { activityId, userId } },
    });
    return !!member && member.status === 'APPROVED';
  }

  // ─────────────────────────────── Presence ────────────────────────────────

  // Kept as a Set (activityId -> userIds) plus a reverse index (userId ->
  // activityIds) so a disconnect can find every room a user was in without
  // scanning all active rooms.
  async addOnline(activityId: string, userId: string) {
    await Promise.all([
      this.redis.client.sadd(this.onlineKey(activityId), userId),
      this.redis.client.sadd(this.onlineByUserKey(userId), activityId),
    ]);
  }

  /** Removes the user from every room they were in. Returns the affected activityIds. */
  async removeOnlineEverywhere(userId: string): Promise<string[]> {
    const activityIds = await this.redis.client.smembers(
      this.onlineByUserKey(userId),
    );
    if (activityIds.length > 0) {
      const pipeline = this.redis.client.pipeline();
      for (const activityId of activityIds) {
        pipeline.srem(this.onlineKey(activityId), userId);
      }
      pipeline.del(this.onlineByUserKey(userId));
      await pipeline.exec();
    }
    return activityIds;
  }

  async getOnlineUsers(activityId: string): Promise<string[]> {
    return this.redis.client.smembers(this.onlineKey(activityId));
  }

  async isOnline(activityId: string, userId: string): Promise<boolean> {
    const result = await this.redis.client.sismember(
      this.onlineKey(activityId),
      userId,
    );
    return result === 1;
  }

  // ─────────────────────────────── Typing ──────────────────────────────────

  /** Registers/refreshes a typing timeout; onExpire fires after 3s of silence. */
  setTyping(activityId: string, userId: string, onExpire: () => void) {
    if (!this.typingMap.has(activityId)) this.typingMap.set(activityId, new Map());
    const room = this.typingMap.get(activityId)!;

    const existing = room.get(userId);
    if (existing) clearTimeout(existing);

    const timeout = setTimeout(() => {
      this.clearTyping(activityId, userId);
      onExpire();
    }, 3000);

    room.set(userId, timeout);
  }

  /** Clears the typing timeout. Returns true if there was something to clear (caller broadcasts). */
  clearTyping(activityId: string, userId: string): boolean {
    const room = this.typingMap.get(activityId);
    if (room?.has(userId)) {
      clearTimeout(room.get(userId));
      room.delete(userId);
      return true;
    }
    return false;
  }

  getTypingUsers(activityId: string): string[] {
    const room = this.typingMap.get(activityId);
    return room ? Array.from(room.keys()) : [];
  }

  // ─────────────────────────────── Messages ────────────────────────────────

  // Pages backwards 30 at a time using a `createdAt < before` cursor rather than
  // OFFSET, so paging stays correct even as new messages arrive mid-scroll.
  // Fetched newest-first (the indexed direction), then reversed for display.
  async fetchMessages(activityId: string, before?: string) {
    const messages = await this.prisma.message.findMany({
      where: {
        activityId,
        ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      },
      include: {
        user: { select: { username: true, avatarUrl: true } },
        reactions: { include: { user: { select: { username: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: MSG_PAGE_SIZE,
    });
    return messages.reverse(); // chronological order
  }

  async markRead(userId: string, activityId: string) {
    try {
      await this.prisma.messageReadStatus.upsert({
        where: { userId_activityId: { userId, activityId } },
        update: { lastReadAt: new Date() },
        create: { userId, activityId, lastReadAt: new Date() },
      });
    } catch (e) {
      this.logger.error(
        `Failed to mark read for user ${userId} in activity ${activityId}: ${(e as Error).message}`,
      );
    }
  }

  // Unread is derived, not stored: one lastReadAt per (user, activity) and the
  // count is whatever arrived after it, excluding the user's own messages. No
  // counter to increment means no counter to drift out of sync.
  async getUnreadCount(userId: string, activityId: string) {
    const readStatus = await this.prisma.messageReadStatus.findUnique({
      where: { userId_activityId: { userId, activityId } },
    });
    return this.prisma.message.count({
      where: {
        activityId,
        userId: { not: userId },
        createdAt: { gt: readStatus?.lastReadAt ?? new Date(0) },
      },
    });
  }

  async createMessage(input: SendMessageInput) {
    const { activityId, userId, content, mediaUrl, fileName, fileSize, type } = input;
    return this.prisma.message.create({
      data: {
        activityId,
        userId,
        content: type === 'TEXT' && content ? content.trim() : '',
        type,
        mediaUrl,
        fileName,
        fileSize,
      },
      include: {
        user: { select: { username: true, avatarUrl: true } },
        reactions: { include: { user: { select: { username: true } } } },
      },
    });
  }

  // Notifies approved members EXCEPT the sender and anyone currently online in
  // the room — those are already watching the conversation, so a notification
  // would be noise. Wrapped in try/catch: a failed notification must never break
  // message delivery, which has already succeeded by this point.
  async dispatchNewMessageNotifications(
    activityId: string,
    senderId: string,
    senderName: string,
    type: MessageType,
    content?: string,
    fileName?: string,
  ) {
    try {
      // Independent reads — run together instead of one round-trip after another.
      // getOnlineUsers is a single SMEMBERS, so checking membership below is a
      // Set lookup instead of one SISMEMBER round-trip per member.
      const [members, activity, onlineUsers] = await Promise.all([
        this.prisma.activityMember.findMany({
          where: { activityId, status: 'APPROVED', userId: { not: senderId } },
        }),
        this.prisma.activity.findUnique({
          where: { id: activityId },
          select: { title: true },
        }),
        this.getOnlineUsers(activityId),
      ]);
      const activityTitle = activity?.title || 'Group';
      const onlineSet = new Set(onlineUsers);

      let notificationBody = '';
      if (type === 'IMAGE') {
        notificationBody = `${senderName} sent an image`;
      } else if (type === 'FILE') {
        notificationBody = `${senderName} sent a file: ${fileName || 'Attachment'}`;
      } else {
        const textContent = content?.trim() || '';
        notificationBody = `${senderName}: ${textContent.substring(0, 60)}${textContent.length > 60 ? '...' : ''}`;
      }

      // Only DB-notify members who are NOT actively online in the room.
      // Fired concurrently — each is an independent insert + socket emit, so
      // there's no reason to notify one member at a time.
      const offlineMembers = members.filter((m) => !onlineSet.has(m.userId));
      await Promise.all(
        offlineMembers.map((member) =>
          this.notificationsService.create(
            member.userId,
            NotificationType.NEW_MESSAGE,
            `New message in ${activityTitle}`,
            notificationBody,
            'ACTIVITY',
            activityId,
          ),
        ),
      );
    } catch (err) {
      this.logger.error(
        `Failed to dispatch chat notifications: ${(err as Error).message}`,
      );
    }
  }

  // ─────────────────────────────── Reactions ───────────────────────────────

  isAllowedEmoji(emoji: string) {
    return ALLOWED_EMOJIS.includes(emoji);
  }

  // Toggle on the (message, user, emoji) unique key: reacting twice with the
  // same emoji removes it. Restricted to ALLOWED_EMOJIS upstream so clients
  // cannot store arbitrary strings. Returns the message's full reaction list so
  // the gateway can broadcast the new state rather than a delta.
  async toggleReaction(messageId: string, userId: string, emoji: string) {
    const existing = await this.prisma.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji } },
    });

    if (existing) {
      await this.prisma.messageReaction.delete({
        where: { messageId_userId_emoji: { messageId, userId, emoji } },
      });
    } else {
      await this.prisma.messageReaction.create({
        data: { messageId, userId, emoji },
      });
    }

    return this.prisma.messageReaction.findMany({
      where: { messageId },
      include: { user: { select: { username: true } } },
    });
  }
}
