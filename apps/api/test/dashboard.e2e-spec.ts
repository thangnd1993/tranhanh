import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { VehicleExpenseService } from '../src/vehicle-expenses/vehicle-expenses.service.js';
import { FakeAuthPrisma } from './fixtures/auth-prisma.js';

type ScopedWhere = {
  userId?: string;
  vehicleId?: string;
  status?: string;
  monitoringType?: string;
};
type ScopedRow = {
  userId: string;
  vehicleId: string;
  status: string;
  monitoringType?: string;
};

function scopedMatches(row: ScopedRow, where: ScopedWhere): boolean {
  if (where.userId && row.userId !== where.userId) return false;
  if (where.vehicleId && row.vehicleId !== where.vehicleId) return false;
  if (where.status && row.status !== where.status) return false;
  if (where.monitoringType && row.monitoringType !== where.monitoringType) return false;
  return true;
}

function cookieValue(response: request.Response, name: string): string {
  const values = response.headers['set-cookie'] as unknown as string[] | undefined;
  const raw = values
    ?.find((value) => value.startsWith(name + '='))
    ?.split(';', 1)[0]
    .slice(name.length + 1);
  if (!raw) throw new Error('Missing ' + name);
  return decodeURIComponent(raw);
}

function expenseSummary(month: string, totalCostVnd: string) {
  const source = { count: 0, recordedTotalCostVnd: '0', unknownCostCount: 0 };
  const manual = { count: totalCostVnd === '0' ? 0 : 1, recordedTotalCostVnd: totalCostVnd, unknownCostCount: 0 };
  return {
    month,
    recordedTotalCostVnd: totalCostVnd,
    totalCostVnd,
    totalCount: manual.count,
    fuel: source,
    maintenance: source,
    manual,
    bySource: { FUEL: source, MAINTENANCE: source, MANUAL: manual },
    byCategory:
      manual.count > 0
        ? [{ category: 'PARKING', count: 1, recordedTotalCostVnd: totalCostVnd, unknownCostCount: 0 }]
        : [],
    unknownMaintenanceCostCount: 0,
    incomplete: false,
  };
}

