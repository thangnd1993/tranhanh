import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { exactAreaCode, matchAreaNumber, parseAreaInput } from './normalize-area.js';
import { validateAreaDataset } from './dataset.js';
import { AreaCodesService } from './area-codes.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { areaPrismaFixture } from '../../test/fixtures/area-rows.js';
import { areaDatasetFixture } from '../../test/fixtures/area-dataset.js';

describe('area-code normalization', () => {
  it.each(['0236', '236', '+84236', '0084236', '84 236', '0236-', ' 0236 '])(
    'normalizes code-only input %s',
    (value) => {
      expect(parseAreaInput(value)).toEqual({ kind: 'CODE', code: '0236' });
    },
  );
  it.each(['0236 123 4567', '+84 236 123 4567', '0084-236-123-4567'])('matches known full landline %s', (value) => {
    const input = parseAreaInput(value);
    expect(input.kind).toBe('NUMBER');
    if (input.kind === 'NUMBER') expect(matchAreaNumber(input.domestic, ['024', '0236'])).toBe('0236');
  });
  it('handles different code lengths and preserves historical inputs', () => {
    expect(parseAreaInput('4')).toEqual({ kind: 'CODE', code: '04' });
    expect(parseAreaInput('0511')).toEqual({ kind: 'CODE', code: '0511' });
    expect(matchAreaNumber('024' + '12345678', ['0236', '024'])).toBe('024');
    expect(matchAreaNumber('028' + '12345678', ['028', '0236'])).toBe('028');
    expect(matchAreaNumber('0236' + '1234567', ['023', '0236'])).toBe('0236');
  });
  it.each([
    '',
    'abc',
    '+84',
    '0084',
    '+840236',
    '+852236',
    '0236--',
    '0236  12',
    '0236/12',
    '0236123',
    '0861234567',
    '05111234567',
    '2361234567',
    '02361234567-',
    '0'.repeat(33),
  ])('rejects malformed/unsupported %s', (value) => {
    expect(() => parseAreaInput(value)).toThrow();
  });
  it('separates well-formed unknown codes and invalid exact routes', () => {
    expect(parseAreaInput('999')).toEqual({ kind: 'CODE', code: '0999' });
    expect(() => matchAreaNumber('0298' + '1234567', ['0236', '024'])).toThrow('not found');
    expect(() => exactAreaCode('236')).toThrow();
    expect(exactAreaCode('04')).toBe('04');
  });
});
describe('reviewed area dataset', () => {
  const input: unknown = JSON.parse(readFileSync(new URL('../../data/area-codes.json', import.meta.url), 'utf8'));
  it('matches sourced counts and representative factual assignments', () => {
    const data = validateAreaDataset(input);
    expect(data.codes.filter((r) => r.status === 'ACTIVE')).toHaveLength(63);
    expect(data.migrations).toHaveLength(59);
    expect(data.groups).toHaveLength(34);
    expect(data.localities).toHaveLength(63);
    for (const [code, name] of [
      ['0236', 'Đà Nẵng'],
      ['024', 'Hà Nội'],
      ['028', 'Hồ Chí Minh'],
      ['0292', 'Cần Thơ'],
      ['0214', 'Lào Cai'],
    ]) {
      const row = data.codes.find((r) => r.code === code)!;
      expect(data.localities.find((r) => r.key === row.localityKey)?.name).toBe(name);
    }
    expect(data.migrations.find((r) => r.oldCode === '0511')).toMatchObject({
      newCode: '0236',
      effectiveDate: '2017-02-11',
    });
    expect(data.migrations.filter((r) => r.effectiveDate === '2017-02-11')).toHaveLength(13);
    expect(data.migrations.filter((r) => r.effectiveDate === '2017-04-15')).toHaveLength(23);
    expect(data.migrations.filter((r) => r.effectiveDate === '2017-06-17')).toHaveLength(23);
    for (const code of ['0210', '0211', '0218', '0219']) {
      expect(data.codes.find((r) => r.code === code)?.effectiveFrom).toBeNull();
      expect(data.migrations.some((r) => r.oldCode === code)).toBe(false);
    }
  });
  it('preserves temporary parallel codes instead of treating proposed consolidation as a migration', () => {
    const data = validateAreaDataset(input);
    const localities = data.localities.filter((r) => r.groupKey === 'ho-chi-minh-2025');
    expect(localities).toHaveLength(3);
    expect(
      data.codes
        .filter((r) => r.status === 'ACTIVE' && localities.some((l) => l.key === r.localityKey))
        .map((r) => r.code),
    ).toEqual(['0254', '0274', '028']);
    expect(data.migrations.every((r) => r.effectiveDate?.startsWith('2017'))).toBe(true);
  });
  it('rejects duplicates, bad references, invalid dates and inconsistent historical mappings', () => {
    const mutations = [
      (d: ReturnType<typeof areaDatasetFixture>) => d.codes.push({ ...d.codes[0] }),
      (d: ReturnType<typeof areaDatasetFixture>) => {
        d.codes[0].referenceId = 'unknown';
      },
      (d: ReturnType<typeof areaDatasetFixture>) => {
        d.codes[0].effectiveFrom = '2017-02-30';
      },
      (d: ReturnType<typeof areaDatasetFixture>) => {
        d.codes[0].effectiveTo = '2016-01-01';
      },
      (d: ReturnType<typeof areaDatasetFixture>) => {
        d.localities[0].groupKey = 'unknown';
      },
      (d: ReturnType<typeof areaDatasetFixture>) => {
        d.codes[0].localityKey = 'unknown';
      },
      (d: ReturnType<typeof areaDatasetFixture>) => {
        d.codes[0].code = '086';
      },
      (d: ReturnType<typeof areaDatasetFixture>) => {
        d.migrations = [];
      },
      (d: ReturnType<typeof areaDatasetFixture>) => d.migrations.push({ ...d.migrations[0] }),
      (d: ReturnType<typeof areaDatasetFixture>) => {
        d.migrations[0].newCode = '0511';
      },
      (d: ReturnType<typeof areaDatasetFixture>) => {
        d.migrations[0].effectiveDate = '2017-02-12';
      },
      (d: ReturnType<typeof areaDatasetFixture>) => {
        d.references[0].url = 'https://user:pass@example.test';
      },
    ];
    for (const change of mutations) {
      const data = areaDatasetFixture();
      change(data);
      expect(() => validateAreaDataset(data)).toThrow();
    }
  });
});
describe('area service contracts and privacy', () => {
  it('searches locality/group names without accents and preserves historical context', async () => {
    const fake = areaPrismaFixture();
    const service = new AreaCodesService(fake as unknown as PrismaService);
    for (const q of ['Đà Nẵng', 'Da Nang', 'DA NANG']) expect((await service.list({ q })).total).toBe(3);
    expect((await service.list({ q: 'TP.HCM' })).items[0].code).toBe('028');
    expect((await service.list({ q: '236' })).items[0].code).toBe('0236');
    const old = await service.exact('0511');
    expect(old).toMatchObject({
      status: 'LEGACY',
      currentCode: '0236',
      replacement: { effectiveDate: '2017-02-11' },
      source: { publisher: 'Test-only publisher' },
      locality: { nameContext: 'TELECOM_SERVICE_AREA' },
    });
    expect((await service.related('0236')).map((r) => r.code)).toEqual(['0235', '0511']);
  });
  it('never sends subscriber digits into database operations', async () => {
    const fake = areaPrismaFixture();
    const service = new AreaCodesService(fake as unknown as PrismaService);
    const result = await service.lookup('+84 236 ' + '123 4567');
    expect(result.code).toBe('0236');
    expect(result.subscriberVerified).toBe(false);
    expect(JSON.stringify(result)).not.toContain('1234567');
    expect(JSON.stringify(fake.areaCode.findMany.mock.calls)).not.toContain('1234567');
    expect(fake.areaCode.findUnique.mock.calls[0][0].where).toEqual({ code: '0236' });
    await expect(service.lookup('999')).rejects.toMatchObject({ status: 404 });
  });
});
