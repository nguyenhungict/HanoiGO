import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripPlannerService } from './trip-planner.service';

@Module({
  controllers: [TripsController],
  providers: [TripPlannerService],
})
export class TripsModule {}
