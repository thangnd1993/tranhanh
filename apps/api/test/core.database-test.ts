import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';

const rollback = new Error('Roll back test-owned fixtures');
let client: PrismaClient;

beforeAll(async () => {
  const raw = process.env.TEST_DATABASE_URL;
  if (!raw || process.env.NODE_ENV === 'production') {
    throw new Error('An explicit local test database is required.');
  }
  const url = new URL(raw);
  if (
    url.protocol !== 'postgresql:' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.pathname !== '/tranhanh_test' ||
    url.hash ||
    [...url.searchParams].some(([key, value]) => key !== 'schema' || value !== 'public')
  ) {
    throw new Error('Database integration tests require local tranhanh_test with public schema.');
  }
  client = new PrismaClient({ adapter: new PrismaPg({ connectionString: raw }) });
  await client.$connect();
});

afterAll(async () => {
  await client?.$disconnect();
});

async function isolated(check: (tx: Prisma.TransactionClient) => Promise<void>): Promise<void> {
  try {
    await client.$transaction(async (tx) => {
      await check(tx);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) {
      throw error;
    }
  }
}

async function fixture(tx: Prisma.TransactionClient) {
  const source = await tx.dataSource.create({ data: { key: `test-${randomUUID()}`, name: 'Test-only source' } });
  const provider = await tx.dataProvider.create({
    data: {
      key: `test-${randomUUID()}`,
      name: 'Test-only adapter',
      sourceId: source.id,
      providerType: 'test-fixture',
    },
  });
  return { source, provider };
}

describe('PostgreSQL core invariants (real database, rolled-back fixtures)', () => {
  it('enforces source keys', () =>
    isolated(async (tx) => {
      const { source } = await fixture(tx);
      await expect(tx.dataSource.create({ data: { key: source.key, name: 'Duplicate' } })).rejects.toMatchObject({
        code: 'P2002',
      });
    }));

  it('enforces provider keys', () =>
    isolated(async (tx) => {
      const { source, provider } = await fixture(tx);
      await expect(
        tx.dataProvider.create({
          data: {
            key: provider.key,
            name: 'Duplicate',
            sourceId: source.id,
            providerType: 'test-fixture',
          },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
    }));

  it('requires a real source', () =>
    isolated(async (tx) => {
      await expect(
        tx.dataProvider.create({
          data: {
            key: `test-${randomUUID()}`,
            name: 'Orphan',
            sourceId: randomUUID(),
            providerType: 'test-fixture',
          },
        }),
      ).rejects.toMatchObject({ code: 'P2003' });
    }));

  it('prevents deleting a source with adapters', () =>
    isolated(async (tx) => {
      const { source } = await fixture(tx);
      await expect(tx.dataSource.delete({ where: { id: source.id } })).rejects.toMatchObject({ code: 'P2003' });
    }));

  it('preserves sync history on provider deletion', () =>
    isolated(async (tx) => {
      const { provider } = await fixture(tx);
      await tx.syncRun.create({ data: { providerId: provider.id, jobType: 'test' } });
      await expect(tx.dataProvider.delete({ where: { id: provider.id } })).rejects.toMatchObject({ code: 'P2003' });
    }));

  it('supports vi/en notes but rejects duplicate locale for a source', () =>
    isolated(async (tx) => {
      const { source } = await fixture(tx);
      await tx.dataSourceTranslation.createMany({
        data: [
          { sourceId: source.id, locale: 'vi', description: 'Ghi chú thử nghiệm' },
          { sourceId: source.id, locale: 'en', description: 'Test-only note' },
        ],
      });
      await expect(
        tx.dataSourceTranslation.create({ data: { sourceId: source.id, locale: 'vi' } }),
      ).rejects.toMatchObject({ code: 'P2002' });
    }));

  it('enforces page + locale uniqueness', () =>
    isolated(async (tx) => {
      const page = await tx.seoPage.create({ data: { key: `test-${randomUUID()}` } });
      await tx.seoMetadata.create({ data: { pageId: page.id, locale: 'en', canonicalPath: `/en/${page.id}` } });
      await expect(
        tx.seoMetadata.create({
          data: {
            pageId: page.id,
            locale: 'en',
            canonicalPath: `/en/${page.id}/other`,
          },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
    }));

  it('rejects invalid enum values at the database boundary', () =>
    isolated(async (tx) => {
      const { provider } = await fixture(tx);
      await expect(
        tx.$executeRaw`UPDATE "DataProvider" SET "status" = 'UNKNOWN' WHERE "id" = ${provider.id}::uuid`,
      ).rejects.toThrow();
    }));

  it('persists supported statuses and UTC instants', () =>
    isolated(async (tx) => {
      const { provider } = await fixture(tx);
      expect(provider.status).toBe('DISABLED');
      const startedAt = new Date('2026-01-01T07:00:00+07:00');
      const run = await tx.syncRun.create({ data: { providerId: provider.id, jobType: 'test', startedAt } });
      expect(run.status).toBe('RUNNING');
      const finished = await tx.syncRun.update({
        where: { id: run.id },
        data: {
          status: 'SUCCEEDED',
          finishedAt: startedAt,
          recordsRead: 0,
        },
      });
      expect(finished.startedAt.toISOString()).toBe('2026-01-01T00:00:00.000Z');
      expect(finished.status).toBe('SUCCEEDED');
    }));

  it('rejects negative sync counts', () =>
    isolated(async (tx) => {
      const { provider } = await fixture(tx);
      await expect(
        tx.syncRun.create({ data: { providerId: provider.id, jobType: 'test', recordsRead: -1 } }),
      ).rejects.toThrow();
    }));

  it('rejects reversed effective intervals', () =>
    isolated(async (tx) => {
      const { source } = await fixture(tx);
      await expect(
        tx.sourceReference.create({
          data: {
            sourceId: source.id,
            retrievedAt: new Date(),
            effectiveFrom: new Date('2026-02-01Z'),
            effectiveTo: new Date('2026-01-01Z'),
          },
        }),
      ).rejects.toThrow();
    }));

  it('retains evidence when a source is disabled', () =>
    isolated(async (tx) => {
      const { source } = await fixture(tx);
      const reference = await tx.sourceReference.create({ data: { sourceId: source.id, retrievedAt: new Date() } });
      await tx.dataSource.update({ where: { id: source.id }, data: { isActive: false } });
      expect(await tx.sourceReference.findUnique({ where: { id: reference.id } })).not.toBeNull();
    }));

  it('requires a finish time for a terminal sync status', () =>
    isolated(async (tx) => {
      const { provider } = await fixture(tx);
      await expect(
        tx.syncRun.create({ data: { providerId: provider.id, jobType: 'test', status: 'FAILED' } }),
      ).rejects.toThrow();
    }));

  it('reserves a canonical path for one page only', () =>
    isolated(async (tx) => {
      const first = await tx.seoPage.create({ data: { key: `test-${randomUUID()}` } });
      const second = await tx.seoPage.create({ data: { key: `test-${randomUUID()}` } });
      const canonicalPath = `/vi/${first.id}`;
      await tx.seoMetadata.create({ data: { pageId: first.id, locale: 'vi', canonicalPath } });
      await expect(
        tx.seoMetadata.create({ data: { pageId: second.id, locale: 'vi', canonicalPath } }),
      ).rejects.toMatchObject({ code: 'P2002' });
    }));

  it('rejects canonical paths belonging to another locale', () =>
    isolated(async (tx) => {
      const page = await tx.seoPage.create({ data: { key: `test-${randomUUID()}` } });
      await expect(
        tx.seoMetadata.create({ data: { pageId: page.id, locale: 'vi', canonicalPath: `/en/${page.id}` } }),
      ).rejects.toThrow();
    }));

  it('prevents deleting evidence publishers', () =>
    isolated(async (tx) => {
      const source = await tx.dataSource.create({ data: { key: `test-${randomUUID()}`, name: 'Evidence fixture' } });
      await tx.sourceReference.create({ data: { sourceId: source.id, retrievedAt: new Date() } });
      await expect(tx.dataSource.delete({ where: { id: source.id } })).rejects.toMatchObject({ code: 'P2003' });
    }));
});
