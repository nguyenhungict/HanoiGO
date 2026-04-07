import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, username, password } = registerDto;

    // 1. Kiểm tra email đã tồn tại chưa
    const existingEmail = await this.usersService.findOneByEmail(email);
    if (existingEmail) {
      throw new ConflictException('Email đã được sử dụng');
    }

    // 2. Kiểm tra username đã tồn tại chưa
    const existingUsername = await this.usersService.findOneByUsername(username);
    if (existingUsername) {
      throw new ConflictException('Tên người dùng đã được sử dụng');
    }

    try {
      // 3. Hash mật khẩu
      const hashedPassword = await bcrypt.hash(password, 12);

      // 4. Tạo người dùng mới
      const user = await this.usersService.create({
        email,
        username,
        passwordHash: hashedPassword,
        // role và status đã có mặc định trong Prisma hoặc sẽ gán ở đây
      });

      // 5. Tạo tokens
      const tokens = await this.generateTokens(user.id, user.username, user.role);

      // 6. Trả về kết quả (loại bỏ passwordHash)
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

  async generateTokens(userId: string, username: string, role: string) {
    const payload = { sub: userId, username, role };
    
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: '15m',
        secret: process.env.JWT_SECRET || 'secretKey',
      }),
      this.jwtService.signAsync(payload, {
        expiresIn: '7d',
        secret: process.env.JWT_REFRESH_SECRET || 'refreshSecretKey',
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

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

  async forgotPassword(email: string) {
    return { message: 'Forgot password functionality not implemented yet' };
  }

  async resetPassword(token: string, newPass: string) {
    return { message: 'Reset password functionality not implemented yet' };
  }

  async logout(userId: string) {
    return { success: true };
  }

  async changePassword(userId: string, dto: any) {
    return { message: 'Change password functionality not implemented yet' };
  }
}
