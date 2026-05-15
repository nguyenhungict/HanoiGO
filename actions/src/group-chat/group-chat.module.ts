import { Module } from '@nestjs/common';
import { GroupChatGateway } from './group-chat.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET') || 'super-secret',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  providers: [GroupChatGateway],
  exports: [GroupChatGateway],
})
export class GroupChatModule {}
