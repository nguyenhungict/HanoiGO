import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

// Without this, `server.to(room).emit(...)` only reaches sockets connected to
// the SAME process — fine for one instance, silently drops messages to
// everyone connected to a different instance once the app scales
// horizontally. The Redis adapter republishes emits over pub/sub so every
// instance forwards to its own local sockets.
export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger('RedisIoAdapter');
  private adapterConstructor: ReturnType<typeof createAdapter>;

  constructor(app: INestApplicationContext) {
    super(app);
  }

  async connectToRedis(): Promise<boolean> {
    try {
      const url = process.env.REDIS_URL || 'redis://localhost:6379';
      const pubClient = new Redis(url, {
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        lazyConnect: true,
        family: 4,
      });
      const subClient = pubClient.duplicate();

      await Promise.all([pubClient.connect(), subClient.connect()]);

      pubClient.on('error', (err) =>
        this.logger.error(`Redis pub client error: ${err.message}`),
      );
      subClient.on('error', (err) =>
        this.logger.error(`Redis sub client error: ${err.message}`),
      );

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log('Socket.io Redis adapter connected');
      return true;
    } catch (err) {
      this.logger.warn(
        `Redis connection failed (${(err as Error).message}). Falling back to in-memory Socket.io adapter.`,
      );
      return false;
    }
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
