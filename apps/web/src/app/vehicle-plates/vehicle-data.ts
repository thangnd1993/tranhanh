import type {
  VehiclePlateAllocationResult,
  VehiclePlateLookupResult,
  VehiclePlatePage,
} from '../../../../../packages/shared/src/vehicle-plates';
export type VehicleRow = VehiclePlateAllocationResult;
export type VehicleLookup = VehiclePlateLookupResult;
export class VehicleError extends Error {
  constructor(readonly status: number) {
    super('Vehicle allocation data unavailable');
  }
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';
const instant = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
const day = (v: unknown) => v === null || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && instant(v));
const text = (v: unknown) => typeof v === 'string' && v.length > 0;
const key = (v: unknown) => typeof v === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(v);
export const validVehiclePrefix = (v: string) =>
  /^[1-9]\d(?:(?:[ABCDEFGHKLMNPSTUVXYZ][ABCDEFGHKLMNPSTUVXYZ0-9]?)|RM)?$/.test(v);
const url = (v: unknown) => {
  if (v === null) return true;
  if (typeof v !== 'string') return false;
  try {
    const u = new URL(v);
    return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password;
  } catch {
    return false;
  }
};
const source = (v: unknown): boolean =>
  record(v) &&
  text(v['publisher']) &&
  typeof v['official'] === 'boolean' &&
  (v['title'] === null || text(v['title'])) &&
  url(v['url']) &&
  url(v['publisherUrl']) &&
  instant(v['retrievedAt']) &&
  (v['publishedAt'] === null || instant(v['publishedAt']));
const target = (v: unknown): boolean =>
  record(v) &&
  key(v['key']) &&
  text(v['name']) &&
  Array.isArray(v['aliases']) &&
  v['aliases'].every(text) &&
  ['LOCALITY', 'CENTRAL_AUTHORITY'].includes(String(v['type'])) &&
  v['nameContext'] === 'VEHICLE_PLATE_ALLOCATION' &&
  source(v['source']);
export function isVehicleResult(v: unknown): v is VehicleRow {
  return (
    record(v) &&
    key(v['key']) &&
    typeof v['numericPrefix'] === 'string' &&
    /^[1-9]\d$/.test(v['numericPrefix']) &&
    (v['seriesPrefix'] === null ||
      (typeof v['seriesPrefix'] === 'string' && validVehiclePrefix(v['numericPrefix'] + v['seriesPrefix']))) &&
    ['ACTIVE', 'INACTIVE'].includes(String(v['status'])) &&
    target(v['target']) &&
    day(v['effectiveFrom']) &&
    day(v['effectiveTo']) &&
    Array.isArray(v['previousTargets']) &&
    v['previousTargets'].every(
      (h) =>
        record(h) &&
        target(h['previousTarget']) &&
        day(h['effectiveFrom']) &&
        h['effectiveTo'] !== null &&
        day(h['effectiveTo']) &&
        source(h['source']) &&
        source(h['transitionSource']),
    ) &&
    source(v['source']) &&
    instant(v['importedAt']) &&
    instant(v['updatedAt'])
  );
}
export const isVehicleList = (v: unknown): v is VehicleRow[] => Array.isArray(v) && v.every(isVehicleResult);
export function isVehicleLookup(v: unknown): v is VehicleLookup {
  if (!record(v) || !record(v['parsed']) || !isVehicleList(v['allocations']) || !v['allocations'].length) return false;
  const p = v['parsed'];
  return (
    typeof p['numericPrefix'] === 'string' &&
    /^[1-9]\d$/.test(p['numericPrefix']) &&
    (p['series'] === null ||
      (typeof p['series'] === 'string' && validVehiclePrefix(p['numericPrefix'] + p['series']))) &&
    typeof p['seriesAllocationVerified'] === 'boolean' &&
    v['resolution'] === 'NUMERIC_PREFIX_ALLOCATION' &&
    v['vehicleOrOwnerVerified'] === false &&
    v['ambiguous'] === v['allocations'].length > 1 &&
    new Set(v['allocations'].map((r) => r.key)).size === v['allocations'].length &&
    v['allocations'].every(
      (r) =>
        r.status === 'ACTIVE' &&
        r.numericPrefix === p['numericPrefix'] &&
        (p['series'] === null || r.seriesPrefix === null || r.seriesPrefix === p['series']),
    ) &&
    p['seriesAllocationVerified'] ===
      Boolean(p['series'] && v['allocations'].some((r) => r.seriesPrefix === p['series']))
  );
}
export const isVehiclePage = (v: unknown): v is VehiclePlatePage =>
  record(v) &&
  isVehicleList(v['items']) &&
  Number.isInteger(v['total']) &&
  Number(v['total']) >= 0 &&
  Number.isInteger(v['page']) &&
  Number(v['page']) > 0 &&
  Number.isInteger(v['pageSize']) &&
  Number(v['pageSize']) > 0;
export async function readVehicle<T>(base: string, path: string, validate: (v: unknown) => v is T): Promise<T> {
  try {
    const res = await fetch(`${base}/api/v1/vehicle-plates${path}`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    });
    if (!res.ok) throw new VehicleError([400, 404].includes(res.status) ? res.status : 503);
    const value: unknown = await res.json();
    if (!validate(value)) throw new VehicleError(503);
    return value;
  } catch (e) {
    throw e instanceof VehicleError ? e : new VehicleError(503);
  }
}
export async function readVehicleCatalogue(base: string): Promise<VehicleRow[]> {
  const rows: VehicleRow[] = [];
  for (let page = 1; page <= 100; page++) {
    const result = await readVehicle(base, `?page=${page}&pageSize=100&status=ACTIVE`, isVehiclePage);
    if (result.page !== page || (!result.items.length && rows.length < result.total)) throw new VehicleError(503);
    rows.push(...result.items);
    if (rows.length >= result.total) {
      if (
        rows.length !== result.total ||
        new Set(rows.map((r) => r.key)).size !== rows.length ||
        rows.some((r) => r.status !== 'ACTIVE')
      )
        throw new VehicleError(503);
      return rows;
    }
  }
  throw new VehicleError(503);
}
