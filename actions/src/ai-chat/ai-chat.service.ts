import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TripPlannerService } from '../trips/trip-planner.service';
import { haversine } from '../trips/trip-planner-geo';
import type { AiChatResponse, PlacePin } from './ai-chat.types';
import type { GenerateItineraryDto } from '../trips/trip-planner.types';

/** Maximum number of conversation turns to include in prompt */
const MAX_HISTORY_TURNS = 8;

/**
 * All fields needed to fire a trip plan.
 * Extended with lunchBreak + visitDuration vs the old version.
 */
interface TripPlanParams {
  numDays: number | null;
  travelDate: string | null;       // "YYYY-MM-DD"
  startTime: number | null;        // 24h integer, e.g. 8
  endTime: number | null;          // 24h integer, e.g. 21
  lunchBreakStart: number | null;  // 24h integer, e.g. 12  ← NEW
  lunchBreakEnd: number | null;    // 24h integer, e.g. 13  ← NEW
  visitDuration: number | null;    // minutes per place, 15–120  ← NEW
  districts: string[];
  categories: string[];
}

/**
 * Single structured JSON the LLM always returns.
 * One prompt → one API call → done.
 */
interface GeminiUnifiedResponse {
  intent: 'nearby' | 'trip_plan' | 'trip_plan_collecting' | 'general';
  response: string;
  extractedParams: TripPlanParams;
}



// Helper: does the params object satisfy all required fields?
function hasAllRequired(p: Partial<TripPlanParams>): boolean {
  return (
    !!p.numDays &&
    !!p.travelDate &&
    Array.isArray(p.categories) && p.categories.length > 0
  );
}

