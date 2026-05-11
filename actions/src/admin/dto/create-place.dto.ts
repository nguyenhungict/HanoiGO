import { IsString, IsNumber, IsOptional, IsArray, IsBoolean } from 'class-validator';

export class CreatePlaceDto {
  @IsString()
  name: string;

  @IsString()
  category: string;

  @IsString()
  district: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  alwaysOpen?: boolean;

  @IsOptional()
  @IsString()
  openTimeStart?: string; // Format "HH:mm"

  @IsOptional()
  @IsString()
  openTimeEnd?: string; // Format "HH:mm"
}
