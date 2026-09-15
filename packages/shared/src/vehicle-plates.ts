import type { PageResult } from './pagination.js';
import type { PhoneSource } from './phone-prefixes.js';

export type VehiclePlateSource = PhoneSource;
export type VehiclePlateTargetType = 'LOCALITY' | 'CENTRAL_AUTHORITY';
export type VehiclePlateAllocationStatus = 'ACTIVE' | 'INACTIVE';

export interface VehiclePlateTargetResult {
  key: string;
  name: string;
  aliases: string[];
  type: VehiclePlateTargetType;
  nameContext: 'VEHICLE_PLATE_ALLOCATION';
  source: VehiclePlateSource;
}

export interface VehiclePlateHistoryResult {
  previousTarget: VehiclePlateTargetResult;
  effectiveFrom: string | null;
  effectiveTo: string;
  source: VehiclePlateSource;
  transitionSource: VehiclePlateSource;
}

export interface VehiclePlateAllocationResult {
  key: string;
  numericPrefix: string;
  /** Null means the source allocates the whole numeric prefix; it does not mean an unknown submitted series. */
  seriesPrefix: string | null;
  status: VehiclePlateAllocationStatus;
  target: VehiclePlateTargetResult;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  previousTargets: VehiclePlateHistoryResult[];
  source: VehiclePlateSource;
  importedAt: string;
  updatedAt: string;
}

export interface VehiclePlateLookupResult {
  parsed: {
    numericPrefix: string;
    series: string | null;
    /** Series is parsed for display only unless a source explicitly allocates it to a target. */
    seriesAllocationVerified: boolean;
  };
  resolution: 'NUMERIC_PREFIX_ALLOCATION';
  allocations: VehiclePlateAllocationResult[];
  ambiguous: boolean;
  vehicleOrOwnerVerified: false;
}

export interface VehiclePlateQuery {
  q?: string;
  prefix?: string;
  target?: string;
  targetType?: VehiclePlateTargetType;
  status?: VehiclePlateAllocationStatus;
  page?: number;
  pageSize?: number;
}

export type VehiclePlatePage = PageResult<VehiclePlateAllocationResult>;
