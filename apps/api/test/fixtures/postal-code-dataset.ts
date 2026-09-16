import { randomUUID } from 'node:crypto';
import type { PostalCodeDataset } from '../../src/postal-codes/dataset.js';
export function postalCodeDatasetFixture(): PostalCodeDataset {
  const sourceKey = `test-${randomUUID()}`,
    referenceId = randomUUID();
  return {
    version: 1,
    standard: { country: 'VN', codePattern: '^[0-9]{5}$', codeLength: 5, effectiveFrom: '2018-01-01' },
    sources: [{ key: sourceKey, name: 'Test source', homepageUrl: 'https://example.test/', isOfficial: false }],
    references: [
      {
        id: referenceId,
        sourceKey,
        title: 'Test evidence',
        url: 'https://example.test/postal',
        retrievedAt: '2025-08-24T00:00:00Z',
        publishedAt: '2025-08-24T00:00:00Z',
        notes: 'Synthetic fixture.',
      },
    ],
    targets: [
      {
        key: 'province-test',
        name: 'Test Province',
        aliases: [],
        type: 'PROVINCE_CITY',
        parentKey: null,
        isActive: true,
        referenceId,
      },
      {
        key: 'postal-target-01234',
        name: 'Test Ward',
        aliases: [],
        type: 'WARD',
        parentKey: 'province-test',
        isActive: true,
        referenceId,
      },
    ],
    assignments: [
      {
        key: 'postal-code-01234',
        code: '01234',
        targetKey: 'postal-target-01234',
        status: 'ACTIVE',
        effectiveFrom: '2025-08-24',
        effectiveTo: null,
        referenceId,
      },
    ],
    sourceAnomalies: [],
  };
}
