import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsUUID,
  Min,
  Max,
} from 'class-validator';

export class CreateActivityDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsUUID()
  placeId?: string;

  // If tripId is provided, lat/lng/address are auto-filled from the trip's start place
  @IsOptional()
  @IsUUID()
  tripId?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxMembers?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