describe('Vehicle dashboard privacy (e2e)', () => {
  let app: INestApplication;
  let owner: ReturnType<typeof request.agent>;
  let stranger: ReturnType<typeof request.agent>;
  let ownerId = '';
  let strangerId = '';
  let ownerCsrf = '';
  let ownedVehicleId = '';
  let archivedVehicleId = '';
  let foreignVehicleId = '';
  const prisma = new FakeAuthPrisma();
  const documents: Array<ScopedRow & { expiresAt: Date | null }> = [];
  const maintenancePlans: Array<ScopedRow & { dueDate: Date | null; dueOdometerKm: number | null }> = [];
  const fuelRows: Array<
    ScopedRow & {
      id: string;
      refueledAt: Date;
      odometerKm: number;
      quantity: string;
      totalCostVnd: bigint;
      isFullTank: boolean;
    }
  > = [];
  const monitoringRows: Array<
    ScopedRow & {
      id: string;
      monitoringType: 'TRAFFIC_FINE';
      isEnabled: boolean;
      automationApprovedAt: Date | null;
      lastAttemptAt: Date | null;
      lastSuccessfulCheckAt: Date | null;
      nextEligibleCheckAt: Date | null;
      lastOutcome: null;
      failureCount: number;
      updatedAt: Date;
    }
  > = [];
  const expenseTotals = new Map<string, string>();

  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    prisma.vehicleDocument = {
      findMany: async ({ where }: { where: ScopedWhere }) =>
        documents.filter((row) => scopedMatches(row, where)).map((row) => ({ expiresAt: row.expiresAt })),
    };
    prisma.maintenancePlan = {
      findMany: async ({ where }: { where: ScopedWhere }) =>
        maintenancePlans
          .filter((row) => scopedMatches(row, where))
          .map((row) => ({ dueDate: row.dueDate, dueOdometerKm: row.dueOdometerKm })),
    };
    prisma.fuelLogEntry = {
      findMany: async ({ where }: { where: ScopedWhere }) => fuelRows.filter((row) => scopedMatches(row, where)),
    };
    prisma.vehicleMonitoring = {
      findFirst: async ({ where }: { where: ScopedWhere }) =>
        monitoringRows.find((row) => scopedMatches(row, where)) ?? null,
    };

    const fixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(VehicleExpenseService)
      .useValue({
        summary: async (_userId: string, vehicleId: string, month: string) =>
          expenseSummary(month, expenseTotals.get(vehicleId) ?? '0'),
      })
      .compile();
    app = fixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
    await app.init();
    owner = request.agent(app.getHttpServer());
    stranger = request.agent(app.getHttpServer());

    const ownerResponse = await owner
      .post('/api/v1/auth/register')
      .send({ email: 'dashboard-owner@example.com', password: 'correct horse battery staple' })
      .expect(201);
    ownerCsrf = cookieValue(ownerResponse, 'tn_csrf');
    ownerId = (await owner.get('/api/v1/auth/me').expect(200)).body.id;
    await stranger
      .post('/api/v1/auth/register')
      .send({ email: 'dashboard-stranger@example.com', password: 'correct horse battery staple' })
      .expect(201);
    strangerId = (await stranger.get('/api/v1/auth/me').expect(200)).body.id;

    const ownedVehicle = await prisma.vehicle.create({
      data: {
        userId: ownerId,
        displayName: 'Owner car',
        licensePlate: '51K-123.45',
        normalizedLicensePlate: '51K12345',
        vehicleType: 'CAR',
        currentOdometerKm: 12_000,
        isPrimary: true,
      },
    });
    const archivedVehicle = await prisma.vehicle.create({
      data: {
        userId: ownerId,
        displayName: 'Archived car',
        licensePlate: '51K-999.99',
        normalizedLicensePlate: '51K99999',
        vehicleType: 'CAR',
        currentOdometerKm: 90_000,
        isPrimary: false,
        status: 'ARCHIVED',
        archivedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    });
    const foreignVehicle = await prisma.vehicle.create({
      data: {
        userId: strangerId,
        displayName: 'Foreign car',
        licensePlate: '30A-888.88',
        normalizedLicensePlate: '30A88888',
        vehicleType: 'CAR',
        currentOdometerKm: 50_000,
        isPrimary: true,
      },
    });

    documents.push(
      {
        userId: ownerId,
        vehicleId: ownedVehicle.id,
        status: 'ACTIVE',
        expiresAt: new Date('2099-01-01T00:00:00.000Z'),
      },
      {
        userId: ownerId,
        vehicleId: archivedVehicle.id,
        status: 'ACTIVE',
        expiresAt: new Date('2020-01-01T00:00:00.000Z'),
      },
      {
        userId: strangerId,
        vehicleId: foreignVehicle.id,
        status: 'ACTIVE',
        expiresAt: new Date('2020-01-01T00:00:00.000Z'),
      },
    );
    maintenancePlans.push(
      {
        userId: ownerId,
        vehicleId: ownedVehicle.id,
        status: 'ACTIVE',
        dueDate: null,
        dueOdometerKm: 13_000,
      },
      {
        userId: ownerId,
        vehicleId: archivedVehicle.id,
        status: 'ACTIVE',
        dueDate: new Date('2020-01-01T00:00:00.000Z'),
        dueOdometerKm: null,
      },
      {
        userId: strangerId,
        vehicleId: foreignVehicle.id,
        status: 'ACTIVE',
        dueDate: new Date('2020-01-01T00:00:00.000Z'),
        dueOdometerKm: null,
      },
    );
    fuelRows.push(
      {
        userId: ownerId,
        vehicleId: ownedVehicle.id,
        status: 'ACTIVE',
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        refueledAt: new Date('2026-09-10T00:00:00.000Z'),
        odometerKm: 12_000,
        quantity: '10.000',
        totalCostVnd: 123_000n,
        isFullTank: true,
      },
      {
        userId: ownerId,
        vehicleId: archivedVehicle.id,
        status: 'ACTIVE',
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        refueledAt: new Date('2026-09-10T00:00:00.000Z'),
        odometerKm: 90_000,
        quantity: '100.000',
        totalCostVnd: 9_999_999n,
        isFullTank: true,
      },
      {
        userId: strangerId,
        vehicleId: foreignVehicle.id,
        status: 'ACTIVE',
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        refueledAt: new Date('2026-09-10T00:00:00.000Z'),
        odometerKm: 50_000,
        quantity: '100.000',
        totalCostVnd: 8_888_888n,
        isFullTank: true,
      },
    );
    monitoringRows.push(
      {
        userId: ownerId,
        vehicleId: archivedVehicle.id,
        status: 'ACTIVE',
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        monitoringType: 'TRAFFIC_FINE',
        isEnabled: true,
        automationApprovedAt: null,
        lastAttemptAt: null,
        lastSuccessfulCheckAt: null,
        nextEligibleCheckAt: null,
        lastOutcome: null,
        failureCount: 0,
        updatedAt: new Date('2026-09-10T00:00:00.000Z'),
      },
      {
        userId: strangerId,
        vehicleId: foreignVehicle.id,
        status: 'ACTIVE',
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        monitoringType: 'TRAFFIC_FINE',
        isEnabled: true,
        automationApprovedAt: null,
        lastAttemptAt: null,
        lastSuccessfulCheckAt: null,
        nextEligibleCheckAt: null,
        lastOutcome: null,
        failureCount: 0,
        updatedAt: new Date('2026-09-10T00:00:00.000Z'),
      },
    );
    expenseTotals.set(ownedVehicle.id, '456000');
    expenseTotals.set(archivedVehicle.id, '9999999');
    expenseTotals.set(foreignVehicle.id, '8888888');

    ownedVehicleId = ownedVehicle.id;
    archivedVehicleId = archivedVehicle.id;
    foreignVehicleId = foreignVehicle.id;
  });

  afterAll(async () => app.close());

  it('validates month and UUID, selects only active owner data, and keeps private response headers', async () => {
    await owner.get('/api/v1/vehicles/dashboard?vehicleId=not-a-uuid').expect(400);
    await owner.get('/api/v1/vehicles/dashboard?month=2026-13').expect(400);
    await owner
      .get('/api/v1/vehicles/dashboard?month=2026-09')
      .expect(200)
      .expect(({ body, headers }) => {
        expect(body).toMatchObject({
          month: '2026-09',
          activeVehicleCount: 1,
          vehicles: [{ id: ownedVehicleId, displayName: 'Owner car' }],
          selectedVehicle: { id: ownedVehicleId, currentOdometerKm: 12_000 },
          documentAttention: { expired: 0, expiringSoon: 0, nextExpiry: '2099-01-01' },
          maintenance: { activePlanCount: 1, duePlanCount: 0, dueSoonPlanCount: 1, unknownMileagePlanCount: 0 },
          expenses: { totalCostVnd: '456000', totalCount: 1 },
          fuel: { refuelCount: 1, totalCostVnd: '123000' },
          monitoring: null,
        });
        expect(body.vehicles).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({ displayName: 'Foreign car' }),
            expect.objectContaining({ displayName: 'Archived car' }),
          ]),
        );
        expect(headers['cache-control']).toBe('private, no-store');
        expect(headers['x-robots-tag']).toBe('noindex');
        expect(headers['referrer-policy']).toBe('no-referrer');
      });
  });

  it('returns one safe 404 for foreign and archived selection attempts', async () => {
    await stranger.get('/api/v1/vehicles/dashboard?vehicleId=' + ownedVehicleId).expect(404);
    await owner.get('/api/v1/vehicles/dashboard?vehicleId=' + foreignVehicleId).expect(404);
    await owner.get('/api/v1/vehicles/dashboard?vehicleId=' + archivedVehicleId).expect(404);
  });

  it('does not expose dashboard values before authentication', async () => {
    await request(app.getHttpServer()).get('/api/v1/vehicles/dashboard').expect(401);
    expect(ownerCsrf).toBeTruthy();
  });
});
