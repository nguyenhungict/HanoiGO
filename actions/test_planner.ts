import { PrismaClient } from '@prisma/client';
import { TripPlannerService } from './src/trips/trip-planner.service';

const prisma = new PrismaClient();

async function main() {
  const service = new TripPlannerService(prisma as any);
  
  const dto = {
    placeNames: [
      "Vietnamese Women's Museum",
      "St. Joseph's Cathedral",
      "Hanoi Opera House",
      "Vietnam Military History Museum",
      "Ho Chi Minh Museum",
      "One Pillar Pagoda"
    ],
    numDays: 1,
    startTime: 8 * 60,
    endTime: 18 * 60,
    travelDate: "2026-04-28",
    visitDurationMin: 60,
    lunchBreakStart: 11 * 60,
    lunchBreakEnd: 13 * 60
  };

  const result = await service.generateItinerary(dto as any);
  console.log("DAYS:");
  console.log(JSON.stringify(result.days, null, 2));
  console.log("UNSCHEDULED:");
  console.log(JSON.stringify(result.unscheduled, null, 2));
}

main().finally(() => prisma.$disconnect());
