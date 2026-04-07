import { IsEmail, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@gmail.com', description: 'Email đã đăng ký' })
  @IsEmail({}, { message: 'Email không đúng định dạng' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'abc123...', description: 'Token nhận từ email' })
  @IsNotEmpty({ message: 'Token không được để trống' })
  token: string;

  @ApiProperty({ example: 'NewPass@123', description: 'Mật khẩu mới (>=8 ký tự, phải có hoa+thường+số+đặc biệt)' })
  @IsNotEmpty({ message: 'Mật khẩu mới không được để trống' })
  @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message: 'Mật khẩu phải có ít nhất 1 chữ hoa, 1 chữ thường, 1 số và 1 ký tự đặc biệt',
  })
  newPassword: string;
}