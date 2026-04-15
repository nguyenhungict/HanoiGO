import { Controller, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('message')
  @ApiOperation({ summary: 'Gửi tin nhắn cho AI Assistant' })
  async sendMessage(
    @Body() body: { message: string; lat?: number; lng?: number }
  ) {
    const { message, lat, lng } = body;
    const response = await this.chatService.getAiResponse(message, lat, lng);
    return { response };
  }
}
