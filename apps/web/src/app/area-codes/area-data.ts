import type { AreaCodePage, AreaCodeResult, AreaCodeSource } from '../../../../../packages/shared/src/area-codes';
export type { AreaCodeResult, AreaCodeSource };
export class AreaError extends Error {
  constructor(readonly status: number) {
    super('Area code data unavailable');
  }
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';
const instant = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
const day = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const optionalDay = (v: unknown) => v === null || day(v);
const safeUrl = (v: unknown) => {
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
  typeof v['publisher'] === 'string' &&
  typeof v['official'] === 'boolean' &&
  (v['title'] === null || typeof v['title'] === 'string') &&
  safeUrl(v['url']) &&
  safeUrl(v['publisherUrl']) &&
  instant(v['retrievedAt']) &&
  (v['publishedAt'] === null || instant(v['publishedAt']));
const code = (v: unknown) => typeof v === 'string' && /^0[1-9]\d{0,2}$/.test(v);
const migration = (v: unknown): boolean =>
  record(v) && code(v['oldCode']) && code(v['newCode']) && optionalDay(v['effectiveDate']) && source(v['source']);
export function isAreaResult(v: unknown): v is AreaCodeResult {
  return (
    record(v) &&
    code(v['code']) &&
    (v['currentCode'] === null || code(v['currentCode'])) &&
    ['ACTIVE', 'LEGACY', 'INACTIVE'].includes(String(v['status'])) &&
    record(v['locality']) &&
    typeof v['locality']['key'] === 'string' &&
    typeof v['locality']['name'] === 'string' &&
    Array.isArray(v['locality']['aliases']) &&
    v['locality']['aliases'].every((a) => typeof a === 'string') &&
    v['locality']['nameContext'] === 'TELECOM_SERVICE_AREA' &&
    source(v['locality']['source']) &&
    record(v['locality']['group']) &&
    typeof v['locality']['group']['key'] === 'string' &&
    typeof v['locality']['group']['name'] === 'string' &&
    optionalDay(v['locality']['group']['effectiveFrom']) &&
    source(v['locality']['group']['source']) &&
    v['resolution'] === 'GEOGRAPHIC_AREA_CODE' &&
    v['subscriberVerified'] === false &&
    optionalDay(v['effectiveFrom']) &&
    optionalDay(v['effectiveTo']) &&
    Array.isArray(v['previousCodes']) &&
    v['previousCodes'].every(migration) &&
    (v['replacement'] === null || migration(v['replacement'])) &&
    source(v['source']) &&
    instant(v['importedAt']) &&
    instant(v['updatedAt']) &&
    (v['status'] !== 'LEGACY' ||
      (record(v['replacement']) &&
        v['replacement']['oldCode'] === v['code'] &&
        v['replacement']['newCode'] === v['currentCode']))
  );
}
export const isAreaList = (v: unknown): v is AreaCodeResult[] => Array.isArray(v) && v.every(isAreaResult);
export function isAreaPage(v: unknown): v is AreaCodePage {
  return (
    record(v) &&
    isAreaList(v['items']) &&
    Number.isInteger(v['total']) &&
    Number(v['total']) >= 0 &&
    Number.isInteger(v['page']) &&
    Number(v['page']) > 0 &&
    Number.isInteger(v['pageSize']) &&
    Number(v['pageSize']) > 0
  );
}
export async function readArea<T>(base: string, path: string, validate: (v: unknown) => v is T): Promise<T> {
  try {
    const response = await fetch(`${base}/api/v1/area-codes${path}`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok) throw new AreaError([400, 404].includes(response.status) ? response.status : 503);
    const value: unknown = await response.json();
    if (!validate(value)) throw new AreaError(503);
    return value;
  } catch (error) {
    throw error instanceof AreaError ? error : new AreaError(503);
  }
}
export async function readAreaCatalogue(base: string): Promise<AreaCodeResult[]> {
  const rows: AreaCodeResult[] = [];
  for (let page = 1; page <= 100; page++) {
    const result = await readArea(base, `?page=${page}&pageSize=100`, isAreaPage);
    if (result.page !== page || (result.items.length === 0 && rows.length < result.total)) throw new AreaError(503);
    rows.push(...result.items);
    if (rows.length >= result.total) {
      if (rows.length !== result.total || new Set(rows.map((r) => r.code)).size !== rows.length)
        throw new AreaError(503);
      return rows.filter((r) => r.status === 'ACTIVE' || r.status === 'LEGACY');
    }
  }
  throw new AreaError(503);
}
