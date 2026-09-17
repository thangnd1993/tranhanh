import { TrafficFineProviderError } from '../traffic-fines/traffic-fine-provider.js';
export type MonitoringRetryDecision = 'RETRY' | 'CONTROLLED_DELAY' | 'DO_NOT_RETRY';
export function classifyMonitoringRetry(error: unknown): MonitoringRetryDecision {
  if (!(error instanceof TrafficFineProviderError)) return 'RETRY';
  if (error.code === 'TIMEOUT' || error.code === 'UNAVAILABLE' || error.code === 'DEGRADED') return 'RETRY';
  if (error.code === 'RATE_LIMITED') return 'CONTROLLED_DELAY';
  return 'DO_NOT_RETRY';
}
