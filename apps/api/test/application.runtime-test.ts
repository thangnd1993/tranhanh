import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { DevelopmentPasswordResetDelivery } from '../src/auth/auth-delivery.service.js';
import { PrismaService } from '../src/database/prisma.service.js';

const ownerEmail = 'runtime-owner@example.test';
const otherEmail = 'runtime-other@example.test';
const oldPassword = 'runtime-old-password-2026';
const newPassword = 'runtime-new-password-2026';
function cookies(response: request.Response): string[] {
  return (response.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
}
function cookie(response: request.Response, name: string): string {
  const raw = cookies(response)
    .find((value) => value.startsWith(`${name}=`))
    ?.split(';', 1)[0]
    .slice(name.length + 1);
  if (!raw) throw new Error(`Missing ${name}`);
  return decodeURIComponent(raw);
}
function privateHeaders(csrf: string) {
  return { 'X-CSRF-Token': csrf };
}

describe('real local application runtime', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let owner: ReturnType<typeof request.agent>;
  let other: ReturnType<typeof request.agent>;
  let ownerCsrf = '';
  let otherCsrf = '';
  let vehicleA = '';
  let vehicleB = '';
  let documentId = '';

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
    await app.init();
    prisma = app.get(PrismaService);
    owner = request.agent(app.getHttpServer());
    other = request.agent(app.getHttpServer());
  });

  afterAll(async () => {
    for (const email of [ownerEmail, otherEmail]) {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) continue;
      await prisma.vehicle.deleteMany({ where: { userId: user.id } });
      await prisma.authSession.deleteMany({ where: { userId: user.id } });
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    await app.close();
  });

  it('rotates refresh sessions, logs out, resets password, and stores hashes only', async () => {
    const registered = await owner
      .post('/api/v1/auth/register')
      .send({ email: ownerEmail, password: oldPassword })
      .expect(201);
    const oldRefresh = cookie(registered, 'tn_refresh');
    const oldCsrf = cookie(registered, 'tn_csrf');
    await owner
      .get('/api/v1/auth/me')
      .expect(200)
      .expect(({ body }) => expect(body.email).toBe(ownerEmail));
    const refreshed = await owner.post('/api/v1/auth/refresh').set(privateHeaders(oldCsrf)).send({}).expect(201);
    const newCsrfFromRefresh = cookie(refreshed, 'tn_csrf');
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', [`tn_refresh=${encodeURIComponent(oldRefresh)}`, `tn_csrf=${encodeURIComponent(oldCsrf)}`])
      .set(privateHeaders(oldCsrf))
      .send({})
      .expect(401);
    await owner.post('/api/v1/auth/logout').set(privateHeaders(newCsrfFromRefresh)).send({}).expect(201);
    await owner.get('/api/v1/auth/me').expect(401);

    const login = await owner.post('/api/v1/auth/login').send({ email: ownerEmail, password: oldPassword }).expect(201);
    ownerCsrf = cookie(login, 'tn_csrf');
    await owner.post('/api/v1/auth/forgot-password').send({ email: ownerEmail }).expect(201);
    const resetToken = app.get(DevelopmentPasswordResetDelivery).take(ownerEmail);
    expect(resetToken).toBeTruthy();
    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, password: newPassword })
      .expect(201);
    await owner.get('/api/v1/auth/me').expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: ownerEmail, password: oldPassword })
      .expect(401);
    const relogin = await owner
      .post('/api/v1/auth/login')
      .send({ email: ownerEmail, password: newPassword })
      .expect(201);
    ownerCsrf = cookie(relogin, 'tn_csrf');
    const user = await prisma.user.findUniqueOrThrow({ where: { email: ownerEmail } });
    expect(user.passwordHash).not.toContain(oldPassword);
    expect(user.passwordHash).not.toContain(newPassword);
    const sessions = await prisma.authSession.findMany({ where: { userId: user.id } });
    expect(sessions.every((session) => !session.tokenHash.includes('.') && !session.csrfTokenHash.includes('.'))).toBe(
      true,
    );
  });

  it('runs Garage ownership, primary, update, archive, restore, and DB uniqueness against PostgreSQL', async () => {
    const first = await owner
      .post('/api/v1/vehicles')
      .set(privateHeaders(ownerCsrf))
      .send({ licensePlate: '51K-900.01', vehicleType: 'CAR', displayName: 'Runtime A1' })
      .expect(201);
    const second = await owner
      .post('/api/v1/vehicles')
      .set(privateHeaders(ownerCsrf))
      .send({ licensePlate: '30A-900.02', vehicleType: 'CAR', displayName: 'Runtime A2' })
      .expect(201);
    vehicleA = first.body.id;
    vehicleB = second.body.id;
    expect(first.body.isPrimary).toBe(true);
    expect(second.body.isPrimary).toBe(false);
    await owner
      .post(`/api/v1/vehicles/${vehicleB}/primary`)
      .set(privateHeaders(ownerCsrf))
      .send({})
      .expect(201)
      .expect(({ body }) => expect(body.isPrimary).toBe(true));
    await owner
      .patch(`/api/v1/vehicles/${vehicleA}`)
      .set(privateHeaders(ownerCsrf))
      .send({ displayName: 'Runtime A1 updated' })
      .expect(200);
    await owner.delete(`/api/v1/vehicles/${vehicleA}`).set(privateHeaders(ownerCsrf)).expect(200);
    await owner.post(`/api/v1/vehicles/${vehicleA}/restore`).set(privateHeaders(ownerCsrf)).send({}).expect(201);
    await owner
      .post('/api/v1/vehicles')
      .set(privateHeaders(ownerCsrf))
      .send({ licensePlate: '51K-900.01', vehicleType: 'CAR' })
      .expect(409);

    const registered = await other
      .post('/api/v1/auth/register')
      .send({ email: otherEmail, password: oldPassword })
      .expect(201);
    otherCsrf = cookie(registered, 'tn_csrf');
    await other.get(`/api/v1/vehicles/${vehicleA}`).expect(404);
    await other
      .patch(`/api/v1/vehicles/${vehicleA}`)
      .set(privateHeaders(otherCsrf))
      .send({ displayName: 'forbidden' })
      .expect(404);
  });

  it('runs vehicle document lifecycle, reminders, and IDOR against PostgreSQL', async () => {
    const created = await owner
      .post(`/api/v1/vehicles/${vehicleA}/documents`)
      .set(privateHeaders(ownerCsrf))
      .send({
        type: 'PERIODIC_INSPECTION',
        displayName: 'Runtime inspection',
        referenceNumber: 'SYNTHETIC-RUNTIME-001',
        issuedAt: '2026-01-01',
        expiresAt: '2027-01-01',
        reminderDaysBefore: [30, 15, 7, 1],
      })
      .expect(201);
    documentId = created.body.id;
    expect(created.body.reminders.filter((item: { enabled: boolean }) => item.enabled)).toHaveLength(4);
    await owner
      .patch(`/api/v1/vehicles/${vehicleA}/documents/${documentId}`)
      .set(privateHeaders(ownerCsrf))
      .send({ expiresAt: '2027-02-01' })
      .expect(200);
    await owner
      .delete(`/api/v1/vehicles/${vehicleA}/documents/${documentId}`)
      .set(privateHeaders(ownerCsrf))
      .expect(200);
    await owner
      .post(`/api/v1/vehicles/${vehicleA}/documents/${documentId}/restore`)
      .set(privateHeaders(ownerCsrf))
      .send({})
      .expect(201);
    await other.get(`/api/v1/vehicles/${vehicleA}/documents/${documentId}`).expect(404);
    await other
      .patch(`/api/v1/vehicles/${vehicleA}/documents/${documentId}`)
      .set(privateHeaders(otherCsrf))
      .send({ displayName: 'forbidden' })
      .expect(404);
    await other
      .delete(`/api/v1/vehicles/${vehicleA}/documents/${documentId}`)
      .set(privateHeaders(otherCsrf))
      .expect(404);
    await other
      .post(`/api/v1/vehicles/${vehicleA}/documents/${documentId}/restore`)
      .set(privateHeaders(otherCsrf))
      .send({})
      .expect(404);
  });

  it('keeps production CSGT monitoring manual-only without runs, snapshots, or schedules', async () => {
    const enabled = await owner
      .post(`/api/v1/vehicles/${vehicleA}/monitoring/enable`)
      .set(privateHeaders(ownerCsrf))
      .send({})
      .expect(201);
    expect(enabled.body).toMatchObject({
      enabled: true,
      capability: 'MANUAL_ONLY',
      effectiveStatus: 'ENABLED_BUT_MANUAL',
      automaticChecksAvailable: false,
      lastSuccessfulCheckAt: null,
      nextEligibleCheckAt: null,
    });
    const monitoring = await prisma.vehicleMonitoring.findUniqueOrThrow({
      where: { vehicleId_monitoringType: { vehicleId: vehicleA, monitoringType: 'TRAFFIC_FINE' } },
    });
    expect(await prisma.vehicleMonitoringRun.count({ where: { monitoringId: monitoring.id } })).toBe(0);
    expect(await prisma.vehicleMonitoringSnapshot.findUnique({ where: { monitoringId: monitoring.id } })).toBeNull();
  });

  it('serves imported public lookups and truthful manual traffic-fine behavior', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/phone-prefixes/086')
      .expect(200)
      .expect(({ body }) => expect(body.prefix).toBe('086'));
    await request(app.getHttpServer()).get('/api/v1/phone-prefixes/999').expect(404);
    await request(app.getHttpServer())
      .get('/api/v1/area-codes/028')
      .expect(200)
      .expect(({ body }) => expect(body.code).toBe('028'));
    await request(app.getHttpServer()).get('/api/v1/area-codes/099').expect(404);
    await request(app.getHttpServer())
      .get('/api/v1/vehicle-plates/51')
      .expect(200)
      .expect(({ body }) => expect(body.parsed.numericPrefix).toBe('51'));
    await request(app.getHttpServer()).get('/api/v1/vehicle-plates/42').expect(404);
    await request(app.getHttpServer())
      .post('/api/v1/traffic-fines/lookup')
      .send({ licensePlate: '51K-900.01', vehicleType: 'CAR' })
      .expect(200)
      .expect(({ body }) => expect(body.outcome).toBe('MANUAL_VERIFICATION_REQUIRED'));
  });
});
