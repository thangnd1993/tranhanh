import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { normalizeSearch } from '../common/normalize-search.js';
import { validateAreaDataset } from './dataset.js';

const date = (value: string | null): Date | null => (value ? new Date(value) : null);

/** Compare only reviewed fields, excluding audit clocks; repeated identical imports preserve timestamps. */
export function changed(existing: object, proposed: object): boolean {
  const stored = existing as Record<string, unknown>;
  return Object.entries(proposed).some(([key, value]) => JSON.stringify(stored[key]) !== JSON.stringify(value));
}

export function assertStableArea(existing: { localityId: string }, localityId: string): void {
  if (existing.localityId !== localityId) {
    throw new Error('Area reassignment needs a reviewed history migration; refusing to overwrite coverage.');
  }
}

export async function applyAreaDataset(tx: Prisma.TransactionClient, input: unknown, now: Date) {
  const data = validateAreaDataset(input);
  // Serialize this small reviewed import, including immutable evidence checks and natural-key upserts.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(808080)`;
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
  const groupIds = new Map<string, string>();
  for (const item of data.groups) {
    const fields = {
      name: item.name,
      aliases: item.aliases,
      searchName: normalizeSearch([item.name, ...item.aliases].join(' ')),
      effectiveFrom: date(item.effectiveFrom),
      sourceReferenceId: item.referenceId,
    };
    const existing = await tx.telecomLocalityGroup.findUnique({ where: { key: item.key } });
    // Group keys identify reviewed snapshots. A changed grouping needs a new key and reviewed membership history.
    if (existing && (existing.name !== fields.name || changed(existing, { effectiveFrom: fields.effectiveFrom }))) {
      throw new Error('Telecom group identity changes require a new key and reviewed history.');
    }
    const row = await tx.telecomLocalityGroup.upsert({
      where: { key: item.key },
      create: { key: item.key, ...fields },
      update: existing && changed(existing, fields) ? fields : {},
    });
    groupIds.set(item.key, row.id);
  }
  const localityIds = new Map<string, string>();
  for (const item of data.localities) {
    const fields = {
      name: item.name,
      aliases: item.aliases,
      isActive: item.isActive,
      searchName: normalizeSearch([item.name, ...item.aliases].join(' ')),
      groupId: groupIds.get(item.groupKey)!,
      sourceReferenceId: item.referenceId,
    };
    const existing = await tx.telecomLocality.findUnique({ where: { key: item.key } });
    if (existing && (existing.groupId !== fields.groupId || existing.name !== fields.name)) {
      throw new Error(
        'Locality coverage/name changes require reviewed history; refusing to erase source-era identity.',
      );
    }
    const row = await tx.telecomLocality.upsert({
      where: { key: item.key },
      create: { key: item.key, ...fields },
      update: existing && changed(existing, fields) ? fields : {},
    });
    localityIds.set(item.key, row.id);
  }
  const codeIds = new Map<string, string>();
  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const item of data.codes) {
    const fields = {
      localityId: localityIds.get(item.localityKey)!,
      status: item.status,
      effectiveFrom: date(item.effectiveFrom),
      effectiveTo: date(item.effectiveTo),
      sourceReferenceId: item.referenceId,
    };
    const existing = await tx.areaCode.findUnique({ where: { code: item.code } });
    if (existing) {
      assertStableArea(existing, fields.localityId);
      if (existing.status === 'LEGACY' && fields.status !== 'LEGACY') {
        throw new Error('Refusing to erase historical code status; use a reviewed history migration.');
      }
      if (
        fields.status !== 'ACTIVE' &&
        existing.status === 'ACTIVE' &&
        (await tx.areaCodeMigration.count({ where: { newCodeId: existing.id } }))
      ) {
        throw new Error('Refusing to retire a retained historical replacement target without reviewed history.');
      }
    }
    const needsUpdate = existing && changed(existing, fields);
    const row = await tx.areaCode.upsert({
      where: { code: item.code },
      create: { code: item.code, ...fields, importedAt: now },
      update: needsUpdate ? { ...fields, importedAt: now } : {},
    });
    codeIds.set(item.code, row.id);
    if (!existing) {
      created++;
    } else if (needsUpdate) {
      updated++;
    } else {
      skipped++;
    }
  }
  for (const item of data.migrations) {
    const oldCodeId = codeIds.get(item.oldCode)!;
    const fields = {
      newCodeId: codeIds.get(item.newCode)!,
      effectiveDate: date(item.effectiveDate),
      sourceReferenceId: item.referenceId,
    };
    const existing = await tx.areaCodeMigration.findUnique({ where: { oldCodeId } });
    if (existing && existing.newCodeId !== fields.newCodeId) {
      throw new Error('Refusing to overwrite a historical replacement; use a reviewed correction migration.');
    }
    await tx.areaCodeMigration.upsert({
      where: { oldCodeId },
      create: { oldCodeId, ...fields },
      update: existing && changed(existing, fields) ? fields : {},
    });
  }
  return { read: data.codes.length, created, updated, skipped };
}

export async function importAreaDataset(client: PrismaClient, input: unknown) {
  const data = validateAreaDataset(input); // Validate everything before even creating an audit record.
  const source = await client.dataSource.upsert({
    where: { key: 'tranhanh-reviewed-data' },
    update: {},
    create: { key: 'tranhanh-reviewed-data', name: 'TraNhanh reviewed datasets', isOfficial: false, isActive: true },
  });
  const provider = await client.dataProvider.upsert({
    where: { key: 'area-code-reviewed-snapshot' },
    update: {},
    create: {
      key: 'area-code-reviewed-snapshot',
      name: 'Reviewed area-code file importer',
      sourceId: source.id,
      providerType: 'reviewed-file',
      status: 'ACTIVE',
    },
  });
  if (!source.isActive || provider.status === 'DISABLED') {
    throw new Error('Reviewed dataset import is disabled.');
  }
  const run = await client.syncRun.create({ data: { providerId: provider.id, jobType: 'area-code-import' } });
  try {
    return await client.$transaction(
      async (tx) => {
        const counts = await applyAreaDataset(tx, data, new Date());
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
          errorCode: 'AREA_CODE_IMPORT_FAILED',
          errorMessage: 'Reviewed import failed; domain transaction rolled back.',
        },
      }),
      client.dataProvider.update({ where: { id: provider.id }, data: { lastFailedSyncAt: finishedAt } }),
    ]);
    throw new Error('Area-code import failed; no domain changes committed. Inspect reviewed data and database state.');
  }
}
