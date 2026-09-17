import type {
  MonitoringLimitationCode,
  MonitoringProviderCapability,
  TrafficFineAutomation,
  TrafficFineProviderInfo,
  VehicleMonitoringStatus,
} from '@tranhanh/shared';

export function monitoringCapability(provider: TrafficFineProviderInfo): MonitoringProviderCapability {
  const map: Record<TrafficFineAutomation, MonitoringProviderCapability> = {
    AUTOMATION_ALLOWED: 'AUTOMATED',
    AUTOMATION_LIMITED: 'LIMITED',
    MANUAL_ONLY: 'MANUAL_ONLY',
    UNSUITABLE: 'UNAVAILABLE',
  };
  return provider.status === 'DISABLED' && provider.automation !== 'MANUAL_ONLY'
    ? 'UNAVAILABLE'
    : map[provider.automation];
}
export function effectiveMonitoringState(input: {
  enabled: boolean;
  vehicleArchived: boolean;
  capability: MonitoringProviderCapability;
  providerStatus: TrafficFineProviderInfo['status'];
  automationApproved: boolean;
}): {
  status: VehicleMonitoringStatus;
  automaticChecksAvailable: boolean;
  limitationCode: MonitoringLimitationCode | null;
} {
  if (!input.enabled) return { status: 'DISABLED', automaticChecksAvailable: false, limitationCode: null };
  if (input.vehicleArchived)
    return { status: 'SUSPENDED', automaticChecksAvailable: false, limitationCode: 'VEHICLE_ARCHIVED' };
  if (input.capability === 'MANUAL_ONLY')
    return {
      status: 'ENABLED_BUT_MANUAL',
      automaticChecksAvailable: false,
      limitationCode: 'MANUAL_VERIFICATION_REQUIRED',
    };
  if (input.capability === 'UNAVAILABLE' || input.providerStatus === 'DISABLED')
    return { status: 'PROVIDER_UNAVAILABLE', automaticChecksAvailable: false, limitationCode: 'PROVIDER_UNAVAILABLE' };
  if (!input.automationApproved)
    return { status: 'SUSPENDED', automaticChecksAvailable: false, limitationCode: 'AUTOMATION_REQUIRES_CONSENT' };
  return { status: 'ENABLED_AND_ACTIVE', automaticChecksAvailable: true, limitationCode: null };
}
export const MONITORING_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const MAX_CONSECUTIVE_FAILURES = 5;
