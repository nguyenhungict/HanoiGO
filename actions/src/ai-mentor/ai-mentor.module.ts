import { Module } from '@nestjs/common';
import { AiMentorController } from './ai-mentor.controller';
import { AiMentorService } from './ai-mentor.service';

@Module({
  controllers: [AiMentorController],
  providers: [AiMentorService]
})
export class AiMentorModule {}
