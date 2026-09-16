import { vi } from 'vitest';
import { normalizeSearch } from '../../src/common/normalize-search.js';
import type { PostalCodeRow } from '../../src/postal-codes/postal-codes.service.js';
const at = new Date('2025-08-24T00:00:00Z');
const source = {
  id: 'source',
  key: 'official',
  name: 'Official test source',
  homepageUrl: 'https://example.test',
  dataUrl: null,
  termsUrl: null,
  isOfficial: true,
  isActive: true,
  createdAt: at,
  updatedAt: at,
};
const reference = {
  id: 'reference',
  sourceId: source.id,
  source,
  title: 'Test evidence',
  externalUrl: 'https://example.test/evidence',
  publishedAt: at,
  retrievedAt: at,
  effectiveFrom: null,
  effectiveTo: null,
  notes: null,
  createdAt: at,
  updatedAt: at,
};
function row(
  code: string,
  name: string,
  type: 'WARD' | 'COMMUNE',
  provinceKey: string,
  provinceName: string,
): PostalCodeRow {
  const parent = {
    id: provinceKey,
    key: provinceKey,
    name: provinceName,
    aliases:
      provinceKey === 'province-15' ? ['TP.HCM', 'Ho Chi Minh City'] : provinceKey === 'province-06' ? ['Da Nang'] : [],
    searchName: normalizeSearch(provinceName),
    type: 'PROVINCE_CITY' as const,
    parentId: null,
    isActive: true,
    sourceReferenceId: reference.id,
    createdAt: at,
    updatedAt: at,
  };
  return {
    id: code,
    key: `postal-code-${code}`,
    code,
    targetId: `target-${code}`,
    target: {
      ...parent,
      id: `target-${code}`,
      key: `postal-target-${code}`,
      name,
      aliases: [name.replace(/^(Phường|Xã) /, '')],
      searchName: normalizeSearch(name),
      type,
      parentId: parent.id,
      parent,
    },
    status: 'ACTIVE',
    effectiveFrom: at,
    effectiveTo: null,
    sourceReferenceId: reference.id,
    sourceReference: reference,
    importedAt: at,
    createdAt: at,
    updatedAt: at,
  };
}
export function postalRows(): PostalCodeRow[] {
  return [
    row('50206', 'Phường Hải Châu', 'WARD', 'province-06', 'TP. Đà Nẵng'),
    row('71016', 'Phường Sài Gòn', 'WARD', 'province-15', 'TP. Hồ Chí Minh'),
    row('90456', 'Xã An Phú', 'COMMUNE', 'province-01', 'An Giang'),
    row('90458', 'Xã Phú Hữu', 'COMMUNE', 'province-01', 'An Giang'),
    row('03127', 'Phường Hải Dương', 'WARD', 'province-14', 'TP. Hải Phòng'),
  ];
}
function textMatch(r: PostalCodeRow, q: string) {
  return (
    r.code.startsWith(q) ||
    r.target.searchName.includes(q) ||
    r.target.parent?.searchName.includes(q) ||
    r.target.parent?.aliases.some((x) => normalizeSearch(x).includes(q))
  );
}
type StringFilter = { startsWith?: string; notIn?: string[]; in?: string[] };
type ParentFilter = { key?: string | StringFilter; searchName?: { contains: string } };
type TargetFilter = { type?: string; searchName?: { contains: string }; parent?: ParentFilter };
interface Where {
  code?: string | StringFilter;
  status?: string;
  target?: TargetFilter;
  OR?: Where[];
  AND?: Where[];
}
function queryFrom(clauses: Where[]): string {
  for (const clause of clauses) {
    if (typeof clause.code === 'object' && clause.code.startsWith) return clause.code.startsWith;
    if (clause.target?.searchName?.contains) return clause.target.searchName.contains;
    if (clause.target?.parent?.searchName?.contains) return clause.target.parent.searchName.contains;
  }
  return '';
}
export function postalPrismaFixture() {
  const rows = postalRows();
  const filter = (where: Where) =>
    rows.filter((row) => {
      if (where.code && typeof where.code === 'string' && row.code !== where.code) return false;
      if (typeof where.code === 'object' && where.code.startsWith && !row.code.startsWith(where.code.startsWith))
        return false;
      if (typeof where.code === 'object' && where.code.notIn?.includes(row.code)) return false;
      if (where.status && row.status !== where.status) return false;
      if (where.target?.type && row.target.type !== where.target.type) return false;
      const parentKey = where.target?.parent?.key;
      if (typeof parentKey === 'string' && row.target.parent?.key !== parentKey) return false;
      if (typeof parentKey === 'object' && parentKey.in && !parentKey.in.includes(row.target.parent?.key ?? ''))
        return false;
      if (where.AND && !textMatch(row, queryFrom(where.AND.flatMap((item) => item.OR ?? [])))) return false;
      if (where.OR && !textMatch(row, queryFrom(where.OR))) return false;
      return true;
    });
  return {
    postalCodeAssignment: {
      count: vi.fn(async ({ where }: { where: Where }) => filter(where).length),
      findMany: vi.fn(async ({ where, skip = 0, take }: { where: Where; skip?: number; take?: number }) =>
        filter(where)
          .sort((left, right) => left.code.localeCompare(right.code))
          .slice(skip, take === undefined ? undefined : skip + take),
      ),
    },
    $transaction: vi.fn(async (operations: Promise<unknown>[]) => Promise.all(operations)),
  };
}
