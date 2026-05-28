import { IsEnum, IsOptional, IsString, IsArray } from 'class-validator';
import { ViolationType } from '@prisma/client';

export class ReportActivityDto {
  @IsEnum(ViolationType)
  reason: ViolationType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceUrls?: string[];
}
