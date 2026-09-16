import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '@tranhanh/shared';
import type { Request } from 'express';
import { PrismaService } from '../database/prisma.service.js';
import { AuthTokenService } from './auth-token.service.js';
import { ACCESS_COOKIE, CSRF_COOKIE, readCookies } from './auth-http.js';
import { TokenHashService } from './auth.crypto.js';

export interface AuthenticatedRequest extends Request {
  authUser?: AuthUser;
  authSessionId?: string;
}
function safeUser(user: {
  id: string;
  email: string;
  displayName: string | null;
  status: 'ACTIVE' | 'DISABLED' | 'PENDING_DELETION';
  createdAt: Date;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    status: user.status,
    createdAt: user.createdAt.toISOString(),
  };
}
@Injectable()
export class AccessAuthGuard implements CanActivate {
  constructor(
    private readonly tokens: AuthTokenService,
    private readonly prisma: PrismaService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const bearer = request.headers.authorization?.match(/^Bearer ([A-Za-z0-9._~-]+)$/)?.[1];
    const token = bearer ?? readCookies(request)[ACCESS_COOKIE];
    if (!token) throw new UnauthorizedException('Authentication required.');
    const claims = await this.tokens.verify(token);
    const session = await this.prisma.authSession.findUnique({
      where: { id: claims.sessionId },
      include: { user: true },
    });
    const now = new Date();
    if (
      !session ||
      session.userId !== claims.userId ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.user.status !== 'ACTIVE'
    )
      throw new UnauthorizedException('Authentication required.');
    if (
      session.user.passwordChangedAt &&
      Math.floor(session.user.passwordChangedAt.getTime() / 1000) > Math.floor(claims.issuedAt.getTime() / 1000)
    )
      throw new UnauthorizedException('Authentication required.');
    request.authUser = safeUser(session.user);
    request.authSessionId = session.id;
    return true;
  }
}
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly hashes: TokenHashService,
    private readonly prisma: PrismaService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.headers.authorization?.startsWith('Bearer ')) return true;
    const cookie = readCookies(request)[CSRF_COOKIE];
    const header = request.headers['x-csrf-token'];
    if (!cookie || typeof header !== 'string' || cookie !== header || !request.authSessionId)
      throw new ForbiddenException('Invalid request verification token.');
    const session = await this.prisma.authSession.findUnique({
      where: { id: request.authSessionId },
      select: { csrfTokenHash: true },
    });
    if (!session || !this.hashes.matches(cookie, session.csrfTokenHash))
      throw new ForbiddenException('Invalid request verification token.');
    return true;
  }
}
@Injectable()
export class TrustedOriginGuard implements CanActivate {
  private readonly origin: string;
  constructor(config: ConfigService) {
    this.origin = new URL(config.getOrThrow<string>('WEB_ORIGIN')).origin;
  }
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const origin = request.headers.origin;
    if (origin && origin !== this.origin) throw new ForbiddenException('Untrusted request origin.');
    return true;
  }
}
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser => {
  const user = context.switchToHttp().getRequest<AuthenticatedRequest>().authUser;
  if (!user) throw new UnauthorizedException('Authentication required.');
  return user;
});
