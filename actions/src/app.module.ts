import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { PlacesModule } from './places/places.module';
import { TripsModule } from './trips/trips.module';
import { ActivitiesModule } from './activities/activities.module';
import { AiChatModule } from './ai-chat/ai-chat.module';
import { GroupChatModule } from './group-chat/group-chat.module';
import { AdminModule } from './admin/admin.module';
import { MediaModule } from './media/media.module';
import { NotificationsModule } from './notifications/notifications.module';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Global default: 60 requests/min per IP. Auth routes override this with
    // a much tighter limit (see AuthController) since login/OTP are the
    // realistic brute-force targets.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60000, limit: 60 }]),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    PlacesModule,
    TripsModule,
    ActivitiesModule,
    AiChatModule,
    GroupChatModule,
    AdminModule,
    MediaModule,
    NotificationsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
