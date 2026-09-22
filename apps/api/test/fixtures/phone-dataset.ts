import { randomUUID } from 'node:crypto';
import type { PrefixDataset } from '../../src/phone-prefixes/dataset.js';

interface PhoneFixtureOptions {
  activePrefix?: string;
  secondActivePrefix?: string;
  legacyPrefix?: string;
}
/** Synthetic isolated DB fixtures; never used by the authoritative importer CLI. */
export function phoneDatasetFixture(options: PhoneFixtureOptions = {}): PrefixDataset {
  const digits = randomUUID().replace(/\D/g, '').padEnd(14, '7');
  const activePrefix =
    options.activePrefix ?? `0${['3', '5', '7', '8', '9'][Number(digits.slice(0, 2)) % 5]}${digits.slice(2, 3)}`;
  const legacyPrefix =
    options.legacyPrefix ?? `01${['2', '6', '8', '9'][Number(digits.slice(3, 5)) % 4]}${digits.slice(5, 6)}`;
  const secondActivePrefix = options.secondActivePrefix ?? `0${activePrefix[1]}${(Number(activePrefix[2]) + 1) % 10}`;
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
      { prefix: activePrefix, operatorKey: key, status: 'ACTIVE', effectiveFrom: null, effectiveTo: null, referenceId },
      {
        prefix: secondActivePrefix,
        operatorKey: key,
        status: 'ACTIVE',
        effectiveFrom: null,
        effectiveTo: null,
        referenceId,
      },
      { prefix: legacyPrefix, operatorKey: key, status: 'LEGACY', effectiveFrom: null, effectiveTo: null, referenceId },
    ],
    migrations: [{ oldPrefix: legacyPrefix, newPrefix: activePrefix, effectiveAt: null, referenceId }],
  };
}
