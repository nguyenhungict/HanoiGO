import { Controller, Post, Body } from '@nestjs/common';
import { TripPlannerService } from './trip-planner.service';
import type { GenerateItineraryDto } from './trip-planner.service';

@Controller('trips')
export class TripsController {
  constructor(private readonly tripPlannerService: TripPlannerService) {}

  @Post('generate-itinerary')
  async generateItinerary(@Body() dto: GenerateItineraryDto) {
    return this.tripPlannerService.generateItinerary(dto);
  }
}
