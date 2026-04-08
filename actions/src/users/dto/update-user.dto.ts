import { IsString, IsOptional, IsArray, IsUrl, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Hung Nguyen', description: 'Họ và tên hiển thị' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'hung_nguyen', description: 'Tên định danh (username)' })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiPropertyOptional({ example: 'Vietnam', description: 'Quốc tịch' })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional({ example: ['Vietnamese', 'English'], description: 'Danh sách ngôn ngữ' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @ApiPropertyOptional({ example: 'I love Hanoi!', description: 'Giới thiệu bản thân' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  bio?: string;

  @ApiPropertyOptional({ example: 'https://...', description: 'Ảnh đại diện' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
