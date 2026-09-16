import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

interface RateLimitPolicy {
  limit: number;
  windowMs: number;
}
const key = 'auth-rate-limit';
export const AuthRateLimit = (limit: number, windowMs: number): MethodDecorator =>
  SetMetadata(key, { limit, windowMs });
@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const policy = this.reflector.get<RateLimitPolicy | undefined>(key, context.getHandler());
    if (!policy) return true;
    const request = context.switchToHttp().getRequest<Request>();
    const now = Date.now();
    const identity = request.socket.remoteAddress ?? 'unknown';
    const bucketKey = `${request.method}:${request.route?.path ?? request.path}:${identity}`;
    const current = this.windows.get(bucketKey);
    if (!current || current.resetAt <= now) {
      this.windows.set(bucketKey, { count: 1, resetAt: now + policy.windowMs });
      return true;
    }
    current.count += 1;
    if (current.count > policy.limit)
      throw new HttpException('Too many attempts. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    if (this.windows.size > 5_000) {
      for (const [entryKey, entry] of this.windows) if (entry.resetAt <= now) this.windows.delete(entryKey);
    }
    return true;
  }
}
