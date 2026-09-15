import { randomUUID } from 'node:crypto';
import type { VehiclePlateDataset } from '../../src/vehicle-plates/dataset.js';
/** Synthetic import fixture; never consumed by the production CLI. */
export function vehiclePlateDatasetFixture(): VehiclePlateDataset {
  const publisherKey = `test-${randomUUID()}`;
  const currentReferenceId = randomUUID();
  const oldReferenceId = randomUUID();
  return {
    version: 1,
    sources: [
      { key: publisherKey, name: 'Test-only publisher', homepageUrl: 'https://example.test/', isOfficial: false },
    ],
    references: [
      {
        id: currentReferenceId,
        sourceKey: publisherKey,
        title: 'Current test evidence',
        url: 'https://example.test/current',
        retrievedAt: '2020-01-01T00:00:00Z',
        publishedAt: null,
        notes: 'Synthetic current evidence.',
      },
      {
        id: oldReferenceId,
        sourceKey: publisherKey,
        title: 'Historical test evidence',
        url: 'https://example.test/history',
        retrievedAt: '2020-01-01T00:00:00Z',
        publishedAt: null,
        notes: 'Synthetic historical evidence.',
      },
    ],
    targets: [
      {
        key: 'current-place',
        name: 'Current Place',
        aliases: [],
        type: 'LOCALITY',
        isActive: true,
        referenceId: currentReferenceId,
      },
      {
        key: 'old-place',
        name: 'Old Place',
        aliases: [],
        type: 'LOCALITY',
        isActive: false,
        referenceId: oldReferenceId,
      },
    ],
    allocations: [
      {
        key: '51-current',
        numericPrefix: '51',
        seriesPrefix: null,
        targetKey: 'current-place',
        status: 'ACTIVE',
        effectiveFrom: '2025-07-01',
        effectiveTo: null,
        referenceId: currentReferenceId,
      },
    ],
    history: [
      {
        allocationKey: '51-current',
        previousTargetKey: 'old-place',
        effectiveFrom: null,
        effectiveTo: '2025-07-01',
        sourceReferenceId: oldReferenceId,
        transitionReferenceId: currentReferenceId,
      },
    ],
    seriesPolicy: {
      referenceId: currentReferenceId,
      allocationResolution: 'NUMERIC_PREFIX_ONLY',
      allowedSeriesPattern: '^(?:[ABCDEFGHKLMNPSTUVXYZ](?:[ABCDEFGHKLMNPSTUVXYZ0-9])?|RM)$',
    },
  };
}
