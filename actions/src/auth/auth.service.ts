import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private transporter: nodemailer.Transporter;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
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
    if (existingEmail) {
      throw new ConflictException('Email đã được sử dụng');
    }

    const existingUsername = await this.usersService.findOneByUsername(username);
    if (existingUsername) {
      throw new ConflictException('Tên người dùng đã được sử dụng');
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await this.usersService.create({
        email,
        username,
        passwordHash: hashedPassword,
      });

      const tokens = await this.generateTokens(user.id, user.username, user.role);

      const { passwordHash, ...result } = user;
      return {
        user: result,
        ...tokens,
      };
    } catch (error) {
      throw new InternalServerErrorException('Lỗi hệ thống khi đăng ký');
    }
  }

  async verifyEmail(token: string) {
    return { message: 'Verify email functionality not implemented yet' };
  }

  // ============================================================
  // LOGIN FLOW
  // ============================================================

  async login(loginDto: any) {
    const { email, password } = loginDto;
    const user = await this.usersService.findOneByEmail(email);

    if (!user) {
      throw new ConflictException('Email hoặc mật khẩu không đúng');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new ConflictException('Email hoặc mật khẩu không đúng');
    }

    const tokens = await this.generateTokens(user.id, user.username, user.role);

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
    // 1. Tìm user theo email
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      // Trả về thành công giả để tránh lộ email có tồn tại hay không (bảo mật)
      return { message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.' };
    }

    // 2. Tạo token ngẫu nhiên (64 ký tự hex)
    const resetToken = crypto.randomBytes(32).toString('hex');

    // 3. Lưu vào bảng PasswordReset, hết hạn sau 15 phút
    await this.prisma.passwordReset.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 phút
      },
    });

    // 4. Gửi email
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

    return { message: 'Nếu email tồn tại, bạn sẽ nhận được link đặt lại mật khẩu.' };
  }

  async resetPassword(token: string, newPassword: string) {
    // 1. Tìm bản ghi PasswordReset theo token
    const record = await this.prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!record) {
      throw new BadRequestException('Token không hợp lệ');
    }

    // 2. Kiểm tra hết hạn
    if (record.expiresAt < new Date()) {
      throw new BadRequestException('Token đã hết hạn. Vui lòng yêu cầu lại.');
    }

    // 3. Kiểm tra đã sử dụng chưa
    if (record.usedAt) {
      throw new BadRequestException('Token đã được sử dụng.');
    }

    // 4. Hash mật khẩu mới và cập nhật user
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: hashedPassword },
    });

    // 5. Đánh dấu token đã sử dụng
    await this.prisma.passwordReset.update({
      where: { token },
      data: { usedAt: new Date() },
    });

    return { message: 'Mật khẩu đã được cập nhật thành công.' };
  }

  // ============================================================
  // HELPERS & OTHER STUBS
  // ============================================================

  async generateTokens(userId: string, username: string, role: string) {
    const payload = { sub: userId, username, role };

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
