export type VehicleMonitoringType = 'TRAFFIC_FINE';
export type VehicleMonitoringStatus =
  'DISABLED' | 'ENABLED_AND_ACTIVE' | 'ENABLED_BUT_MANUAL' | 'SUSPENDED' | 'PROVIDER_UNAVAILABLE';
export type MonitoringProviderCapability = 'AUTOMATED' | 'LIMITED' | 'MANUAL_ONLY' | 'UNAVAILABLE';
export type VehicleMonitoringOutcome = 'SUCCEEDED' | 'NO_CHANGE' | 'CHANGED' | 'FAILED';
export type MonitoringLimitationCode =
  'AUTOMATION_REQUIRES_CONSENT' | 'MANUAL_VERIFICATION_REQUIRED' | 'PROVIDER_UNAVAILABLE' | 'VEHICLE_ARCHIVED';

export interface VehicleMonitoringResult {
  id: string;
  vehicleId: string;
  monitoringType: VehicleMonitoringType;
  providerKey: string;
  providerName: string;
  providerUrl: string;
  enabled: boolean;
  effectiveStatus: VehicleMonitoringStatus;
  capability: MonitoringProviderCapability;
  automaticChecksAvailable: boolean;
  limitationCode: MonitoringLimitationCode | null;
  lastAttemptAt: string | null;
  lastSuccessfulCheckAt: string | null;
  nextEligibleCheckAt: string | null;
  lastOutcome: VehicleMonitoringOutcome | null;
  failureCount: number;
  updatedAt: string;
}
export interface VehicleMonitoringRunResult {
  id: string;
  startedAt: string;
  finishedAt: string;
  outcome: VehicleMonitoringOutcome;
  providerKey: string;
  normalizedResultCount: number;
  changeDetected: boolean;
  errorCode: string | null;
}
export interface VehicleMonitoringHistoryResult {
  items: VehicleMonitoringRunResult[];
}
