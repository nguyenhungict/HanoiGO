import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class SaveTripStopDto {
  @IsUUID()
  @IsNotEmpty()
  placeId: string;

  @IsInt()
  @Min(1)
  stopOrder: number;

  @IsString()
  @IsOptional()
  arriveAt?: string;

  @IsString()
  @IsOptional()
  departAt?: string;

  @IsNumber()
  @IsOptional()
  distanceFromPrevM?: number;

  @IsNumber()
  @IsOptional()
  durationFromPrevS?: number;

  @IsBoolean()
  @IsOptional()
  isSkipped?: boolean;
}

export class SaveTripDayDto {
  @IsInt()
  @Min(1)
  dayNumber: number;

  @IsString()
  @IsOptional()
  district?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveTripStopDto)
  stops: SaveTripStopDto[];
}

export class SaveTripDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsInt()
  @Min(1)
  numDays: number;

  @IsUUID()
  @IsOptional()
  startPlaceId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveTripDayDto)
  days: SaveTripDayDto[];
}
