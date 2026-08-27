import { Request } from 'express';
import { Role } from '@prisma/client';

// Shape returned by JwtStrategy.validate() — this is what Passport attaches
// to `req.user` on every route behind JwtAuthGuard.
export interface JwtUser {
  id: string;
  username: string;
  role: Role;
}

export interface AuthenticatedRequest extends Request {
  user: JwtUser;
}

// For routes behind OptionalJwtAuthGuard — user is present only if a valid
// token was sent, so callers must handle the unauthenticated case.
export interface OptionalAuthRequest extends Request {
  user?: JwtUser;
}
