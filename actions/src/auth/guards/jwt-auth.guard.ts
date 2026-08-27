import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtUser } from '../../common/types/authenticated-request';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = JwtUser | null>(err: any, user: any): any {
    // Return user if authenticated, otherwise null. No error thrown.
    return (user as TUser) || null;
  }
}
