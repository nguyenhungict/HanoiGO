import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService
  ) { }

  private getGenAI() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) return null;
    return new GoogleGenerativeAI(apiKey);
  }

  async getAiResponse(message: string, lat?: number, lng?: number) {
    try {
      const genAI = this.getGenAI();
      if (!genAI) {
        return "Xin lỗi, hiện tại tôi chưa được cấu hình API Key để trò chuyện. Vui lòng kiểm tra lại cấu hình hệ thống.";
      }
      // 1. Fetch relevant landmarks for context (Corrected fields based on schema)
      const landmarks = await this.prisma.place.findMany({
        select: {
          name: true,
          category: true,
          district: true,
          lat: true,
          lng: true,
          address: true,
          descriptionEn: true,
        },
        take: 30, // Tăng nhẹ hiệu năng bằng cách lấy ít hơn một chút
      });

      // 2. Format context
      const context = landmarks.map(l =>
        `- ${l.name} (${l.category} tại ${l.district}, Đ/c: ${l.address || 'Hà Nội'}): ${l.descriptionEn || 'Một địa điểm thú vị để khám phá.'}`
      ).join('\n');

      const userLocationInfo = lat && lng
        ? `Người dùng hiện đang ở tọa độ (${lat}, ${lng}). Hãy ưu tiên gợi ý các điểm gần tọa độ này nếu họ hỏi về địa điểm gần đây.`
        : "Không rõ vị trí hiện tại của người dùng.";

      // 3. Init Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
        Bạn là "HanoiGO AI Assistant", một hướng dẫn viên du lịch ảo thông minh và thân thiện dành riêng cho du khách khám phá Hà Nội.
        
        Dưới đây là danh sách các địa điểm nổi bật tại Hà Nội:
        ${context}

        ${userLocationInfo}

        YÊU CẦU:
        1. Trả lời bằng tiếng Việt, giọng văn trẻ trung, nhiệt tình, chuyên nghiệp.
        2. Nếu người dùng hỏi về địa điểm gần họ, hãy sử dụng tọa độ của họ (nếu có) để gợi ý các điểm phù hợp nhất từ danh sách.
        3. Nếu người dùng hỏi về sở thích (lịch sử, cảnh đẹp, ẩm thực...), hãy lọc trong danh sách trên để đưa ra gợi ý tốt nhất.
        4. Trả lời ngắn gọn, súc tích (dưới 200 từ).
        5. Nếu không có thông tin trong danh sách, hãy trả lời dựa trên kiến thức chung về Hà Nội nhưng ưu tiên các điểm có trong hệ thống.

        CÂU HỎI CỦA NGƯỜI DÙNG: "${message}"
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      this.logger.error('Gemini/Chat Error Detail:', error);
      if (error?.status === 429 || error?.message?.includes('quota')) {
        return "Hiện tại tôi đang bận xử lý quá nhiều yêu cầu (Hit Limit API). Bạn vui lòng đợi một lát rồi thử lại nhé!";
      }
      return "Rất tiếc, đã có lỗi xảy ra khi tôi đang xử lý thông tin. Bạn hãy thử lại sau nhé!";
    }
  }
}
