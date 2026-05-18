import { Controller, Post, Body } from '@nestjs/common';
import { AiChatService } from './ai-chat.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { AiChatResponse } from './ai-chat.types';

@ApiTags('AI Chat')
@Controller('ai-chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post('message')
  @ApiOperation({ summary: 'Send a message to AI Assistant' })
  async sendMessage(
    @Body()
    body: {
      message: string;
      lat?: number;
      lng?: number;
      history?: { role: string; content: string }[];
      accumulated?: Record<string, unknown>; // accumulated trip params from previous turns
    },
  ): Promise<AiChatResponse & { accumulatedParams?: unknown }> {
    const { message, lat, lng, history, accumulated } = body;
    return this.aiChatService.getAiResponse(message, lat, lng, history, accumulated ?? {});
  }
}

