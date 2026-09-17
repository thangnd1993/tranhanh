import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';
import { applyPostalCodeDataset } from '../src/postal-codes/import-dataset.js';
import { postalCodeInclude, postalCodeResult } from '../src/postal-codes/postal-codes.service.js';
import { postalCodeDatasetFixture } from './fixtures/postal-code-dataset.js';
let client: PrismaClient;
const rollback = new Error('rollback postal fixture');
beforeAll(async () => {
  const raw = process.env.TEST_DATABASE_URL;
  if (!raw || process.env.NODE_ENV === 'production') throw new Error('Explicit isolated test database required.');
  const u = new URL(raw);
  if (
    u.protocol !== 'postgresql:' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) ||
    u.pathname !== '/tranhanh_test'
  )
    throw new Error('Only local tranhanh_test is allowed.');
  client = new PrismaClient({ adapter: new PrismaPg({ connectionString: raw }) });
  await client.$connect();
});
afterAll(async () => client?.$disconnect());
async function isolated(
  check: (tx: Prisma.TransactionClient, fixture: ReturnType<typeof postalCodeDatasetFixture>) => Promise<void>,
) {
  const fixture = postalCodeDatasetFixture();
  try {
    await client.$transaction(
      async (tx) => {
        await applyPostalCodeDataset(tx, fixture, new Date('2025-08-25Z'));
        await check(tx, fixture);
        throw rollback;
      },
      { timeout: 15000 },
    );
  } catch (error) {
    if (error !== rollback) throw error;
  }
}
describe('postal-code PostgreSQL invariants', () => {
  it('imports idempotently with hierarchy and evidence joins', () =>
    isolated(async (tx, fixture) => {
      expect(await applyPostalCodeDataset(tx, fixture, new Date())).toEqual({
        read: 1,
        created: 0,
        updated: 0,
        skipped: 1,
      });
      const row = await tx.postalCodeAssignment.findUniqueOrThrow({
        where: { key: 'postal-code-01234' },
        include: postalCodeInclude,
      });
      expect(postalCodeResult(row)).toMatchObject({
        code: '01234',
        hierarchy: [{ name: 'Test Province' }, { name: 'Test Ward' }],
        source: { publisher: 'Test source' },
      });
    }));
  it('enforces mapping uniqueness', () =>
    isolated(async (tx) => {
      const row = await tx.postalCodeAssignment.findUniqueOrThrow({ where: { key: 'postal-code-01234' } });
      await expect(
        tx.postalCodeAssignment.create({ data: { ...row, id: randomUUID(), key: `other-${randomUUID()}` } }),
      ).rejects.toMatchObject({ code: 'P2002' });
    }));
  it('enforces target and evidence foreign keys', async () => {
    await isolated(async (tx) => {
      await expect(
        tx.postalCodeAssignment.update({ where: { key: 'postal-code-01234' }, data: { targetId: randomUUID() } }),
      ).rejects.toMatchObject({ code: 'P2003' });
    });
    await isolated(async (tx) => {
      await expect(
        tx.postalCodeAssignment.update({
          where: { key: 'postal-code-01234' },
          data: { sourceReferenceId: randomUUID() },
        }),
      ).rejects.toMatchObject({ code: 'P2003' });
    });
  });
  it('rejects malformed codes and reversed intervals', async () => {
    await isolated(async (tx) => {
      await expect(
        tx.postalCodeAssignment.update({ where: { key: 'postal-code-01234' }, data: { code: '1234' } }),
      ).rejects.toThrow();
    });
    await isolated(async (tx) => {
      await expect(
        tx.postalCodeAssignment.update({
          where: { key: 'postal-code-01234' },
          data: { effectiveTo: new Date('2025-01-01') },
        }),
      ).rejects.toThrow();
    });
  });
  it('restricts hierarchy and evidence deletion', async () => {
    await isolated(async (tx) => {
      await expect(tx.postalCodeTarget.delete({ where: { key: 'province-test' } })).rejects.toMatchObject({
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
