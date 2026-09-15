import { Prisma, PrismaClient } from '../generated/prisma/client.js';
import { normalizeSearch } from '../common/normalize-search.js';
import { validateVehiclePlateDataset } from './dataset.js';

const date = (value: string | null): Date | null => (value ? new Date(value) : null);
export function vehiclePlateChanged(existing: object, proposed: object): boolean {
  const stored = existing as Record<string, unknown>;
  return Object.entries(proposed).some(([key, value]) => JSON.stringify(stored[key]) !== JSON.stringify(value));
}

export async function applyVehiclePlateDataset(tx: Prisma.TransactionClient, input: unknown, now: Date) {
  const data = validateVehiclePlateDataset(input);
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(515151)`;
  const sourceIds = new Map<string, string>();
  for (const item of data.sources) {
    const { key, ...fields } = item;
    const existing = await tx.dataSource.findUnique({ where: { key } });
    const row = await tx.dataSource.upsert({
      where: { key },
      create: { ...item, isActive: true },
      update: existing && vehiclePlateChanged(existing, fields) ? fields : {},
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
    if (existing && vehiclePlateChanged(existing, fields)) {
      throw new Error('Evidence snapshots are immutable; add a new reference UUID for changed evidence.');
    }
    await tx.sourceReference.upsert({ where: { id: item.id }, create: { id: item.id, ...fields }, update: {} });
  }
  const targetIds = new Map<string, string>();
  for (const item of data.targets) {
    const fields = {
      name: item.name,
      aliases: item.aliases,
      searchName: normalizeSearch([item.name, ...item.aliases].join(' ')),
      type: item.type,
      isActive: item.isActive,
      sourceReferenceId: item.referenceId,
    };
    const existing = await tx.vehiclePlateTarget.findUnique({ where: { key: item.key } });
    if (existing && (existing.name !== fields.name || existing.type !== fields.type)) {
      throw new Error('Allocation-target identity changes require reviewed history; refusing to erase source context.');
    }
    const row = await tx.vehiclePlateTarget.upsert({
      where: { key: item.key },
      create: { key: item.key, ...fields },
      update: existing && vehiclePlateChanged(existing, fields) ? fields : {},
    });
    targetIds.set(item.key, row.id);
  }
  const allocationIds = new Map<string, string>();
  let created = 0,
    updated = 0,
    skipped = 0;
  for (const item of data.allocations) {
    const fields = {
      numericPrefix: item.numericPrefix,
      seriesPrefix: item.seriesPrefix,
      targetId: targetIds.get(item.targetKey)!,
      status: item.status,
      effectiveFrom: date(item.effectiveFrom),
      effectiveTo: date(item.effectiveTo),
      sourceReferenceId: item.referenceId,
    };
    const existing = await tx.vehiclePlateAllocation.findUnique({ where: { key: item.key } });
    if (
      existing &&
      (existing.numericPrefix !== fields.numericPrefix ||
        existing.seriesPrefix !== fields.seriesPrefix ||
        existing.targetId !== fields.targetId)
    ) {
      throw new Error('Allocation identity or target reassignment requires reviewed history; refusing overwrite.');
    }
    const needsUpdate = existing && vehiclePlateChanged(existing, fields);
    const row = await tx.vehiclePlateAllocation.upsert({
      where: { key: item.key },
      create: { key: item.key, ...fields, importedAt: now },
      update: needsUpdate ? { ...fields, importedAt: now } : {},
    });
    allocationIds.set(item.key, row.id);
    if (!existing) created++;
    else if (needsUpdate) updated++;
    else skipped++;
  }
  for (const item of data.history) {
    const allocationId = allocationIds.get(item.allocationKey)!;
    const previousTargetId = targetIds.get(item.previousTargetKey)!;
    const effectiveTo = date(item.effectiveTo)!;
    const fields = {
      effectiveFrom: date(item.effectiveFrom),
      sourceReferenceId: item.sourceReferenceId,
      transitionReferenceId: item.transitionReferenceId,
    };
    const where = { allocationId_previousTargetId_effectiveTo: { allocationId, previousTargetId, effectiveTo } };
    const existing = await tx.vehiclePlateAllocationHistory.findUnique({ where });
    await tx.vehiclePlateAllocationHistory.upsert({
      where,
      create: { allocationId, previousTargetId, effectiveTo, ...fields },
      update: existing && vehiclePlateChanged(existing, fields) ? fields : {},
    });
  }
  return { read: data.allocations.length, created, updated, skipped };
}

export async function importVehiclePlateDataset(client: PrismaClient, input: unknown) {
  const data = validateVehiclePlateDataset(input);
  const source = await client.dataSource.upsert({
    where: { key: 'tranhanh-reviewed-data' },
    update: {},
    create: { key: 'tranhanh-reviewed-data', name: 'TraNhanh reviewed datasets', isOfficial: false, isActive: true },
  });
  const provider = await client.dataProvider.upsert({
    where: { key: 'vehicle-plate-reviewed-snapshot' },
    update: {},
    create: {
      key: 'vehicle-plate-reviewed-snapshot',
      name: 'Reviewed vehicle-plate file importer',
      sourceId: source.id,
      providerType: 'reviewed-file',
      status: 'ACTIVE',
    },
  });
  if (!source.isActive || provider.status === 'DISABLED') throw new Error('Reviewed dataset import is disabled.');
  const run = await client.syncRun.create({ data: { providerId: provider.id, jobType: 'vehicle-plate-import' } });
  try {
    return await client.$transaction(
      async (tx) => {
        const counts = await applyVehiclePlateDataset(tx, data, new Date());
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
          errorCode: 'VEHICLE_PLATE_IMPORT_FAILED',
          errorMessage: 'Reviewed import failed; domain transaction rolled back.',
        },
      }),
      client.dataProvider.update({ where: { id: provider.id }, data: { lastFailedSyncAt: finishedAt } }),
    ]);
    throw new Error(
      'Vehicle-plate import failed; no domain changes committed. Inspect reviewed data and database state.',
    );
  }
}
