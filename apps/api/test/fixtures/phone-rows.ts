import { vi } from 'vitest';
import type { PhoneRow } from '../../src/phone-prefixes/phone-prefixes.service.js';

// In-memory HTTP fixtures, not authoritative import data and not database-constraint proof.
const at = new Date('2020-01-01T00:00:00Z');
const source = {
  id: 'source-fixture',
  key: 'test-publisher',
  name: 'Test-only publisher',
  homepageUrl: 'https://example.test/',
  dataUrl: null,
  termsUrl: null,
  isOfficial: false,
  isActive: true,
  createdAt: at,
  updatedAt: at,
};
const reference = {
  id: 'reference-fixture',
  sourceId: source.id,
  source,
  title: 'Test-only evidence',
  externalUrl: 'https://example.test/evidence',
  publishedAt: null,
  retrievedAt: at,
  effectiveFrom: null,
  effectiveTo: null,
  notes: null,
  createdAt: at,
  updatedAt: at,
};
function row(prefix: string, key: string, name: string): PhoneRow {
  return {
    id: prefix,
    prefix,
    operatorId: key,
    operator: {
      id: key,
      key,
      name,
      searchName: `${key} ${name.toLowerCase()}`,
      website: null,
      isActive: true,
      sourceReferenceId: reference.id,
      createdAt: at,
      updatedAt: at,
    },
    status: prefix.length === 4 ? 'LEGACY' : 'ACTIVE',
    effectiveFrom: null,
    effectiveTo: null,
    sourceReferenceId: reference.id,
    sourceReference: reference,
    importedAt: at,
    createdAt: at,
    updatedAt: at,
    previous: [],
    replacement: null,
  };
}
export function phoneRows(): PhoneRow[] {
  const current = row('038', 'viettel', 'Viettel');
  const old = row('0168', 'viettel', 'Viettel');
  const migration = {
    id: 'migration-fixture',
    oldPrefixId: old.id,
    newPrefixId: current.id,
    effectiveAt: null,
    sourceReferenceId: reference.id,
    sourceReference: reference,
    createdAt: at,
    updatedAt: at,
  };
  old.replacement = { ...migration, newPrefix: current };
  current.previous = [{ ...migration, oldPrefix: old }];
  return [old, current, row('086', 'viettel', 'Viettel'), row('091', 'vinaphone', 'VinaPhone')];
}
interface Where {
  prefix?: { startsWith?: string; not?: string };
  operator?: { key?: string; searchName?: { contains: string } };
  operatorId?: string;
  status?: string;
  OR?: Where[];
}
function matches(row: PhoneRow, where: Where): boolean {
  return (
    (!where.prefix?.startsWith || row.prefix.startsWith(where.prefix.startsWith)) &&
    (!where.prefix?.not || row.prefix !== where.prefix.not) &&
    (!where.operator?.key || row.operator.key === where.operator.key) &&
    (!where.operator?.searchName || row.operator.searchName.includes(where.operator.searchName.contains)) &&
    (!where.operatorId || row.operatorId === where.operatorId) &&
    (!where.status || row.status === where.status) &&
    (!where.OR || where.OR.some((item) => matches(row, item)))
  );
}
export function phonePrismaFixture() {
  const rows = phoneRows();
  return {
    phonePrefix: {
      findUnique: vi.fn(
        async ({ where }: { where: { prefix: string } }) => rows.find((row) => row.prefix === where.prefix) ?? null,
      ),
      count: vi.fn(async ({ where }: { where: Where }) => rows.filter((row) => matches(row, where)).length),
      findMany: vi.fn(async ({ where, skip = 0, take }: { where: Where; skip?: number; take?: number }) =>
        rows
          .filter((row) => matches(row, where))
          .sort((a, b) => a.prefix.localeCompare(b.prefix))
          .slice(skip, take === undefined ? undefined : skip + take),
      ),
    },
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
  };
}
