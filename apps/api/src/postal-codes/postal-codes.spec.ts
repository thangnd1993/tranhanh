import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PrismaService } from '../database/prisma.service.js';
import { validatePostalCodeDataset } from './dataset.js';
import { normalizePostalCode } from './normalize-postal-code.js';
import { PostalCodesService } from './postal-codes.service.js';
import { postalPrismaFixture } from '../../test/fixtures/postal-code-rows.js';
describe('postal-code normalization', () => {
  it.each([
    ['50206', '50206'],
    [' 03127 ', '03127'],
    ['０３１２７', '03127'],
  ])('normalizes %s', (input, expected) => expect(normalizePostalCode(input)).toBe(expected));
  it.each(['', '1234', '123456', '12A45', '03-127', '  '])('rejects malformed %s', (input) =>
    expect(() => normalizePostalCode(input)).toThrow(),
  );
});
describe('official postal-code dataset', () => {
  const input: unknown = JSON.parse(readFileSync(new URL('../../data/postal-codes.json', import.meta.url), 'utf8'));
  it('validates current two-tier coverage and explicitly records source anomalies', () => {
    const data = validatePostalCodeDataset(input);
    expect(data.standard.codeLength).toBe(5);
    expect(data.targets.filter((x) => x.type === 'PROVINCE_CITY')).toHaveLength(34);
    expect(data.targets).toHaveLength(3355);
    expect(data.assignments).toHaveLength(3320);
    expect(data.assignments.find((x) => x.code === '50206')?.targetKey).toBe('postal-target-50206');
    expect(data.assignments.find((x) => x.code === '05127')?.targetKey).toBe('postal-target-05127');
    expect(data.sourceAnomalies).toEqual([expect.objectContaining({ sourceValue: '152213' })]);
  });
  it('rejects duplicate mappings, malformed codes, broken hierarchy and silent omissions', () => {
    const valid = validatePostalCodeDataset(input);
    for (const mutate of [
      (d: typeof valid) => d.assignments.push({ ...d.assignments[0], key: 'other' }),
      (d: typeof valid) => {
        d.assignments[0].code = '123456';
      },
      (d: typeof valid) => {
        d.targets[34].parentKey = null;
      },
      (d: typeof valid) => {
        d.sourceAnomalies = [];
      },
    ]) {
      const copy = structuredClone(valid);
      mutate(copy);
      expect(() => validatePostalCodeDataset(copy)).toThrow();
    }
  });
});
describe('postal-code service', () => {
  it('resolves exact codes with source and hierarchy and preserves leading zeroes', async () => {
    const service = new PostalCodesService(postalPrismaFixture() as unknown as PrismaService);
    const result = await service.exact(' 03127 ');
    expect(result).toMatchObject({
      query: '03127',
      ambiguous: false,
      matches: [
        {
          code: '03127',
          target: { name: 'Phường Hải Dương' },
          hierarchy: [{ name: 'TP. Hải Phòng' }, { name: 'Phường Hải Dương' }],
          source: { official: true },
        },
      ],
    });
  });
  it('searches accents and aliases, preserves ambiguity and returns siblings', async () => {
    const service = new PostalCodesService(postalPrismaFixture() as unknown as PrismaService);
    expect((await service.lookup('Da Nang')).matches[0].code).toBe('50206');
    expect((await service.lookup('TP.HCM')).matches[0].code).toBe('71016');
    expect((await service.lookup('An Giang')).ambiguous).toBe(true);
    expect((await service.related('90456')).map((x) => x.code)).toEqual(['90458']);
    await expect(service.exact('99999')).rejects.toMatchObject({ status: 404 });
  });
});
