import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';
import { applyVehiclePlateDataset } from '../src/vehicle-plates/import-dataset.js';
import { vehiclePlateInclude, vehiclePlateResult } from '../src/vehicle-plates/vehicle-plates.service.js';
import { vehiclePlateDatasetFixture } from './fixtures/vehicle-plate-dataset.js';
let client: PrismaClient;
const rollback = new Error('Rollback vehicle-plate fixture');
beforeAll(async () => {
  const raw = process.env.TEST_DATABASE_URL;
  if (!raw || process.env.NODE_ENV === 'production') throw new Error('Explicit isolated test database required.');
  const u = new URL(raw);
  if (
    u.protocol !== 'postgresql:' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) ||
    u.pathname !== '/tranhanh_test' ||
    u.hash ||
    [...u.searchParams].some(([k, v]) => k !== 'schema' || v !== 'public')
  )
    throw new Error('Only local tranhanh_test with public schema is allowed.');
  client = new PrismaClient({ adapter: new PrismaPg({ connectionString: raw }) });
  await client.$connect();
});
afterAll(async () => client?.$disconnect());
async function freshFixture(): Promise<ReturnType<typeof vehiclePlateDatasetFixture>> {
  const numericPrefixes = Array.from({ length: 90 }, (_, index) => String(index + 10));
  const existing = await client.vehiclePlateAllocation.findMany({
    where: { numericPrefix: { in: numericPrefixes }, seriesPrefix: null },
    select: { numericPrefix: true },
  });
  const occupied = new Set(existing.map((row) => row.numericPrefix));
  const numericPrefix = numericPrefixes.find((prefix) => !occupied.has(prefix));
  if (numericPrefix) {
    return vehiclePlateDatasetFixture({ numericPrefix });
  }
  throw new Error('Unable to allocate a collision-free vehicle-plate fixture key without modifying existing data.');
}
async function isolated(
  check: (tx: Prisma.TransactionClient, fixture: ReturnType<typeof vehiclePlateDatasetFixture>) => Promise<void>,
) {
  const fixture = await freshFixture();
  try {
    await client.$transaction(
      async (tx) => {
        if (await tx.vehiclePlateAllocation.count({ where: { key: { in: fixture.allocations.map((x) => x.key) } } }))
          throw new Error('Fixture keys exist; refusing existing data.');
        await applyVehiclePlateDataset(tx, fixture, new Date('2020-01-02Z'));
        await check(tx, fixture);
        throw rollback;
      },
      { timeout: 15000 },
    );
  } catch (e) {
    if (e !== rollback) throw e;
  }
}
describe('vehicle-plate PostgreSQL invariants (not mocked)', () => {
  it('imports idempotently with joined evidence and history', () =>
    isolated(async (tx, fixture) => {
      const before = await tx.vehiclePlateAllocation.findUniqueOrThrow({ where: { key: fixture.allocations[0].key } });
      expect(await applyVehiclePlateDataset(tx, fixture, new Date())).toEqual({
        read: 1,
        created: 0,
        updated: 0,
        skipped: 1,
      });
      const after = await tx.vehiclePlateAllocation.findUniqueOrThrow({
        where: { key: fixture.allocations[0].key },
        include: vehiclePlateInclude,
      });
      expect(after.importedAt).toEqual(before.importedAt);
      expect(vehiclePlateResult(after)).toMatchObject({
        numericPrefix: fixture.allocations[0].numericPrefix,
        previousTargets: [{ previousTarget: { name: 'Old Place' }, effectiveTo: '2025-07-01' }],
      });
    }));
  it('enforces allocation scope uniqueness', () =>
    isolated(async (tx, fixture) => {
      const row = await tx.vehiclePlateAllocation.findUniqueOrThrow({ where: { key: fixture.allocations[0].key } });
      await expect(
        tx.vehiclePlateAllocation.create({ data: { ...row, id: randomUUID(), key: `other-${randomUUID()}` } }),
      ).rejects.toMatchObject({ code: 'P2002' });
    }));
  it('enforces target and evidence foreign keys', async () => {
    await isolated(async (tx, fixture) => {
      await expect(
        tx.vehiclePlateAllocation.update({
          where: { key: fixture.allocations[0].key },
          data: { targetId: randomUUID() },
        }),
      ).rejects.toMatchObject({ code: 'P2003' });
    });
    await isolated(async (tx, fixture) => {
      await expect(
        tx.vehiclePlateAllocation.update({
          where: { key: fixture.allocations[0].key },
          data: { sourceReferenceId: randomUUID() },
        }),
      ).rejects.toMatchObject({ code: 'P2003' });
    });
  });
  it('rejects malformed prefixes, series and reversed dates', async () => {
    await isolated(async (tx, fixture) => {
      await expect(
        tx.vehiclePlateAllocation.update({ where: { key: fixture.allocations[0].key }, data: { numericPrefix: '01' } }),
      ).rejects.toThrow();
    });
    await isolated(async (tx, fixture) => {
      await expect(
        tx.vehiclePlateAllocation.update({ where: { key: fixture.allocations[0].key }, data: { seriesPrefix: 'I' } }),
      ).rejects.toThrow();
    });
    await isolated(async (tx, fixture) => {
      await expect(
        tx.vehiclePlateAllocation.update({
          where: { key: fixture.allocations[0].key },
          data: { effectiveTo: new Date('2025-01-01') },
        }),
      ).rejects.toThrow();
    });
  });
  it('restricts deletion of targets and evidence with retained history', async () => {
    await isolated(async (tx, fixture) => {
      await expect(tx.vehiclePlateTarget.delete({ where: { key: fixture.targets[1].key } })).rejects.toMatchObject({
        code: 'P2003',
      });
    });
    await isolated(async (tx, fixture) => {
      await expect(tx.sourceReference.delete({ where: { id: fixture.references[0].id } })).rejects.toMatchObject({
        code: 'P2003',
      });
    });
  });
});
