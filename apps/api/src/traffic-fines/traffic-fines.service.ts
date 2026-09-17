import { createHash } from 'node:crypto';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import type {
  TrafficFineLimitation,
  TrafficFineLookupRequest,
  TrafficFineLookupResponse,
  TrafficFineProviderInfo,
  TrafficFineRecord,
  TrafficFineRecordStatus,
} from '@tranhanh/shared';
import { maskFullVehiclePlate, normalizeFullVehiclePlate } from '../common/normalize-full-vehicle-plate.js';
import {
  TRAFFIC_FINE_PROVIDER,
  TrafficFineProviderError,
  type TrafficFineProvider,
  type TrafficFineProviderRecord,
  type TrafficFineProviderResult,
} from './traffic-fine-provider.js';

const outcomes = new Set([
  'RESULTS_AVAILABLE',
  'NO_MATCHING_RECORDS',
  'MANUAL_VERIFICATION_REQUIRED',
  'SOURCE_UNAVAILABLE',
  'UNSUPPORTED',
]);
const statuses = new Set<TrafficFineRecordStatus>(['UNRESOLVED', 'RESOLVED', 'UNKNOWN']);
const limitationCodes = new Set<TrafficFineLimitation['code']>([
  'CAPTCHA_REQUIRED',
  'MANUAL_LOOKUP_ONLY',
  'COVERAGE_NOT_GUARANTEED',
  'FRESHNESS_NOT_PUBLISHED',
  'NO_PUBLIC_API',
  'PROVIDER_UNAVAILABLE',
]);
function text(value: unknown, max = 1_000): string | null {
  if (value == null) return null;
  if (typeof value !== 'string') throw new TrafficFineProviderError('MALFORMED_RESPONSE');
  const clean = value.normalize('NFC').replace(/\s+/gu, ' ').trim();
  if (!clean) return null;
  if (clean.length > max || /[\p{Cc}\p{Cf}]/u.test(clean)) throw new TrafficFineProviderError('MALFORMED_RESPONSE');
  return clean;
}
function dateText(value: unknown): string | null {
  const clean = text(value, 50);
  if (!clean) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  if (!/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(clean) || Number.isNaN(Date.parse(clean)))
    throw new TrafficFineProviderError('MALFORMED_RESPONSE');
  return clean;
}
function fingerprint(providerKey: string, record: Omit<TrafficFineRecord, 'fingerprint'>): string {
  return createHash('sha256')
    .update(
      JSON.stringify([
        providerKey,
        record.violationTime,
        record.violationLocation,
        record.violationBehavior,
        record.detectingAuthority,
        record.processingAuthority,
        record.status,
        record.providerStatusText,
        record.sourceUpdatedAt,
        record.publicReference,
      ]),
    )
    .digest('hex');
}
function normalizeRecord(provider: TrafficFineProviderInfo, value: unknown): TrafficFineRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new TrafficFineProviderError('MALFORMED_RESPONSE');
  const raw = value as TrafficFineProviderRecord;
  const status = raw.status ?? 'UNKNOWN';
  if (!statuses.has(status)) throw new TrafficFineProviderError('MALFORMED_RESPONSE');
  const base: Omit<TrafficFineRecord, 'fingerprint'> = {
    providerKey: provider.key,
    sourceUrl: provider.url,
    violationTime: dateText(raw.violationTime),
    violationLocation: text(raw.violationLocation),
    violationBehavior: text(raw.violationBehavior),
    detectingAuthority: text(raw.detectingAuthority),
    processingAuthority: text(raw.processingAuthority),
    status,
    providerStatusText: text(raw.providerStatusText, 250),
    sourceUpdatedAt: dateText(raw.sourceUpdatedAt),
    publicReference: text(raw.publicReference, 250),
  };
  return { fingerprint: fingerprint(provider.key, base), ...base };
}
function normalizeProviderResult(
  provider: TrafficFineProviderInfo,
  value: unknown,
): Omit<TrafficFineProviderResult, 'records'> & { records: TrafficFineRecord[] } {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new TrafficFineProviderError('MALFORMED_RESPONSE');
  const raw = value as Partial<TrafficFineProviderResult>;
  if (!raw.outcome || !outcomes.has(raw.outcome) || !Array.isArray(raw.records) || !Array.isArray(raw.limitations))
    throw new TrafficFineProviderError('MALFORMED_RESPONSE');
  const retrievedAt = dateText(raw.retrievedAt);
  if (!retrievedAt || /^\d{4}-\d{2}-\d{2}$/.test(retrievedAt)) throw new TrafficFineProviderError('MALFORMED_RESPONSE');
  const limitations = raw.limitations.map((limitation) => {
    if (!limitation || !limitationCodes.has(limitation.code)) throw new TrafficFineProviderError('MALFORMED_RESPONSE');
    const message = text(limitation.message, 500);
    if (!message) throw new TrafficFineProviderError('MALFORMED_RESPONSE');
    return { code: limitation.code, message };
  });
  const records = raw.records.map((record) => normalizeRecord(provider, record));
  if (raw.outcome === 'RESULTS_AVAILABLE' && records.length === 0)
    throw new TrafficFineProviderError('MALFORMED_RESPONSE');
  if (raw.outcome !== 'RESULTS_AVAILABLE' && records.length > 0)
    throw new TrafficFineProviderError('MALFORMED_RESPONSE');
  return { outcome: raw.outcome, records, retrievedAt, limitations };
}
function publicProviderError(error: TrafficFineProviderError): never {
  const status = error.code === 'MALFORMED_RESPONSE' ? HttpStatus.BAD_GATEWAY : HttpStatus.SERVICE_UNAVAILABLE;
  throw new HttpException(
    {
      statusCode: status,
      outcome: 'SOURCE_UNAVAILABLE',
      providerError: error.code,
      message: 'The traffic-fine source could not complete this lookup.',
    },
    status,
  );
}

@Injectable()
export class TrafficFinesService {
  constructor(@Inject(TRAFFIC_FINE_PROVIDER) private readonly provider: TrafficFineProvider) {}
  providerInfo(): TrafficFineProviderInfo {
    return this.provider.describe();
  }
  async lookup(input: TrafficFineLookupRequest): Promise<TrafficFineLookupResponse> {
    const plate = normalizeFullVehiclePlate(input.licensePlate);
    const provider = this.provider.describe();
    if (!provider.supportedVehicleTypes.includes(input.vehicleType)) {
      return {
        outcome: 'UNSUPPORTED',
        queriedPlateMasked: maskFullVehiclePlate(plate.display),
        vehicleType: input.vehicleType,
        results: [],
        provider,
        retrievedAt: new Date().toISOString(),
        limitations: [
          { code: 'COVERAGE_NOT_GUARANTEED', message: 'This source does not support the selected vehicle type.' },
        ],
      };
    }
    try {
      const normalized = normalizeProviderResult(
        provider,
        await this.provider.lookup({ normalizedPlate: plate.normalized, vehicleType: input.vehicleType }),
      );
      const unique = [...new Map(normalized.records.map((record) => [record.fingerprint, record])).values()];
      return {
        outcome: normalized.outcome,
        queriedPlateMasked: maskFullVehiclePlate(plate.display),
        vehicleType: input.vehicleType,
        results: unique,
        provider,
        retrievedAt: normalized.retrievedAt,
        limitations: normalized.limitations,
      };
    } catch (error) {
      if (error instanceof TrafficFineProviderError) return publicProviderError(error);
      return publicProviderError(new TrafficFineProviderError('UNAVAILABLE'));
    }
  }
}
