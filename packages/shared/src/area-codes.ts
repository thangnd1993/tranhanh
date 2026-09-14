import type { PageResult } from './pagination.js';
import type { PhoneSource } from './phone-prefixes.js';
/** Public evidence shape shared with phone prefixes; never a Prisma model. */
export type AreaCodeSource = PhoneSource;
export type AreaCodeStatus = 'ACTIVE' | 'LEGACY' | 'INACTIVE';
export interface AreaCodeMigrationResult {
  oldCode: string;
  newCode: string;
  /** ISO calendar date: beginning of transition, not the end of parallel dialing. */
  effectiveDate: string | null;
  source: AreaCodeSource;
}
export interface AreaCodeLocality {
  key: string;
  name: string;
  aliases: string[];
  nameContext: 'TELECOM_SERVICE_AREA';
  source: AreaCodeSource;
  group: {
    key: string;
    name: string;
    /** Reviewed telecom grouping; not a canonical administrative identifier. */
    effectiveFrom: string | null;
    source: AreaCodeSource;
  };
}
export interface AreaCodeResult {
  code: string;
  currentCode: string | null;
  status: AreaCodeStatus;
  locality: AreaCodeLocality;
  resolution: 'GEOGRAPHIC_AREA_CODE';
  subscriberVerified: false;
  /** ISO calendar dates; nullable where no exact date is established. */
  effectiveFrom: string | null;
  effectiveTo: string | null;
  previousCodes: AreaCodeMigrationResult[];
  replacement: AreaCodeMigrationResult | null;
  source: AreaCodeSource;
  importedAt: string;
  updatedAt: string;
}
export interface AreaCodeQuery {
  q?: string;
  code?: string;
  locality?: string;
  group?: string;
  status?: AreaCodeStatus;
  page?: number;
  pageSize?: number;
}
export type AreaCodePage = PageResult<AreaCodeResult>;
