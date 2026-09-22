import { NotFoundException, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import type {
  VehicleExpenseLedgerResult,
  VehicleExpenseListResult,
  VehicleExpenseResult,
  VehicleExpenseSummary,
} from '@tranhanh/shared';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { VehicleExpenseService } from '../src/vehicle-expenses/vehicle-expenses.service.js';
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

describe('Vehicle expense privacy (e2e)', () => {
  let app: INestApplication;
  let owner: ReturnType<typeof request.agent>;
  let stranger: ReturnType<typeof request.agent>;
  let ownerCsrf = '';
  let strangerCsrf = '';
  let ownerId = '';
  const vehicleId = '11111111-1111-4111-8111-111111111111';
  const otherVehicleId = '44444444-4444-4444-8444-444444444444';
  const expenseId = '22222222-2222-4222-8222-222222222222';
  const expense: VehicleExpenseResult = {
    id: expenseId,
    vehicleId,
    category: 'PARKING',
    title: 'Parking',
    expenseDate: '2026-09-21',
    totalCostVnd: '0',
    notes: null,
    status: 'ACTIVE',
    archivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const ledger: VehicleExpenseLedgerResult = {
    items: [
      {
        source: 'MANUAL',
        sourceId: expenseId,
        originalId: expenseId,
        vehicleId,
        category: 'PARKING',
        date: '2026-09-21',
        title: 'Parking',
        totalCostVnd: '0',
        status: 'ACTIVE',
        sourcePath: `/expenses/manual/${expenseId}`,
      },
    ],
    page: 1,
    pageSize: 20,
    total: 1,
  };
  const manual: VehicleExpenseListResult = { items: [expense], page: 1, pageSize: 20, total: 1 };
  const summary: VehicleExpenseSummary = {
    month: '2026-09',
    recordedTotalCostVnd: '0',
    totalCostVnd: '0',
    totalCount: 1,
    fuel: { count: 0, recordedTotalCostVnd: '0', unknownCostCount: 0 },
    maintenance: { count: 0, recordedTotalCostVnd: '0', unknownCostCount: 0 },
    manual: { count: 1, recordedTotalCostVnd: '0', unknownCostCount: 0 },
    bySource: {
      FUEL: { count: 0, recordedTotalCostVnd: '0', unknownCostCount: 0 },
      MAINTENANCE: { count: 0, recordedTotalCostVnd: '0', unknownCostCount: 0 },
      MANUAL: { count: 1, recordedTotalCostVnd: '0', unknownCostCount: 0 },
    },
    byCategory: [{ category: 'PARKING', count: 1, recordedTotalCostVnd: '0', unknownCostCount: 0 }],
    unknownMaintenanceCostCount: 0,
    incomplete: false,
  };
  const owned = (userId: string, requestedVehicleId: string) => {
    if (userId !== ownerId || requestedVehicleId !== vehicleId) throw new NotFoundException('Vehicle not found.');
  };

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    const service = {
      listLedger: async (userId: string, requestedVehicleId: string) => {
        owned(userId, requestedVehicleId);
        return ledger;
      },
      summary: async (userId: string, requestedVehicleId: string) => {
        owned(userId, requestedVehicleId);
        return summary;
      },
      listManual: async (userId: string, requestedVehicleId: string) => {
        owned(userId, requestedVehicleId);
        return manual;
      },
      getManual: async (userId: string, requestedVehicleId: string) => {
        owned(userId, requestedVehicleId);
        return expense;
      },
      createManual: async (userId: string, requestedVehicleId: string) => {
        owned(userId, requestedVehicleId);
        return expense;
      },
      updateManual: async (userId: string, requestedVehicleId: string) => {
        owned(userId, requestedVehicleId);
        return expense;
      },
      archiveManual: async (userId: string, requestedVehicleId: string) => {
        owned(userId, requestedVehicleId);
        return { ...expense, status: 'ARCHIVED', archivedAt: new Date().toISOString() };
      },
      restoreManual: async (userId: string, requestedVehicleId: string) => {
        owned(userId, requestedVehicleId);
        return expense;
      },
    };
    const fixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(new FakeAuthPrisma())
      .overrideProvider(VehicleExpenseService)
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
        .send({ email: 'expense-owner@example.com', password: 'correct horse battery staple' })
        .expect(201),
      'tn_csrf',
    );
    strangerCsrf = cookieValue(
      await stranger
        .post('/api/v1/auth/register')
        .send({ email: 'expense-stranger@example.com', password: 'correct horse battery staple' })
        .expect(201),
      'tn_csrf',
    );
    ownerId = (await owner.get('/api/v1/auth/me').expect(200)).body.id;
  });

  afterAll(async () => app.close());

  it('requires access auth/CSRF, validates manual-only inputs, and keeps owner scope private', async () => {
    const base = `/api/v1/vehicles/${vehicleId}/expenses`;
    await request(app.getHttpServer()).get(base).expect(401);
    await owner.post(`${base}/manual`).send({ title: 'x' }).expect(403);
    await owner
      .post(`${base}/manual`)
      .set('Origin', 'https://evil.example')
      .set('X-CSRF-Token', ownerCsrf)
      .send({ category: 'PARKING', title: 'Parking', expenseDate: '2026-09-21', totalCostVnd: '0' })
      .expect(403);
    await owner
      .post(`${base}/manual`)
      .set('X-CSRF-Token', ownerCsrf)
      .send({ category: 'FUEL', title: 'Fuel', expenseDate: '2026-09-21', totalCostVnd: '1' })
      .expect(400);
    await owner
      .post(`${base}/manual`)
      .set('X-CSRF-Token', ownerCsrf)
      .send({ category: 'PARKING', title: 'Parking', expenseDate: '2026-09-21', totalCostVnd: '0' })
      .expect(201)
      .expect(({ headers }) => expect(headers['cache-control']).toBe('private, no-store'));
    await stranger.get(`${base}/manual/${expenseId}`).expect(404);
    await stranger
      .patch(`${base}/manual/${expenseId}`)
      .set('X-CSRF-Token', strangerCsrf)
      .send({ title: 'x' })
      .expect(404);
    await owner.get(`/api/v1/vehicles/${otherVehicleId}/expenses/summary?month=2026-09`).expect(404);
    expect(ownerId).toBeTruthy();
  });
});
