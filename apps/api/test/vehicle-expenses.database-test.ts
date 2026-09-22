import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';

import { VehicleExpenseService } from '../src/vehicle-expenses/vehicle-expenses.service.js';
const rollback = new Error('rollback');
let client: PrismaClient;

beforeAll(async () => {
  const raw = process.env.TEST_DATABASE_URL;
  if (!raw || process.env.NODE_ENV === 'production') throw new Error('An explicit local test database is required.');
  const url = new URL(raw);
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) || url.pathname !== '/tranhanh_test')
    throw new Error('Database integration tests require local tranhanh_test.');
  client = new PrismaClient({ adapter: new PrismaPg({ connectionString: raw }) });
  await client.$connect();
});

afterAll(async () => client?.$disconnect());

async function isolated(check: (tx: Prisma.TransactionClient) => Promise<void>) {
  try {
    await client.$transaction(async (tx) => {
      await check(tx);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}

async function fixture(tx: Prisma.TransactionClient) {
  const user = await tx.user.create({
    data: { email: `${randomUUID()}@example.test`, passwordHash: 'fixture' },
  });
  const vehicle = await tx.vehicle.create({
    data: {
      userId: user.id,
      displayName: 'Expense fixture vehicle',
      licensePlate: `51K-${Math.floor(Math.random() * 90000 + 10000)}`,
      normalizedLicensePlate: randomUUID().replaceAll('-', '').slice(0, 10),
      vehicleType: 'CAR',
    },
  });
  return { user, vehicle };
}

async function committedFixture() {
  return client.$transaction((tx) => fixture(tx));
}

async function removeFixture(userId: string, vehicleId: string) {
  await client.vehicle.delete({ where: { id: vehicleId } });
  await client.user.delete({ where: { id: userId } });
}
async function createFuel(
  userId: string,
  vehicleId: string,
  refueledAt: string,
  totalCostVnd: bigint,
  createdAt = new Date('2026-01-15T12:00:00.000Z'),
) {
  return client.fuelLogEntry.create({
    data: {
      userId,
      vehicleId,
      refueledAt: new Date(refueledAt),
      odometerKm: 100,
      quantity: '1.000',
      totalCostVnd,
      fuelProductKey: 'OTHER',
      customFuelLabel: 'Fixture fuel',
      isFullTank: true,
      createdAt,
    },
  });
}

async function createMaintenance(
  userId: string,
  vehicleId: string,
  serviceDate: string,
  totalCostVnd: bigint | undefined,
  createdAt = new Date('2026-01-15T12:00:00.000Z'),
) {
  return client.maintenanceHistory.create({
    data: {
      userId,
      vehicleId,
      title: 'Fixture maintenance',
      category: 'Fixture',
      serviceDate: new Date(serviceDate),
      ...(totalCostVnd === undefined ? {} : { totalCostVnd }),
      createdAt,
    },
  });
}

async function createManual(
  userId: string,
  vehicleId: string,
  expenseDate: string,
  totalCostVnd: bigint,
  createdAt = new Date('2026-01-15T12:00:00.000Z'),
) {
  return client.vehicleExpense.create({
    data: {
      userId,
      vehicleId,
      category: 'PARKING',
      title: 'Fixture manual',
      expenseDate: new Date(expenseDate),
      totalCostVnd,
      createdAt,
    },
  });
}

async function expectConstraint(action: Promise<unknown>, constraint: string) {
  await expect(action).rejects.toMatchObject({ code: 'P2039' });
  try {
    await action;
  } catch (error) {
    expect(String(error)).toContain(constraint);
  }
}

describe('PostgreSQL vehicle expense invariants', () => {
  it('enforces composite owner and vehicle ownership', () =>
    isolated(async (tx) => {
      const { vehicle } = await fixture(tx);
      const stranger = await tx.user.create({
        data: { email: `${randomUUID()}@example.test`, passwordHash: 'fixture' },
      });
      await expect(
        tx.vehicleExpense.create({
          data: {
            userId: stranger.id,
            vehicleId: vehicle.id,
            category: 'PARKING',
            title: 'Wrong owner',
            expenseDate: new Date('2026-09-21'),
            totalCostVnd: 100n,
          },
        }),
      ).rejects.toMatchObject({ code: 'P2003' });
    }));

  it('preserves exact zero and the maximum safe VND amount while rejecting negative values', () =>
    isolated(async (tx) => {
      const { user, vehicle } = await fixture(tx);
      const zero = await tx.vehicleExpense.create({
        data: {
          userId: user.id,
          vehicleId: vehicle.id,
          category: 'OTHER',
          title: 'Zero',
          expenseDate: new Date('2026-09-21'),
          totalCostVnd: 0n,
        },
      });
      const maximum = await tx.vehicleExpense.create({
        data: {
          userId: user.id,
          vehicleId: vehicle.id,
          category: 'TOLL',
          title: 'Maximum',
          expenseDate: new Date('2026-09-21'),
          totalCostVnd: 9999999999999999n,
        },
      });
      expect(zero.totalCostVnd).toBe(0n);
      expect(maximum.totalCostVnd).toBe(9999999999999999n);
      await expectConstraint(
        tx.vehicleExpense.create({
          data: {
            userId: user.id,
            vehicleId: vehicle.id,
            category: 'OTHER',
            title: 'Negative',
            expenseDate: new Date('2026-09-21'),
            totalCostVnd: -1n,
          },
        }),
        'VehicleExpense_total_cost_check',
      );
    }));

  it('rejects an over-limit VND amount', () =>
    isolated(async (tx) => {
      const { user, vehicle } = await fixture(tx);
      await expectConstraint(
        tx.vehicleExpense.create({
          data: {
            userId: user.id,
            vehicleId: vehicle.id,
            category: 'OTHER',
            title: 'Overflow',
            expenseDate: new Date('2026-09-21'),
            totalCostVnd: 10000000000000000n,
          },
        }),
        'VehicleExpense_total_cost_check',
      );
    }));

  it('enforces nonblank titles', () =>
    isolated(async (tx) => {
      const { user, vehicle } = await fixture(tx);
      await expectConstraint(
        tx.vehicleExpense.create({
          data: {
            userId: user.id,
            vehicleId: vehicle.id,
            category: 'OTHER',
            title: '   ',
            expenseDate: new Date('2026-09-21'),
            totalCostVnd: 0n,
          },
        }),
        'VehicleExpense_title_check',
      );
    }));

  it('rejects archived expenses without an archive timestamp', () =>
    isolated(async (tx) => {
      const { user, vehicle } = await fixture(tx);
      await expectConstraint(
        tx.vehicleExpense.create({
          data: {
            userId: user.id,
            vehicleId: vehicle.id,
            category: 'OTHER',
            title: 'Missing archive timestamp',
            expenseDate: new Date('2026-09-21'),
            totalCostVnd: 0n,
            status: 'ARCHIVED',
          },
        }),
        'VehicleExpense_archive_check',
      );
    }));

  it('cascades expenses with private vehicle deletion', () =>
    isolated(async (tx) => {
      const { user, vehicle } = await fixture(tx);
      await tx.vehicleExpense.create({
        data: {
          userId: user.id,
          vehicleId: vehicle.id,
          category: 'INSURANCE',
          title: 'Insurance',
          expenseDate: new Date('2026-09-21'),
          totalCostVnd: 100n,
        },
      });
      await tx.vehicle.delete({ where: { id: vehicle.id } });
      expect(await tx.vehicleExpense.count({ where: { vehicleId: vehicle.id } })).toBe(0);
    }));
  it('aggregates Vietnam instant/date month boundaries without duplicate source costs', async () => {
    const { user, vehicle } = await committedFixture();
    try {
      const fuelYearBoundary = await createFuel(user.id, vehicle.id, '2025-12-31T17:00:00.000Z', 100n);
      const fuelMonthEnd = await createFuel(user.id, vehicle.id, '2026-01-31T16:59:59.999Z', 200n);
      const fuelAfterBoundary = await createFuel(user.id, vehicle.id, '2026-01-31T17:00:00.000Z', 900n);
      const maintenanceUnknown = await createMaintenance(user.id, vehicle.id, '2026-01-01', undefined);
      const maintenanceZero = await createMaintenance(user.id, vehicle.id, '2026-01-31', 0n);
      const maintenanceAfterMonth = await createMaintenance(user.id, vehicle.id, '2026-02-01', 500n);
      const manualInside = await createManual(user.id, vehicle.id, '2026-01-15', 400n);
      const manualAfterMonth = await createManual(user.id, vehicle.id, '2026-02-01', 800n);
      const service = new VehicleExpenseService(client as never);
      const summary = await service.summary(user.id, vehicle.id, '2026-01');
      expect(summary.recordedTotalCostVnd).toBe('700');
      expect(summary.totalCount).toBe(5);
      expect(summary.fuel).toMatchObject({ count: 2, recordedTotalCostVnd: '300', unknownCostCount: 0 });
      expect(summary.maintenance).toMatchObject({ count: 2, recordedTotalCostVnd: '0', unknownCostCount: 1 });
      expect(summary.manual).toMatchObject({ count: 1, recordedTotalCostVnd: '400', unknownCostCount: 0 });
      expect(summary.unknownMaintenanceCostCount).toBe(1);
      expect(summary.incomplete).toBe(true);
      const ledger = await service.listLedger(user.id, vehicle.id, {
        status: 'ACTIVE',
        month: '2026-01',
        page: 1,
        pageSize: 100,
      });
      expect(ledger.total).toBe(5);
      expect(ledger.items).toHaveLength(5);
      expect(ledger.items.map((item) => item.sourceId)).toEqual(
        expect.arrayContaining([
          fuelYearBoundary.id,
          fuelMonthEnd.id,
          maintenanceUnknown.id,
          maintenanceZero.id,
          manualInside.id,
        ]),
      );
      expect(ledger.items.map((item) => item.sourceId)).not.toContain(fuelAfterBoundary.id);
      expect(ledger.items.map((item) => item.sourceId)).not.toContain(maintenanceAfterMonth.id);
      expect(ledger.items.map((item) => item.sourceId)).not.toContain(manualAfterMonth.id);
    } finally {
      await removeFixture(user.id, vehicle.id);
    }
  });
  it('keeps mixed-source tie ordering across bounded pages', async () => {
    const { user, vehicle } = await committedFixture();
    try {
      const createdAt = new Date('2026-01-20T12:00:00.000Z');
      const fuel = await createFuel(user.id, vehicle.id, '2026-01-20T12:00:00.000Z', 100n, createdAt);
      const maintenance = await createMaintenance(user.id, vehicle.id, '2026-01-20', 200n, createdAt);
      const manual = await createManual(user.id, vehicle.id, '2026-01-20', 300n, createdAt);
      const service = new VehicleExpenseService(client as never);
      const full = await service.listLedger(user.id, vehicle.id, {
        status: 'ACTIVE',
        month: '2026-01',
        page: 1,
        pageSize: 100,
      });
      const first = await service.listLedger(user.id, vehicle.id, {
        status: 'ACTIVE',
        month: '2026-01',
        page: 1,
        pageSize: 2,
      });
      const second = await service.listLedger(user.id, vehicle.id, {
        status: 'ACTIVE',
        month: '2026-01',
        page: 2,
        pageSize: 2,
      });
      const combined = [...first.items, ...second.items];
      expect(first.total).toBe(3);
      expect(second.total).toBe(3);
      expect(full.items.map((item) => item.source)).toEqual(['MANUAL', 'MAINTENANCE', 'FUEL']);
      expect(first.items.map((item) => item.sourceId)).toEqual([manual.id, maintenance.id]);
      expect(second.items.map((item) => item.sourceId)).toEqual([fuel.id]);
      expect(combined.map((item) => item.sourceId)).toEqual(full.items.map((item) => item.sourceId));
      expect(new Set(combined.map((item) => item.sourceId)).size).toBe(combined.length);
    } finally {
      await removeFixture(user.id, vehicle.id);
    }
  });
  it('reflects source edits and lifecycle without mirrored expense rows', async () => {
    const { user, vehicle } = await committedFixture();
    try {
      const fuel = await createFuel(user.id, vehicle.id, '2026-09-21T08:00:00.000Z', 111n);
      const maintenance = await createMaintenance(user.id, vehicle.id, '2026-09-21', 222n);
      const service = new VehicleExpenseService(client as never);
      const manual = await service.createManual(user.id, vehicle.id, {
        category: 'PARKING',
        title: 'Service manual',
        expenseDate: '2026-09-21',
        totalCostVnd: '333',
      });
      await client.fuelLogEntry.update({ where: { id: fuel.id }, data: { totalCostVnd: 444n } });
      await client.maintenanceHistory.update({ where: { id: maintenance.id }, data: { totalCostVnd: 555n } });
      await service.updateManual(user.id, vehicle.id, manual.id, { totalCostVnd: '666' });
      let summary = await service.summary(user.id, vehicle.id, '2026-09');
      expect(summary.recordedTotalCostVnd).toBe('1665');
      expect(summary.totalCount).toBe(3);
      await client.fuelLogEntry.update({
        where: { id: fuel.id },
        data: { status: 'ARCHIVED', archivedAt: new Date() },
      });
      await client.maintenanceHistory.update({
        where: { id: maintenance.id },
        data: { status: 'ARCHIVED', archivedAt: new Date() },
      });
      await service.archiveManual(user.id, vehicle.id, manual.id);
      summary = await service.summary(user.id, vehicle.id, '2026-09');
      expect(summary.recordedTotalCostVnd).toBe('0');
      expect(summary.totalCount).toBe(0);
      await client.fuelLogEntry.update({ where: { id: fuel.id }, data: { status: 'ACTIVE', archivedAt: null } });
      await client.maintenanceHistory.update({
        where: { id: maintenance.id },
        data: { status: 'ACTIVE', archivedAt: null },
      });
      await service.restoreManual(user.id, vehicle.id, manual.id);
      summary = await service.summary(user.id, vehicle.id, '2026-09');
      expect(summary.recordedTotalCostVnd).toBe('1665');
      expect(summary.totalCount).toBe(3);
      expect(await client.fuelLogEntry.count({ where: { vehicleId: vehicle.id } })).toBe(1);
      expect(await client.maintenanceHistory.count({ where: { vehicleId: vehicle.id } })).toBe(1);
      expect(await client.vehicleExpense.count({ where: { vehicleId: vehicle.id } })).toBe(1);
      const ledger = await service.listLedger(user.id, vehicle.id, {
        status: 'ACTIVE',
        month: '2026-09',
        page: 1,
        pageSize: 100,
      });
      expect(new Set(ledger.items.map((item) => item.sourceId)).size).toBe(3);
    } finally {
      await removeFixture(user.id, vehicle.id);
    }
  });
});
