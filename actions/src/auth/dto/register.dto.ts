import { IsEmail, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'explorer@hanoigo.vn', description: 'Email của người dùng' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: 'HanoiGo@2024', description: 'Mật khẩu (ít nhất 1 chữ hoa, 1 chữ thường, 1 số, 1 ký tự đặc biệt)' })
  @IsNotEmpty()
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message: 'Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt',
  })
  password: string;

  @ApiProperty({ example: 'hung_nguyen', description: 'Tên người dùng duy nhất' })
  @IsNotEmpty({ message: 'Tên người dùng không được để trống' })
  username: string;
}