import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  VehicleDashboardMaintenanceSummary,
  VehicleDashboardOption,
  VehicleDashboardResult,
  VehicleMonitoringResult,
} from '@tranhanh/shared';
import { PrismaService } from '../database/prisma.service.js';
import { buildFuelSummary, vietnamMonth } from '../fuel-log/fuel-log-calculator.js';
import { dateOnly, maintenanceDueStatus, vietnamToday as maintenanceToday } from '../maintenance/maintenance-due.js';
import { expiryDetails } from '../vehicle-documents/vehicle-document-date.js';
import { VehicleExpenseService } from '../vehicle-expenses/vehicle-expenses.service.js';
import { TRAFFIC_FINE_PROVIDER, type TrafficFineProvider } from '../traffic-fines/traffic-fine-provider.js';
import { effectiveMonitoringState, monitoringCapability } from '../vehicle-monitoring/vehicle-monitoring.policy.js';
import type { VehicleDashboardQueryDto } from './vehicle-dashboard.dto.js';

@Injectable()
export class VehicleDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expenses: VehicleExpenseService,
    @Inject(TRAFFIC_FINE_PROVIDER) private readonly provider: TrafficFineProvider,
  ) {}

  async get(userId: string, query: VehicleDashboardQueryDto): Promise<VehicleDashboardResult> {
    const month = query.month ?? vietnamMonth();
    const readAt = new Date();
    const vehicles = await this.prisma.vehicle.findMany({
      where: { userId, status: 'ACTIVE' },
      select: {
        id: true,
        displayName: true,
        licensePlate: true,
        vehicleType: true,
        isPrimary: true,
        currentOdometerKm: true,
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
    });
    const options: VehicleDashboardOption[] = vehicles.map((vehicle) => ({
      id: vehicle.id,
      displayName: vehicle.displayName,
      licensePlate: vehicle.licensePlate,
      vehicleType: vehicle.vehicleType,
      isPrimary: vehicle.isPrimary,
    }));
    const selected = query.vehicleId ? vehicles.find((vehicle) => vehicle.id === query.vehicleId) : vehicles[0];
    if (query.vehicleId && !selected) throw new NotFoundException('Vehicle not found.');
    if (!selected) {
      return {
        month,
        refreshedAt: new Date().toISOString(),
        activeVehicleCount: 0,
        vehicles: [],
        selectedVehicle: null,
        documentAttention: null,
        maintenance: null,
        expenses: null,
        fuel: null,
        monitoring: null,
        featureLinks: [{ key: 'GARAGE', path: '/garage' }],
      };
    }

    const [documentAttention, maintenance, expenses, fuelRows, monitoring] = await Promise.all([
      this.documents(userId, selected.id, readAt),
      this.maintenance(userId, selected.id, selected.currentOdometerKm, readAt),
      this.expenses.summary(userId, selected.id, month),
      this.prisma.fuelLogEntry.findMany({
        where: { userId, vehicleId: selected.id, status: 'ACTIVE' },
        select: { id: true, refueledAt: true, odometerKm: true, quantity: true, totalCostVnd: true, isFullTank: true },
        orderBy: [{ refueledAt: 'asc' }, { odometerKm: 'asc' }, { id: 'asc' }],
      }),
      this.monitoring(userId, selected.id),
    ]);
    const fuel = buildFuelSummary(fuelRows, month);
    const base = `/garage/${selected.id}`;
    return {
      month,
      refreshedAt: new Date().toISOString(),
      activeVehicleCount: vehicles.length,
      vehicles: options,
      selectedVehicle: {
        ...options.find((item) => item.id === selected.id)!,
        currentOdometerKm: selected.currentOdometerKm,
      },
      documentAttention,
      maintenance,
      expenses,
      fuel,
      monitoring,
      featureLinks: [
        { key: 'GARAGE', path: base },
        { key: 'DOCUMENTS', path: `${base}/documents` },
        { key: 'FUEL_LOG', path: `${base}/fuel-log` },
        { key: 'MAINTENANCE', path: `${base}/maintenance` },
        { key: 'EXPENSES', path: `${base}/expenses` },
        { key: 'MONITORING', path: base },
      ],
    };
  }

  private async documents(userId: string, vehicleId: string, readAt: Date) {
    const rows = await this.prisma.vehicleDocument.findMany({
      where: { userId, vehicleId, status: 'ACTIVE' },
      select: { expiresAt: true },
    });
    const details = rows.map((row) => ({ expiresAt: row.expiresAt, ...expiryDetails(row.expiresAt, readAt) }));
    const upcoming = details
      .filter((item) => item.daysUntilExpiry !== null && item.daysUntilExpiry >= 0)
      .sort(
        (a, b) =>
          (a.expiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.expiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER),
      );
    return {
      expired: details.filter((item) => item.expiryState === 'EXPIRED').length,
      expiringSoon: details.filter((item) => item.expiryState === 'EXPIRING_SOON').length,
      nextExpiry: upcoming[0]?.expiresAt?.toISOString().slice(0, 10) ?? null,
    };
  }

  private async maintenance(
    userId: string,
    vehicleId: string,
    currentOdometerKm: number | null,
    readAt: Date,
  ): Promise<VehicleDashboardMaintenanceSummary> {
    const rows = await this.prisma.maintenancePlan.findMany({
      where: { userId, vehicleId, status: 'ACTIVE' },
      select: { dueDate: true, dueOdometerKm: true },
    });
    const today = maintenanceToday(readAt);
    const statuses = rows.map((row) =>
      maintenanceDueStatus(
        { dueDate: dateOnly(row.dueDate), dueOdometerKm: row.dueOdometerKm },
        currentOdometerKm,
        today,
      ),
    );
    return {
      activePlanCount: rows.length,
      duePlanCount: statuses.filter((status) => status === 'DUE').length,
      dueSoonPlanCount: statuses.filter((status) => status === 'DUE_SOON').length,
      unknownMileagePlanCount: statuses.filter((status) => status === 'UNKNOWN_MILEAGE').length,
    };
  }

  private async monitoring(userId: string, vehicleId: string): Promise<VehicleMonitoringResult | null> {
    const row = await this.prisma.vehicleMonitoring.findFirst({
      where: { userId, vehicleId, monitoringType: 'TRAFFIC_FINE' },
    });
    if (!row) return null;
    const provider = this.provider.describe();
    const capability = monitoringCapability(provider);
    const state = effectiveMonitoringState({
      enabled: row.isEnabled,
      vehicleArchived: false,
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
}
