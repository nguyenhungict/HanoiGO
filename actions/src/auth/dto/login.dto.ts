import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'explorer@hanoigo.vn', description: 'Địa chỉ email người dùng' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', description: 'Mật khẩu đăng nhập' })
  @IsNotEmpty()
  password: string;
}