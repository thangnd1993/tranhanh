import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { AuthRateLimitGuard } from './auth-rate-limit.guard.js';

describe('AuthRateLimitGuard', () => {
  it('limits only handlers carrying an explicit auth policy', () => {
    const reflector = { get: vi.fn().mockReturnValue({ limit: 2, windowMs: 60_000 }) } as unknown as Reflector;
    const guard = new AuthRateLimitGuard(reflector);
    const context = {
      getHandler: () => function handler() {},
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          path: '/auth/login',
          route: { path: 'login' },
          socket: { remoteAddress: '127.0.0.1' },
        }),
      }),
    } as unknown as ExecutionContext;
    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(HttpException);
    expect(reflector.get).toHaveBeenCalled();
  });
  it('does not affect public endpoints without auth rate metadata', () => {
    const reflector = { get: vi.fn().mockReturnValue(undefined) } as unknown as Reflector;
    const context = { getHandler: () => function handler() {} } as unknown as ExecutionContext;
    expect(new AuthRateLimitGuard(reflector).canActivate(context)).toBe(true);
  });
});
