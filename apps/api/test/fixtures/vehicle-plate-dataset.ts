import { randomUUID } from 'node:crypto';
import type { VehiclePlateDataset } from '../../src/vehicle-plates/dataset.js';

interface VehiclePlateFixtureOptions {
  numericPrefix?: string;
}
/** Synthetic import fixture; never consumed by the production CLI. */
export function vehiclePlateDatasetFixture(options: VehiclePlateFixtureOptions = {}): VehiclePlateDataset {
  const suffix = randomUUID().slice(0, 8).toLowerCase();
  const numericPrefix =
    options.numericPrefix ?? `${(Number.parseInt(suffix[0], 16) % 9) + 1}${Number.parseInt(suffix[1], 16) % 10}`;
  const currentTargetKey = `current-place-${suffix}`;
  const oldTargetKey = `old-place-${suffix}`;
  const allocationKey = `${numericPrefix}-current-${suffix}`;
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
        key: currentTargetKey,
        name: 'Current Place',
        aliases: [],
        type: 'LOCALITY',
        isActive: true,
        referenceId: currentReferenceId,
      },
      {
        key: oldTargetKey,
        name: 'Old Place',
        aliases: [],
        type: 'LOCALITY',
        isActive: false,
        referenceId: oldReferenceId,
      },
    ],
    allocations: [
      {
        key: allocationKey,
        numericPrefix,
        seriesPrefix: null,
        targetKey: currentTargetKey,
        status: 'ACTIVE',
        effectiveFrom: '2025-07-01',
        effectiveTo: null,
        referenceId: currentReferenceId,
      },
    ],
    history: [
      {
        allocationKey,
        previousTargetKey: oldTargetKey,
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
