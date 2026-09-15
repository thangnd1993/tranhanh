import { randomUUID } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { Prisma } from '../generated/prisma/client.js';
import { applyVehiclePlateDataset } from './import-dataset.js';
import { vehiclePlateDatasetFixture } from '../../test/fixtures/vehicle-plate-dataset.js';
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
        async ({ where, create, update }: { where: Record<string, unknown>; create: object; update: object }) => {
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
    vehiclePlateTarget: table(),
    vehiclePlateAllocation: table(),
    vehiclePlateAllocationHistory: table(),
  };
}
describe('vehicle-plate importer decisions (non-database)', () => {
  it('is idempotent and never deletes omitted allocations', async () => {
    const memory = memoryTransaction();
    const tx = memory as unknown as Prisma.TransactionClient;
    const data = vehiclePlateDatasetFixture();
    expect(await applyVehiclePlateDataset(tx, data, new Date('2020-01-02'))).toEqual({
      read: 1,
      created: 1,
      updated: 0,
      skipped: 0,
    });
    const before = memory.vehiclePlateAllocation.records.get(JSON.stringify('51-current'));
    expect(await applyVehiclePlateDataset(tx, data, new Date('2021-01-02'))).toEqual({
      read: 1,
      created: 0,
      updated: 0,
      skipped: 1,
    });
    expect(memory.vehiclePlateAllocation.records.get(JSON.stringify('51-current'))).toEqual(before);
    const smaller = structuredClone(data);
    smaller.allocations = [];
    smaller.history = [];
    expect(() => applyVehiclePlateDataset(tx, smaller, new Date())).rejects.toThrow();
    expect(memory.vehiclePlateAllocation.records.size).toBe(1);
  });
  it('validates before writes and preserves immutable evidence', async () => {
    const memory = memoryTransaction();
    const tx = memory as unknown as Prisma.TransactionClient;
    await expect(applyVehiclePlateDataset(tx, {}, new Date())).rejects.toThrow('Invalid vehicle-plate dataset');
    expect(memory.$executeRaw).not.toHaveBeenCalled();
    const data = vehiclePlateDatasetFixture();
    await applyVehiclePlateDataset(tx, data, new Date());
    data.references[0].notes = 'changed';
    await expect(applyVehiclePlateDataset(tx, data, new Date())).rejects.toThrow('immutable');
  });
  it('refuses silent target renaming and allocation reassignment', async () => {
    const memory = memoryTransaction();
    const tx = memory as unknown as Prisma.TransactionClient;
    const data = vehiclePlateDatasetFixture();
    await applyVehiclePlateDataset(tx, data, new Date());
    const renamed = structuredClone(data);
    renamed.targets[0].name = 'Rewritten place';
    await expect(applyVehiclePlateDataset(tx, renamed, new Date())).rejects.toThrow('reviewed history');
    const moved = structuredClone(data);
    moved.allocations[0].targetKey = 'old-place';
    moved.targets[1].isActive = true;
    moved.history = [];
    await expect(applyVehiclePlateDataset(tx, moved, new Date())).rejects.toThrow('reassignment');
  });
});
