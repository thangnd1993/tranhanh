import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';
import { applyAreaDataset } from '../src/area-codes/import-dataset.js';
import { areaInclude, areaResult } from '../src/area-codes/area-codes.service.js';
import { areaDatasetFixture } from './fixtures/area-dataset.js';

let client: PrismaClient;
const rollback = new Error('Rollback test-only area records');
beforeAll(async () => {
  const raw = process.env.TEST_DATABASE_URL;
  if (!raw || process.env.NODE_ENV === 'production') {
    throw new Error('Explicit isolated test database required.');
  }
  const url = new URL(raw);
  if (
    url.protocol !== 'postgresql:' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.pathname !== '/tranhanh_test' ||
    url.hash ||
    [...url.searchParams].some(([key, value]) => key !== 'schema' || value !== 'public')
  ) {
    throw new Error('Only local tranhanh_test with public schema is allowed.');
  }
  client = new PrismaClient({ adapter: new PrismaPg({ connectionString: raw }) });
  await client.$connect();
});
afterAll(async () => {
  await client?.$disconnect();
});

async function freshFixture(): Promise<ReturnType<typeof areaDatasetFixture>> {
  const currentCodes = Array.from({ length: 100 }, (_, index) => `02${String(index).padStart(2, '0')}`);
  const legacyCodes = Array.from({ length: 100 }, (_, index) => `01${String(index).padStart(2, '0')}`);
  const existing = await client.areaCode.findMany({
    where: { code: { in: [...currentCodes, ...legacyCodes] } },
    select: { code: true },
  });
  const occupied = new Set(existing.map((row) => row.code));
  const currentCode = currentCodes.find((code) => !occupied.has(code));
  const legacyCode = legacyCodes.find((code) => !occupied.has(code));
  if (currentCode && legacyCode) {
    return areaDatasetFixture({ currentCode, legacyCode });
  }
  throw new Error('Unable to allocate collision-free area-code fixture keys without modifying existing data.');
}
async function isolated(
  check: (tx: Prisma.TransactionClient, fixture: ReturnType<typeof areaDatasetFixture>) => Promise<void>,
): Promise<void> {
  const fixture = await freshFixture();
  try {
    await client.$transaction(
      async (tx) => {
        // Never touch pre-existing allocations, even in an explicitly selected test database.
        if (await tx.areaCode.count({ where: { code: { in: fixture.codes.map((x) => x.code) } } })) {
          throw new Error(
            'Fixture code keys already exist; select a clean test database without deleting existing data.',
          );
        }
        await applyAreaDataset(tx, fixture, new Date('2020-01-02T00:00:00Z'));
        await check(tx, fixture);
        throw rollback;
      },
      { timeout: 15000 },
    );
  } catch (error) {
    if (error !== rollback) {
      throw error;
    }
  }
}

