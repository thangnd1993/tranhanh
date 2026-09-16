import type {
  TrafficFineLimitation,
  TrafficFineLookupOutcome,
  TrafficFineProviderInfo,
  TrafficFineRecordStatus,
  TrafficFineVehicleType,
} from '@tranhanh/shared';

export const TRAFFIC_FINE_PROVIDER = Symbol('TRAFFIC_FINE_PROVIDER');
export type TrafficFineProviderErrorCode =
  'UNAVAILABLE' | 'TIMEOUT' | 'RATE_LIMITED' | 'MALFORMED_RESPONSE' | 'DEGRADED';

export interface TrafficFineProviderQuery {
  normalizedPlate: string;
  vehicleType: TrafficFineVehicleType;
}
export interface TrafficFineProviderRecord {
  violationTime?: string | null;
  violationLocation?: string | null;
  violationBehavior?: string | null;
  detectingAuthority?: string | null;
  processingAuthority?: string | null;
  status?: TrafficFineRecordStatus;
  providerStatusText?: string | null;
  sourceUpdatedAt?: string | null;
  publicReference?: string | null;
}
export interface TrafficFineProviderResult {
  outcome: TrafficFineLookupOutcome;
  records: TrafficFineProviderRecord[];
  retrievedAt: string;
  limitations: TrafficFineLimitation[];
}
export interface TrafficFineProvider {
  describe(): TrafficFineProviderInfo;
  lookup(query: TrafficFineProviderQuery): Promise<TrafficFineProviderResult>;
}
export class TrafficFineProviderError extends Error {
  constructor(
    readonly code: TrafficFineProviderErrorCode,
    message = 'Traffic-fine source is temporarily unavailable.',
  ) {
    super(message);
  }
}
