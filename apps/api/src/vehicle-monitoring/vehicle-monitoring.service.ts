import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { VehicleMonitoringHistoryResult, VehicleMonitoringResult } from '@tranhanh/shared';
import { PrismaService } from '../database/prisma.service.js';
import { TRAFFIC_FINE_PROVIDER, type TrafficFineProvider } from '../traffic-fines/traffic-fine-provider.js';
import { monitoringCapability, effectiveMonitoringState } from './vehicle-monitoring.policy.js';
import { VehicleMonitoringQueue } from './vehicle-monitoring.queue.js';

type OwnedMonitoring = Awaited<ReturnType<VehicleMonitoringService['owned']>>;

@Injectable()
export class VehicleMonitoringService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(TRAFFIC_FINE_PROVIDER) private readonly provider: TrafficFineProvider,
    private readonly queue: VehicleMonitoringQueue,
  ) {}

  async get(userId: string, vehicleId: string): Promise<VehicleMonitoringResult> {
    return this.result(await this.owned(userId, vehicleId));
  }

  async setEnabled(userId: string, vehicleId: string, enabled: boolean): Promise<VehicleMonitoringResult> {
    const current = await this.owned(userId, vehicleId);
    const provider = this.provider.describe();
    const capability = monitoringCapability(provider);
    const automationApproved = enabled && capability === 'AUTOMATED' && provider.status !== 'DISABLED';
    const state = effectiveMonitoringState({
      enabled,
      vehicleArchived: current.vehicle.status === 'ARCHIVED',
      capability,
      providerStatus: provider.status,
      automationApproved,
    });
    const nextEligibleCheckAt = state.automaticChecksAvailable ? new Date() : null;
    const updated = await this.prisma.vehicleMonitoring.update({
      where: { id: current.id },
      data: {
        isEnabled: enabled,
        status: state.status,
        capability,
        automationApprovedAt: automationApproved ? new Date() : null,
        nextEligibleCheckAt,
        ...(enabled ? {} : { failureCount: 0, lastErrorCode: null }),
      },
      include: { vehicle: { select: { status: true } } },
    });
    if (state.automaticChecksAvailable) await this.queue.enqueue(updated.id);
    return this.result(updated);
  }

  async history(userId: string, vehicleId: string): Promise<VehicleMonitoringHistoryResult> {
    const monitoring = await this.owned(userId, vehicleId);
    const runs = await this.prisma.vehicleMonitoringRun.findMany({
      where: { monitoringId: monitoring.id },
      orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
      take: 50,
    });
    return {
      items: runs.map((run) => ({
        id: run.id,
        startedAt: run.startedAt.toISOString(),
        finishedAt: run.finishedAt.toISOString(),
        outcome: run.outcome,
        providerKey: run.providerKey,
        normalizedResultCount: run.normalizedResultCount,
        changeDetected: run.changeDetected,
        errorCode: run.errorCode,
      })),
    };
  }

  private result(row: OwnedMonitoring): VehicleMonitoringResult {
    const provider = this.provider.describe();
    const capability = monitoringCapability(provider);
    const state = effectiveMonitoringState({
      enabled: row.isEnabled,
      vehicleArchived: row.vehicle.status === 'ARCHIVED',
      capability,
      providerStatus: provider.status,
      automationApproved: Boolean(row.automationApprovedAt),
    });
    return {
      id: row.id,
      vehicleId: row.vehicleId,
      monitoringType: row.monitoringType,
      providerKey: provider.key,
      providerName: provider.name,
      providerUrl: provider.url,
      enabled: row.isEnabled,
      effectiveStatus: state.status,
      capability,
      automaticChecksAvailable: state.automaticChecksAvailable,
      limitationCode: state.limitationCode,
      lastAttemptAt: row.lastAttemptAt?.toISOString() ?? null,
      lastSuccessfulCheckAt: row.lastSuccessfulCheckAt?.toISOString() ?? null,
      nextEligibleCheckAt: state.automaticChecksAvailable ? (row.nextEligibleCheckAt?.toISOString() ?? null) : null,
      lastOutcome: row.lastOutcome,
      failureCount: row.failureCount,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async owned(userId: string, vehicleId: string) {
    const monitoring = await this.prisma.vehicleMonitoring.findFirst({
      where: { userId, vehicleId, monitoringType: 'TRAFFIC_FINE' },
      include: { vehicle: { select: { status: true } } },
    });
    if (!monitoring) throw new NotFoundException('Vehicle not found.');
    return monitoring;
  }
}
