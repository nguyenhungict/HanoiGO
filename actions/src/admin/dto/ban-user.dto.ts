import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ViolationType } from '@prisma/client';

export class BanUserDto {
  @IsEnum(ViolationType)
  reason: ViolationType;

  @IsOptional()
  @IsString()
  description?: string;
}
