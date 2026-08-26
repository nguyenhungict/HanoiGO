import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger('RedisService');

  // Shared connection for app-level data (presence sets, etc). The Socket.io
  // pub/sub adapter in main.ts uses its own separate pub/sub clients, since a
  // client in subscriber mode can't run normal commands.
  readonly client: Redis;

  constructor() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    this.client = new Redis(url);
    this.client.on('error', (err) =>
      this.logger.error(`Redis connection error: ${err.message}`),
    );
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
