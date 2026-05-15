import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  private getGenAI() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) return null;
    return new GoogleGenerativeAI(apiKey);
  }

  async getAiResponse(message: string, lat?: number, lng?: number) {
    try {
      const genAI = this.getGenAI();
      if (!genAI) {
        return 'Xin lỗi, hiện tại tôi chưa được cấu hình API Key để trò chuyện. Vui lòng kiểm tra lại cấu hình hệ thống.';
      }
      // 1. Fetch ALL landmarks from DB
      const allPlaces = await this.prisma.place.findMany({
        select: {
          name: true,
          category: true,
          address: true,
          district: true,
          lat: true,
          lng: true,
        },
      });

      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const context = `
        Bạn là HanoiGO AI Assistant. Hãy trả lời thân thiện, hữu ích.
        Sử dụng tiếng Việt.
        Vị trí người dùng hiện tại: ${lat && lng ? `Lat: ${lat}, Lng: ${lng}` : 'Không rõ'}.
        Danh sách các địa danh có trong hệ thống HanoiGO:
        ${allPlaces.map((p) => `- ${p.name} (${p.category}) tại ${p.address || p.district}`).join('\n')}
        Nhiệm vụ:
        - Tư vấn địa điểm du lịch tại Hà Nội dựa trên danh sách trên.
        - Nếu người dùng hỏi địa điểm gần họ, hãy tính toán dựa trên tọa độ.
        - Trả lời ngắn gọn, súc tích, định dạng Markdown.
      `;

      const result = await model.generateContent([context, message]);
      const response = result.response;
      return response.text();
    } catch (error) {
      this.logger.error('Gemini Error:', error);
      return 'HanoiGO AI đang bận một chút, bạn thử lại sau nhé!';
    }
  }
}
