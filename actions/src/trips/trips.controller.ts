import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TripPlannerService } from './trip-planner.service';
import { TripCrudService } from './trip-crud.service';
import type { GenerateItineraryDto } from './trip-planner.types';
import { SaveTripDto } from './dto/save-trip.dto';

@Controller('trips')
export class TripsController {
  constructor(
    private readonly tripPlannerService: TripPlannerService,
    private readonly tripCrudService: TripCrudService,
  ) {}

  @UseGuards(AuthGuard('jwt'))
  @Post('generate-itinerary')
  async generateItinerary(@Body() dto: GenerateItineraryDto) {
    return this.tripPlannerService.generateItinerary(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('save')
  async saveTrip(
    @Request() req: { user: { id: string } },
    @Body() dto: SaveTripDto,
  ) {
    return this.tripCrudService.saveTrip(req.user.id, dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('my-trips')
  async getMyTrips(@Request() req: { user: { id: string } }) {
    return this.tripCrudService.getUserTrips(req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async deleteTrip(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.tripCrudService.deleteTrip(req.user.id, id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('clone/:id')
  async cloneTrip(
    @Request() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    return this.tripCrudService.cloneTrip(req.user.id, id);
  }
}
