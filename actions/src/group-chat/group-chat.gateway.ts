import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

const ALLOWED_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
const MSG_PAGE_SIZE = 30;

interface SocketData {
  userId: string;
  username: string;
}

/** Map<activityId, Set<userId>> — ai đang online trong room nào */
const onlineMap = new Map<string, Set<string>>();
/** Map<activityId, Map<userId, timeout>> — typing debounce */
const typingMap = new Map<string, Map<string, NodeJS.Timeout>>();

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'group-chat',
})
export class GroupChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger('GroupChatGateway');

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // ──────────────────────────────── Connection ────────────────────────────────

  async handleConnection(client: Socket) {
    try {
      const auth = client.handshake.auth as { token?: string };
      const headers = client.handshake.headers as { authorization?: string };
      const token = auth.token || headers.authorization?.split(' ')[1];

      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{ sub: string; username: string }>(
        token,
      );
      // JWT uses `sub` for userId (standard claim)
      const data = client.data as SocketData;
      data.userId = payload.sub;
      data.username = payload.username;

      this.logger.log(`Connected: ${client.id} (${payload.username})`);
    } catch (e) {
      this.logger.error(`Auth failed: ${(e as Error).message}`);
      client.disconnect();
    }
    await Promise.resolve(); // satisfy require-await rule
  }

  handleDisconnect(client: Socket) {
    const data = client.data as SocketData;
    const { userId } = data;
    this.logger.log(`Disconnected: ${client.id}`);

    // Remove from all online rooms this socket was in
    for (const [activityId, users] of onlineMap.entries()) {
      if (users.has(userId)) {
        users.delete(userId);
        this._broadcastOnline(activityId);
        this._clearTyping(activityId, userId);
      }
    }
  }

  // ─────────────────────────────── Join Room ──────────────────────────────────

  @SubscribeMessage('join_activity')
  async handleJoinActivity(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { activityId: string },
  ) {
    const socketData = client.data as SocketData;
    const { userId, username } = socketData;
    const { activityId } = data;

    // Verify membership
    const member = await this.prisma.activityMember.findUnique({
      where: { activityId_userId: { activityId, userId } },
    });

    if (!member || member.status !== 'APPROVED') {
      client.emit('error', {
        message: 'You are not a member of this activity.',
      });
      return;
    }

    const room = `activity_${activityId}`;
    void client.join(room);

    // Online presence
    if (!onlineMap.has(activityId)) onlineMap.set(activityId, new Set());
    onlineMap.get(activityId)!.add(userId);
    this._broadcastOnline(activityId);

    // Message history (newest 30)
    const messages = await this._fetchMessages(activityId);
    client.emit('message_history', messages);

    this.logger.log(`${username} joined room ${room}`);
  }

  // ──────────────────────────────── Send Message ──────────────────────────────

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { activityId: string; content: string },
  ) {
    const socketData = client.data as SocketData;
    const { userId } = socketData;
    const { activityId, content } = data;

    if (!content?.trim()) return;

    // Stop typing when message sent
    this._clearTyping(activityId, userId);

    const message = await this.prisma.message.create({
      data: { activityId, userId, content: content.trim(), type: 'TEXT' },
      include: {
        user: { select: { username: true, avatarUrl: true } },
        reactions: {
          include: { user: { select: { username: true } } },
        },
      },
    });

    this.server.to(`activity_${activityId}`).emit('new_message', message);
  }

  // ──────────────────────────────── Load More ─────────────────────────────────

  @SubscribeMessage('load_more_messages')
  async handleLoadMore(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { activityId: string; before: string },
  ) {
    const { activityId, before } = data;
    const messages = await this._fetchMessages(activityId, before);
    client.emit('more_messages', messages);
  }

  // ──────────────────────────────── Typing ────────────────────────────────────

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { activityId: string },
  ) {
    const socketData = client.data as SocketData;
    const { userId } = socketData;
    const { activityId } = data;

    if (!typingMap.has(activityId)) typingMap.set(activityId, new Map());
    const room = typingMap.get(activityId)!;

    // Clear existing timeout for this user
    const existingTimeout = room.get(userId);
    if (existingTimeout) clearTimeout(existingTimeout);

    // Auto-stop typing after 3s of no new events
    const timeout = setTimeout(() => {
      this._clearTyping(activityId, userId);
    }, 3000);

    room.set(userId, timeout);
    this._broadcastTyping(activityId);
  }

  @SubscribeMessage('stop_typing')
  handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { activityId: string },
  ) {
    const socketData = client.data as SocketData;
    this._clearTyping(data.activityId, socketData.userId);
  }

  // ──────────────────────────────── Reactions ─────────────────────────────────

  @SubscribeMessage('react_message')
  async handleReact(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { messageId: string; activityId: string; emoji: string },
  ) {
    const socketData = client.data as SocketData;
    const { userId } = socketData;
    const { messageId, activityId, emoji } = data;

    if (!ALLOWED_EMOJIS.includes(emoji)) return;

    // Toggle: if exists delete, else create
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

    // Fetch fresh reactions for this message
    const reactions = await this.prisma.messageReaction.findMany({
      where: { messageId },
      include: { user: { select: { username: true } } },
    });

    this.server
      .to(`activity_${activityId}`)
      .emit('message_reacted', { messageId, reactions });
  }

  // ──────────────────────────────── Helpers ───────────────────────────────────

  private async _fetchMessages(activityId: string, before?: string) {
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
    return messages.reverse(); // return chronological order
  }

  private _broadcastOnline(activityId: string) {
    const users = Array.from(onlineMap.get(activityId) ?? []);
    this.server.to(`activity_${activityId}`).emit('online_users', users);
  }

  private _broadcastTyping(activityId: string) {
    const room = typingMap.get(activityId);
    const users = room ? Array.from(room.keys()) : [];
    this.server
      .to(`activity_${activityId}`)
      .emit('typing_users', { activityId, users });
  }

  private _clearTyping(activityId: string, userId: string) {
    const room = typingMap.get(activityId);
    if (room?.has(userId)) {
      clearTimeout(room.get(userId));
      room.delete(userId);
      this._broadcastTyping(activityId);
    }
  }
}
