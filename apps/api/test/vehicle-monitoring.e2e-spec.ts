import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { FakeAuthPrisma } from './fixtures/auth-prisma.js';
function cookieValue(response: request.Response, name: string): string {
  const values = response.headers['set-cookie'] as unknown as string[] | undefined;
  const raw = values
    ?.find((v) => v.startsWith(`${name}=`))
    ?.split(';', 1)[0]
    .slice(name.length + 1);
  if (!raw) throw new Error(`Missing ${name}`);
  return decodeURIComponent(raw);
}
describe('Vehicle Monitoring ownership and manual capability (e2e)', () => {
  let app: INestApplication;
  let owner: ReturnType<typeof request.agent>;
  let stranger: ReturnType<typeof request.agent>;
  let ownerCsrf = '';
  let strangerCsrf = '';
  let vehicleId = '';
  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    const fixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(new FakeAuthPrisma())
      .compile();
    app = fixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
    await app.init();
    owner = request.agent(app.getHttpServer());
    stranger = request.agent(app.getHttpServer());
    ownerCsrf = cookieValue(
      await owner
        .post('/api/v1/auth/register')
        .send({ email: 'monitor-owner@example.com', password: 'correct horse battery staple' })
        .expect(201),
      'tn_csrf',
    );
    strangerCsrf = cookieValue(
      await stranger
        .post('/api/v1/auth/register')
        .send({ email: 'monitor-stranger@example.com', password: 'correct horse battery staple' })
        .expect(201),
      'tn_csrf',
    );
    vehicleId = (
      await owner
        .post('/api/v1/vehicles')
        .set('X-CSRF-Token', ownerCsrf)
        .send({ licensePlate: '51K-765.43', vehicleType: 'CAR' })
        .expect(201)
    ).body.id;
  });
  afterAll(async () => app.close());
  it('requires auth and CSRF and returns private cache headers', async () => {
    await request(app.getHttpServer()).get(`/api/v1/vehicles/${vehicleId}/monitoring`).expect(401);
    const state = await owner.get(`/api/v1/vehicles/${vehicleId}/monitoring`).expect(200);
    expect(state.headers['cache-control']).toBe('private, no-store');
    expect(state.headers['x-robots-tag']).toBe('noindex');
    await owner.post(`/api/v1/vehicles/${vehicleId}/monitoring/enable`).send({}).expect(403);
  });
  it('stores preference honestly for MANUAL_ONLY and disables it', async () => {
    const enabled = await owner
      .post(`/api/v1/vehicles/${vehicleId}/monitoring/enable`)
      .set('X-CSRF-Token', ownerCsrf)
      .send({})
      .expect(201);
    expect(enabled.body).toMatchObject({
      enabled: true,
      effectiveStatus: 'ENABLED_BUT_MANUAL',
      capability: 'MANUAL_ONLY',
      automaticChecksAvailable: false,
      nextEligibleCheckAt: null,
      lastSuccessfulCheckAt: null,
    });
    expect(
      await owner
        .get(`/api/v1/vehicles/${vehicleId}/monitoring/history`)
        .expect(200)
        .then((r) => r.body),
    ).toEqual({ items: [] });
    const disabled = await owner
      .post(`/api/v1/vehicles/${vehicleId}/monitoring/disable`)
      .set('X-CSRF-Token', ownerCsrf)
      .send({})
      .expect(201);
    expect(disabled.body).toMatchObject({ enabled: false, effectiveStatus: 'DISABLED' });
  });
  it('returns safe 404 for the complete cross-owner matrix', async () => {
    await stranger.get(`/api/v1/vehicles/${vehicleId}/monitoring`).expect(404);
    await stranger.get(`/api/v1/vehicles/${vehicleId}/monitoring/history`).expect(404);
    await stranger
      .post(`/api/v1/vehicles/${vehicleId}/monitoring/enable`)
      .set('X-CSRF-Token', strangerCsrf)
      .send({})
      .expect(404);
    await stranger
      .post(`/api/v1/vehicles/${vehicleId}/monitoring/disable`)
      .set('X-CSRF-Token', strangerCsrf)
      .send({})
      .expect(404);
  });
});
