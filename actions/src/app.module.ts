import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
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
    PrismaModule,
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
  providers: [],
})
export class AppModule {}
