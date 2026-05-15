import { Controller, Post, Body } from '@nestjs/common';
import { AiChatService } from './ai-chat.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('AI Chat')
@Controller('ai-chat')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}

  @Post('message')
  @ApiOperation({ summary: 'Gửi tin nhắn cho AI Assistant' })
  async sendMessage(
    @Body() body: { message: string; lat?: number; lng?: number },
  ) {
    const { message, lat, lng } = body;
    const response = await this.aiChatService.getAiResponse(message, lat, lng);
    return { response };
  }
}
