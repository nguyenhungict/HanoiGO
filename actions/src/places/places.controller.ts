import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { PlacesService } from './places.service';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('places')
@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all places with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    const pageNumber = page ? parseInt(page, 10) : undefined;
    const limitNumber = limit ? parseInt(limit, 10) : undefined;
    return this.placesService.findAll(pageNumber, limitNumber);
  }

  // Declared before any ':id' route would be, so 'nearby' is not read as an id.
  @Get('nearby')
  @ApiOperation({
    summary: 'Find places within a radius of a point (PostGIS ST_DWithin)',
  })
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lng', required: true, type: Number })
  @ApiQuery({ name: 'radius', required: false, type: Number, description: 'metres, default 5000' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
    @Query('limit') limit?: string,
  ) {
    const latNum = Number(lat);
    const lngNum = Number(lng);

    if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
      throw new BadRequestException('lat must be a number between -90 and 90');
    }
    if (!Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
      throw new BadRequestException('lng must be a number between -180 and 180');
    }

    const radiusNum = radius ? Number(radius) : 5000;
    if (!Number.isFinite(radiusNum) || radiusNum <= 0) {
      throw new BadRequestException('radius must be a positive number of metres');
    }

    const limitNum = limit ? Number(limit) : 20;
    if (!Number.isFinite(limitNum) || limitNum <= 0) {
      throw new BadRequestException('limit must be a positive number');
    }

    return this.placesService.findNearby(
      latNum,
      lngNum,
      Math.min(radiusNum, 50000),
      Math.min(limitNum, 100),
    );
  }
}
