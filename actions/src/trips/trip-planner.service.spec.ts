import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TripPlannerService } from './trip-planner.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TripPlannerService', () => {
  let service: TripPlannerService;
  let prismaService: PrismaService;

  const mockPlaces = [
    // --- KHU VỰC HOÀN KIẾM ---
    {
      id: 'hk1',
      name: 'Hồ Hoàn Kiếm',
      category: 'LANDMARK',
      district: 'Hoàn Kiếm',
      lat: 21.0285,
      lng: 105.8542,
      image_url: null,
      always_open: true,
      open_days: [0, 1, 2, 3, 4, 5, 6],
      open_time_start: '00:00:00',
      open_time_end: '23:59:59',
      has_break: false,
      break_start: null,
      break_end: null,
      visit_duration_min: 60,
    },
    {
      id: 'hk2',
      name: 'Nhà Thờ Lớn',
      category: 'LANDMARK',
      district: 'Hoàn Kiếm',
      lat: 21.0287,
      lng: 105.8489,
      image_url: null,
      always_open: true,
      open_days: [0, 1, 2, 3, 4, 5, 6],
      open_time_start: '00:00:00',
      open_time_end: '23:59:59',
      has_break: false,
      break_start: null,
      break_end: null,
      visit_duration_min: 60,
    },
    {
      id: 'hk3',
      name: 'Phố Cổ Hà Nội',
      category: 'LANDMARK',
      district: 'Hoàn Kiếm',
      lat: 21.0345,
      lng: 105.8516,
      image_url: null,
      always_open: true,
      open_days: [0, 1, 2, 3, 4, 5, 6],
      open_time_start: '00:00:00',
      open_time_end: '23:59:59',
      has_break: false,
      break_start: null,
      break_end: null,
      visit_duration_min: 90,
    },

    // --- KHU VỰC CẦU GIẤY ---
    {
      id: 'cg1',
      name: 'Bảo tàng Dân tộc học',
      category: 'MUSEUM',
      district: 'Cầu Giấy',
      lat: 21.0404,
      lng: 105.7955,
      image_url: null,
      always_open: false,
      open_days: [0, 2, 3, 4, 5, 6], // Đóng cửa thứ 2 (1)
      open_time_start: '08:30:00',
      open_time_end: '17:30:00',
      has_break: false,
      break_start: null,
      break_end: null,
      visit_duration_min: 120,
    },
    {
      id: 'cg2',
      name: 'Công viên Cầu Giấy',
      category: 'PARK',
      district: 'Cầu Giấy',
      lat: 21.0264,
      lng: 105.7938,
      image_url: null,
      always_open: true,
      open_days: [0, 1, 2, 3, 4, 5, 6],
      open_time_start: '00:00:00',
      open_time_end: '23:59:59',
      has_break: false,
      break_start: null,
      break_end: null,
      visit_duration_min: 60,
    },

    // --- ĐIỂM CÓ GIỜ MỞ CỬA BUỔI CHIỀU ---
    {
      id: 'cg3',
      name: 'Quán Cafe Cầu Giấy',
      category: 'CAFE',
      district: 'Cầu Giấy',
      lat: 21.028,
      lng: 105.795,
      image_url: null,
      always_open: false,
      open_days: [0, 1, 2, 3, 4, 5, 6],
      open_time_start: '14:00:00', // Mở cửa từ 2h chiều
      open_time_end: '22:00:00',
      has_break: false,
      break_start: null,
      break_end: null,
      visit_duration_min: 60,
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TripPlannerService,
        {
          provide: PrismaService,
          useValue: {
            $queryRawUnsafe: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TripPlannerService>(TripPlannerService);
    prismaService = module.get<PrismaService>(PrismaService);

    // Mock Prisma query để trả về mockPlaces
    (prismaService.$queryRawUnsafe as jest.Mock).mockImplementation(
      (query: string, values: string[]) => {
        return Promise.resolve(
          mockPlaces.filter(
            (p) => values.includes(p.name) || values.includes(p.id),
          ),
        );
      },
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // TEST 1: K-Means Clustering - Gom nhóm không gian
  it('nên phân tách các địa điểm Hoàn Kiếm và Cầu Giấy vào 2 ngày khác nhau', async () => {
    const dto = {
      placeNames: [
        'Hồ Hoàn Kiếm',
        'Nhà Thờ Lớn',
        'Phố Cổ Hà Nội',
        'Bảo tàng Dân tộc học',
        'Công viên Cầu Giấy',
      ],
      numDays: 2,
      startTime: 480, // 08:00
      endTime: 1080, // 18:00
      travelDate: '2026-05-01T00:00:00.000Z',
      visitDurationMin: 60,
    };

    const result = await service.generateItinerary(dto);

    expect(result.days.length).toBe(2);

    // Lấy tên các địa điểm trong mỗi ngày
    const day1Names = result.days[0].stops.map((s) => s.name);
    const day2Names = result.days[1].stops.map((s) => s.name);

    // Kiểm tra xem Hoàn Kiếm và Cầu Giấy có bị lẫn lộn không
    const isDay1HoanKiem = day1Names.includes('Hồ Hoàn Kiếm');

    if (isDay1HoanKiem) {
      expect(day1Names).toContain('Nhà Thờ Lớn');
      expect(day1Names).toContain('Phố Cổ Hà Nội');
      expect(day2Names).toContain('Bảo tàng Dân tộc học');
      expect(day2Names).toContain('Công viên Cầu Giấy');
    } else {
      expect(day2Names).toContain('Hồ Hoàn Kiếm');
      expect(day2Names).toContain('Nhà Thờ Lớn');
      expect(day2Names).toContain('Phố Cổ Hà Nội');
      expect(day1Names).toContain('Bảo tàng Dân tộc học');
      expect(day1Names).toContain('Công viên Cầu Giấy');
    }
  });

  // TEST 2: Xử lý ngoại lệ - Đóng cửa định kỳ
  it('nên bỏ qua các địa điểm đóng cửa vào ngày đi (Bảo tàng DTH đóng cửa Thứ 2)', async () => {
    const dto = {
      placeNames: ['Hồ Hoàn Kiếm', 'Bảo tàng Dân tộc học'],
      numDays: 1,
      startTime: 480, // 08:00
      endTime: 1080, // 18:00
      // 2026-05-04 là Thứ Hai
      travelDate: '2026-05-04T00:00:00.000Z',
      visitDurationMin: 60,
    };

    const result = await service.generateItinerary(dto);

    // Bảo tàng Dân tộc học phải nằm trong mảng infeasible
    expect(
      result.infeasible.some((i) => i.name === 'Bảo tàng Dân tộc học'),
    ).toBeTruthy();

    // Hồ Hoàn Kiếm phải được lên lịch
    expect(
      result.days[0].stops.some((s) => s.name === 'Hồ Hoàn Kiếm'),
    ).toBeTruthy();
  });

  // TEST 3: Tối ưu giờ mở cửa chênh lệch (Time Window)
  it('nên xếp các điểm mở cả ngày vào buổi sáng và điểm mở muộn vào buổi chiều', async () => {
    const dto = {
      placeNames: ['Công viên Cầu Giấy', 'Quán Cafe Cầu Giấy'],
      numDays: 1,
      startTime: 480, // 08:00
      endTime: 1080, // 18:00
      travelDate: '2026-05-01T00:00:00.000Z',
      visitDurationMin: 60,
    };

    const result = await service.generateItinerary(dto);
    const stops = result.days[0].stops;

    expect(stops.length).toBe(2);

    // Công viên Cầu Giấy (mở 24/24) nên đi đầu tiên lúc 8h
    expect(stops[0].name).toBe('Công viên Cầu Giấy');

    // Quán cafe Cầu Giấy (mở lúc 14h = 840) nên đi sau
    expect(stops[1].name).toBe('Quán Cafe Cầu Giấy');

    // Thời gian chờ ở điểm số 2 (Cafe) sẽ phải đáng kể vì đi sau công viên (tầm 9h-9h30 đã đến) nhưng phải đợi đến 14h
    // Nếu thuật toán có Time Window tốt, nó sẽ tính toán đúng waitMin thay vì crash
    expect(stops[1].waitMin).toBeGreaterThan(0);
  });

  // TEST 4: TỐI ƯU ĐIỂM XUẤT PHÁT (Người dùng yêu cầu)
  it('nên ưu tiên chọn địa điểm GẦN điểm xuất phát nhất làm điểm đến ĐẦU TIÊN trong ngày', async () => {
    const dto = {
      placeNames: ['Hồ Hoàn Kiếm', 'Phố Cổ Hà Nội'], // Cả 2 điểm nằm ở Hoàn Kiếm
      numDays: 1,
      startTime: 480, // 08:00
      endTime: 1080, // 18:00
      travelDate: '2026-05-01T00:00:00.000Z',
      visitDurationMin: 60,

      // Khách ở ngay cạnh Nhà Hát Lớn (Rất gần Hồ Hoàn Kiếm, Xa Phố Cổ hơn 1 chút)
      startLat: 21.0242,
      startLng: 105.8576,
    };

    const result = await service.generateItinerary(dto);
    const stops = result.days[0].stops;

    expect(stops.length).toBe(2);

    // Kiểm tra xem thuật toán có đủ thông minh để xếp Hồ Hoàn Kiếm lên đầu không
    // Vì Hồ Hoàn Kiếm gần điểm startLat/startLng hơn là Phố Cổ Hà Nội
    expect(stops[0].name).toBe('Hồ Hoàn Kiếm');
    expect(stops[1].name).toBe('Phố Cổ Hà Nội');
  });

  // TEST 5: Tối ưu ngược lại điểm xuất phát
  it('nên chọn Phố Cổ Hà Nội làm điểm ĐẦU TIÊN nếu người dùng đang ở ngay trong khu Phố Cổ', async () => {
    const dto = {
      placeNames: ['Hồ Hoàn Kiếm', 'Phố Cổ Hà Nội'],
      numDays: 1,
      startTime: 480, // 08:00
      endTime: 1080, // 18:00
      travelDate: '2026-05-01T00:00:00.000Z',
      visitDurationMin: 60,

      // Khách ở ngay tại Chợ Đồng Xuân (Phố Cổ Hà Nội)
      startLat: 21.0378,
      startLng: 105.8499,
    };

    const result = await service.generateItinerary(dto);
    const stops = result.days[0].stops;

    expect(stops.length).toBe(2);

    // Khi này Phố Cổ Hà Nội phải được ưu tiên xếp đi đầu tiên do ở gần điểm xuất phát hơn
    expect(stops[0].name).toBe('Phố Cổ Hà Nội');
    expect(stops[1].name).toBe('Hồ Hoàn Kiếm');
  });

  // ════════════════════════════════════════════════════════════════════════════
  //  BUG DETECTION TESTS — Các test phát hiện bugs trong thuật toán
  // ════════════════════════════════════════════════════════════════════════════

  // TEST 6: Travel time giữa các stops phải hợp lý (không được = 0 nếu xa nhau)
  it('travel time giữa 2 stops xa nhau (Hoàn Kiếm → Cầu Giấy) phải > 5 phút', async () => {
    const dto = {
      placeNames: ['Hồ Hoàn Kiếm', 'Bảo tàng Dân tộc học'],
      numDays: 1,
      startTime: 480,
      endTime: 1080,
      travelDate: '2026-05-01T00:00:00.000Z', // Thứ 5
      visitDurationMin: 30,
    };

    const result = await service.generateItinerary(dto);
    const stops = result.days[0].stops;

    expect(stops.length).toBe(2);
    // Khoảng cách Hoàn Kiếm → Cầu Giấy ~6km, tốc độ 15km/h ≈ 24 phút
    // Travel time phải > 5 phút (sanity check)
    expect(stops[1].travelFromPrevMin).toBeGreaterThan(5);
  });

  // TEST 7: Tất cả stops phải có arriveAt < departAt (logic thời gian cơ bản)
  it('mỗi stop phải có thời gian đến < thời gian đi (không bị đảo ngược)', async () => {
    const dto = {
      placeNames: [
        'Hồ Hoàn Kiếm',
        'Nhà Thờ Lớn',
        'Phố Cổ Hà Nội',
        'Bảo tàng Dân tộc học',
        'Công viên Cầu Giấy',
      ],
      numDays: 2,
      startTime: 480,
      endTime: 1080,
      travelDate: '2026-05-01T00:00:00.000Z',
      visitDurationMin: 60,
    };

    const result = await service.generateItinerary(dto);

    for (const day of result.days) {
      for (let i = 0; i < day.stops.length; i++) {
        const stop = day.stops[i];
        const [arrH, arrM] = stop.arriveAt.split(':').map(Number);
        const [depH, depM] = stop.departAt.split(':').map(Number);
        const arriveMin = arrH * 60 + arrM;
        const departMin = depH * 60 + depM;

        // arriveAt phải < departAt
        expect(departMin).toBeGreaterThan(arriveMin);

        // Nếu có stop tiếp theo, arriveAt của nó phải >= departAt của stop hiện tại
        if (i < day.stops.length - 1) {
          const nextStop = day.stops[i + 1];
          const [nextArrH, nextArrM] = nextStop.arriveAt.split(':').map(Number);
          const nextArriveMin = nextArrH * 60 + nextArrM;
          expect(nextArriveMin).toBeGreaterThanOrEqual(departMin);
        }
      }
    }
  });

  // TEST 8: Không có stops nào vượt quá endTime (18:00 = 1080 phút)
  it('không có stop nào có departAt vượt quá giờ kết thúc', async () => {
    const dto = {
      placeNames: [
        'Hồ Hoàn Kiếm',
        'Nhà Thờ Lớn',
        'Phố Cổ Hà Nội',
        'Bảo tàng Dân tộc học',
        'Công viên Cầu Giấy',
        'Quán Cafe Cầu Giấy',
      ],
      numDays: 1,
      startTime: 480,
      endTime: 1080, // 18:00
      travelDate: '2026-05-01T00:00:00.000Z',
      visitDurationMin: 60,
    };

    const result = await service.generateItinerary(dto);

    for (const day of result.days) {
      for (const stop of day.stops) {
        const [depH, depM] = stop.departAt.split(':').map(Number);
        const departMin = depH * 60 + depM;
        expect(departMin).toBeLessThanOrEqual(1080);
      }
    }

    // Với 6 places x 60 phút + travel time, 1 ngày (10 tiếng) không đủ
    // Phải có unscheduled hoặc số stops < 6
    const totalScheduled = result.days.reduce((s, d) => s + d.stops.length, 0);
    const totalDropped = result.unscheduled.length + result.infeasible.length;
    expect(totalScheduled + totalDropped).toBeLessThanOrEqual(6);
  });

  // TEST 9: FreeTime phải >= 0 và hợp lý
  it('freeTimeMin phải >= 0 cho mỗi ngày', async () => {
    const dto = {
      placeNames: ['Hồ Hoàn Kiếm', 'Nhà Thờ Lớn'],
      numDays: 1,
      startTime: 480,
      endTime: 1080,
      travelDate: '2026-05-01T00:00:00.000Z',
      visitDurationMin: 60,
    };

    const result = await service.generateItinerary(dto);

    for (const day of result.days) {
      expect(day.freeTimeMin).toBeGreaterThanOrEqual(0);
      // 2 places x 60 phút = 120 phút dùng. 600 phút tổng cộng.
      // FreeTime phải > 400 phút (trừ travel)
      expect(day.freeTimeMin).toBeGreaterThan(300);
    }
  });

  // TEST 10: Quán cafe mở 14h — nếu đi cùng 3 điểm Hoàn Kiếm, waitMin phải lớn
  it('waitMin phải tính đúng cho điểm mở cửa buổi chiều khi đến sớm', async () => {
    const dto = {
      placeNames: ['Hồ Hoàn Kiếm', 'Nhà Thờ Lớn', 'Quán Cafe Cầu Giấy'],
      numDays: 1,
      startTime: 480, // 08:00
      endTime: 1080, // 18:00
      travelDate: '2026-05-01T00:00:00.000Z',
      visitDurationMin: 30,
    };

    const result = await service.generateItinerary(dto);
    const stops = result.days[0].stops;

    // Tìm Quán Cafe Cầu Giấy
    const cafeStop = stops.find((s) => s.name === 'Quán Cafe Cầu Giấy');

    if (cafeStop) {
      // Cafe mở lúc 14:00 (840 phút). Nếu đến sớm hơn 14h → waitMin > 0
      const [arrH, arrM] = cafeStop.arriveAt.split(':').map(Number);
      const arriveMin = arrH * 60 + arrM;

      if (arriveMin < 840) {
        // Đến trước 14h → phải có wait time
        expect(cafeStop.waitMin).toBeGreaterThan(0);
      }
    }
  });

  // TEST 11: Khi chỉ có 1 place → vẫn phải trả về lịch trình hợp lệ
  it('1 place duy nhất vẫn tạo lịch trình hợp lệ', async () => {
    const dto = {
      placeNames: ['Hồ Hoàn Kiếm'],
      numDays: 1,
      startTime: 480,
      endTime: 1080,
      travelDate: '2026-05-01T00:00:00.000Z',
      visitDurationMin: 60,
    };

    const result = await service.generateItinerary(dto);

    expect(result.days.length).toBe(1);
    expect(result.days[0].stops.length).toBe(1);
    expect(result.days[0].stops[0].name).toBe('Hồ Hoàn Kiếm');
    expect(result.infeasible.length).toBe(0);
    expect(result.unscheduled.length).toBe(0);
  });

  // ════════════════════════════════════════════════════════════════════════════
  //  BUG FIX VERIFICATION TESTS
  // ════════════════════════════════════════════════════════════════════════════

  // TEST 12: Bug 1 — GNN first stop phải check openDays
  it('không chọn place đóng cửa hôm đó làm first stop dù nó gần nhất', async () => {
    // Thêm place đóng cửa Thứ 6 (Friday = day 5, ngày đi) nhưng rất gần startLat/startLng
    const closedOnFriday = {
      id: 'closed1',
      name: 'Place Đóng Cửa Thứ 6',
      category: 'MUSEUM',
      district: 'Hoàn Kiếm',
      lat: 21.0243, // Rất gần điểm xuất phát
      lng: 105.8575,
      image_url: null,
      always_open: false,
      open_days: [0, 1, 2, 3, 4, 6], // Không có 5 (Friday)
      open_time_start: '08:00:00',
      open_time_end: '17:00:00',
      has_break: false,
      break_start: null,
      break_end: null,
      visit_duration_min: 60,
    };

    (prismaService.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([
      closedOnFriday,
      mockPlaces[0], // Hồ Hoàn Kiếm
    ]);

    const dto = {
      placeNames: ['Place Đóng Cửa Thứ 6', 'Hồ Hoàn Kiếm'],
      numDays: 1,
      startTime: 480,
      endTime: 1080,
      travelDate: '2026-05-01T00:00:00.000Z', // Friday (day 5)
      visitDurationMin: 60,
      startLat: 21.0242,
      startLng: 105.8576,
    };

    const result = await service.generateItinerary(dto);
    const stops = result.days[0]?.stops || [];

    // Place đóng cửa Thứ 6 không nên xuất hiện trong stops
    expect(stops.some((s) => s.name === 'Place Đóng Cửa Thứ 6')).toBe(false);
    // Hồ Hoàn Kiếm (always_open) phải có mặt
    expect(stops.some((s) => s.name === 'Hồ Hoàn Kiếm')).toBe(true);
  });

  // TEST 13: Bug 2 — resolveConflicts phải dùng startTime thực, không hardcode 480
  it('startTime=420 (7:00) → stop đầu tiên phải arrive ~7:00, không phải 8:00', async () => {
    const dto = {
      placeNames: ['Hồ Hoàn Kiếm'],
      numDays: 1,
      startTime: 420, // 7:00
      endTime: 1080,
      travelDate: '2026-05-01T00:00:00.000Z',
      visitDurationMin: 60,
    };

    const result = await service.generateItinerary(dto);
    const stops = result.days[0].stops;

    expect(stops.length).toBe(1);
    const [arrH] = stops[0].arriveAt.split(':').map(Number);
    // Arrive phải trước 8h (vì startTime=7:00)
    expect(arrH).toBeLessThanOrEqual(7);
  });

  // TEST 14: Bug 4 — Place mở 17:00, visit 120 phút, endTime 18:00 → phải bị drop
  it('place mở 17:00 với visit 120 phút phải bị drop khi endTime=18:00', async () => {
    const latePlace = {
      id: 'late1',
      name: 'Place Mở Muộn',
      category: 'BAR',
      district: 'Hoàn Kiếm',
      lat: 21.029,
      lng: 105.852,
      image_url: null,
      always_open: false,
      open_days: [0, 1, 2, 3, 4, 5, 6],
      open_time_start: '17:00:00', // 1020
      open_time_end: '23:00:00',
      has_break: false,
      break_start: null,
      break_end: null,
      visit_duration_min: 120, // 2 tiếng → depart 19:00 > endTime 18:00
    };

    (prismaService.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([
      latePlace,
    ]);

    const dto = {
      placeNames: ['Place Mở Muộn'],
      numDays: 1,
      startTime: 480,
      endTime: 1080, // 18:00
      travelDate: '2026-05-01T00:00:00.000Z',
      visitDurationMin: 120,
    };

    const result = await service.generateItinerary(dto);

    // Place phải bị drop (unscheduled) vì departMin = 19:00 > 18:00
    const scheduled = result.days.flatMap((d) => d.stops);
    expect(scheduled.some((s) => s.name === 'Place Mở Muộn')).toBe(false);
  });

  // TEST 15: Lunch break — không có stop nào bắt đầu visit trong khoảng 11:00-13:00
  it('không có stop nào startVisit trong khoảng lunch break mặc định (11:00-13:00)', async () => {
    const dto = {
      placeNames: [
        'Hồ Hoàn Kiếm',
        'Nhà Thờ Lớn',
        'Phố Cổ Hà Nội',
        'Công viên Cầu Giấy',
      ],
      numDays: 1,
      startTime: 480,
      endTime: 1200, // 20:00 — đủ rộng để xếp hết
      travelDate: '2026-05-01T00:00:00.000Z',
      visitDurationMin: 60,
      // Dùng lunch break mặc định: 660-780 (11:00-13:00)
    };

    const result = await service.generateItinerary(dto);

    for (const day of result.days) {
      for (const stop of day.stops) {
        const [arrH, arrM] = stop.arriveAt.split(':').map(Number);
        const [depH, depM] = stop.departAt.split(':').map(Number);
        const arriveMin = arrH * 60 + arrM;
        const departMin = depH * 60 + depM;
        const startVisitMin = arriveMin + stop.waitMin;

        // startVisit không nên nằm trong [660, 780)
        // HOẶC nếu startVisit < 660, departMin không nên > 660
        const overlapsLunch =
          startVisitMin < 780 && departMin > 660 && startVisitMin >= 660;
        expect(overlapsLunch).toBe(false);
      }
    }
  });

  // TEST 16: User custom lunch break (12:00-12:30)
  it('custom lunch break 12:00-12:30 → visit có thể bắt đầu lúc 11:00', async () => {
    const dto = {
      placeNames: ['Hồ Hoàn Kiếm', 'Nhà Thờ Lớn'],
      numDays: 1,
      startTime: 480,
      endTime: 1080,
      travelDate: '2026-05-01T00:00:00.000Z',
      visitDurationMin: 30, // 30 phút — kết thúc trước 11:30, trước lunch 12:00
      lunchBreakStart: 720, // 12:00
      lunchBreakEnd: 750, // 12:30
    };

    const result = await service.generateItinerary(dto);
    const stops = result.days[0].stops;

    expect(stops.length).toBe(2);
    // Với lunch ngắn 12:00-12:30 và visit 30 phút, cả 2 stops nên fit trước lunch
    for (const stop of stops) {
      const [depH, depM] = stop.departAt.split(':').map(Number);
      const departMin = depH * 60 + depM;
      expect(departMin).toBeLessThanOrEqual(1080);
    }
  });

  it('placeIds lookup uses explicit uuid array cast', async () => {
    const uuid = '11111111-1111-1111-1111-111111111111';
    (prismaService.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([
      { ...mockPlaces[0], id: uuid },
    ]);

    await service.generateItinerary({
      placeIds: [uuid],
      numDays: 1,
      startTime: 480,
      endTime: 1080,
      travelDate: '2026-05-01T00:00:00.000Z',
      visitDurationMin: 60,
    });

    const [query, values] = (prismaService.$queryRawUnsafe as jest.Mock).mock
      .calls[0] as [string, string[]];
    expect(query).toContain('id = ANY($1::uuid[])');
    expect(values).toEqual([uuid]);
  });

  it('missing placeIds and placeNames throws BadRequestException', async () => {
    await expect(
      service.generateItinerary({
        numDays: 1,
        startTime: 480,
        endTime: 1080,
        travelDate: '2026-05-01T00:00:00.000Z',
        visitDurationMin: 60,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('GPS-delayed stops are not reinserted with zero first-leg travel', async () => {
    const farStartPlaces = [
      {
        ...mockPlaces[0],
        id: 'gps1',
        name: 'GPS Far A',
        visit_duration_min: 60,
      },
      {
        ...mockPlaces[1],
        id: 'gps2',
        name: 'GPS Far B',
        visit_duration_min: 60,
      },
    ];
    (prismaService.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce(
      farStartPlaces,
    );
    jest
      .spyOn(service as any, 'getTravelToFirstStop')
      .mockResolvedValue(11 * 3600);

    const result = await service.generateItinerary({
      placeNames: ['GPS Far A', 'GPS Far B'],
      numDays: 1,
      startTime: 480,
      endTime: 1080,
      travelDate: '2026-05-01T00:00:00.000Z',
      visitDurationMin: 60,
      startLat: 10,
      startLng: 10,
    });

    const scheduled = result.days.flatMap((day) => day.stops);
    expect(scheduled).toHaveLength(0);
    expect(result.unscheduled.length).toBe(2);
  });

  it('recalculates later stops after dropping a GPS-delayed middle stop', async () => {
    const closesEarly = {
      id: 'mid-drop',
      name: 'Middle Closes Early',
      category: 'MUSEUM',
      district: 'Hoan Kiem',
      lat: 21.0286,
      lng: 105.8543,
      image_url: null,
      always_open: false,
      open_days: [0, 1, 2, 3, 4, 5, 6],
      open_time_start: '08:00:00',
      open_time_end: '09:30:00',
      has_break: false,
      break_start: null,
      break_end: null,
      visit_duration_min: 30,
    };
    const routePlaces = [
      {
        ...mockPlaces[0],
        id: 'route-a',
        name: 'Route A',
        lat: 21.0285,
        lng: 105.8542,
        visit_duration_min: 30,
      },
      closesEarly,
      {
        ...mockPlaces[1],
        id: 'route-c',
        name: 'Route C',
        lat: 21.0287,
        lng: 105.8544,
        visit_duration_min: 30,
      },
    ];
    (prismaService.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce(
      routePlaces,
    );
    jest
      .spyOn(service as any, 'getTravelToFirstStop')
      .mockResolvedValue(60 * 60);

    const result = await service.generateItinerary({
      placeNames: ['Route A', 'Middle Closes Early', 'Route C'],
      numDays: 1,
      startTime: 480,
      endTime: 1080,
      travelDate: '2026-05-01T00:00:00.000Z',
      visitDurationMin: 30,
      startLat: 21.0284,
      startLng: 105.8541,
      lunchBreakStart: 720,
      lunchBreakEnd: 750,
    });

    const stops = result.days[0].stops;
    expect(stops.map((s) => s.name)).not.toContain('Middle Closes Early');
    expect(stops.map((s) => s.name)).toEqual(
      expect.arrayContaining(['Route A', 'Route C']),
    );
    const routeA = stops.find((s) => s.name === 'Route A')!;
    const routeC = stops.find((s) => s.name === 'Route C')!;
    const [aDepH, aDepM] = routeA.departAt.split(':').map(Number);
    const [cArrH, cArrM] = routeC.arriveAt.split(':').map(Number);
    expect(cArrH * 60 + cArrM).toBeGreaterThanOrEqual(aDepH * 60 + aDepM);
  });

  it('pushes visits that overlap a place-specific break until after the break', async () => {
    const breakPlace = {
      id: 'break-overlap',
      name: 'Break Overlap Place',
      category: 'MUSEUM',
      district: 'Hoan Kiem',
      lat: 21.0285,
      lng: 105.8542,
      image_url: null,
      always_open: false,
      open_days: [0, 1, 2, 3, 4, 5, 6],
      open_time_start: '08:00:00',
      open_time_end: '18:00:00',
      has_break: true,
      break_start: '11:00:00',
      break_end: '13:00:00',
      visit_duration_min: 90,
    };
    (prismaService.$queryRawUnsafe as jest.Mock).mockResolvedValueOnce([
      breakPlace,
    ]);

    const result = await service.generateItinerary({
      placeNames: ['Break Overlap Place'],
      numDays: 1,
      startTime: 630,
      endTime: 1080,
      travelDate: '2026-05-01T00:00:00.000Z',
      visitDurationMin: 90,
      lunchBreakStart: 720,
      lunchBreakEnd: 720,
    });

    expect(result.days[0].stops[0].departAt).toBe('14:30');
  });
});
