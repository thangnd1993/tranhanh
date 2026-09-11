import type {
  PhonePrefixPage,
  PhonePrefixResult,
  PhoneSource,
} from '../../../../../packages/shared/src/phone-prefixes';
export type { PhonePrefixResult, PhoneSource };
export class PhoneError extends Error {
  constructor(readonly status: number) {
    super('Phone data unavailable');
  }
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';
const date = (v: unknown) => typeof v === 'string' && Number.isFinite(Date.parse(v));
const optionalDate = (v: unknown) => v === null || date(v);
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
  typeof v['publisher'] === 'string' &&
  typeof v['official'] === 'boolean' &&
  (v['title'] === null || typeof v['title'] === 'string') &&
  url(v['url']) &&
  url(v['publisherUrl']) &&
  date(v['retrievedAt']) &&
  optionalDate(v['publishedAt']);
const prefix = (v: unknown) => typeof v === 'string' && /^\d{3,4}$/.test(v);
const migration = (v: unknown): boolean =>
  record(v) &&
  prefix(v['oldPrefix']) &&
  prefix(v['newPrefix']) &&
  optionalDate(v['effectiveAt']) &&
  source(v['source']);
export function isPhoneResult(v: unknown): v is PhonePrefixResult {
  return (
    record(v) &&
    prefix(v['prefix']) &&
    (v['currentPrefix'] === null || prefix(v['currentPrefix'])) &&
    ['ACTIVE', 'LEGACY', 'INACTIVE'].includes(String(v['status'])) &&
    record(v['operator']) &&
    typeof v['operator']['key'] === 'string' &&
    typeof v['operator']['name'] === 'string' &&
    url(v['operator']['website']) &&
    v['operatorResolution'] === 'PREFIX_ALLOCATION' &&
    v['currentSubscriberNetworkVerified'] === false &&
    optionalDate(v['effectiveFrom']) &&
    optionalDate(v['effectiveTo']) &&
    date(v['updatedAt']) &&
    date(v['importedAt']) &&
    source(v['source']) &&
    Array.isArray(v['previousPrefixes']) &&
    v['previousPrefixes'].every(migration) &&
    (v['replacement'] === null || migration(v['replacement'])) &&
    (v['status'] !== 'LEGACY' ||
      (record(v['replacement']) &&
        v['replacement']['oldPrefix'] === v['prefix'] &&
        v['replacement']['newPrefix'] === v['currentPrefix']))
  );
}
export async function readPhone<T>(base: string, path: string, validate: (v: unknown) => v is T): Promise<T> {
  try {
    const response = await fetch(`${base}/api/v1/phone-prefixes${path}`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok) throw new PhoneError([400, 404].includes(response.status) ? response.status : 503);
    const value: unknown = await response.json();
    if (!validate(value)) throw new PhoneError(503);
    return value;
  } catch (error) {
    throw error instanceof PhoneError ? error : new PhoneError(503);
  }
}
export const isPhoneList = (v: unknown): v is PhonePrefixResult[] => Array.isArray(v) && v.every(isPhoneResult);
export function isPhonePage(v: unknown): v is PhonePrefixPage {
  return (
    record(v) &&
    isPhoneList(v['items']) &&
    Number.isInteger(v['total']) &&
    Number(v['total']) >= 0 &&
    Number.isInteger(v['page']) &&
    Number(v['page']) > 0 &&
    Number.isInteger(v['pageSize']) &&
    Number(v['pageSize']) > 0
  );
}
/** Same API-backed catalogue drives the public index and sitemap; no bundled business dataset. */
export async function readCatalogue(base: string): Promise<PhonePrefixResult[]> {
  const rows: PhonePrefixResult[] = [];
  for (let page = 1; page <= 100; page++) {
    const result = await readPhone(base, `?page=${page}&pageSize=100`, isPhonePage);
    if (result.page !== page || (result.items.length === 0 && rows.length < result.total)) throw new PhoneError(503);
    rows.push(...result.items);
    if (rows.length >= result.total) {
      if (rows.length !== result.total || new Set(rows.map((r) => r.prefix)).size !== rows.length)
        throw new PhoneError(503);
      return rows.filter((r) => r.status === 'ACTIVE' || r.status === 'LEGACY');
    }
  }
  throw new PhoneError(503);
}
