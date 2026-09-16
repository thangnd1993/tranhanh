import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { TRAFFIC_FINE_RATE_LIMIT, TrafficFineRateLimitGuard } from './traffic-fine-rate-limit.guard.js';
function context(address: string): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ socket: { remoteAddress: address } }) }),
  } as unknown as ExecutionContext;
}
describe('TrafficFineRateLimitGuard', () => {
  it('limits by request identity without using or retaining a plate', () => {
    const guard = new TrafficFineRateLimitGuard();
    for (let i = 0; i < TRAFFIC_FINE_RATE_LIMIT; i++) expect(guard.canActivate(context('127.0.0.1'))).toBe(true);
    expect(() => guard.canActivate(context('127.0.0.1'))).toThrowError(/Too many traffic-fine lookups/);
    expect(guard.canActivate(context('127.0.0.2'))).toBe(true);
    expect(JSON.stringify(guard)).not.toMatch(/license|plate/i);
  });
});
