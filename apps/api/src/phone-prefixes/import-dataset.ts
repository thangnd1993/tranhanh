import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { normalizeSearch } from '../common/normalize-search.js';
import { validateDataset } from './dataset.js';

const date = (value: string | null): Date | null => (value ? new Date(value) : null);

/** Compare only reviewed fields, excluding audit clocks; repeated identical imports preserve timestamps. */
export function changed(existing: object, proposed: object): boolean {
  const stored = existing as Record<string, unknown>;
  return Object.entries(proposed).some(([key, value]) => JSON.stringify(stored[key]) !== JSON.stringify(value));
}

export function assertStableAssignment(existing: { operatorId: string }, operatorId: string): void {
  if (existing.operatorId !== operatorId) {
    throw new Error('Prefix reassignment needs a reviewed history migration; refusing to overwrite allocation.');
  }
}

export async function applyPhoneDataset(tx: Prisma.TransactionClient, input: unknown, now: Date) {
  const data = validateDataset(input);
  // Serialize this small reviewed import, including immutable evidence checks and natural-key upserts.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(606060)`;
  const sourceIds = new Map<string, string>();
  for (const item of data.sources) {
    const { key, ...fields } = item;
    const existing = await tx.dataSource.findUnique({ where: { key } });
    const row = await tx.dataSource.upsert({
      where: { key },
      create: { ...item, isActive: true },
      update: existing && changed(existing, fields) ? fields : {},
    });
    sourceIds.set(key, row.id);
  }
  for (const item of data.references) {
    const fields = {
      sourceId: sourceIds.get(item.sourceKey)!,
      title: item.title,
      externalUrl: item.url,
      retrievedAt: new Date(item.retrievedAt),
      publishedAt: date(item.publishedAt),
      notes: item.notes,
    };
    const existing = await tx.sourceReference.findUnique({ where: { id: item.id } });
    if (existing && changed(existing, fields)) {
      throw new Error('Evidence snapshots are immutable; add a new reference UUID for changed evidence.');
    }
    await tx.sourceReference.upsert({ where: { id: item.id }, create: { id: item.id, ...fields }, update: {} });
  }
  const operatorIds = new Map<string, string>();
  for (const item of data.operators) {
    const fields = {
      name: item.name,
      website: item.website,
      isActive: item.isActive,
      searchName: normalizeSearch(`${item.key} ${item.name}`),
      sourceReferenceId: item.referenceId,
    };
    const existing = await tx.telecomOperator.findUnique({ where: { key: item.key } });
    const row = await tx.telecomOperator.upsert({
      where: { key: item.key },
      create: { key: item.key, ...fields },
      update: existing && changed(existing, fields) ? fields : {},
    });
    operatorIds.set(item.key, row.id);
  }
  const prefixIds = new Map<string, string>();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const item of data.prefixes) {
    const fields = {
      operatorId: operatorIds.get(item.operatorKey)!,
      status: item.status,
      effectiveFrom: date(item.effectiveFrom),
      effectiveTo: date(item.effectiveTo),
      sourceReferenceId: item.referenceId,
    };
    const existing = await tx.phonePrefix.findUnique({ where: { prefix: item.prefix } });
    if (existing) {
      assertStableAssignment(existing, fields.operatorId);
    }
    const needsUpdate = existing && changed(existing, fields);
    const row = await tx.phonePrefix.upsert({
      where: { prefix: item.prefix },
      create: { prefix: item.prefix, ...fields, importedAt: now },
      update: needsUpdate ? { ...fields, importedAt: now } : {},
    });
    prefixIds.set(item.prefix, row.id);
    if (!existing) {
      created++;
    } else if (needsUpdate) {
      updated++;
    } else {
      skipped++;
    }
  }
  for (const item of data.migrations) {
    const oldPrefixId = prefixIds.get(item.oldPrefix)!;
    const fields = {
      newPrefixId: prefixIds.get(item.newPrefix)!,
      effectiveAt: date(item.effectiveAt),
      sourceReferenceId: item.referenceId,
    };
    const existing = await tx.phonePrefixMigration.findUnique({ where: { oldPrefixId } });
    if (existing && existing.newPrefixId !== fields.newPrefixId) {
      throw new Error('Refusing to overwrite a historical replacement; use a reviewed correction migration.');
    }
    await tx.phonePrefixMigration.upsert({
      where: { oldPrefixId },
      create: { oldPrefixId, ...fields },
      update: existing && changed(existing, fields) ? fields : {},
    });
  }
  return { read: data.prefixes.length, created, updated, skipped };
}

export async function importPhoneDataset(client: PrismaClient, input: unknown) {
  const data = validateDataset(input); // Validate everything before even creating an audit record.
  const source = await client.dataSource.upsert({
    where: { key: 'tranhanh-reviewed-data' },
    update: {},
    create: { key: 'tranhanh-reviewed-data', name: 'TraNhanh reviewed datasets', isOfficial: false, isActive: true },
  });
  const provider = await client.dataProvider.upsert({
    where: { key: 'phone-prefix-reviewed-snapshot' },
    update: {},
    create: {
      key: 'phone-prefix-reviewed-snapshot',
      name: 'Reviewed phone-prefix file importer',
      sourceId: source.id,
      providerType: 'reviewed-file',
      status: 'ACTIVE',
    },
  });
  if (!source.isActive || provider.status === 'DISABLED') {
    throw new Error('Reviewed dataset import is disabled.');
  }
  const run = await client.syncRun.create({ data: { providerId: provider.id, jobType: 'phone-prefix-import' } });
  try {
    return await client.$transaction(
      async (tx) => {
        const counts = await applyPhoneDataset(tx, data, new Date());
        const finishedAt = new Date();
        await tx.syncRun.update({
          where: { id: run.id },
          data: {
            status: 'SUCCEEDED',
            finishedAt,
            recordsRead: counts.read,
            recordsCreated: counts.created,
            recordsUpdated: counts.updated,
            recordsSkipped: counts.skipped,
          },
        });
        await tx.dataProvider.update({ where: { id: provider.id }, data: { lastSuccessfulSyncAt: finishedAt } });
        return counts;
      },
      { timeout: 30000 },
    );
  } catch {
    const finishedAt = new Date();
    await client.$transaction([
      client.syncRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          finishedAt,
          errorCode: 'PHONE_PREFIX_IMPORT_FAILED',
          errorMessage: 'Reviewed import failed; domain transaction rolled back.',
        },
      }),
      client.dataProvider.update({ where: { id: provider.id }, data: { lastFailedSyncAt: finishedAt } }),
    ]);
    throw new Error(
      'Phone-prefix import failed; no domain changes committed. Inspect reviewed data and database state.',
    );
  }
}
