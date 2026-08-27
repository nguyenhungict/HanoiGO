import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { requireEnv } from '../../common/env.utils';
import { JwtUser } from '../../common/types/authenticated-request';

// Matches the payload signed in AuthService.generateTokens().
interface JwtAccessPayload {
  sub: string;
  username: string;
  role: string;
  tokenVersion: number;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: requireEnv('JWT_SECRET'),
    });
  }

  async validate(payload: JwtAccessPayload): Promise<JwtUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        role: true,
        status: true,
        tokenVersion: true,
      },
    });

    if (!user || user.status === UserStatus.BANNED) {
      throw new UnauthorizedException(
        'User is not allowed to access this resource',
      );
    }

    const tokenVersion =
      typeof payload.tokenVersion === 'number' ? payload.tokenVersion : 1;

    if (user.tokenVersion !== tokenVersion) {
      throw new UnauthorizedException('Token is no longer valid');
    }

    return {
      id: user.id,
      username: user.username,
      role: user.role,
    };
  }
}
