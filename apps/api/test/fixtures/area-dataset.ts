import { randomUUID } from 'node:crypto';
import type { AreaDataset } from '../../src/area-codes/dataset.js';

interface AreaFixtureOptions {
  currentCode?: string;
  legacyCode?: string;
}
/** Synthetic data for guarded transaction tests; never consumed by the authoritative CLI. */
export function areaDatasetFixture(options: AreaFixtureOptions = {}): AreaDataset {
  const digits = randomUUID().replace(/\D/g, '').padEnd(14, '7');
  const currentCode = options.currentCode ?? `02${digits.slice(0, 2)}`;
  const legacyDigits = `${(Number(digits[2]) % 9) + 1}${digits.slice(3, 5)}`;
  const legacyCode =
    options.legacyCode ?? `0${legacyDigits === currentCode.slice(1) ? `9${digits.slice(3, 5)}` : legacyDigits}`;
  const key = `test-${randomUUID()}`;
  const referenceId = randomUUID();
  return {
    version: 1,
    sources: [{ key, name: 'Test-only publisher', homepageUrl: 'https://example.test/', isOfficial: false }],
    references: [
      {
        id: referenceId,
        sourceKey: key,
        title: 'Test-only evidence',
        url: 'https://example.test/evidence',
        retrievedAt: '2020-01-01T00:00:00Z',
        publishedAt: null,
        notes: 'Synthetic fixture, never production facts.',
      },
    ],
    groups: [{ key, name: 'Test-only group', aliases: [], effectiveFrom: null, referenceId }],
    localities: [{ key, name: 'Test-only service area', aliases: [], isActive: true, groupKey: key, referenceId }],
    codes: [
      {
        code: currentCode,
        localityKey: key,
        status: 'ACTIVE',
        effectiveFrom: '2017-02-11',
        effectiveTo: null,
        referenceId,
      },
      { code: legacyCode, localityKey: key, status: 'LEGACY', effectiveFrom: null, effectiveTo: null, referenceId },
    ],
    migrations: [{ oldCode: legacyCode, newCode: currentCode, effectiveDate: '2017-02-11', referenceId }],
  };
}
