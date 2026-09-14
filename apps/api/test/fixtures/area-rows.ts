import { vi } from 'vitest';
import type { AreaRow } from '../../src/area-codes/area-codes.service.js';
import { normalizeSearch } from '../../src/common/normalize-search.js';
// Synthetic joined HTTP/service fixtures; not proof of PostgreSQL constraints or authoritative evidence.
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
function row(code: string, key: string, name: string, groupKey = key, groupName = name): AreaRow {
  const aliases = key === 'ho-chi-minh' ? ['TP.HCM'] : [];
  return {
    id: code,
    code,
    localityId: key,
    locality: {
      id: key,
      key,
      name,
      aliases,
      searchName: normalizeSearch([name, ...aliases].join(' ')),
      isActive: true,
      groupId: groupKey,
      group: {
        id: groupKey,
        key: groupKey,
        name: groupName,
        aliases,
        searchName: normalizeSearch([groupName, ...aliases].join(' ')),
        effectiveFrom: null,
        sourceReferenceId: reference.id,
        sourceReference: reference,
        createdAt: at,
        updatedAt: at,
      },
      sourceReferenceId: reference.id,
      sourceReference: reference,
      createdAt: at,
      updatedAt: at,
    },
    status: 'ACTIVE',
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
export function areaRows(): AreaRow[] {
  const current = row('0236', 'da-nang', 'Đà Nẵng');
  const old = row('0511', 'da-nang', 'Đà Nẵng');
  old.status = 'LEGACY';
  const migration = {
    id: 'migration-fixture',
    oldCodeId: old.id,
    newCodeId: current.id,
    effectiveDate: new Date('2017-02-11'),
    sourceReferenceId: reference.id,
    sourceReference: reference,
    createdAt: at,
    updatedAt: at,
  };
  old.replacement = { ...migration, newCode: current };
  current.previous = [{ ...migration, oldCode: old }];
  return [
    old,
    current,
    row('0235', 'quang-nam', 'Quảng Nam', 'da-nang', 'Đà Nẵng'),
    row('024', 'ha-noi', 'Hà Nội'),
    row('028', 'ho-chi-minh', 'Hồ Chí Minh'),
  ];
}
interface Where {
  code?: { startsWith?: string; not?: string };
  locality?: {
    key?: string;
    groupId?: string;
    searchName?: { contains: string };
    group?: { key?: string; searchName?: { contains: string } };
  };
  localityId?: string;
  status?: string | { in: string[] };
  OR?: Where[];
}
function matches(row: AreaRow, where: Where): boolean {
  const loc = where.locality;
  return (
    (!where.code?.startsWith || row.code.startsWith(where.code.startsWith)) &&
    (!where.code?.not || row.code !== where.code.not) &&
    (!where.localityId || row.localityId === where.localityId) &&
    (!loc?.key || row.locality.key === loc.key) &&
    (!loc?.groupId || row.locality.groupId === loc.groupId) &&
    (!loc?.searchName || row.locality.searchName.includes(loc.searchName.contains)) &&
    (!loc?.group?.key || row.locality.group.key === loc.group.key) &&
    (!loc?.group?.searchName || row.locality.group.searchName.includes(loc.group.searchName.contains)) &&
    (!where.status ||
      (typeof where.status === 'string' ? row.status === where.status : where.status.in.includes(row.status))) &&
    (!where.OR || where.OR.some((w) => matches(row, w)))
  );
}
export function areaPrismaFixture() {
  const rows = areaRows();
  return {
    areaCode: {
      findUnique: vi.fn(
        async ({ where }: { where: { code: string } }) => rows.find((r) => r.code === where.code) ?? null,
      ),
      count: vi.fn(async ({ where }: { where: Where }) => rows.filter((r) => matches(r, where)).length),
      findMany: vi.fn(async ({ where, skip = 0, take }: { where: Where; skip?: number; take?: number }) =>
        rows
          .filter((r) => matches(r, where))
          .sort((a, b) => a.code.localeCompare(b.code))
          .slice(skip, take === undefined ? undefined : skip + take),
      ),
    },
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
  };
}
