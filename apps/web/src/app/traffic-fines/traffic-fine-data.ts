import type { TrafficFineLookupResponse, TrafficFineProviderInfo, TrafficFineRecord } from '@tranhanh/shared';

const outcomes = new Set([
  'RESULTS_AVAILABLE',
  'NO_MATCHING_RECORDS',
  'MANUAL_VERIFICATION_REQUIRED',
  'SOURCE_UNAVAILABLE',
  'UNSUPPORTED',
]);
const vehicleTypes = new Set(['CAR', 'MOTORCYCLE', 'ELECTRIC_BICYCLE']);
const automations = new Set(['AUTOMATION_ALLOWED', 'AUTOMATION_LIMITED', 'MANUAL_ONLY', 'UNSUITABLE']);
const providerStatuses = new Set(['ACTIVE', 'DEGRADED', 'DISABLED']);
const recordStatuses = new Set(['UNRESOLVED', 'RESOLVED', 'UNKNOWN']);
const limitationCodes = new Set([
  'CAPTCHA_REQUIRED',
  'MANUAL_LOOKUP_ONLY',
  'COVERAGE_NOT_GUARANTEED',
  'FRESHNESS_NOT_PUBLISHED',
  'NO_PUBLIC_API',
  'PROVIDER_UNAVAILABLE',
]);
const stringOrNull = (value: unknown): value is string | null => value === null || typeof value === 'string';
const safeUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
};
function isProvider(value: unknown): value is TrafficFineProviderInfo {
  if (!value || typeof value !== 'object') return false;
  const provider = value as Record<string, unknown>;
  return (
    typeof provider['key'] === 'string' &&
    typeof provider['name'] === 'string' &&
    typeof provider['official'] === 'boolean' &&
    safeUrl(provider['url']) &&
    automations.has(provider['automation'] as string) &&
    providerStatuses.has(provider['status'] as string) &&
    typeof provider['geographicCoverage'] === 'string' &&
    Array.isArray(provider['supportedVehicleTypes']) &&
    provider['supportedVehicleTypes'].every((type) => vehicleTypes.has(type)) &&
    typeof provider['requiresCaptcha'] === 'boolean' &&
    typeof provider['requiresAuthentication'] === 'boolean' &&
    typeof provider['freshness'] === 'string'
  );
}
function isRecord(value: unknown): value is TrafficFineRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record['fingerprint'] === 'string' &&
    /^[a-f0-9]{64}$/.test(record['fingerprint']) &&
    typeof record['providerKey'] === 'string' &&
    safeUrl(record['sourceUrl']) &&
    stringOrNull(record['violationTime']) &&
    stringOrNull(record['violationLocation']) &&
    stringOrNull(record['violationBehavior']) &&
    stringOrNull(record['detectingAuthority']) &&
    stringOrNull(record['processingAuthority']) &&
    recordStatuses.has(record['status'] as string) &&
    stringOrNull(record['providerStatusText']) &&
    stringOrNull(record['sourceUpdatedAt']) &&
    stringOrNull(record['publicReference'])
  );
}
export function isTrafficFineLookupResponse(value: unknown): value is TrafficFineLookupResponse {
  if (!value || typeof value !== 'object') return false;
  const response = value as Record<string, unknown>;
  const limitations = response['limitations'];
  const outcome = response['outcome'];
  const results = response['results'];
  return (
    outcomes.has(outcome as string) &&
    typeof response['queriedPlateMasked'] === 'string' &&
    response['queriedPlateMasked'].includes('*') &&
    vehicleTypes.has(response['vehicleType'] as string) &&
    Array.isArray(results) &&
    results.every(isRecord) &&
    (outcome === 'RESULTS_AVAILABLE' ? results.length > 0 : results.length === 0) &&
    isProvider(response['provider']) &&
    typeof response['retrievedAt'] === 'string' &&
    !Number.isNaN(Date.parse(response['retrievedAt'])) &&
    Array.isArray(limitations) &&
    limitations.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        limitationCodes.has((item as Record<string, unknown>)['code'] as string) &&
        typeof (item as Record<string, unknown>)['message'] === 'string',
    )
  );
}

export class TrafficFineApiError extends Error {
  constructor(readonly status: number) {
    super('Traffic-fine lookup failed.');
  }
}
