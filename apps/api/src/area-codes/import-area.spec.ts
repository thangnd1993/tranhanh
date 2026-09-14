import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '../generated/prisma/client.js';
import { applyAreaDataset } from './import-dataset.js';
import { areaDatasetFixture } from '../../test/fixtures/area-dataset.js';

/** Executes the real import decisions against memory; deliberately does not emulate database constraints/rollback. */
function memoryTransaction() {
  function table() {
    const records = new Map<string, Record<string, unknown>>();
    return {
      records,
      findUnique: vi.fn(
        async ({ where }: { where: Record<string, string> }) => records.get(Object.values(where)[0]) ?? null,
      ),
      upsert: vi.fn(
        async ({ where, create, update }: { where: Record<string, string>; create: object; update: object }) => {
          const key = Object.values(where)[0];
          const existing = records.get(key);
          const row = existing ? { ...existing, ...update } : { id: randomUUID(), ...create };
          records.set(key, row);
          return row;
        },
      ),
    };
  }
  return {
    $executeRaw: vi.fn(async () => 0),
    dataSource: table(),
    sourceReference: table(),
    telecomLocalityGroup: table(),
    telecomLocality: table(),
    areaCode: table(),
    areaCodeMigration: { ...table(), count: vi.fn(async () => 1) },
  };
}
describe('area importer decisions (non-database)', () => {
  it('upserts twice without duplicates, deletes or changed import timestamps', async () => {
    const memory = memoryTransaction();
    const tx = memory as unknown as Prisma.TransactionClient;
    const data = areaDatasetFixture();
    expect(await applyAreaDataset(tx, data, new Date('2020-01-02'))).toEqual({
      read: 2,
      created: 2,
      updated: 0,
      skipped: 0,
    });
    const before = memory.areaCode.records.get('0236');
    expect(await applyAreaDataset(tx, data, new Date('2021-01-02'))).toEqual({
      read: 2,
      created: 0,
      updated: 0,
      skipped: 2,
    });
    expect(memory.areaCode.records.size).toBe(2);
    expect(memory.areaCodeMigration.records.size).toBe(1);
    expect(memory.areaCode.records.get('0236')).toEqual(before);
    const smaller = structuredClone(data);
    smaller.codes = [smaller.codes[0]];
    smaller.migrations = [];
    await applyAreaDataset(tx, smaller, new Date());
    expect(memory.areaCode.records.has('0511')).toBe(true);
    expect(memory.areaCodeMigration.records.size).toBe(1);
  });
  it('validates before writes and preserves immutable evidence', async () => {
    const memory = memoryTransaction();
    const tx = memory as unknown as Prisma.TransactionClient;
    await expect(applyAreaDataset(tx, {}, new Date())).rejects.toThrow('Invalid area-code dataset');
    expect(memory.$executeRaw).not.toHaveBeenCalled();
    const data = areaDatasetFixture();
    await applyAreaDataset(tx, data, new Date());
    data.references[0].notes = 'Replacement evidence at old UUID';
    await expect(applyAreaDataset(tx, data, new Date())).rejects.toThrow('immutable');
  });
  it('refuses silent locality reassignment or source-era name erasure', async () => {
    const memory = memoryTransaction();
    const tx = memory as unknown as Prisma.TransactionClient;
    const data = areaDatasetFixture();
    await applyAreaDataset(tx, data, new Date());
    const renamed = structuredClone(data);
    renamed.localities[0].name = 'New coverage name';
    await expect(applyAreaDataset(tx, renamed, new Date())).rejects.toThrow('reviewed history');
    const moved = structuredClone(data);
    moved.localities.push({ ...moved.localities[0], key: 'other-locality' });
    moved.codes.forEach((row) => (row.localityKey = 'other-locality'));
    await expect(applyAreaDataset(tx, moved, new Date())).rejects.toThrow('reassignment');
  });
  it('cannot retire a replacement target by omitting its retained history', async () => {
    const memory = memoryTransaction();
    const tx = memory as unknown as Prisma.TransactionClient;
    const data = areaDatasetFixture();
    await applyAreaDataset(tx, data, new Date());
    data.codes = [{ ...data.codes[0], status: 'INACTIVE' }];
    data.migrations = [];
    await expect(applyAreaDataset(tx, data, new Date())).rejects.toThrow('retained historical replacement');
  });
  it('allows new evidence snapshots without redefining the telecom group identity', async () => {
    const memory = memoryTransaction();
    const tx = memory as unknown as Prisma.TransactionClient;
    const data = areaDatasetFixture();
    await applyAreaDataset(tx, data, new Date());
    const referenceId = randomUUID();
    data.references.push({ ...data.references[0], id: referenceId, notes: 'New review' });
    data.groups[0].referenceId = referenceId;
    await applyAreaDataset(tx, data, new Date());
    expect(memory.telecomLocalityGroup.records.get(data.groups[0].key)?.['sourceReferenceId']).toBe(referenceId);
    expect(memory.sourceReference.records.size).toBe(2);
  });
});