// Helper: merge previously collected params with newly extracted ones (non-null wins)
function mergeParams(
  prev: Partial<TripPlanParams>,
  next: Partial<TripPlanParams>,
): TripPlanParams {
  return {
    numDays:         next.numDays         ?? prev.numDays         ?? null,
    travelDate:      next.travelDate      ?? prev.travelDate      ?? null,
    startTime:       next.startTime       ?? prev.startTime       ?? null,
    endTime:         next.endTime         ?? prev.endTime         ?? null,
    lunchBreakStart: next.lunchBreakStart ?? prev.lunchBreakStart ?? null,
    lunchBreakEnd:   next.lunchBreakEnd   ?? prev.lunchBreakEnd   ?? null,
    visitDuration:   next.visitDuration   ?? prev.visitDuration   ?? null,
    districts:       next.districts?.length ? next.districts : (prev.districts ?? []),
    categories:      next.categories?.length ? next.categories : (prev.categories ?? []),
  };
}

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private tripPlannerService: TripPlannerService,
  ) {}

  // ── Gemini Client ──────────────────────────────────────────────────────────

  private getModel() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) throw new Error('GEMINI_API_KEY not configured');
    return new GoogleGenerativeAI(apiKey).getGenerativeModel({
      model: 'gemini-2.5-flash',
    });
  }

  private async callGemini(prompt: string): Promise<GeminiUnifiedResponse> {
    const raw = await this.getModel().generateContent(prompt);
    const text = raw.response.text().replace(/```json|```/g, '').trim();
    return JSON.parse(text) as GeminiUnifiedResponse;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private trimHistory(history?: { role: string; content: string }[]): string {
    if (!history?.length) return '';
    const recent = history.slice(-MAX_HISTORY_TURNS);
    return (
      `\nRecent conversation (last ${recent.length} messages):\n` +
      recent.map(m => `${m.role}: ${m.content}`).join('\n') +
      '\n'
    );
  }

  /**
   * Scan conversation history and re-extract any TripPlanParams that were
   * already collected in previous turns. This prevents asking the user again
   * for something they already answered.
   *
   * Strategy: look for a previous assistant message that contained a JSON
   * extractedParams block. We piggyback on the fact that we store the last
   * accumulated params in the history via a hidden JSON comment injected by
   * the client, OR we simply re-run a cheap extraction pass on history.
   *
   * For simplicity, we pass the accumulated state as part of the prompt so
   * the LLM can see what it already knows — no extra API call needed.
   */
  private buildAccumulatedParamsSummary(
    history?: { role: string; content: string }[],
  ): string {
    // The client is responsible for passing `accumulatedParams` in the history
    // as a system-style message. Here we just format it for the prompt.
    // If you prefer server-side accumulation, store it in a session/cache.
    return ''; // see note in buildMegaPrompt
  }

  // ── Core: Single Mega Prompt ───────────────────────────────────────────────

  /**
   * One prompt handles ALL intents. Key design decisions:
   * 1. We pass `accumulatedParams` from previous turns so the LLM knows what
   *    it already has and only asks for what is still missing.
   * 2. The LLM is instructed to ask for ALL missing fields in ONE message,
   *    never one by one.
   * 3. extractedParams is ALWAYS present in the response (nulls for unknowns).
   */
  private buildMegaPrompt(
    message: string,
    historyText: string,
    context: {
      nearbyList?: string;
      today: string;
      accumulated: Partial<TripPlanParams>; // params gathered so far
    },
  ): string {
    const nearbySection = context.nearbyList
      ? `\nNearby places (pre-sorted by distance):\n${context.nearbyList}\n`
      : '';

    // Summarise what we already know so the LLM doesn't ask again
    const known = context.accumulated;
    const knownLines: string[] = [];
    if (known.numDays)         knownLines.push(`- Số ngày: ${known.numDays}`);
    if (known.travelDate)      knownLines.push(`- Ngày đi: ${known.travelDate}`);
    if (known.startTime)       knownLines.push(`- Giờ bắt đầu: ${known.startTime}h`);
    if (known.endTime)         knownLines.push(`- Giờ kết thúc: ${known.endTime}h`);
    if (known.lunchBreakStart) knownLines.push(`- Nghỉ trưa: ${known.lunchBreakStart}h–${known.lunchBreakEnd ?? known.lunchBreakStart + 1}h`);
    if (known.visitDuration)   knownLines.push(`- Thời gian mỗi điểm: ${known.visitDuration} phút`);
    if (known.categories?.length) knownLines.push(`- Loại hình: ${known.categories.join(', ')}`);
    if (known.districts?.length)  knownLines.push(`- Quận/huyện: ${known.districts.join(', ')}`);

    const alreadyKnownSection = knownLines.length
      ? `\nThông tin đã thu thập được từ hội thoại trước:\n${knownLines.join('\n')}\n`
      : '';

    return `
You are HanoiGO AI, a trip planning assistant for Hanoi, Vietnam.
Today: ${context.today}.
${historyText}${alreadyKnownSection}${nearbySection}
User message: "${message}"

TASK: Analyze the user message + full conversation, then return EXACTLY this JSON (no other text):
{
  "intent": "<nearby | trip_plan | trip_plan_collecting | general>",
  "response": "<Vietnamese Markdown reply, friendly, emojis ok>",
  "extractedParams": {
    "numDays":         <integer | null>,
    "travelDate":      <"YYYY-MM-DD" | null>,
    "startTime":       <24h integer | null>,
    "endTime":         <24h integer | null>,
    "lunchBreakStart": <24h integer | null>,
    "lunchBreakEnd":   <24h integer | null>,
    "visitDuration":   <minutes integer 15-120 | null>,
    "districts":       <string[] | []>,
    "categories":      <string[] from EXACTLY these values: ["Heritage & History","Arts & Culture","Sightseeing","Eat & Shop","Nature & Outdoors","Spiritual"] | []>
  }
}

────────────────────────────────────────────
INTENT RULES
────────────────────────────────────────────
"nearby"
  → User asks for places near their current location.

"trip_plan"
  → User wants an itinerary AND all THREE required fields are now known
    (combining "already collected" above + what user just said):
    numDays, travelDate, categories (non-empty).
  → In this case, set response to a brief wait message, e.g.:
    "Đang lên lịch trình cho bạn... ⏳ Chờ mình một chút nhé!"

"trip_plan_collecting"
  → User wants a trip BUT at least one required field is still unknown.
  → CRITICAL: Ask for ALL missing required fields in ONE SINGLE message.
    Format as a numbered or bulleted list. Tell the user to answer everything at once.
    Missing fields to ask about (only ask what is truly missing):
      • numDays    → "Bạn muốn đi bao nhiêu ngày?"
      • travelDate → "Bạn dự kiến đi vào ngày nào?"
      • categories → "Bạn thích trải nghiệm loại hình nào?
                      (Heritage & History / Arts & Culture / Sightseeing / Eat & Shop /
                       Nature & Outdoors / Spiritual)"
    OPTIONAL fields — ask only if the user hasn't mentioned them AND it feels
    natural to ask in one go (don't spam):
      • startTime / endTime  → "Bạn muốn bắt đầu lúc mấy giờ và kết thúc lúc mấy giờ?"
      • lunchBreakStart/End  → "Bạn có muốn nghỉ trưa không? Nếu có, từ mấy giờ đến mấy giờ?"
      • visitDuration        → "Bạn muốn dành bao lâu cho mỗi địa điểm? (15–120 phút)"
    If user says "no preference" / "tùy" for categories → fill with
    ["Heritage & History","Sightseeing"].
    NEVER ask one field at a time across multiple turns. One message = all missing.

"general"
  → Any other question about Hanoi / HanoiGO.

────────────────────────────────────────────
EXTRACTION RULES
────────────────────────────────────────────
- Merge all info from conversation history AND current message.
- Relative dates: "ngày mai" = ${context.today} + 1 day (resolve to YYYY-MM-DD).
- If user gives a time range like "8am to 9pm" → startTime=8, endTime=21.
- If user mentions "nghỉ trưa 12-1h" → lunchBreakStart=12, lunchBreakEnd=13.
- Always include extractedParams even when all values are null/[].

JSON ONLY — no markdown fences, no extra text outside the JSON object.
`.trim();
  }

  // ── Nearby Intent ──────────────────────────────────────────────────────────

  private async resolveNearbyContext(
    lat: number,
    lng: number,
  ): Promise<{ list: string; pins: PlacePin[] }> {
    const allPlaces = await this.prisma.place.findMany({
      select: {
        id: true, name: true, category: true,
        address: true, district: true, lat: true, lng: true,
      },
    });

    const sorted = allPlaces
      .filter(p => p.lat != null && p.lng != null)
      .map(p => ({ ...p, distanceKm: haversine(lat, lng, p.lat!, p.lng!) }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 12);

    const list = sorted
      .map(
        (p, i) =>
          `${i + 1}. ${p.name} (${p.category}) ${p.distanceKm.toFixed(2)}km - ${p.address || p.district}`,
      )
      .join('\n');

    const pins: PlacePin[] = sorted.slice(0, 8).map(p => ({
      id: p.id,
      name: p.name,
      lat: p.lat!,
      lng: p.lng!,
      category: p.category,
      address: p.address || p.district || '',
      distanceKm: p.distanceKm,
    }));

    return { list, pins };
  }

  // ── Trip Plan Execution ────────────────────────────────────────────────────

  private async executeTripPlan(
    params: TripPlanParams,
    lat?: number,
    lng?: number,
  ): Promise<AiChatResponse> {
    const numDays        = params.numDays        ?? 1;
    const startMin       = (params.startTime       ?? 8)  * 60;
    const endMin         = (params.endTime         ?? 21) * 60;
    const visitDuration  =  params.visitDuration   ?? 60;

    // Build lunch break windows to pass to planner (if provided)
    const lunchBreakWindows =
      params.lunchBreakStart != null
        ? [
            {
              start: params.lunchBreakStart * 60,
              end:   (params.lunchBreakEnd ?? params.lunchBreakStart + 1) * 60,
            },
          ]
        : undefined;

    const whereClause: Record<string, unknown> = {};
    if (params.categories?.length) whereClause['category']  = { in: params.categories };
    if (params.districts?.length)  whereClause['district']  = { in: params.districts };

    const matchedPlaces = await this.prisma.place.findMany({
      where: whereClause,
      select: { id: true, name: true },
      take: 40,
    });

    if (matchedPlaces.length === 0) {
      return {
        response:
          'Mình không tìm thấy địa điểm phù hợp trong hệ thống. ' +
          'Bạn thử mô tả lại sở thích hoặc khu vực muốn ghé thăm nhé! 🗺️',
        intent: 'trip_plan_collecting',
      };
    }

    const dto: GenerateItineraryDto = {
      placeIds:         matchedPlaces.map(p => p.id),
      numDays,
      startTime:        startMin,
      endTime:          endMin,
      travelDate:       params.travelDate ?? new Date().toISOString().split('T')[0],
      visitDurationMin: visitDuration,
      startLat:         lat,
      startLng:         lng,
      // Pass lunch break if your GenerateItineraryDto supports it:
      // lunchBreaks: lunchBreakWindows,
    };

    const itinerary = await this.tripPlannerService.generateItinerary(dto);

    const daySummaries = itinerary.days
      .map(
        d =>
          `📅 **Ngày ${d.dayNumber}** (${d.dayLabel}): ` +
          (d.stops.map(s => s.name).join(' → ') || 'Chưa có điểm dừng'),
      )
      .join('\n');

    const response = [
      `🎉 Lịch trình **${numDays} ngày** của bạn đã sẵn sàng!`,
      '',
      daySummaries,
      '',
      '_Cuộn xuống để xem chi tiết từng ngày nhé!_ 😊',
    ].join('\n');

    return { response, intent: 'trip_plan', itinerary };
  }

  // ── Main Entry Point ───────────────────────────────────────────────────────

  /**
   * @param message       Current user message
   * @param lat           User latitude (optional)
   * @param lng           User longitude (optional)
   * @param history       Previous chat turns
   * @param accumulated   Params collected in earlier turns (client must persist & pass back)
   */
  async getAiResponse(
    message: string,
    lat?: number,
    lng?: number,
    history?: { role: string; content: string }[],
    accumulated: Partial<TripPlanParams> = {},  // ← NEW: pass accumulated state from client
  ): Promise<AiChatResponse & { accumulatedParams?: TripPlanParams }> {
    try {
      const today       = new Date().toISOString().split('T')[0];
      const historyText = this.trimHistory(history);

      // Pre-fetch nearby only when likely needed
      const likelyNearby = /gần|nearby|xung quanh|quanh đây|near me/i.test(message);
      let nearbyList: string | undefined;
      let nearbyPins: PlacePin[] = [];

      if (likelyNearby && lat && lng) {
        const ctx = await this.resolveNearbyContext(lat, lng);
        nearbyList = ctx.list;
        nearbyPins = ctx.pins;
      }

      // ── Single Gemini API Call ─────────────────────────────────────────────
      const prompt  = this.buildMegaPrompt(message, historyText, {
        nearbyList,
        today,
        accumulated,
      });
      const gemini  = await this.callGemini(prompt);
      // ──────────────────────────────────────────────────────────────────────

      this.logger.log(`Intent: "${gemini.intent}" | message: "${message}"`);

      // Merge newly extracted params with what we already had
      const merged = mergeParams(accumulated, gemini.extractedParams ?? {});

      switch (gemini.intent) {
        // ── Nearby ──────────────────────────────────────────────────────────
        case 'nearby': {
          if (!nearbyList && lat && lng) {
            const ctx  = await this.resolveNearbyContext(lat, lng);
            nearbyPins = ctx.pins;
          }
          if (!lat || !lng) {
            return {
              response:
                'Để tìm địa điểm gần bạn, mình cần biết vị trí của bạn. ' +
                'Bạn hãy cho phép ứng dụng truy cập vị trí nhé! 📍',
              intent: 'nearby',
            };
          }
          return { response: gemini.response, intent: 'nearby', places: nearbyPins };
        }

        // ── Trip Plan ────────────────────────────────────────────────────────
        case 'trip_plan': {
          // Double-check: LLM may label intent=trip_plan prematurely
          if (!hasAllRequired(merged)) {
            this.logger.warn('LLM said trip_plan but params incomplete — downgrading to collecting');
            return {
              response: gemini.response,
              intent:   'trip_plan_collecting',
              accumulatedParams: merged,
            };
          }
          // Execute — no extra Gemini call
          const result = await this.executeTripPlan(merged, lat, lng);
          return { ...result, accumulatedParams: merged };
        }

        // ── Collecting ───────────────────────────────────────────────────────
        case 'trip_plan_collecting':
          return {
            response: gemini.response,
            intent:   'trip_plan_collecting',
            accumulatedParams: merged,  // client stores this and sends it back next turn
          };

        // ── General ──────────────────────────────────────────────────────────
        default:
          return { response: gemini.response, intent: 'general' };
      }
    } catch (error) {
      this.logger.error('AI Chat Error:', error);
      const is429 = (error as { status?: number })?.status === 429;
      return {
        response: is429
          ? 'HanoiGO AI đang được nhiều người dùng cùng lúc, bạn vui lòng thử lại sau ít giây nhé! ⏳'
          : 'HanoiGO AI đang bận một chút, bạn thử lại sau nhé! 🙏',
        intent: 'general',
      };
    }
  }
}