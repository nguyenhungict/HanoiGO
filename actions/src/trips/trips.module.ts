import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripPlannerService } from './trip-planner.service';
import { TripCrudService } from './trip-crud.service';

@Module({
  controllers: [TripsController],
  providers: [TripPlannerService, TripCrudService],
  exports: [TripPlannerService, TripCrudService],
})
export class TripsModule {}
