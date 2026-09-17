import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';
const rollback = new Error('rollback');
let client: PrismaClient;
beforeAll(async () => {
  const raw = process.env.TEST_DATABASE_URL;
  if (!raw || process.env.NODE_ENV === 'production') throw new Error('An explicit local test database is required.');
  const url = new URL(raw);
  if (
    url.protocol !== 'postgresql:' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.pathname !== '/tranhanh_test'
  )
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
    data: { email: `${randomUUID()}@example.test`, passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$fixture$fixture' },
  });
  const vehicle = await tx.vehicle.create({
    data: {
      userId: user.id,
      displayName: 'Test',
      licensePlate: '51K-123.45',
      normalizedLicensePlate: '51K12345',
      vehicleType: 'CAR',
    },
  });
  return { user, vehicle };
}
describe('PostgreSQL vehicle monitoring invariants', () => {
  it('enforces one monitoring type per vehicle and nonnegative failures', () =>
    isolated(async (tx) => {
      const { user, vehicle } = await fixture(tx);
      const base = {
        userId: user.id,
        vehicleId: vehicle.id,
        monitoringType: 'TRAFFIC_FINE' as const,
        providerKey: 'test-provider',
        capability: 'AUTOMATED' as const,
      };
      await tx.vehicleMonitoring.create({ data: base });
      await expect(tx.vehicleMonitoring.create({ data: base })).rejects.toMatchObject({ code: 'P2002' });
      await expect(
        tx.vehicleMonitoring.update({
          where: { vehicleId_monitoringType: { vehicleId: vehicle.id, monitoringType: 'TRAFFIC_FINE' } },
          data: { failureCount: -1 },
        }),
      ).rejects.toThrow();
    }));
  it('enforces that the monitoring owner matches the vehicle owner', () =>
    isolated(async (tx) => {
      const owned = await fixture(tx);
      const stranger = await tx.user.create({
        data: {
          email: `${randomUUID()}@example.test`,
          passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$fixture$fixture',
        },
      });
      await expect(
        tx.vehicleMonitoring.create({
          data: {
            userId: stranger.id,
            vehicleId: owned.vehicle.id,
            monitoringType: 'TRAFFIC_FINE',
            providerKey: 'test-provider',
            capability: 'AUTOMATED',
          },
        }),
      ).rejects.toMatchObject({ code: 'P2003' });
    }));

  it('rejects a disabled monitor with a scheduled check', () =>
    isolated(async (tx) => {
      const { user, vehicle } = await fixture(tx);
      await expect(
        tx.vehicleMonitoring.create({
          data: {
            userId: user.id,
            vehicleId: vehicle.id,
            monitoringType: 'TRAFFIC_FINE',
            providerKey: 'test-provider',
            capability: 'AUTOMATED',
            nextEligibleCheckAt: new Date(),
          },
        }),
      ).rejects.toThrow();
    }));
  it('enforces snapshot count and cascades private monitor data with vehicle deletion', () =>
    isolated(async (tx) => {
      const { user, vehicle } = await fixture(tx);
      const monitor = await tx.vehicleMonitoring.create({
        data: {
          userId: user.id,
          vehicleId: vehicle.id,
          monitoringType: 'TRAFFIC_FINE',
          providerKey: 'test-provider',
          capability: 'AUTOMATED',
        },
      });
      await expect(
        tx.vehicleMonitoringSnapshot.create({
          data: {
            monitoringId: monitor.id,
            providerKey: 'test-provider',
            fingerprints: ['a'],
            resultCount: 0,
            retrievedAt: new Date(),
          },
        }),
      ).rejects.toThrow();
      await tx.vehicle.delete({ where: { id: vehicle.id } });
      expect(await tx.vehicleMonitoring.findUnique({ where: { id: monitor.id } })).toBeNull();
    }));
  it('stores no duplicated plate column in any monitoring table', async () => {
    const columns = await client.$queryRaw<
      Array<{ column_name: string }>
    >`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name LIKE 'VehicleMonitoring%'`;
    expect(columns.map((row) => row.column_name)).not.toContain('licensePlate');
    expect(columns.map((row) => row.column_name)).not.toContain('normalizedLicensePlate');
  });
});
