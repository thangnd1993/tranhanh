import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '../generated/prisma/client.js';
import { applyPostalCodeDataset } from './import-dataset.js';
import { postalCodeDatasetFixture } from '../../test/fixtures/postal-code-dataset.js';
function memoryTransaction() {
  function table() {
    const records = new Map<string, Record<string, unknown>>();
    return {
      records,
      findUnique: vi.fn(
        async ({ where }: { where: Record<string, unknown> }) =>
          records.get(JSON.stringify(Object.values(where)[0])) ?? null,
      ),
      upsert: vi.fn(
        async ({
          where,
          create,
          update,
        }: {
          where: Record<string, unknown>;
          create: Record<string, unknown>;
          update: Record<string, unknown>;
        }) => {
          const key = JSON.stringify(Object.values(where)[0]);
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
    postalCodeTarget: table(),
    postalCodeAssignment: table(),
  };
}

describe('postal-code importer decisions', () => {
  it('is idempotent and never deletes omitted assignments', async () => {
    const memory = memoryTransaction(),
      tx = memory as unknown as Prisma.TransactionClient,
      data = postalCodeDatasetFixture();
    expect(await applyPostalCodeDataset(tx, data, new Date('2025-08-25Z'))).toEqual({
      read: 1,
      created: 1,
      updated: 0,
      skipped: 0,
    });
    expect(await applyPostalCodeDataset(tx, data, new Date('2026-01-01Z'))).toEqual({
      read: 1,
      created: 0,
      updated: 0,
      skipped: 1,
    });
    const smaller = structuredClone(data);
    smaller.assignments = [];
    await expect(applyPostalCodeDataset(tx, smaller, new Date())).rejects.toThrow();
    expect(memory.postalCodeAssignment.records.size).toBe(1);
  });
  it('validates before writes and refuses evidence or hierarchy mutation', async () => {
    const memory = memoryTransaction(),
      tx = memory as unknown as Prisma.TransactionClient,
      data = postalCodeDatasetFixture();
    await expect(applyPostalCodeDataset(tx, {}, new Date())).rejects.toThrow('Invalid postal-code dataset');
    await applyPostalCodeDataset(tx, data, new Date());
    const changedEvidence = structuredClone(data);
    changedEvidence.references[0].notes = 'changed';
    await expect(applyPostalCodeDataset(tx, changedEvidence, new Date())).rejects.toThrow('immutable');
    const moved = structuredClone(data);
    moved.targets[1].parentKey = null;
    await expect(applyPostalCodeDataset(tx, moved, new Date())).rejects.toThrow();
  });
});
