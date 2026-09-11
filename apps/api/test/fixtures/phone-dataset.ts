import { randomUUID } from 'node:crypto';
import type { PrefixDataset } from '../../src/phone-prefixes/dataset.js';

/** Synthetic isolated DB fixtures; never used by the authoritative importer CLI. */
export function phoneDatasetFixture(): PrefixDataset {
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
        notes: 'Synthetic test fixture, never production facts.',
      },
    ],
    operators: [{ key, name: 'Test-only operator', website: 'https://example.test/', isActive: true, referenceId }],
    prefixes: [
      { prefix: '086', operatorKey: key, status: 'ACTIVE', effectiveFrom: null, effectiveTo: null, referenceId },
      { prefix: '038', operatorKey: key, status: 'ACTIVE', effectiveFrom: null, effectiveTo: null, referenceId },
      { prefix: '0168', operatorKey: key, status: 'LEGACY', effectiveFrom: null, effectiveTo: null, referenceId },
    ],
    migrations: [{ oldPrefix: '0168', newPrefix: '038', effectiveAt: null, referenceId }],
  };
}
