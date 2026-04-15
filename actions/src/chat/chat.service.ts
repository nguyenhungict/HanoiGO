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
  ) {}

  private getGenAI() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    this.logger.log(`API Key present: ${!!apiKey} (Starts with: ${apiKey?.substring(0, 4)})`);
    if (!apiKey) return null;
    return new GoogleGenerativeAI(apiKey);
  }

  async getAiResponse(message: string, lat?: number, lng?: number) {
    try {
      const genAI = this.getGenAI();
      if (!genAI) {
        this.logger.warn('GEMINI_API_KEY missing in ConfigService');
        return "Xin lỗi, hiện tại tôi chưa được cấu hình API Key để trò chuyện. Vui lòng kiểm tra lại cấu hình hệ thống.";
      }

      this.logger.log('Fetching landmarks for chat context...');
      // 1. Phân tích từ khóa từ message để tìm kiếm chính xác hơn
      const keywords = message.split(' ').filter(w => w.length > 2).slice(0, 5);
      this.logger.log(`Searching landmarks for keywords: ${keywords.join(', ')}`);

      // 1. Fetch relevant landmarks (Ưu tiên những điểm khớp từ khóa)
      const landmarks = await this.prisma.place.findMany({
        where: keywords.length > 0 ? {
          OR: [
            ...keywords.map(k => ({ name: { contains: k, mode: 'insensitive' as const } })),
            ...keywords.map(k => ({ category: { contains: k, mode: 'insensitive' as const } }))
          ]
        } : {},
        select: {
          name: true,
          category: true,
          district: true,
          lat: true,
          lng: true,
          address: true,
          descriptionEn: true,
        },
        take: 20,
      });

      // Nếu không tìm thấy bằng từ khóa, lấy thêm 30 điểm bất kỳ để có context chung
      let finalLandmarks = landmarks;
      if (landmarks.length < 5) {
        const fallback = await this.prisma.place.findMany({
          select: {
            name: true,
            category: true,
            district: true,
            lat: true,
            lng: true,
            address: true,
            descriptionEn: true,
          },
          take: 30,
        });
        const existingNames = new Set(landmarks.map(l => l.name));
        finalLandmarks = [...landmarks, ...fallback.filter(f => !existingNames.has(f.name))].slice(0, 50);
      }
      this.logger.log(`Found ${finalLandmarks.length} relevant landmarks for context.`);

      // 2. Format context (Gửi kèm tọa độ để AI tự tính toán ngầm)
      const context = finalLandmarks.map(l => 
        `- ${l.name} [Tọa độ: ${l.lat}, ${l.lng}] (${l.category} tại ${l.district}, Đ/c: ${l.address || 'Hà Nội'}): ${l.descriptionEn || 'Địa điểm tham quan hấp dẫn.'}`
      ).join('\n');

      const userLocationInfo = lat && lng 
        ? `Người dùng đang ở: (${lat}, ${lng}).` 
        : "Không rõ vị trí người dùng.";

      // 3. Init Gemini
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `
        Bạn là "HanoiGO AI Assistant". Hãy trả lời người dùng theo phong cách chuyên nghiệp, thân thiện và ĐẸP MẮT.

        DỮ LIỆU ĐỊA ĐIỂM (Dùng tọa độ để tính khoảng cách nếu cần, nhưng KHÔNG ĐƯỢC in tọa độ ra câu trả lời):
        ${context}

        ${userLocationInfo}

        QUY TẮC ĐỊNH DẠNG:
        1. Sử dụng Emoji phù hợp ở đầu mỗi ý. 
        2. Tên địa điểm hãy bôi đậm (VD: **Hồ Gươm**).
        3. Nếu gợi ý danh sách, hãy dùng danh sách có dấu gạch đầu dòng rõ ràng.
        4. Phản hồi bằng tiếng Việt. Độ dài vừa phải, súc tích.
        5. Nếu có tọa độ người dùng, hãy ưu tiên liệt kê các điểm gần họ (dưới 2km) lên đầu.
        6. Kết thúc bằng một câu chúc hoặc gợi ý hành động tiếp theo.

        CÂU HỎI: "${message}"
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      this.logger.log('Gemini response received.');
      return response.text();
    } catch (error) {
      this.logger.error('Gemini/Chat Error Detail:', error);
      if (error?.status === 429 || error?.message?.includes('quota')) {
        return "Hiện tại tôi đang bận xử lý quá nhiều yêu cầu (Hit Limit API). Bạn vui lòng đợi một lát rồi thử lại nhé!";
      }
      if (error?.status === 503) {
        return "Máy chủ AI hiện đang bận do lượt truy cập cao (503 Service Unavailable). Bạn vui lòng thử lại sau vài giây nhé!";
      }
      return "Rất tiếc, đã có lỗi xảy ra khi tôi đang xử lý thông tin. Bạn hãy thử lại sau nhé!";
    }
  }
}
