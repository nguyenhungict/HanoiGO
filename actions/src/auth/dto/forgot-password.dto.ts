import { IsEmail, IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'user@gmail.com', description: 'Registered email address' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'abc123...', description: 'Reset password token from email' })
  @IsNotEmpty({ message: 'Token cannot be empty' })
  token: string;

  @ApiProperty({
    example: 'NewPass@123',
    description: 'New password (>=8 chars, must contain upper+lower+number+special)',
  })
  @IsNotEmpty({ message: 'New password cannot be empty' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{8,}$/, {
    message:
      'Password must contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character',
  })
  newPassword: string;
}
