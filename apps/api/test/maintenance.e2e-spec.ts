import { NotFoundException, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { MaintenanceService } from '../src/maintenance/maintenance.service.js';
import { FakeAuthPrisma } from './fixtures/auth-prisma.js';

function cookieValue(response: request.Response, name: string): string {
  const values = response.headers['set-cookie'] as unknown as string[] | undefined;
  const raw = values
    ?.find((value) => value.startsWith(`${name}=`))
    ?.split(';', 1)[0]
    .slice(name.length + 1);
  if (!raw) throw new Error(`Missing ${name}`);
  return decodeURIComponent(raw);
}

describe('Maintenance privacy (e2e)', () => {
  let app: INestApplication;
  let owner: ReturnType<typeof request.agent>;
  let stranger: ReturnType<typeof request.agent>;
  let ownerCsrf = '';
  let strangerCsrf = '';
  let ownerId = '';
  const vehicleId = '11111111-1111-4111-8111-111111111111';
  const otherVehicleId = '44444444-4444-4444-8444-444444444444';
  const historyId = '22222222-2222-4222-8222-222222222222';
  const planId = '33333333-3333-4333-8333-333333333333';
  const history = {
    id: historyId,
    vehicleId,
    title: 'Oil service',
    category: 'Engine',
    serviceDate: '2026-09-21',
    odometerKm: 50000,
    totalCostVnd: '0',
    workshop: null,
    notes: null,
    status: 'ACTIVE',
    archivedAt: null,
    completedPlanId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as const;
  const plan = {
    id: planId,
    vehicleId,
    title: 'Brake inspection',
    dueDate: '2026-10-01',
    dueOdometerKm: null,
    notes: null,
    status: 'ACTIVE',
    dueStatus: 'DUE_SOON',
    currentOdometerKm: 50000,
    completedAt: null,
    completionHistoryId: null,
    archivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as const;
  const owned = (userId: string, requestedVehicleId: string) => {
    if (userId !== ownerId || requestedVehicleId !== vehicleId)
      throw new NotFoundException('Maintenance record not found.');
    return true;
  };
  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    const service = {
      listHistory: async (userId: string, requestedVehicleId: string) => {
        owned(userId, requestedVehicleId);
        return { items: [history], page: 1, pageSize: 20, total: 1 };
      },
      getHistory: async (userId: string, requestedVehicleId: string) => {
        owned(userId, requestedVehicleId);
        return history;
      },
      createHistory: async (userId: string, requestedVehicleId: string) => {
        owned(userId, requestedVehicleId);
        return history;
      },
      updateHistory: async (userId: string, requestedVehicleId: string) => {
        owned(userId, requestedVehicleId);
        return history;
      },
      archiveHistory: async (userId: string, requestedVehicleId: string) => {
        owned(userId, requestedVehicleId);
        return history;
      },
      restoreHistory: async (userId: string, requestedVehicleId: string) => {
        owned(userId, requestedVehicleId);
        return history;
      },
      listPlans: async (userId: string, requestedVehicleId: string) => {
        owned(userId, requestedVehicleId);
        return { items: [plan], page: 1, pageSize: 20, total: 1 };
      },
      getPlan: async (userId: string, requestedVehicleId: string) => {
        owned(userId, requestedVehicleId);
        return plan;
      },
      createPlan: async (userId: string, requestedVehicleId: string) => {
        owned(userId, requestedVehicleId);
        return plan;
      },
      updatePlan: async (userId: string, requestedVehicleId: string) => {
        owned(userId, requestedVehicleId);
        return plan;
      },
      archivePlan: async (userId: string, requestedVehicleId: string) => {
        owned(userId, requestedVehicleId);
        return plan;
      },
      restorePlan: async (userId: string, requestedVehicleId: string) => {
        owned(userId, requestedVehicleId);
        return plan;
      },
      completePlan: async (userId: string, requestedVehicleId: string) => {
        owned(userId, requestedVehicleId);
        return {
          plan: { ...plan, status: 'COMPLETED', completedAt: new Date().toISOString(), completionHistoryId: historyId },
          history: { ...history, completedPlanId: planId },
        };
      },
      summary: async (userId: string, requestedVehicleId: string) => {
        owned(userId, requestedVehicleId);
        return {
          activeHistoryCount: 1,
          activePlanCount: 1,
          duePlanCount: 0,
          dueSoonPlanCount: 1,
          totalCostVnd: '0',
          unknownCostHistoryCount: 0,
          latestServiceDate: '2026-09-21',
        };
      },
    };
    const fixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(new FakeAuthPrisma())
      .overrideProvider(MaintenanceService)
      .useValue(service)
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
        .send({ email: 'maintenance-owner@example.com', password: 'correct horse battery staple' })
        .expect(201),
      'tn_csrf',
    );
    strangerCsrf = cookieValue(
      await stranger
        .post('/api/v1/auth/register')
        .send({ email: 'maintenance-stranger@example.com', password: 'correct horse battery staple' })
        .expect(201),
      'tn_csrf',
    );
    ownerId = (await owner.get('/api/v1/auth/me').expect(200)).body.id;
  });
  afterAll(async () => app.close());

  it('requires auth/CSRF, keeps responses private, and safely handles owner and wrong-vehicle access', async () => {
    const base = `/api/v1/vehicles/${vehicleId}/maintenance`;
    await request(app.getHttpServer()).get(`${base}/history`).expect(401);
    await owner.post(`${base}/history`).send({ title: 'x', category: 'x', serviceDate: '2026-09-21' }).expect(403);
    await owner
      .post(`${base}/history`)
      .set('Origin', 'https://evil.example')
      .set('X-CSRF-Token', ownerCsrf)
      .send({ title: 'x', category: 'x', serviceDate: '2026-09-21' })
      .expect(403);
    await owner
      .post(`${base}/history`)
      .set('X-CSRF-Token', ownerCsrf)
      .send({ title: 'Oil service', category: 'Engine', serviceDate: '2026-09-21', totalCostVnd: '0' })
      .expect(201)
      .expect(({ headers }) => expect(headers['cache-control']).toBe('private, no-store'));
    await stranger.get(`${base}/history/${historyId}`).expect(404);
    await stranger
      .patch(`${base}/history/${historyId}`)
      .set('X-CSRF-Token', strangerCsrf)
      .send({ title: 'x' })
      .expect(404);
    await stranger
      .post(`${base}/plans/${planId}/complete`)
      .set('X-CSRF-Token', strangerCsrf)
      .send({ serviceDate: '2026-09-21', category: 'Engine' })
      .expect(404);
    await owner.get(`/api/v1/vehicles/${otherVehicleId}/maintenance/plans`).expect(404);
    expect(ownerId).toBeTruthy();
  });
});
