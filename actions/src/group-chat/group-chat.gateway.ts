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
import { JwtService } from '@nestjs/jwt';
import { GroupChatService, MessageType } from './group-chat.service';

interface SocketData {
  userId: string;
  username: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'group-chat',
})
export class GroupChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('GroupChatGateway');

  constructor(
    private jwtService: JwtService,
    private chatService: GroupChatService,
  ) { }

  // ──────────────────────────────── Connection ────────────────────────────────

  // Authenticates the socket before it can do anything: the JWT is verified from
  // the handshake and a failure disconnects immediately, so no unauthenticated
  // socket ever reaches a handler. The identity is cached on `client.data` and
  // every handler below reads the sender from there — never from the event
  // payload, which a client could forge.
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

  // A dropped socket sends no leave event, so presence must be swept out of
  // EVERY room the user was in, then each affected room re-broadcast — otherwise
  // they would linger as "online" forever.
  async handleDisconnect(client: Socket) {
    const data = client.data as SocketData;
    const { userId } = data;
    this.logger.log(`Disconnected: ${client.id}`);

    const affectedActivityIds =
      await this.chatService.removeOnlineEverywhere(userId);
    for (const activityId of affectedActivityIds) {
      await this._broadcastOnline(activityId);
      if (this.chatService.clearTyping(activityId, userId)) {
        this._broadcastTyping(activityId);
      }
    }
  }

  // ─────────────────────────────── Join Room ──────────────────────────────────

  // The authorisation gate for chat: one Socket.io room per activity
  // (`activity_<id>`), entered only after checking ActivityMember.status ===
  // APPROVED. A user who never joins the room simply never receives its
  // broadcasts, so this single check guards every event that follows.
  @SubscribeMessage('join_activity')
  async handleJoinActivity(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { activityId: string },
  ) {
    const { userId, username } = client.data as SocketData;
    const { activityId } = data;

    const isMember = await this.chatService.isApprovedMember(activityId, userId);
    if (!isMember) {
      client.emit('error', {
        message: 'You are not a member of this activity.',
      });
      return;
    }

    const room = `activity_${activityId}`;
    void client.join(room);

    // Message history (newest 30) and unread count
    const [messages, unreadCount] = await Promise.all([
      this.chatService.fetchMessages(activityId),
      this.chatService.getUnreadCount(userId, activityId),
    ]);

    client.emit('message_history', { messages, unreadCount });

    // Online presence
    await this.chatService.addOnline(activityId, userId);
    await this._broadcastOnline(activityId);

    this.logger.log(`${username} joined room ${room}`);
  }

  @SubscribeMessage('mark_read')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { activityId: string },
  ) {
    const { userId } = client.data as SocketData;
    await this.chatService.markRead(userId, data.activityId);
  }

  // ──────────────────────────────── Send Message ──────────────────────────────

  // Persist first, then broadcast to the room, then notify. Members currently
  // online in the room are skipped when dispatching notifications (see
  // dispatchNewMessageNotifications) — they are already looking at the message.
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      activityId: string;
      content?: string;
      mediaUrl?: string;
      fileName?: string;
      fileSize?: number;
      type: MessageType;
    },
  ) {
    const { userId, username } = client.data as SocketData;
    const { activityId, content, mediaUrl, fileName, fileSize } = data;
    const type = data.type || 'TEXT';

    if (type === 'TEXT' && !content?.trim()) return;
    if (type !== 'TEXT' && !mediaUrl) return;

    // Stop typing when message sent
    if (this.chatService.clearTyping(activityId, userId)) {
      this._broadcastTyping(activityId);
    }

    const message = await this.chatService.createMessage({
      activityId,
      userId,
      content,
      mediaUrl,
      fileName,
      fileSize,
      type,
    });

    this.server.to(`activity_${activityId}`).emit('new_message', message);

    // Update read status for the sender
    await this.chatService.markRead(userId, activityId);

    await this.chatService.dispatchNewMessageNotifications(
      activityId,
      userId,
      message.user?.username || username || 'Someone',
      type,
      content,
      fileName,
    );
  }

  // ──────────────────────────────── Load More ─────────────────────────────────

  @SubscribeMessage('load_more_messages')
  async handleLoadMore(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { activityId: string; before: string },
  ) {
    const messages = await this.chatService.fetchMessages(
      data.activityId,
      data.before,
    );
    client.emit('more_messages', messages);
  }

  // ──────────────────────────────── Typing ────────────────────────────────────

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { activityId: string },
  ) {
    const { userId } = client.data as SocketData;
    const { activityId } = data;

    this.chatService.setTyping(activityId, userId, () => {
      this._broadcastTyping(activityId);
    });
    this._broadcastTyping(activityId);
  }

  @SubscribeMessage('stop_typing')
  handleStopTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { activityId: string },
  ) {
    const { userId } = client.data as SocketData;
    if (this.chatService.clearTyping(data.activityId, userId)) {
      this._broadcastTyping(data.activityId);
    }
  }

  // ──────────────────────────────── Reactions ─────────────────────────────────

  @SubscribeMessage('react_message')
  async handleReact(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { messageId: string; activityId: string; emoji: string },
  ) {
    const { userId } = client.data as SocketData;
    const { messageId, activityId, emoji } = data;

    if (!this.chatService.isAllowedEmoji(emoji)) return;

    const reactions = await this.chatService.toggleReaction(
      messageId,
      userId,
      emoji,
    );

    this.server
      .to(`activity_${activityId}`)
      .emit('message_reacted', { messageId, reactions });
  }

  // ──────────────────────────────── Broadcast helpers ─────────────────────────

  private async _broadcastOnline(activityId: string) {
    const users = await this.chatService.getOnlineUsers(activityId);
    this.server.to(`activity_${activityId}`).emit('online_users', users);
  }

  private _broadcastTyping(activityId: string) {
    const users = this.chatService.getTypingUsers(activityId);
    this.server
      .to(`activity_${activityId}`)
      .emit('typing_users', { activityId, users });
  }
}
