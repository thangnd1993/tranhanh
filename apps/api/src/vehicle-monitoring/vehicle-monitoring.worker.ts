import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { TrafficFinesService } from '../traffic-fines/traffic-fines.service.js';
import {
  MAX_CONSECUTIVE_FAILURES,
  MONITORING_INTERVAL_MS,
  effectiveMonitoringState,
  monitoringCapability,
} from './vehicle-monitoring.policy.js';
import { VehicleMonitoringQueue, type VehicleMonitoringJobData } from './vehicle-monitoring.queue.js';

export function normalizedFingerprintSet(values: string[]): string[] {
  return [...new Set(values)].sort();
}
export function hasMeaningfulChange(previous: string[] | null, current: string[]): boolean {
  if (previous === null) return current.length > 0;
  const before = normalizedFingerprintSet(previous);
  const after = normalizedFingerprintSet(current);
  return before.length !== after.length || before.some((value, index) => value !== after[index]);
}
export const monitoringWorkerPolicy = { concurrency: 1, providerMinimumIntervalMs: 1_000 } as const;

@Injectable()
export class VehicleMonitoringWorker {
  private providerGate: Promise<void> = Promise.resolve();
  constructor(
    private readonly prisma: PrismaService,
    private readonly trafficFines: TrafficFinesService,
    private readonly queue: VehicleMonitoringQueue,
  ) {}

  async handle(data: VehicleMonitoringJobData): Promise<void> {
    if (!data || typeof data.monitoringId !== 'string' || Object.keys(data).some((key) => key !== 'monitoringId'))
      throw new Error('Invalid privacy-safe monitoring job payload.');
    const release = this.providerGate;
    let unlock!: () => void;
    this.providerGate = new Promise<void>((resolve) => (unlock = resolve));
    await release;
    try {
      await this.run(data.monitoringId);
    } finally {
      unlock();
    }
  }

  private async run(monitoringId: string): Promise<void> {
    const monitoring = await this.prisma.vehicleMonitoring.findUnique({
      where: { id: monitoringId },
      include: { vehicle: true, snapshot: true },
    });
    if (!monitoring) return;
    const provider = this.trafficFines.providerInfo();
    const capability = monitoringCapability(provider);
    const state = effectiveMonitoringState({
      enabled: monitoring.isEnabled,
      vehicleArchived: monitoring.vehicle.status === 'ARCHIVED',
      capability,
      providerStatus: provider.status,
      automationApproved: Boolean(monitoring.automationApprovedAt),
    });
    const now = new Date();
    const isQueueRetry = monitoring.lastOutcome === 'FAILED' && monitoring.failureCount > 0;
    if (
      !state.automaticChecksAvailable ||
      (monitoring.nextEligibleCheckAt && monitoring.nextEligibleCheckAt > now && !isQueueRetry)
    ) {
      if (monitoring.status !== state.status || monitoring.nextEligibleCheckAt) {
        await this.prisma.vehicleMonitoring.update({
          where: { id: monitoring.id },
          data: { status: state.status, capability, nextEligibleCheckAt: null },
        });
      }
      return;
    }
    const startedAt = now;
    try {
      const response = await this.trafficFines.lookup({
        licensePlate: monitoring.vehicle.licensePlate,
        vehicleType: monitoring.vehicle.vehicleType === 'MOTORCYCLE' ? 'MOTORCYCLE' : 'CAR',
      });
      if (response.outcome !== 'RESULTS_AVAILABLE' && response.outcome !== 'NO_MATCHING_RECORDS')
        throw new Error('AUTOMATION_NOT_AVAILABLE');
      const fingerprints = normalizedFingerprintSet(response.results.map((item) => item.fingerprint));
      const changed = hasMeaningfulChange(monitoring.snapshot?.fingerprints ?? null, fingerprints);
      const finishedAt = new Date();
      await this.prisma.$transaction(async (tx) => {
        await tx.vehicleMonitoringRun.create({
          data: {
            monitoringId: monitoring.id,
            providerKey: provider.key,
            startedAt,
            finishedAt,
            outcome: changed ? 'CHANGED' : monitoring.snapshot ? 'NO_CHANGE' : 'SUCCEEDED',
            normalizedResultCount: fingerprints.length,
            changeDetected: changed,
          },
        });
        await tx.vehicleMonitoringSnapshot.upsert({
          where: { monitoringId: monitoring.id },
          create: {
            monitoringId: monitoring.id,
            providerKey: provider.key,
            fingerprints,
            resultCount: fingerprints.length,
            retrievedAt: new Date(response.retrievedAt),
          },
          update: {
            providerKey: provider.key,
            fingerprints,
            resultCount: fingerprints.length,
            retrievedAt: new Date(response.retrievedAt),
          },
        });
        await tx.vehicleMonitoring.update({
          where: { id: monitoring.id },
          data: {
            status: 'ENABLED_AND_ACTIVE',
            capability,
            lastAttemptAt: finishedAt,
            lastSuccessfulCheckAt: finishedAt,
            nextEligibleCheckAt: new Date(finishedAt.getTime() + MONITORING_INTERVAL_MS),
            lastOutcome: changed ? 'CHANGED' : monitoring.snapshot ? 'NO_CHANGE' : 'SUCCEEDED',
            failureCount: 0,
            lastErrorCode: null,
          },
        });
      });
      await this.queue.enqueue(monitoring.id, new Date(finishedAt.getTime() + MONITORING_INTERVAL_MS));
    } catch (error) {
      const finishedAt = new Date();
      const failureCount = monitoring.failureCount + 1;
      const errorCode =
        error instanceof Error && error.message === 'AUTOMATION_NOT_AVAILABLE'
          ? 'AUTOMATION_NOT_AVAILABLE'
          : 'PROVIDER_FAILURE';
      await this.prisma.$transaction(async (tx) => {
        await tx.vehicleMonitoringRun.create({
          data: {
            monitoringId: monitoring.id,
            providerKey: provider.key,
            startedAt,
            finishedAt,
            outcome: 'FAILED',
            normalizedResultCount: 0,
            changeDetected: false,
            errorCode,
          },
        });
        await tx.vehicleMonitoring.update({
          where: { id: monitoring.id },
          data: {
            status: failureCount >= MAX_CONSECUTIVE_FAILURES ? 'SUSPENDED' : 'ENABLED_AND_ACTIVE',
            lastAttemptAt: finishedAt,
            lastOutcome: 'FAILED',
            failureCount,
            lastErrorCode: errorCode,
            nextEligibleCheckAt:
              failureCount >= MAX_CONSECUTIVE_FAILURES
                ? null
                : new Date(finishedAt.getTime() + Math.min(2 ** failureCount * 60_000, MONITORING_INTERVAL_MS)),
          },
        });
      });
      throw error;
    }
  }
}
