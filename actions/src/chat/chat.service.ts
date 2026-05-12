import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
      // 1. Fetch ALL landmarks from DB
      const allPlaces = await this.prisma.place.findMany({
        select: {
          name: true,
          category: true,
          district: true,
          lat: true,
          lng: true,
          address: true,
          descriptionEn: true,
        },
      });

      // 2. Filter by proximity (Haversine) or fall back to first 20
      const NEARBY_RADIUS_KM = 3;
      let landmarks = allPlaces;
      let userLocationInfo: string;

      if (lat && lng) {
        const nearby = allPlaces
          .filter(l => l.lat != null && l.lng != null)
          .map(l => ({ ...l, distKm: haversineKm(lat, lng, l.lat!, l.lng!) }))
          .filter(l => l.distKm <= NEARBY_RADIUS_KM)
          .sort((a, b) => a.distKm - b.distKm)
          .slice(0, 10);

        landmarks = nearby.length > 0 ? nearby : allPlaces.slice(0, 20);

        userLocationInfo = nearby.length > 0
          ? `Người dùng đang ở tọa độ (${lat.toFixed(5)}, ${lng.toFixed(5)}). Đã tìm thấy **${nearby.length} địa điểm trong bán kính ${NEARBY_RADIUS_KM}km** — hãy ưu tiên gợi ý những nơi này và đề cập khoảng cách ước tính.`
          : `Người dùng ở tọa độ (${lat.toFixed(5)}, ${lng.toFixed(5)}) nhưng không có địa điểm nào trong ${NEARBY_RADIUS_KM}km. Gợi ý các địa điểm nổi bật nhất của Hà Nội.`;
      } else {
        landmarks = allPlaces.slice(0, 20);
        userLocationInfo = 'Không rõ vị trí hiện tại của người dùng.';
      }

      // 3. Format context
      const context = landmarks.map(l => {
        const dist = (l as any).distKm != null ? ` (~${((l as any).distKm as number).toFixed(2)}km)` : '';
        return `- ${l.name}${dist} (${l.category} tại ${l.district}, Đ/c: ${l.address || 'Hà Nội'}): ${l.descriptionEn || 'Một địa điểm thú vị để khám phá.'}`;
      }).join('\n');

      // 4. Init Gemini
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
