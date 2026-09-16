import type { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { normalizeSearch } from '../common/normalize-search.js';
import { validatePostalCodeDataset } from './dataset.js';
const date = (value: string | null) => (value ? new Date(`${value}T00:00:00.000Z`) : null);
const same = (left: Record<string, unknown>, right: Record<string, unknown>) =>
  Object.entries(right).every(([key, value]) => {
    const existing = left[key];
    if (existing instanceof Date && value instanceof Date) return existing.getTime() === value.getTime();
    if (Array.isArray(existing) && Array.isArray(value)) return JSON.stringify(existing) === JSON.stringify(value);
    return existing === value;
  });
export async function applyPostalCodeDataset(tx: Prisma.TransactionClient, input: unknown, now: Date) {
  const data = validatePostalCodeDataset(input);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(771_312)`;
  const sourceIds = new Map<string, string>();
  for (const item of data.sources) {
    const fields = { name: item.name, homepageUrl: item.homepageUrl, isOfficial: item.isOfficial, isActive: true };
    const existing = await tx.dataSource.findUnique({ where: { key: item.key } });
    const row = await tx.dataSource.upsert({
      where: { key: item.key },
      create: { key: item.key, ...fields },
      update: existing && !same(existing, fields) ? fields : {},
    });
    sourceIds.set(item.key, row.id);
  }
  for (const item of data.references) {
    const fields = {
      sourceId: sourceIds.get(item.sourceKey)!,
      title: item.title,
      externalUrl: item.url,
      retrievedAt: new Date(item.retrievedAt),
      publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
      notes: item.notes,
    };
    const existing = await tx.sourceReference.findUnique({ where: { id: item.id } });
    if (existing && !same(existing, fields))
      throw new Error('Evidence snapshots are immutable; add a new reference UUID.');
    await tx.sourceReference.upsert({ where: { id: item.id }, create: { id: item.id, ...fields }, update: {} });
  }
  const targetIds = new Map<string, string>();
  for (const item of data.targets.filter((x) => x.parentKey === null)) {
    const fields = {
      name: item.name,
      aliases: item.aliases,
      searchName: normalizeSearch([item.name, ...item.aliases].join(' ')),
      type: item.type,
      parentId: null,
      isActive: item.isActive,
      sourceReferenceId: item.referenceId,
    };
    const existing = await tx.postalCodeTarget.findUnique({ where: { key: item.key } });
    if (existing && (existing.name !== fields.name || existing.type !== fields.type))
      throw new Error('Postal target identity changes require reviewed reconciliation.');
    const row = await tx.postalCodeTarget.upsert({
      where: { key: item.key },
      create: { key: item.key, ...fields },
      update: existing && !same(existing, fields) ? fields : {},
    });
    targetIds.set(item.key, row.id);
  }
  for (const item of data.targets.filter((x) => x.parentKey !== null)) {
    const fields = {
      name: item.name,
      aliases: item.aliases,
      searchName: normalizeSearch([item.name, ...item.aliases].join(' ')),
      type: item.type,
      parentId: targetIds.get(item.parentKey!)!,
      isActive: item.isActive,
      sourceReferenceId: item.referenceId,
    };
    const existing = await tx.postalCodeTarget.findUnique({ where: { key: item.key } });
    if (
      existing &&
      (existing.name !== fields.name || existing.type !== fields.type || existing.parentId !== fields.parentId)
    )
      throw new Error('Postal target identity or hierarchy changes require reviewed reconciliation.');
    const row = await tx.postalCodeTarget.upsert({
      where: { key: item.key },
      create: { key: item.key, ...fields },
      update: existing && !same(existing, fields) ? fields : {},
    });
    targetIds.set(item.key, row.id);
  }
  let created = 0,
    updated = 0,
    skipped = 0;
  for (const item of data.assignments) {
    const fields = {
      code: item.code,
      targetId: targetIds.get(item.targetKey)!,
      status: item.status,
      effectiveFrom: date(item.effectiveFrom),
      effectiveTo: date(item.effectiveTo),
      sourceReferenceId: item.referenceId,
    };
    const existing = await tx.postalCodeAssignment.findUnique({ where: { key: item.key } });
    if (existing && (existing.code !== fields.code || existing.targetId !== fields.targetId))
      throw new Error('Postal assignment identity changes require reviewed history.');
    const needsUpdate = Boolean(existing && !same(existing, fields));
    await tx.postalCodeAssignment.upsert({
      where: { key: item.key },
      create: { key: item.key, ...fields, importedAt: now },
      update: needsUpdate ? { ...fields, importedAt: now } : {},
    });
    if (!existing) created++;
    else if (needsUpdate) updated++;
    else skipped++;
  }
  return { read: data.assignments.length, created, updated, skipped };
}
export async function importPostalCodeDataset(client: PrismaClient, input: unknown) {
  const data = validatePostalCodeDataset(input);
  const source = await client.dataSource.upsert({
    where: { key: 'tranhanh-reviewed-data' },
    update: {},
    create: { key: 'tranhanh-reviewed-data', name: 'TraNhanh reviewed datasets', isOfficial: false, isActive: true },
  });
  const provider = await client.dataProvider.upsert({
    where: { key: 'postal-code-reviewed-snapshot' },
    update: {},
    create: {
      key: 'postal-code-reviewed-snapshot',
      name: 'Reviewed postal-code file importer',
      sourceId: source.id,
      providerType: 'reviewed-file',
      status: 'ACTIVE',
    },
  });
  if (!source.isActive || provider.status === 'DISABLED') throw new Error('Reviewed dataset import is disabled.');
  const run = await client.syncRun.create({ data: { providerId: provider.id, jobType: 'postal-code-import' } });
  try {
    return await client.$transaction(
      async (tx) => {
        const counts = await applyPostalCodeDataset(tx, data, new Date());
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
      { timeout: 120000 },
    );
  } catch {
    const finishedAt = new Date();
    await client.$transaction([
      client.syncRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          finishedAt,
          errorCode: 'POSTAL_CODE_IMPORT_FAILED',
          errorMessage: 'Reviewed import failed; domain transaction rolled back.',
        },
      }),
      client.dataProvider.update({ where: { id: provider.id }, data: { lastFailedSyncAt: finishedAt } }),
    ]);
    throw new Error('Postal-code import failed; no domain changes committed.');
  }
}