describe('area-code PostgreSQL invariants (not mocked)', () => {
  it('imports twice without duplicate rows or changed code timestamps', () =>
    isolated(async (tx, fixture) => {
      const before = await tx.areaCode.findUniqueOrThrow({ where: { code: fixture.codes[0].code } });
      expect(await applyAreaDataset(tx, fixture, new Date())).toEqual({ read: 2, created: 0, updated: 0, skipped: 2 });
      const after = await tx.areaCode.findUniqueOrThrow({ where: { code: fixture.codes[0].code } });
      expect(after.updatedAt).toEqual(before.updatedAt);
      expect(after.importedAt).toEqual(before.importedAt);
      expect(await tx.sourceReference.count({ where: { id: fixture.references[0].id } })).toBe(1);
      expect(await tx.areaCodeMigration.count({ where: { sourceReferenceId: fixture.references[0].id } })).toBe(1);
    }));
  it('returns real joined evidence and old/current relations', () =>
    isolated(async (tx, fixture) => {
      const row = await tx.areaCode.findUniqueOrThrow({ where: { code: fixture.codes[1].code }, include: areaInclude });
      expect(areaResult(row)).toMatchObject({
        status: 'LEGACY',
        currentCode: fixture.codes[0].code,
        source: { publisher: 'Test-only publisher', title: 'Test-only evidence' },
      });
    }));
  it('enforces code uniqueness', () =>
    isolated(async (tx, fixture) => {
      const row = await tx.areaCode.findUniqueOrThrow({ where: { code: fixture.codes[0].code } });
      await expect(tx.areaCode.create({ data: { ...row, id: randomUUID() } })).rejects.toMatchObject({
        code: 'P2002',
      });
    }));
  it('enforces locality foreign keys', () =>
    isolated(async (tx, fixture) => {
      await expect(
        tx.areaCode.update({ where: { code: fixture.codes[0].code }, data: { localityId: randomUUID() } }),
      ).rejects.toMatchObject({ code: 'P2003' });
    }));
  it('enforces evidence foreign keys', () =>
    isolated(async (tx, fixture) => {
      await expect(
        tx.areaCode.update({ where: { code: fixture.codes[0].code }, data: { sourceReferenceId: randomUUID() } }),
      ).rejects.toMatchObject({ code: 'P2003' });
    }));
  it('enforces migration target relations', () =>
    isolated(async (tx, fixture) => {
      const old = await tx.areaCode.findUniqueOrThrow({ where: { code: fixture.codes[1].code } });
      await expect(
        tx.areaCodeMigration.update({ where: { oldCodeId: old.id }, data: { newCodeId: randomUUID() } }),
      ).rejects.toMatchObject({ code: 'P2003' });
    }));
  it('rejects duplicate historical mappings', () =>
    isolated(async (tx, fixture) => {
      const old = await tx.areaCode.findUniqueOrThrow({ where: { code: fixture.codes[1].code } });
      const current = await tx.areaCode.findUniqueOrThrow({ where: { code: fixture.codes[0].code } });
      await expect(
        tx.areaCodeMigration.create({
          data: { oldCodeId: old.id, newCodeId: current.id, sourceReferenceId: fixture.references[0].id },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
    }));
  it('preserves locality history on deletion', () =>
    isolated(async (tx, fixture) => {
      await expect(tx.telecomLocality.delete({ where: { key: fixture.localities[0].key } })).rejects.toMatchObject({
        code: 'P2003',
      });
    }));
  it('preserves evidence on deletion', () =>
    isolated(async (tx, fixture) => {
      await expect(tx.sourceReference.delete({ where: { id: fixture.references[0].id } })).rejects.toMatchObject({
        code: 'P2003',
      });
    }));
  it('preserves the replacement target on deletion', () =>
    isolated(async (tx, fixture) => {
      await expect(tx.areaCode.delete({ where: { code: fixture.codes[0].code } })).rejects.toMatchObject({
        code: 'P2003',
      });
    }));
  it('rejects impossible active legacy format at the database boundary', () =>
    isolated(async (tx, fixture) => {
      await expect(
        tx.areaCode.update({ where: { code: fixture.codes[1].code }, data: { status: 'ACTIVE' } }),
      ).rejects.toThrow();
    }));
  it('rejects reversed effective intervals', () =>
    isolated(async (tx, fixture) => {
      await expect(
        tx.areaCode.update({
          where: { code: fixture.codes[0].code },
          data: {
            effectiveFrom: new Date('2020-02-01Z'),
            effectiveTo: new Date('2020-01-01Z'),
          },
        }),
      ).rejects.toThrow();
    }));
  it('enforces telecom grouping foreign keys', () =>
    isolated(async (tx, fixture) => {
      await expect(
        tx.telecomLocality.update({ where: { key: fixture.localities[0].key }, data: { groupId: randomUUID() } }),
      ).rejects.toMatchObject({ code: 'P2003' });
    }));
  it('restricts deletion of a referenced telecom group', () =>
    isolated(async (tx, fixture) => {
      await expect(tx.telecomLocalityGroup.delete({ where: { key: fixture.groups[0].key } })).rejects.toMatchObject({
        code: 'P2003',
      });
    }));
  it('enforces locality key uniqueness', () =>
    isolated(async (tx, fixture) => {
      const row = await tx.telecomLocality.findUniqueOrThrow({ where: { key: fixture.localities[0].key } });
      await expect(tx.telecomLocality.create({ data: { ...row, id: randomUUID() } })).rejects.toMatchObject({
        code: 'P2002',
      });
    }));
  it('enforces grouping key uniqueness', () =>
    isolated(async (tx, fixture) => {
      const row = await tx.telecomLocalityGroup.findUniqueOrThrow({ where: { key: fixture.groups[0].key } });
      await expect(tx.telecomLocalityGroup.create({ data: { ...row, id: randomUUID() } })).rejects.toMatchObject({
        code: 'P2002',
      });
    }));
  it('rejects a self-replacing historical code', () =>
    isolated(async (tx, fixture) => {
      const old = await tx.areaCode.findUniqueOrThrow({ where: { code: fixture.codes[1].code } });
      await expect(
        tx.areaCodeMigration.update({ where: { oldCodeId: old.id }, data: { newCodeId: old.id } }),
      ).rejects.toThrow();
    }));
  it('rolls back all domain writes after an immutable-evidence conflict', async () => {
    const fixture = await freshFixture();
    await expect(
      client.$transaction(
        async (tx) => {
          if (await tx.areaCode.count({ where: { code: { in: fixture.codes.map((x) => x.code) } } })) {
            throw new Error('Fixture keys exist; refusing to modify existing data.');
          }
          await applyAreaDataset(tx, fixture, new Date());
          const changed = structuredClone(fixture);
          changed.references[0].notes = 'Changed test evidence using the same ID';
          await applyAreaDataset(tx, changed, new Date());
        },
        { timeout: 15000 },
      ),
    ).rejects.toThrow('immutable');
    expect(await client.sourceReference.findUnique({ where: { id: fixture.references[0].id } })).toBeNull();
    expect(await client.telecomLocality.findUnique({ where: { key: fixture.localities[0].key } })).toBeNull();
  });
});
