import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';
import { MaintenanceService } from '../src/maintenance/maintenance.service.js';

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

async function expectConstraint(action: Promise<unknown> | (() => Promise<unknown>), code: string, constraint: string) {
  let error: unknown;
  try {
    await (typeof action === 'function' ? action() : action);
  } catch (caught) {
    error = caught;
  }
  expect(error).toBeDefined();
  expect(error).toMatchObject({ code });
  expect(String(error)).toContain(constraint);
}
async function fixture(tx: Prisma.TransactionClient) {
  const user = await tx.user.create({
    data: { email: `${randomUUID()}@example.test`, passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$fixture$fixture' },
  });
  const vehicle = await tx.vehicle.create({
    data: {
      userId: user.id,
      displayName: 'Maintenance fixture vehicle',
      licensePlate: `51K-${Math.floor(Math.random() * 90000 + 10000)}`,
      normalizedLicensePlate: randomUUID().replaceAll('-', '').slice(0, 10),
      vehicleType: 'CAR',
    },
  });
  return { user, vehicle };
}

describe('PostgreSQL maintenance invariants', () => {
  it('enforces composite owner/vehicle relationships for history and plans', async () => {
    await isolated(async (tx) => {
      const { vehicle } = await fixture(tx);
      const stranger = await tx.user.create({ data: { email: `${randomUUID()}@example.test`, passwordHash: 'x' } });
      await expectConstraint(
        tx.maintenanceHistory.create({
          data: {
            userId: stranger.id,
            vehicleId: vehicle.id,
            title: 'Wrong owner',
            category: 'Other',
            serviceDate: new Date('2026-09-21'),
          },
        }),
        'P2003',
        'MaintenanceHistory_vehicleId_userId_fkey',
      );
    });

    await isolated(async (tx) => {
      const { vehicle } = await fixture(tx);
      const stranger = await tx.user.create({ data: { email: `${randomUUID()}@example.test`, passwordHash: 'x' } });
      await expectConstraint(
        tx.maintenancePlan.create({
          data: { userId: stranger.id, vehicleId: vehicle.id, title: 'Wrong owner', dueDate: new Date('2026-10-01') },
        }),
        'P2003',
        'MaintenancePlan_vehicleId_userId_fkey',
      );
    });
  });

  it('preserves null unknown cost separately from exact zero and enforces numeric bounds', () =>
    isolated(async (tx) => {
      const { user, vehicle } = await fixture(tx);
      const unknown = await tx.maintenanceHistory.create({
        data: {
          userId: user.id,
          vehicleId: vehicle.id,
          title: 'Unknown',
          category: 'Other',
          serviceDate: new Date('2026-09-21'),
        },
      });
      const zero = await tx.maintenanceHistory.create({
        data: {
          userId: user.id,
          vehicleId: vehicle.id,
          title: 'Zero',
          category: 'Other',
          serviceDate: new Date('2026-09-21'),
          totalCostVnd: 0n,
          odometerKm: 0,
        },
      });
      expect(unknown.totalCostVnd).toBeNull();
      expect(zero.totalCostVnd).toBe(0n);
      await expectConstraint(
        tx.maintenanceHistory.create({
          data: {
            userId: user.id,
            vehicleId: vehicle.id,
            title: 'Invalid',
            category: 'Other',
            serviceDate: new Date('2026-09-21'),
            totalCostVnd: -1n,
          },
        }),
        'P2039',
        'MaintenanceHistory_total_cost_check',
      );
    }));

  it('isolates the non-negative history odometer constraint', () =>
    isolated(async (tx) => {
      const { user, vehicle } = await fixture(tx);
      await expectConstraint(
        tx.maintenanceHistory.create({
          data: {
            userId: user.id,
            vehicleId: vehicle.id,
            title: 'Invalid odometer',
            category: 'Other',
            serviceDate: new Date('2026-09-21'),
            odometerKm: -1,
          },
        }),
        'P2039',
        'MaintenanceHistory_odometer_check',
      );
    }));

  it('requires a plan threshold and enforces lifecycle timestamps', () =>
    isolated(async (tx) => {
      const { user, vehicle } = await fixture(tx);
      await expectConstraint(
        tx.maintenancePlan.create({ data: { userId: user.id, vehicleId: vehicle.id, title: 'No threshold' } }),
        'P2039',
        'MaintenancePlan_due_check',
      );
    }));

  it('isolates archived plan lifecycle timestamp constraint', () =>
    isolated(async (tx) => {
      const { user, vehicle } = await fixture(tx);
      await expectConstraint(
        tx.maintenancePlan.create({
          data: {
            userId: user.id,
            vehicleId: vehicle.id,
            title: 'Archived without timestamp',
            dueDate: new Date('2026-10-01'),
            status: 'ARCHIVED',
          },
        }),
        'P2039',
        'MaintenancePlan_archive_check',
      );
    }));

  it('isolates completed plan link constraint', () =>
    isolated(async (tx) => {
      const { user, vehicle } = await fixture(tx);
      await expectConstraint(
        tx.maintenancePlan.create({
          data: {
            userId: user.id,
            vehicleId: vehicle.id,
            title: 'Completed without link',
            dueDate: new Date('2026-10-01'),
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        }),
        'P2039',
        'MaintenancePlan_completion_check',
      );
    }));

  it('cascades private history and plans with vehicle deletion', () =>
    isolated(async (tx) => {
      const { user, vehicle } = await fixture(tx);
      await tx.maintenanceHistory.create({
        data: {
          userId: user.id,
          vehicleId: vehicle.id,
          title: 'Service',
          category: 'Other',
          serviceDate: new Date('2026-09-21'),
        },
      });
      const plan = await tx.maintenancePlan.create({
        data: { userId: user.id, vehicleId: vehicle.id, title: 'Plan', dueOdometerKm: 1000 },
      });
      await tx.vehicle.delete({ where: { id: vehicle.id } });
      expect(await tx.maintenanceHistory.count({ where: { vehicleId: vehicle.id } })).toBe(0);
      expect(await tx.maintenancePlan.findUnique({ where: { id: plan.id } })).toBeNull();
    }));

  it('completes exactly once, raises odometer monotonically, and rolls back a broken completion', async () => {
    const user = await client.user.create({
      data: { email: `${randomUUID()}@example.test`, passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$fixture$fixture' },
    });
    const vehicle = await client.vehicle.create({
      data: {
        userId: user.id,
        displayName: 'Maintenance completion fixture',
        licensePlate: `51K-${Math.floor(Math.random() * 90000 + 10000)}`,
        normalizedLicensePlate: randomUUID().replaceAll('-', '').slice(0, 10),
        vehicleType: 'CAR',
        currentOdometerKm: 900,
      },
    });
    try {
      const service = new MaintenanceService(client as never);
      const plan = await client.maintenancePlan.create({
        data: { userId: user.id, vehicleId: vehicle.id, title: 'Completion plan', dueOdometerKm: 1000 },
      });
      const completed = await service.completePlan(user.id, vehicle.id, plan.id, {
        serviceDate: '2026-09-21',
        category: 'Engine',
        odometerKm: 1200,
        totalCostVnd: '0',
      });
      expect(completed.history.totalCostVnd).toBe('0');
      expect(completed.history.completedPlanId).toBe(plan.id);
      expect(completed.plan.status).toBe('COMPLETED');
      expect(completed.plan.completionHistoryId).toBe(completed.history.id);
      expect((await client.vehicle.findUniqueOrThrow({ where: { id: vehicle.id } })).currentOdometerKm).toBe(1200);

      const retry = await service.completePlan(user.id, vehicle.id, plan.id, {
        serviceDate: '2026-09-22',
        category: 'Different retry payload',
        odometerKm: 1000,
        totalCostVnd: '999',
      });
      expect(retry.history.id).toBe(completed.history.id);
      expect(retry.history.completedPlanId).toBe(plan.id);
      expect(await client.maintenanceHistory.count({ where: { vehicleId: vehicle.id } })).toBe(1);
      expect((await client.vehicle.findUniqueOrThrow({ where: { id: vehicle.id } })).currentOdometerKm).toBe(1200);

      const concurrentPlan = await client.maintenancePlan.create({
        data: { userId: user.id, vehicleId: vehicle.id, title: 'Concurrent completion plan', dueOdometerKm: 1300 },
      });
      const [first, second] = await Promise.all([
        service.completePlan(user.id, vehicle.id, concurrentPlan.id, {
          serviceDate: '2026-09-23',
          category: 'Engine',
          odometerKm: 1300,
        }),
        service.completePlan(user.id, vehicle.id, concurrentPlan.id, {
          serviceDate: '2026-09-24',
          category: 'Other',
          odometerKm: 1250,
        }),
      ]);
      expect(first.history.id).toBe(second.history.id);
      expect(await client.maintenanceHistory.count({ where: { vehicleId: vehicle.id } })).toBe(2);
      expect((await client.vehicle.findUniqueOrThrow({ where: { id: vehicle.id } })).currentOdometerKm).toBe(1300);

      const rollbackPlan = await client.maintenancePlan.create({
        data: { userId: user.id, vehicleId: vehicle.id, title: 'Rollback plan', dueOdometerKm: 2000 },
      });
      await expect(
        client.$transaction(async (tx) => {
          const history = await tx.maintenanceHistory.create({
            data: {
              userId: user.id,
              vehicleId: vehicle.id,
              title: 'Should roll back',
              category: 'Other',
              serviceDate: new Date('2026-09-21'),
            },
          });
          await tx.maintenancePlan.update({
            where: { id: rollbackPlan.id },
            data: { status: 'COMPLETED', completedAt: new Date(), completionHistoryId: randomUUID() },
          });
          return history;
        }),
      ).rejects.toThrow();
      expect(
        await client.maintenanceHistory.findFirst({ where: { vehicleId: vehicle.id, title: 'Should roll back' } }),
      ).toBeNull();
      expect(await client.maintenancePlan.findUnique({ where: { id: rollbackPlan.id } })).toMatchObject({
        status: 'ACTIVE',
        completionHistoryId: null,
      });

      await client.vehicle.update({
        where: { id: vehicle.id },
        data: { status: 'ARCHIVED', archivedAt: new Date() },
      });
      await expect(
        service.createHistory(user.id, vehicle.id, {
          title: 'Blocked on archived vehicle',
          category: 'Other',
          serviceDate: '2026-09-21',
        } as never),
      ).rejects.toMatchObject({ status: 404 });
      await expect(
        service.completePlan(user.id, vehicle.id, rollbackPlan.id, {
          serviceDate: '2026-09-21',
          category: 'Other',
        } as never),
      ).rejects.toMatchObject({ status: 404 });
      await expect(service.getHistory(user.id, vehicle.id, completed.history.id)).resolves.toMatchObject({
        id: completed.history.id,
      });
    } finally {
      await client.vehicle.delete({ where: { id: vehicle.id } });
      await client.user.delete({ where: { id: user.id } });
    }
  });
});
