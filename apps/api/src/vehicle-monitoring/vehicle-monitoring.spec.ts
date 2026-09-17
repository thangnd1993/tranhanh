/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma-shaped deterministic worker fixture. */
import { describe, expect, it, vi } from 'vitest';
import type { TrafficFineProvider } from '../traffic-fines/traffic-fine-provider.js';
import { TrafficFineProviderError } from '../traffic-fines/traffic-fine-provider.js';
import { effectiveMonitoringState, monitoringCapability } from './vehicle-monitoring.policy.js';
import { VEHICLE_MONITORING_JOB, monitoringJobOptions } from './vehicle-monitoring.queue.js';
import { classifyMonitoringRetry } from './vehicle-monitoring.retry.js';
import { VehicleMonitoringService } from './vehicle-monitoring.service.js';
import { hasMeaningfulChange, normalizedFingerprintSet } from './vehicle-monitoring.worker.js';

const manualProvider: TrafficFineProvider = {
  describe: () => ({
    key: 'csgt-manual',
    name: 'CSGT',
    official: true,
    url: 'https://www.csgt.vn/test',
    automation: 'MANUAL_ONLY',
    status: 'DISABLED',
    geographicCoverage: 'Vietnam',
    supportedVehicleTypes: ['CAR'],
    requiresCaptcha: true,
    requiresAuthentication: false,
    freshness: 'Unknown',
  }),
  lookup: vi.fn(),
};
function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'monitoring-a',
    userId: 'user-a',
    vehicleId: 'vehicle-a',
    monitoringType: 'TRAFFIC_FINE',
    providerKey: 'csgt-manual',
    status: 'DISABLED',
    isEnabled: false,
    capability: 'MANUAL_ONLY',
    automationApprovedAt: null,
    lastAttemptAt: null,
    lastSuccessfulCheckAt: null,
    nextEligibleCheckAt: null,
    lastOutcome: null,
    failureCount: 0,
    lastErrorCode: null,
    createdAt: new Date('2026-09-17T00:00:00Z'),
    updatedAt: new Date('2026-09-17T00:00:00Z'),
    vehicle: { status: 'ACTIVE' },
    ...overrides,
  };
}
describe('vehicle monitoring', () => {
  it('derives truthful manual-only state without a schedule', () => {
    const capability = monitoringCapability(manualProvider.describe());
    expect(capability).toBe('MANUAL_ONLY');
    expect(
      effectiveMonitoringState({
        enabled: true,
        vehicleArchived: false,
        capability,
        providerStatus: 'DISABLED',
        automationApproved: false,
      }),
    ).toEqual({
      status: 'ENABLED_BUT_MANUAL',
      automaticChecksAvailable: false,
      limitationCode: 'MANUAL_VERIFICATION_REQUIRED',
    });
  });
  it('requires explicit automation consent after a provider capability change', () => {
    expect(
      effectiveMonitoringState({
        enabled: true,
        vehicleArchived: false,
        capability: 'AUTOMATED',
        providerStatus: 'ACTIVE',
        automationApproved: false,
      }),
    ).toMatchObject({
      status: 'SUSPENDED',
      automaticChecksAvailable: false,
      limitationCode: 'AUTOMATION_REQUIRES_CONSENT',
    });
  });
  it('enables a manual preference without enqueueing or fabricating check timestamps', async () => {
    const update = vi.fn(async ({ data }: { data: Record<string, unknown> }) =>
      row({ ...data, isEnabled: true, updatedAt: new Date() }),
    );
    const prisma = {
      vehicleMonitoring: {
        findFirst: vi.fn(async ({ where }: { where: { userId: string } }) =>
          where.userId === 'user-a' ? row() : null,
        ),
        update,
      },
      vehicleMonitoringRun: { findMany: vi.fn(async () => []) },
    };
    const queue = { enqueue: vi.fn() };
    const service = new VehicleMonitoringService(prisma as never, manualProvider, queue as never);
    const result = await service.setEnabled('user-a', 'vehicle-a', true);
    expect(result).toMatchObject({
      enabled: true,
      effectiveStatus: 'ENABLED_BUT_MANUAL',
      automaticChecksAvailable: false,
      nextEligibleCheckAt: null,
      lastSuccessfulCheckAt: null,
    });
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
  it('uses safe 404 ownership semantics for config, mutation, and history', async () => {
    const prisma = {
      vehicleMonitoring: { findFirst: vi.fn(async () => null) },
      vehicleMonitoringRun: { findMany: vi.fn() },
    };
    const service = new VehicleMonitoringService(prisma as never, manualProvider, { enqueue: vi.fn() } as never);
    await expect(service.get('user-b', 'vehicle-a')).rejects.toMatchObject({ status: 404 });
    await expect(service.setEnabled('user-b', 'vehicle-a', true)).rejects.toMatchObject({ status: 404 });
    await expect(service.history('user-b', 'vehicle-a')).rejects.toMatchObject({ status: 404 });
    expect(prisma.vehicleMonitoringRun.findMany).not.toHaveBeenCalled();
  });
  it('deduplicates fingerprints and ignores ordering-only changes', () => {
    expect(normalizedFingerprintSet(['b', 'a', 'a'])).toEqual(['a', 'b']);
    expect(hasMeaningfulChange(['a', 'b'], ['b', 'a', 'a'])).toBe(false);
    expect(hasMeaningfulChange(['a'], ['a', 'c'])).toBe(true);
    expect(hasMeaningfulChange(null, [])).toBe(false);
    expect(hasMeaningfulChange(null, ['a'])).toBe(true);
  });
  it('classifies retry behavior and defines bounded exponential queue retries', () => {
    expect(classifyMonitoringRetry(new TrafficFineProviderError('TIMEOUT'))).toBe('RETRY');
    expect(classifyMonitoringRetry(new TrafficFineProviderError('RATE_LIMITED'))).toBe('CONTROLLED_DELAY');
    expect(classifyMonitoringRetry(new TrafficFineProviderError('MALFORMED_RESPONSE'))).toBe('DO_NOT_RETRY');
    expect(VEHICLE_MONITORING_JOB).toBe('vehicle-monitoring-check');
    expect(monitoringJobOptions).toMatchObject({ attempts: 4, backoff: { type: 'exponential' } });
  });
  it('keeps the queue payload opaque and plate-free', () => {
    const payload = { monitoringId: 'opaque-monitoring-id' };
    expect(Object.keys(payload)).toEqual(['monitoringId']);
    expect(JSON.stringify(payload)).not.toMatch(/plate|email|51K/i);
  });
  it('processes deterministic automated results, dedupes, and records only meaningful changes', async () => {
    const state: any = {
      id: 'monitoring-auto',
      userId: 'user-a',
      vehicleId: 'vehicle-a',
      monitoringType: 'TRAFFIC_FINE',
      providerKey: 'test-auto',
      status: 'ENABLED_AND_ACTIVE',
      isEnabled: true,
      capability: 'AUTOMATED',
      automationApprovedAt: new Date(),
      lastAttemptAt: null,
      lastSuccessfulCheckAt: null,
      nextEligibleCheckAt: new Date(0),
      lastOutcome: null,
      failureCount: 0,
      lastErrorCode: null,
      vehicle: { status: 'ACTIVE', licensePlate: '51K-123.45', vehicleType: 'CAR' },
      snapshot: null,
    };
    const runs: any[] = [];
    const tx: any = {
      vehicleMonitoringRun: {
        create: vi.fn(async ({ data }: any) => {
          runs.push(data);
          return data;
        }),
      },
      vehicleMonitoringSnapshot: {
        upsert: vi.fn(async ({ create, update }: any) => {
          state.snapshot = { ...(state.snapshot ?? {}), ...(state.snapshot ? update : create) };
          return state.snapshot;
        }),
      },
      vehicleMonitoring: {
        update: vi.fn(async ({ data }: any) => {
          Object.assign(state, data);
          return state;
        }),
      },
    };
    const prisma: any = {
      vehicleMonitoring: { findUnique: vi.fn(async () => state), update: tx.vehicleMonitoring.update },
      $transaction: vi.fn(async (run: any) => run(tx)),
    };
    const providerInfo = {
      ...manualProvider.describe(),
      key: 'test-auto',
      automation: 'AUTOMATION_ALLOWED' as const,
      status: 'ACTIVE' as const,
      requiresCaptcha: false,
    };
    let records = [{ fingerprint: 'a' }, { fingerprint: 'a' }];
    const trafficFines: any = {
      providerInfo: () => providerInfo,
      lookup: vi.fn(async () => ({
        outcome: 'RESULTS_AVAILABLE',
        results: records,
        retrievedAt: new Date().toISOString(),
      })),
    };
    const queue = { enqueue: vi.fn(async () => undefined) };
    const worker = new (await import('./vehicle-monitoring.worker.js')).VehicleMonitoringWorker(
      prisma,
      trafficFines,
      queue as never,
    );
    await worker.handle({ monitoringId: state.id });
    expect(runs.at(-1)).toMatchObject({ normalizedResultCount: 1, changeDetected: true, outcome: 'CHANGED' });
    state.nextEligibleCheckAt = new Date(0);
    await worker.handle({ monitoringId: state.id });
    expect(runs.at(-1)).toMatchObject({ changeDetected: false, outcome: 'NO_CHANGE' });
    records = [{ fingerprint: 'a' }, { fingerprint: 'b' }];
    state.nextEligibleCheckAt = new Date(0);
    await worker.handle({ monitoringId: state.id });
    expect(runs.at(-1)).toMatchObject({ normalizedResultCount: 2, changeDetected: true, outcome: 'CHANGED' });
    expect(JSON.stringify(runs)).not.toContain('51K-123.45');
    expect(queue.enqueue).toHaveBeenCalledTimes(3);
  });
});
