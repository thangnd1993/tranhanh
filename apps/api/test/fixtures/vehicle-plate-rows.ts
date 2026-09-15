import { vi } from 'vitest';
import { normalizeSearch } from '../../src/common/normalize-search.js';
import type { VehiclePlateRow } from '../../src/vehicle-plates/vehicle-plates.service.js';
const at = new Date('2020-01-01T00:00:00Z');
const publisher = {
  id: 'publisher',
  key: 'test',
  name: 'Test-only publisher',
  homepageUrl: 'https://example.test',
  dataUrl: null,
  termsUrl: null,
  isOfficial: false,
  isActive: true,
  createdAt: at,
  updatedAt: at,
};
const reference = {
  id: 'reference',
  sourceId: publisher.id,
  source: publisher,
  title: 'Test evidence',
  externalUrl: 'https://example.test/evidence',
  publishedAt: null,
  retrievedAt: at,
  effectiveFrom: null,
  effectiveTo: null,
  notes: null,
  createdAt: at,
  updatedAt: at,
};
function row(
  numericPrefix: string,
  targetKey: string,
  targetName: string,
  seriesPrefix: string | null = null,
): VehiclePlateRow {
  return {
    id: `${numericPrefix}-${seriesPrefix ?? 'all'}`,
    key: `${numericPrefix}-${seriesPrefix ?? 'current'}`,
    numericPrefix,
    seriesPrefix,
    targetId: targetKey,
    target: {
      id: targetKey,
      key: targetKey,
      name: targetName,
      aliases: targetKey === 'ho-chi-minh' ? ['TP.HCM'] : [],
      searchName: normalizeSearch(targetName),
      type: targetKey === 'cuc-canh-sat-giao-thong' ? 'CENTRAL_AUTHORITY' : 'LOCALITY',
      isActive: true,
      sourceReferenceId: reference.id,
      sourceReference: reference,
      createdAt: at,
      updatedAt: at,
    },
    status: 'ACTIVE',
    effectiveFrom: new Date('2025-07-01'),
    effectiveTo: null,
    sourceReferenceId: reference.id,
    sourceReference: reference,
    importedAt: at,
    createdAt: at,
    updatedAt: at,
    history: [],
  };
}
export function vehiclePlateRows(): VehiclePlateRow[] {
  const r61 = row('61', 'ho-chi-minh', 'TP. Hồ Chí Minh');
  const oldTarget = {
    ...r61.target,
    id: 'binh-duong',
    key: 'binh-duong',
    name: 'Bình Dương',
    aliases: [],
    searchName: 'binh duong',
    isActive: false,
  };
  r61.history = [
    {
      id: 'history-61',
      allocationId: r61.id,
      previousTargetId: oldTarget.id,
      previousTarget: oldTarget,
      effectiveFrom: null,
      effectiveTo: new Date('2025-07-01'),
      sourceReferenceId: reference.id,
      sourceReference: reference,
      transitionReferenceId: reference.id,
      transitionReference: reference,
      createdAt: at,
      updatedAt: at,
    },
  ];
  return [
    row('30', 'ha-noi', 'Hà Nội'),
    row('30', 'ha-noi', 'Hà Nội', 'K'),
    row('43', 'da-nang', 'Đà Nẵng'),
    row('51', 'ho-chi-minh', 'TP. Hồ Chí Minh'),
    r61,
    row('80', 'cuc-canh-sat-giao-thong', 'Cục Cảnh sát giao thông'),
  ];
}
type StringFilter = { startsWith?: string; in?: string[]; notIn?: string[] };
interface Where {
  numericPrefix?: string | StringFilter;
  key?: StringFilter;
  status?: string;
  seriesPrefix?: string | null | StringFilter;
  target?: { key?: string | StringFilter; type?: string; searchName?: { contains: string } };
  OR?: Where[];
  AND?: Where[];
}
function matches(r: VehiclePlateRow, w: Where): boolean {
  if (w.numericPrefix && typeof w.numericPrefix === 'string' && r.numericPrefix !== w.numericPrefix) return false;
  if (
    typeof w.numericPrefix === 'object' &&
    w.numericPrefix?.startsWith &&
    !r.numericPrefix.startsWith(w.numericPrefix.startsWith)
  )
    return false;
  if (w.key?.notIn?.includes(r.key)) return false;
  if (w.status && r.status !== w.status) return false;
  if (w.seriesPrefix === null && r.seriesPrefix !== null) return false;
  if (typeof w.seriesPrefix === 'string' && r.seriesPrefix !== w.seriesPrefix) return false;
  if (
    typeof w.seriesPrefix === 'object' &&
    w.seriesPrefix?.startsWith &&
    !r.seriesPrefix?.startsWith(w.seriesPrefix.startsWith)
  )
    return false;
  if (w.target?.key && typeof w.target.key === 'string' && r.target.key !== w.target.key) return false;
  if (typeof w.target?.key === 'object' && w.target.key.in && !w.target.key.in.includes(r.target.key)) return false;
  if (w.target?.type && r.target.type !== w.target.type) return false;
  if (w.target?.searchName?.contains && !r.target.searchName.includes(w.target.searchName.contains)) return false;
  if (w.OR && !w.OR.some((x: Where) => matches(r, x))) return false;
  if (w.AND && !w.AND.every((x: Where) => matches(r, x))) return false;
  return true;
}
export function vehiclePlatePrismaFixture() {
  const rows = vehiclePlateRows();
  return {
    vehiclePlateAllocation: {
      count: vi.fn(async ({ where }: { where: Where }) => rows.filter((r) => matches(r, where)).length),
      findMany: vi.fn(async ({ where, skip = 0, take }: { where: Where; skip?: number; take?: number }) =>
        rows
          .filter((r) => matches(r, where))
          .sort(
            (a, b) =>
              a.numericPrefix.localeCompare(b.numericPrefix) ||
              (a.seriesPrefix ?? '').localeCompare(b.seriesPrefix ?? ''),
          )
          .slice(skip, take === undefined ? undefined : skip + take),
      ),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}
