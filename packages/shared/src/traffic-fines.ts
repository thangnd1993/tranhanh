export type TrafficFineVehicleType = 'CAR' | 'MOTORCYCLE' | 'ELECTRIC_BICYCLE';
export type TrafficFineLookupOutcome =
  'RESULTS_AVAILABLE' | 'NO_MATCHING_RECORDS' | 'MANUAL_VERIFICATION_REQUIRED' | 'SOURCE_UNAVAILABLE' | 'UNSUPPORTED';
export type TrafficFineRecordStatus = 'UNRESOLVED' | 'RESOLVED' | 'UNKNOWN';
export type TrafficFineAutomation = 'AUTOMATION_ALLOWED' | 'AUTOMATION_LIMITED' | 'MANUAL_ONLY' | 'UNSUITABLE';
export type TrafficFineProviderStatus = 'ACTIVE' | 'DEGRADED' | 'DISABLED';

export interface TrafficFineLookupRequest {
  licensePlate: string;
  vehicleType: TrafficFineVehicleType;
}

export interface TrafficFineProviderInfo {
  key: string;
  name: string;
  official: boolean;
  url: string;
  automation: TrafficFineAutomation;
  status: TrafficFineProviderStatus;
  geographicCoverage: string;
  supportedVehicleTypes: TrafficFineVehicleType[];
  requiresCaptcha: boolean;
  requiresAuthentication: boolean;
  freshness: string;
}

export interface TrafficFineLimitation {
  code:
    | 'CAPTCHA_REQUIRED'
    | 'MANUAL_LOOKUP_ONLY'
    | 'COVERAGE_NOT_GUARANTEED'
    | 'FRESHNESS_NOT_PUBLISHED'
    | 'NO_PUBLIC_API'
    | 'PROVIDER_UNAVAILABLE';
  message: string;
}

export interface TrafficFineRecord {
  fingerprint: string;
  providerKey: string;
  sourceUrl: string;
  violationTime: string | null;
  violationLocation: string | null;
  violationBehavior: string | null;
  detectingAuthority: string | null;
  processingAuthority: string | null;
  status: TrafficFineRecordStatus;
  providerStatusText: string | null;
  sourceUpdatedAt: string | null;
  publicReference: string | null;
}

export interface TrafficFineLookupResponse {
  outcome: TrafficFineLookupOutcome;
  queriedPlateMasked: string;
  vehicleType: TrafficFineVehicleType;
  results: TrafficFineRecord[];
  provider: TrafficFineProviderInfo;
  retrievedAt: string;
  limitations: TrafficFineLimitation[];
}

export interface TrafficFineErrorResponse {
  statusCode: number;
  outcome: 'SOURCE_UNAVAILABLE';
  providerError: 'UNAVAILABLE' | 'TIMEOUT' | 'RATE_LIMITED' | 'MALFORMED_RESPONSE' | 'DEGRADED';
  message: string;
}
