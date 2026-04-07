import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { PlacesModule } from './places/places.module';
import { TripsModule } from './trips/trips.module';
import { ActivitiesModule } from './activities/activities.module';
import { ChatModule } from './chat/chat.module';
import { AiMentorModule } from './ai-mentor/ai-mentor.module';
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
    ChatModule,
    AiMentorModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
