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
    // Khởi tạo Nodemailer transporter với Gmail
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

    // Nếu email đã tồn tại nhưng chưa xác thực (PENDING) → cho phép đăng ký lại với OTP mới
    if (existingEmail && existingEmail.status === UserStatus.PENDING) {
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await this.prisma.user.update({
        where: { id: existingEmail.id },
        data: { otpCode, otpExpiresAt },
      });

      await this.sendOtpEmail(email, existingEmail.username, otpCode);

      return {
        message: 'Mã xác thực đã được gửi đến email của bạn.',
        email,
      };
    }

    if (existingEmail) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const existingUsername =
      await this.usersService.findOneByUsername(username);
    if (existingUsername) {
      throw new ConflictException('Tên người dùng đã được sử dụng');
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
        message: 'Mã xác thực đã được gửi đến email của bạn.',
        email,
      };
    } catch (error) {
      // Nếu gửi email thất bại → xóa user vừa tạo để người dùng có thể thử lại
      if (createdUserId) {
        await this.prisma.user.delete({ where: { id: createdUserId } }).catch(() => {});
      }
      console.error('Registration error:', error);
      throw new InternalServerErrorException('Lỗi hệ thống khi đăng ký. Vui lòng thử lại.');
    }
  }

  async verifyOtp(email: string, otp: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('Tài khoản đã được xác thực');
    }

    if (!user.otpCode || user.otpCode !== otp) {
      throw new BadRequestException('Mã xác thực không chính xác');
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new BadRequestException('Mã xác thực đã hết hạn');
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
      throw new NotFoundException('Không tìm thấy người dùng');
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('Tài khoản đã được xác thực');
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

    return { message: 'Mã xác thực mới đã được gửi.' };
  }

  private async sendOtpEmail(email: string, username: string, otpCode: string) {
    await this.transporter.sendMail({
      from: process.env.MAIL_FROM || '"HanoiGO" <noreply@hanoigo.com>',
      to: email,
      subject: '🛡️ HanoiGO - Xác thực tài khoản',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #FF5A5F; margin: 0; font-size: 28px; letter-spacing: -0.5px;">HanoiGO</h1>
            <p style="color: #666; font-size: 14px;">The Modern Archivist</p>
          </div>
          <div style="border-top: 1px solid #eee; padding-top: 32px;">
            <p style="color: #333; font-size: 16px;">Xin chào <strong>${username}</strong>,</p>
            <p style="color: #666; font-size: 15px; line-height: 1.6;">Cảm ơn bạn đã đăng ký HanoiGO. Để hoàn tất việc thiết lập tài khoản, vui lòng sử dụng mã xác thực bên dưới:</p>
            <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; text-align: center; margin: 32px 0;">
              <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #333;">${otpCode}</span>
            </div>
            <p style="color: #999; font-size: 13px; text-align: center;">Mã này sẽ hết hiệu lực sau <strong>10 phút</strong>.</p>
            <p style="color: #666; font-size: 15px; line-height: 1.6; margin-top: 32px;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này hoặc liên hệ với bộ phận hỗ trợ của chúng tôi.</p>
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
      throw new ConflictException('Tài khoản hoặc mật khẩu không đúng');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new ConflictException('Tài khoản hoặc mật khẩu không đúng');
    }

    if (user.status === UserStatus.BANNED) {
      throw new ForbiddenException('Tài khoản của bạn đã bị khóa.');
    }

    if (user.status === UserStatus.PENDING) {
      throw new ForbiddenException(
        'Vui lòng xác thực email của bạn trước khi đăng nhập.',
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
        message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.',
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
      subject: '🔐 HanoiGO - Đặt lại mật khẩu',
      html: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #FF5A5F; margin-bottom: 8px;">HanoiGO</h2>
          <p style="color: #666; font-size: 14px;">Xin chào <strong>${user.username}</strong>,</p>
          <p style="color: #666; font-size: 14px;">Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" 
               style="background-color: #FF5A5F; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
              Đặt lại mật khẩu
            </a>
          </div>
          <p style="color: #999; font-size: 12px;">Link này sẽ hết hạn sau <strong>15 phút</strong>.</p>
          <p style="color: #999; font-size: 12px;">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
          <p style="color: #ccc; font-size: 11px; text-align: center;">© 2024 HanoiGO. The Modern Archivist.</p>
        </div>
      `,
    });

    return {
      message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    let payload: any;
    try {
      payload = this.jwtService.decode(token);
    } catch {
      throw new BadRequestException('Token không hợp lệ');
    }

    if (!payload?.sub || payload?.purpose !== 'reset-password') {
      throw new BadRequestException('Token không hợp lệ');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new BadRequestException('Token không hợp lệ');
    }

    const resetSecret = this.getResetSecret(user.passwordHash);
    try {
      await this.jwtService.verifyAsync(token, { secret: resetSecret });
    } catch {
      throw new BadRequestException('Token đã hết hạn hoặc đã được sử dụng.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: hashedPassword },
    });

    return { message: 'Mật khẩu đã được cập nhật thành công.' };
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

  async logout(userId: string) {
    return { success: true };
  }

  async changePassword(userId: string, dto: any) {
    return { message: 'Change password functionality not implemented yet' };
  }
}
