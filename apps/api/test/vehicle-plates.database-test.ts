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
async function isolated(
  check: (tx: Prisma.TransactionClient, fixture: ReturnType<typeof vehiclePlateDatasetFixture>) => Promise<void>,
) {
  const fixture = vehiclePlateDatasetFixture();
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
      const before = await tx.vehiclePlateAllocation.findUniqueOrThrow({ where: { key: '51-current' } });
      expect(await applyVehiclePlateDataset(tx, fixture, new Date())).toEqual({
        read: 1,
        created: 0,
        updated: 0,
        skipped: 1,
      });
      const after = await tx.vehiclePlateAllocation.findUniqueOrThrow({
        where: { key: '51-current' },
        include: vehiclePlateInclude,
      });
      expect(after.importedAt).toEqual(before.importedAt);
      expect(vehiclePlateResult(after)).toMatchObject({
        numericPrefix: '51',
        previousTargets: [{ previousTarget: { name: 'Old Place' }, effectiveTo: '2025-07-01' }],
      });
    }));
  it('enforces allocation scope uniqueness', () =>
    isolated(async (tx) => {
      const row = await tx.vehiclePlateAllocation.findUniqueOrThrow({ where: { key: '51-current' } });
      await expect(
        tx.vehiclePlateAllocation.create({ data: { ...row, id: randomUUID(), key: `other-${randomUUID()}` } }),
      ).rejects.toMatchObject({ code: 'P2002' });
    }));
  it('enforces target and evidence foreign keys', () =>
    isolated(async (tx) => {
      await expect(
        tx.vehiclePlateAllocation.update({ where: { key: '51-current' }, data: { targetId: randomUUID() } }),
      ).rejects.toMatchObject({ code: 'P2003' });
      await expect(
        tx.vehiclePlateAllocation.update({ where: { key: '51-current' }, data: { sourceReferenceId: randomUUID() } }),
      ).rejects.toMatchObject({ code: 'P2003' });
    }));
  it('rejects malformed prefixes, series and reversed dates', () =>
    isolated(async (tx) => {
      await expect(
        tx.vehiclePlateAllocation.update({ where: { key: '51-current' }, data: { numericPrefix: '01' } }),
      ).rejects.toThrow();
      await expect(
        tx.vehiclePlateAllocation.update({ where: { key: '51-current' }, data: { seriesPrefix: 'I' } }),
      ).rejects.toThrow();
      await expect(
        tx.vehiclePlateAllocation.update({
          where: { key: '51-current' },
          data: { effectiveTo: new Date('2025-01-01') },
        }),
      ).rejects.toThrow();
    }));
  it('restricts deletion of targets and evidence with retained history', () =>
    isolated(async (tx, fixture) => {
      await expect(tx.vehiclePlateTarget.delete({ where: { key: 'old-place' } })).rejects.toMatchObject({
        code: 'P2003',
      });
      await expect(tx.sourceReference.delete({ where: { id: fixture.references[0].id } })).rejects.toMatchObject({
        code: 'P2003',
      });
    }));
});
