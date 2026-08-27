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
    this.client = new Redis(url, {
      // Without this, a failed connection attempt on a dual-stack host (IPv6
      // ::1 AND IPv4 127.0.0.1 both refused, e.g. no Redis reachable at all)
      // surfaces as an AggregateError that bypasses ioredis's normal 'error'
      // event and crashes the whole process — exactly what took down the
      // Render deploy, which has no Redis provisioned. Forcing IPv4-only
      // keeps every connection failure on the single-error path below.
      family: 4,
      // Cap retries instead of ioredis's default infinite backoff so the
      // client gives up cleanly (still auto-reconnects later) rather than
      // spamming reconnect attempts forever when Redis is simply absent.
      retryStrategy: (times) => Math.min(times * 1000, 30000),
    });
    this.client.on('error', (err) =>
      this.logger.error(`Redis connection error: ${err.message}`),
    );
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}
