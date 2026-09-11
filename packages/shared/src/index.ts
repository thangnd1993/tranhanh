export type ServiceStatus = 'ok' | 'unavailable';

export interface HealthResponse {
  service: string;
  status: ServiceStatus;
  timestamp: string;
}

export interface ReadinessResponse extends HealthResponse {
  checks: {
    database: ServiceStatus;
    redis: ServiceStatus;
  };
}

export type { CursorResult, IntegerString, PageResult } from './pagination.js';

export type {
  PhonePrefixStatus,
  PhoneSource,
  PhoneMigration,
  PhonePrefixResult,
  PhonePrefixQuery,
  PhonePrefixPage,
} from './phone-prefixes.js';
