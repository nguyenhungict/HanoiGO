import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'explorer@hanoigo.vn',
    description: 'User email address',
  })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Login password' })
  @IsNotEmpty()
  password: string;
}
