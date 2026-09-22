import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';
import { applyPhoneDataset } from '../src/phone-prefixes/import-dataset.js';
import { phoneInclude, phoneResult } from '../src/phone-prefixes/phone-prefixes.service.js';
import { phoneDatasetFixture } from './fixtures/phone-dataset.js';

let client: PrismaClient;
const rollback = new Error('Rollback test-only phone records');
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

async function freshFixture(): Promise<ReturnType<typeof phoneDatasetFixture>> {
  const activePrefixes = ['3', '5', '7', '8', '9'].flatMap((family) =>
    Array.from({ length: 10 }, (_, index) => `0${family}${index}`),
  );
  const legacyPrefixes = ['2', '6', '8', '9'].flatMap((family) =>
    Array.from({ length: 10 }, (_, index) => `01${family}${index}`),
  );
  const existing = await client.phonePrefix.findMany({
    where: { prefix: { in: [...activePrefixes, ...legacyPrefixes] } },
    select: { prefix: true },
  });
  const occupied = new Set(existing.map((row) => row.prefix));
  const activePrefix = activePrefixes.find((prefix) => !occupied.has(prefix));
  const secondActivePrefix = activePrefixes.find((prefix) => prefix !== activePrefix && !occupied.has(prefix));
  const legacyPrefix = legacyPrefixes.find((prefix) => !occupied.has(prefix));
  if (activePrefix && secondActivePrefix && legacyPrefix) {
    return phoneDatasetFixture({ activePrefix, secondActivePrefix, legacyPrefix });
  }
  throw new Error('Unable to allocate collision-free phone-prefix fixture keys without modifying existing data.');
}
async function isolated(
  check: (tx: Prisma.TransactionClient, fixture: ReturnType<typeof phoneDatasetFixture>) => Promise<void>,
): Promise<void> {
  const fixture = await freshFixture();
  try {
    await client.$transaction(
      async (tx) => {
        // Never touch pre-existing allocations, even in an explicitly selected test database.
        if (await tx.phonePrefix.count({ where: { prefix: { in: fixture.prefixes.map((x) => x.prefix) } } })) {
          throw new Error(
            'Fixture prefix keys already exist; select a clean test database without deleting existing data.',
          );
        }
        await applyPhoneDataset(tx, fixture, new Date('2020-01-02T00:00:00Z'));
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

describe('phone-prefix PostgreSQL invariants (not mocked)', () => {
  it('imports twice without duplicate rows or changed prefix timestamps', () =>
    isolated(async (tx, fixture) => {
      const before = await tx.phonePrefix.findUniqueOrThrow({ where: { prefix: fixture.prefixes[0].prefix } });
      expect(await applyPhoneDataset(tx, fixture, new Date())).toEqual({ read: 3, created: 0, updated: 0, skipped: 3 });
      const after = await tx.phonePrefix.findUniqueOrThrow({ where: { prefix: fixture.prefixes[0].prefix } });
      expect(after.updatedAt).toEqual(before.updatedAt);
      expect(after.importedAt).toEqual(before.importedAt);
      expect(await tx.sourceReference.count({ where: { id: fixture.references[0].id } })).toBe(1);
      expect(await tx.phonePrefixMigration.count({ where: { sourceReferenceId: fixture.references[0].id } })).toBe(1);
    }));
  it('returns real joined evidence and old/current relations', () =>
    isolated(async (tx, fixture) => {
      const row = await tx.phonePrefix.findUniqueOrThrow({
        where: { prefix: fixture.prefixes[2].prefix },
        include: phoneInclude,
      });
      expect(phoneResult(row)).toMatchObject({
        status: 'LEGACY',
        currentPrefix: fixture.prefixes[0].prefix,
        source: { publisher: 'Test-only publisher', title: 'Test-only evidence' },
      });
    }));
  it('enforces prefix uniqueness', () =>
    isolated(async (tx, fixture) => {
      const row = await tx.phonePrefix.findUniqueOrThrow({ where: { prefix: fixture.prefixes[0].prefix } });
      await expect(tx.phonePrefix.create({ data: { ...row, id: randomUUID() } })).rejects.toMatchObject({
        code: 'P2002',
      });
    }));
  it('enforces operator foreign keys', () =>
    isolated(async (tx, fixture) => {
      await expect(
        tx.phonePrefix.update({ where: { prefix: fixture.prefixes[0].prefix }, data: { operatorId: randomUUID() } }),
      ).rejects.toMatchObject({ code: 'P2003' });
    }));
  it('enforces evidence foreign keys', () =>
    isolated(async (tx, fixture) => {
      await expect(
        tx.phonePrefix.update({
          where: { prefix: fixture.prefixes[0].prefix },
          data: { sourceReferenceId: randomUUID() },
        }),
      ).rejects.toMatchObject({ code: 'P2003' });
    }));
  it('enforces migration target relations', () =>
    isolated(async (tx, fixture) => {
      const old = await tx.phonePrefix.findUniqueOrThrow({ where: { prefix: fixture.prefixes[2].prefix } });
      await expect(
        tx.phonePrefixMigration.update({ where: { oldPrefixId: old.id }, data: { newPrefixId: randomUUID() } }),
      ).rejects.toMatchObject({ code: 'P2003' });
    }));
  it('rejects duplicate historical mappings', () =>
    isolated(async (tx, fixture) => {
      const old = await tx.phonePrefix.findUniqueOrThrow({ where: { prefix: fixture.prefixes[2].prefix } });
      const current = await tx.phonePrefix.findUniqueOrThrow({ where: { prefix: fixture.prefixes[0].prefix } });
      await expect(
        tx.phonePrefixMigration.create({
          data: { oldPrefixId: old.id, newPrefixId: current.id, sourceReferenceId: fixture.references[0].id },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
    }));
  it('preserves operator history on deletion', () =>
    isolated(async (tx, fixture) => {
      await expect(tx.telecomOperator.delete({ where: { key: fixture.operators[0].key } })).rejects.toMatchObject({
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
      await expect(tx.phonePrefix.delete({ where: { prefix: fixture.prefixes[0].prefix } })).rejects.toMatchObject({
        code: 'P2003',
      });
    }));
  it('rejects impossible active legacy format at the database boundary', () =>
    isolated(async (tx, fixture) => {
      await expect(
        tx.phonePrefix.update({ where: { prefix: fixture.prefixes[2].prefix }, data: { status: 'ACTIVE' } }),
      ).rejects.toThrow();
    }));
  it('rejects reversed effective intervals', () =>
    isolated(async (tx, fixture) => {
      await expect(
        tx.phonePrefix.update({
          where: { prefix: fixture.prefixes[0].prefix },
          data: {
            effectiveFrom: new Date('2020-02-01Z'),
            effectiveTo: new Date('2020-01-01Z'),
          },
        }),
      ).rejects.toThrow();
    }));
  it('rolls back all domain writes after an immutable-evidence conflict', async () => {
    const fixture = await freshFixture();
    await expect(
      client.$transaction(
        async (tx) => {
          if (await tx.phonePrefix.count({ where: { prefix: { in: fixture.prefixes.map((x) => x.prefix) } } })) {
            throw new Error('Fixture keys exist; refusing to modify existing data.');
          }
          await applyPhoneDataset(tx, fixture, new Date());
          const changed = structuredClone(fixture);
          changed.references[0].notes = 'Changed test evidence using the same ID';
          await applyPhoneDataset(tx, changed, new Date());
        },
        { timeout: 15000 },
      ),
    ).rejects.toThrow('immutable');
    expect(await client.sourceReference.findUnique({ where: { id: fixture.references[0].id } })).toBeNull();
    expect(await client.telecomOperator.findUnique({ where: { key: fixture.operators[0].key } })).toBeNull();
  });
});
