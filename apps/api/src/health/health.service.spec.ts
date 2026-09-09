import { describe, expect, it, vi } from 'vitest';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  it('reports liveness without checking dependencies', () => {
    const service = new HealthService({} as never, {} as never);
    expect(service.liveness().status).toBe('ok');
  });

  it('reports readiness when PostgreSQL and Redis respond', async () => {
    const prisma = { $queryRawUnsafe: vi.fn().mockResolvedValue([{ '?column?': 1 }]) };
    const redis = { ping: vi.fn().mockResolvedValue('PONG') };
    const service = new HealthService(prisma as never, redis as never);

    await expect(service.readiness()).resolves.toMatchObject({
      checks: { database: 'ok', redis: 'ok' },
      status: 'ok',
    });
  });

  it('reports an unavailable dependency without leaking its error', async () => {
    const prisma = { $queryRawUnsafe: vi.fn().mockRejectedValue(new Error('secret connection detail')) };
    const redis = { ping: vi.fn().mockResolvedValue('PONG') };
    const service = new HealthService(prisma as never, redis as never);

    await expect(service.readiness()).resolves.toMatchObject({
      checks: { database: 'unavailable', redis: 'ok' },
      status: 'unavailable',
    });
  });
});
