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

  async connectToRedis(): Promise<void> {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    const pubClient = new Redis(url);
    const subClient = pubClient.duplicate();

    await Promise.all([
      new Promise<void>((resolve, reject) => {
        pubClient.once('ready', resolve);
        pubClient.once('error', reject);
      }),
      new Promise<void>((resolve, reject) => {
        subClient.once('ready', resolve);
        subClient.once('error', reject);
      }),
    ]);

    pubClient.on('error', (err) =>
      this.logger.error(`Redis pub client error: ${err.message}`),
    );
    subClient.on('error', (err) =>
      this.logger.error(`Redis sub client error: ${err.message}`),
    );

    this.adapterConstructor = createAdapter(pubClient, subClient);
    this.logger.log('Socket.io Redis adapter connected');
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
