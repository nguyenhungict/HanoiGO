import { Module } from '@nestjs/common';
import { GroupChatGateway } from './group-chat.gateway';
import { GroupChatService } from './group-chat.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RedisModule } from '../redis/redis.module';
import { requireEnv } from '../common/env.utils';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    NotificationsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({
        secret: requireEnv('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [GroupChatGateway, GroupChatService],
  exports: [GroupChatGateway],
})
export class GroupChatModule {}
