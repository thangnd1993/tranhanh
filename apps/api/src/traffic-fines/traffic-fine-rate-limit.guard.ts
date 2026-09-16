import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Request } from 'express';

export const TRAFFIC_FINE_RATE_LIMIT = 10;
export const TRAFFIC_FINE_RATE_WINDOW_MS = 10 * 60_000;
@Injectable()
export class TrafficFineRateLimitGuard implements CanActivate {
  private readonly windows = new Map<string, { count: number; resetAt: number }>();
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const now = Date.now();
    const identity = request.socket.remoteAddress ?? 'unknown';
    const current = this.windows.get(identity);
    if (!current || current.resetAt <= now) {
      this.windows.set(identity, { count: 1, resetAt: now + TRAFFIC_FINE_RATE_WINDOW_MS });
      return true;
    }
    current.count += 1;
    if (current.count > TRAFFIC_FINE_RATE_LIMIT)
      throw new HttpException('Too many traffic-fine lookups. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    if (this.windows.size > 5_000)
      for (const [key, window] of this.windows) if (window.resetAt <= now) this.windows.delete(key);
    return true;
  }
}
