import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { RegisterDto } from './dto/register.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    // Initialize Nodemailer transporter with Gmail
    this.transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST || 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    });
  }

  // ============================================================
  // SIGNUP FLOW
  // ============================================================

  async register(registerDto: RegisterDto) {
    const { email, username, password } = registerDto;

    const existingEmail = await this.usersService.findOneByEmail(email);

    // If email already exists but is pending verification -> allow re-registration with a new OTP
    if (existingEmail && existingEmail.status === UserStatus.PENDING) {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await this.prisma.user.update({
        where: { id: existingEmail.id },
        data: { otpCode, otpExpiresAt },
      });

      await this.sendOtpEmail(email, existingEmail.username, otpCode);

      return {
        message: 'Verification code has been sent to your email.',
        email,
      };
    }

    if (existingEmail) {
      throw new ConflictException('Email is already in use');
    }

    const existingUsername =
      await this.usersService.findOneByUsername(username);
    if (existingUsername) {
      throw new ConflictException('Username is already taken');
    }

    let createdUserId: string | null = null;
    try {
      const hashedPassword = await bcrypt.hash(password, 12);
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      const newUser = await this.usersService.create({
        email,
        username,
        passwordHash: hashedPassword,
        status: UserStatus.PENDING,
        otpCode,
        otpExpiresAt,
      });
      createdUserId = newUser.id;

      await this.sendOtpEmail(email, username, otpCode);

      return {
        message: 'Verification code has been sent to your email.',
        email,
      };
    } catch (error) {
      // If sending email fails -> delete the newly created user so they can try again
      if (createdUserId) {
        await this.prisma.user
          .delete({ where: { id: createdUserId } })
          .catch(() => {});
      }
      console.error('Registration error:', error);
      throw new InternalServerErrorException(
        'System error during registration. Please try again.',
      );
    }
  }

  async verifyOtp(email: string, otp: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('Account is already verified');
    }

    if (!user.otpCode || user.otpCode !== otp) {
      throw new BadRequestException('Incorrect verification code');
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new BadRequestException('Verification code has expired');
    }

    // Update user to ACTIVE and clear OTP
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        status: UserStatus.ACTIVE,
        otpCode: null,
        otpExpiresAt: null,
      },
    });

    const tokens = await this.generateTokens(
      updatedUser.id,
      updatedUser.username,
      updatedUser.role,
      updatedUser.tokenVersion,
    );

    const { passwordHash, ...result } = updatedUser;
    return {
      user: result,
      ...tokens,
    };
  }

  async resendOtp(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('Account is already verified');
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode,
        otpExpiresAt,
      },
    });

    await this.sendOtpEmail(email, user.username, otpCode);

    return { message: 'A new verification code has been sent.' };
  }

  private async sendOtpEmail(email: string, username: string, otpCode: string) {
    await this.transporter.sendMail({
      from: process.env.MAIL_FROM || '"HanoiGO" <noreply@hanoigo.com>',
      to: email,
      subject: '🛡️ HanoiGO - Account Verification',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #FF5A5F; margin: 0; font-size: 28px; letter-spacing: -0.5px;">HanoiGO</h1>
            <p style="color: #666; font-size: 14px;">The Modern Archivist</p>
          </div>
          <div style="border-top: 1px solid #eee; padding-top: 32px;">
            <p style="color: #333; font-size: 16px;">Hello <strong>${username}</strong>,</p>
            <p style="color: #666; font-size: 15px; line-height: 1.6;">Thank you for registering on HanoiGO. To complete your account setup, please use the verification code below:</p>
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; text-align: center; margin: 32px 0;">
              <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #333;">${otpCode}</span>
            </div>
            <p style="color: #999; font-size: 13px; text-align: center;">This code will expire in <strong>10 minutes</strong>.</p>
            <p style="color: #666; font-size: 15px; line-height: 1.6; margin-top: 32px;">If you did not make this request, please ignore this email or contact support.</p>
          </div>
          <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #eee; text-align: center;">
            <p style="color: #ccc; font-size: 12px;">© 2024 HanoiGO Team. All rights reserved.</p>
          </div>
        </div>
      `,
    });
  }

  // ============================================================
  // LOGIN FLOW
  // ============================================================

  async login(loginDto: any) {
    const { email, password } = loginDto;

    let user = await this.usersService.findOneByEmail(email);
    if (!user) {
      user = await this.usersService.findOneByUsername(email);
    }

    if (!user) {
      throw new ConflictException('Invalid username or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new ConflictException('Invalid username or password');
    }

    if (user.status === UserStatus.BANNED) {
      throw new ForbiddenException('Your account has been locked.');
    }

    if (user.status === UserStatus.PENDING) {
      throw new ForbiddenException(
        'Please verify your email before logging in.',
      );
    }

    const tokens = await this.generateTokens(
      user.id,
      user.username,
      user.role,
      user.tokenVersion,
    );

    const { passwordHash, ...result } = user;
    return {
      user: result,
      ...tokens,
    };
  }

  // ============================================================
  // FORGOT PASSWORD FLOW
  // ============================================================

  async forgotPassword(email: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      return {
        message: 'If the email exists, you will receive a password reset link.',
      };
    }

    const resetSecret = this.getResetSecret(user.passwordHash);
    const resetToken = await this.jwtService.signAsync(
      { sub: user.id, purpose: 'reset-password' },
      { secret: resetSecret, expiresIn: '15m' },
    );

    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    await this.transporter.sendMail({
      from: process.env.MAIL_FROM || '"HanoiGO" <noreply@hanoigo.com>',
      to: email,
      subject: '🔐 HanoiGO - Password Reset',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #FF5A5F; margin-bottom: 8px;">HanoiGO</h2>
          <p style="color: #666; font-size: 14px;">Hello <strong>${user.username}</strong>,</p>
          <p style="color: #666; font-size: 14px;">We received a request to reset the password for your account.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" 
               style="background-color: #FF5A5F; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              Reset password
            </a>
          </div>
          <p style="color: #999; font-size: 12px;">This link will expire in <strong>15 minutes</strong>.</p>
          <p style="color: #999; font-size: 12px;">If you did not request this, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="color: #ccc; font-size: 11px; text-align: center;">© 2024 HanoiGO. The Modern Archivist.</p>
        </div>
      `,
    });

    return {
      message: 'If the email exists, you will receive a password reset link.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    let payload: any;
    try {
      payload = this.jwtService.decode(token);
    } catch {
      throw new BadRequestException('Invalid token');
    }

    if (!payload?.sub || payload?.purpose !== 'reset-password') {
      throw new BadRequestException('Invalid token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new BadRequestException('Invalid token');
    }

    const resetSecret = this.getResetSecret(user.passwordHash);
    try {
      await this.jwtService.verifyAsync(token, { secret: resetSecret });
    } catch {
      throw new BadRequestException('Token has expired or has already been used.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });

    return { message: 'Password has been successfully updated.' };
  }

  private getResetSecret(passwordHash: string): string {
    const jwtSecret =
      this.configService.get<string>('JWT_SECRET') || 'secretKey';
    return `${jwtSecret}:${passwordHash}`;
  }

  // ============================================================
  // HELPERS
  // ============================================================

  async generateTokens(
    userId: string,
    username: string,
    role: string,
    tokenVersion: number,
  ) {
    const payload = { sub: userId, username, role, tokenVersion };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: '7d',
        secret: process.env.JWT_SECRET || 'secretKey',
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: '7d',
        secret: process.env.JWT_REFRESH_SECRET || 'refreshSecretKey',
      }),
    ]);

    return { accessToken, refreshToken };
  }


  async changePassword(userId: string, dto: any) {
    return { message: 'Change password functionality not implemented yet' };
  }
}
