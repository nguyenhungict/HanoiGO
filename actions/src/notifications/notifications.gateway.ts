import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface SocketData {
  userId: string;
  username: string;
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  // Map<userId, Set<socketId>> — supporting multiple sessions per user
  private readonly activeClients = new Map<string, Set<string>>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const auth = client.handshake.auth as { token?: string };
      const headers = client.handshake.headers as { authorization?: string };
      const token = auth.token || headers.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(`Connection rejected: No token provided (${client.id})`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify<{ sub: string; username: string }>(
        token,
      );
      const userId = payload.sub;
      const username = payload.username;

      const data = client.data as SocketData;
      data.userId = userId;
      data.username = username;

      if (!this.activeClients.has(userId)) {
        this.activeClients.set(userId, new Set());
      }
      this.activeClients.get(userId)!.add(client.id);

      this.logger.log(`User connected: ${username} (${userId}) | socketId: ${client.id}`);
    } catch (e) {
      this.logger.error(`Auth failed for client ${client.id}: ${(e as Error).message}`);
      client.disconnect();
    }
    await Promise.resolve();
  }

  handleDisconnect(client: Socket) {
    const data = client.data as SocketData;
    const { userId } = data;

    if (userId && this.activeClients.has(userId)) {
      const sockets = this.activeClients.get(userId)!;
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.activeClients.delete(userId);
      }
      this.logger.log(`User disconnected: socketId ${client.id}`);
    }
  }

  /**
   * Pushes a real-time event to all active sockets of a specific user.
   */
  sendToUser(userId: string, event: string, payload: any) {
    const socketIds = this.activeClients.get(userId);
    if (socketIds && socketIds.size > 0) {
      this.logger.log(`Pushing event ${event} to user ${userId} across ${socketIds.size} sockets`);
      for (const socketId of socketIds) {
        this.server.to(socketId).emit(event, payload);
      }
      return true;
    }
    this.logger.log(`User ${userId} is offline, real-time push skipped`);
    return false;
  }
}
