import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PrismaService } from '../database/prisma.service.js';
import { validateVehiclePlateDataset } from './dataset.js';
import { exactVehiclePlatePrefix, parseVehiclePlate } from './normalize-vehicle-plate.js';
import { VehiclePlatesService } from './vehicle-plates.service.js';
import { vehiclePlateDatasetFixture } from '../../test/fixtures/vehicle-plate-dataset.js';
import { vehiclePlatePrismaFixture } from '../../test/fixtures/vehicle-plate-rows.js';

describe('vehicle-plate normalization and privacy', () => {
  it.each([
    ['51', { numericPrefix: '51', series: null, kind: 'NUMERIC_PREFIX' }],
    ['51K', { numericPrefix: '51', series: 'K', kind: 'ALLOCATION_PREFIX' }],
    ['51k', { numericPrefix: '51', series: 'K', kind: 'ALLOCATION_PREFIX' }],
    ['51K-123.45', { numericPrefix: '51', series: 'K', kind: 'FULL_PLATE' }],
    ['51K 12345', { numericPrefix: '51', series: 'K', kind: 'FULL_PLATE' }],
    ['30K1', { numericPrefix: '30', series: 'K1', kind: 'ALLOCATION_PREFIX' }],
  ])('parses %s without retaining serial', (input, expected) => expect(parseVehiclePlate(input)).toEqual(expected));
  it.each(['', '5', '051K', '51I', '51K12345', '51K-12.345', '51K-123.456', '51K/12345', '51K\n12345', '０１K'])(
    'rejects malformed input %s',
    (input) => expect(() => parseVehiclePlate(input)).toThrow(),
  );
  it('rejects full plates on exact routes', () => {
    expect(() => exactVehiclePlatePrefix('51K-123.45')).toThrow();
    expect(exactVehiclePlatePrefix('51K').series).toBe('K');
  });
});
describe('reviewed vehicle-plate dataset', () => {
  const input: unknown = JSON.parse(readFileSync(new URL('../../data/vehicle-plates.json', import.meta.url), 'utf8'));
  it('contains the complete current table and source-backed transitions', () => {
    const d = validateVehiclePlateDataset(input);
    expect(d.allocations).toHaveLength(81);
    expect(d.targets.filter((x) => x.isActive)).toHaveLength(35);
    expect(d.history).toHaveLength(29);
    for (const [prefix, name] of [
      ['51', 'TP. Hồ Chí Minh'],
      ['43', 'Đà Nẵng'],
      ['30', 'Hà Nội'],
      ['80', 'Cục Cảnh sát giao thông'],
    ]) {
      const a = d.allocations.find((x) => x.numericPrefix === prefix)!;
      expect(d.targets.find((x) => x.key === a.targetKey)?.name).toBe(name);
    }
    expect(d.history.find((x) => x.allocationKey === '61-current')).toMatchObject({
      previousTargetKey: 'binh-duong',
      effectiveTo: '2025-07-01',
    });
    expect(d.allocations.every((x) => x.seriesPrefix === null)).toBe(true);
  });
  it('rejects duplicate allocation scope, missing evidence, bad dates and erased history', () => {
    const changes = [
      (d: ReturnType<typeof vehiclePlateDatasetFixture>) => d.allocations.push({ ...d.allocations[0], key: 'other' }),
      (d: ReturnType<typeof vehiclePlateDatasetFixture>) => {
        d.allocations[0].referenceId = 'missing';
      },
      (d: ReturnType<typeof vehiclePlateDatasetFixture>) => {
        d.allocations[0].effectiveFrom = '2025-02-30';
      },
      (d: ReturnType<typeof vehiclePlateDatasetFixture>) => {
        d.history = [];
      },
      (d: ReturnType<typeof vehiclePlateDatasetFixture>) => {
        d.history[0].previousTargetKey = 'current-place';
      },
    ];
    for (const change of changes) {
      const d = vehiclePlateDatasetFixture();
      change(d);
      expect(() => validateVehiclePlateDataset(d)).toThrow();
    }
  });
});
describe('vehicle-plate service contracts', () => {
  it('uses series only when source-backed and returns all ambiguous matches', async () => {
    const fake = vehiclePlatePrismaFixture();
    const service = new VehiclePlatesService(fake as unknown as PrismaService);
    const current = await service.lookup('51K-123.45');
    expect(current).toMatchObject({
      parsed: { numericPrefix: '51', series: 'K', seriesAllocationVerified: false },
      ambiguous: false,
      vehicleOrOwnerVerified: false,
    });
    expect(JSON.stringify(current)).not.toContain('123.45');
    expect(JSON.stringify(fake.vehiclePlateAllocation.findMany.mock.calls)).not.toContain('123.45');
    const synthetic = await service.exact('30K');
    expect(synthetic.ambiguous).toBe(true);
    expect(synthetic.parsed.seriesAllocationVerified).toBe(true);
    expect(synthetic.allocations).toHaveLength(2);
  });
  it('searches accents and returns current-target related prefixes with history', async () => {
    const service = new VehiclePlatesService(vehiclePlatePrismaFixture() as unknown as PrismaService);
    expect((await service.list({ q: 'Da Nang' })).items[0].numericPrefix).toBe('43');
    expect((await service.related('51')).map((x) => x.numericPrefix)).toEqual(['61']);
    expect((await service.exact('61')).allocations[0].previousTargets[0]).toMatchObject({
      previousTarget: { name: 'Bình Dương' },
      effectiveTo: '2025-07-01',
    });
    await expect(service.exact('42')).rejects.toMatchObject({ status: 404 });
  });
});
