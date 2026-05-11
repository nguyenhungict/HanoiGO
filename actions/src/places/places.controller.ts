import { Controller, Get } from '@nestjs/common';
import { PlacesService } from './places.service';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('places')
@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all places' })
  findAll() {
    return this.placesService.findAll();
  }
}
