import { randomUUID } from 'node:crypto';
import type { AreaDataset } from '../../src/area-codes/dataset.js';
/** Synthetic data for guarded transaction tests; never consumed by the authoritative CLI. */
export function areaDatasetFixture(): AreaDataset {
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
      { code: '0236', localityKey: key, status: 'ACTIVE', effectiveFrom: '2017-02-11', effectiveTo: null, referenceId },
      { code: '0511', localityKey: key, status: 'LEGACY', effectiveFrom: null, effectiveTo: null, referenceId },
    ],
    migrations: [{ oldCode: '0511', newCode: '0236', effectiveDate: '2017-02-11', referenceId }],
  };
}
