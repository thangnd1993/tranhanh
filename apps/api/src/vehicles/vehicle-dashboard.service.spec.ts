import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VehicleDashboardService } from './vehicle-dashboard.service.js';

const userId = '11111111-1111-4111-8111-111111111111';
const primaryId = '22222222-2222-4222-8222-222222222222';
const fallbackId = '33333333-3333-4333-8333-333333333333';
const foreignId = '44444444-4444-4444-8444-444444444444';
const now = new Date('2026-09-21T04:00:00.000Z');

function vehicle(id: string, isPrimary: boolean, currentOdometerKm: number | null = 12_000) {
  return {
    id,
    displayName: id === primaryId ? 'Primary' : 'Backup',
    licensePlate: id === primaryId ? '51K-123.45' : '30A-123.45',
    vehicleType: 'CAR' as const,
    isPrimary,
    currentOdometerKm,
  };
}

function prismaFake(vehicles = [vehicle(primaryId, true), vehicle(fallbackId, false)]) {
  return {
    vehicle: { findMany: vi.fn(async () => vehicles) },
    vehicleDocument: { findMany: vi.fn(async () => [{ expiresAt: new Date('2026-09-30T00:00:00.000Z') }]) },
    maintenancePlan: {
      findMany: vi.fn(async () => [
        { dueDate: new Date('2026-09-22T00:00:00.000Z'), dueOdometerKm: null },
        { dueDate: null, dueOdometerKm: 13_000 },
      ]),
    },
    fuelLogEntry: {
      findMany: vi.fn(async () => [
        {
          id: 'fuel-a',
          refueledAt: now,
          odometerKm: 11_000,
          quantity: '20.000',
          totalCostVnd: 400_000n,
          isFullTank: true,
        },
        {
          id: 'fuel-b',
          refueledAt: new Date('2026-09-21T05:00:00.000Z'),
          odometerKm: 11_200,
          quantity: '10.000',
          totalCostVnd: 200_000n,
          isFullTank: true,
        },
      ]),
    },
    vehicleMonitoring: {
      findFirst: vi.fn(async () => ({
        id: 'monitoring-a',
        vehicleId: primaryId,
        monitoringType: 'TRAFFIC_FINE' as const,
        isEnabled: true,
        automationApprovedAt: null,
        lastAttemptAt: null,
        lastSuccessfulCheckAt: null,
        nextEligibleCheckAt: null,
        lastOutcome: null,
        failureCount: 0,
        updatedAt: now,
      })),
    },
  };
}

function expenseSummary(month: string) {
  const source = { count: 0, recordedTotalCostVnd: '0', unknownCostCount: 0 };
  return {
    month,
    recordedTotalCostVnd: '0',
    totalCostVnd: '0',
    totalCount: 0,
    fuel: source,
    maintenance: source,
    manual: source,
    bySource: { FUEL: source, MAINTENANCE: source, MANUAL: source },
    byCategory: [],
    unknownMaintenanceCostCount: 0,
    incomplete: false,
  };
}

function provider() {
  return {
    describe: () => ({
      key: 'csgt-manual',
      name: 'CSGT',
      official: true,
      url: 'https://www.csgt.vn',
      automation: 'MANUAL_ONLY' as const,
      status: 'DISABLED' as const,
      geographicCoverage: 'Vietnam',
      supportedVehicleTypes: ['CAR'],
      requiresCaptcha: true,
      requiresAuthentication: false,
      freshness: 'Not published',
    }),
  };
}

describe('VehicleDashboardService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-22T04:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('selects the active primary by default and composes exact month cards without account totals', async () => {
    const prisma = prismaFake();
    const expenses = {
      summary: vi.fn(async (_userId: string, _vehicleId: string, month: string) => expenseSummary(month)),
    };
    const service = new VehicleDashboardService(prisma as never, expenses as never, provider() as never);
    const result = await service.get(userId, { month: '2026-09' });

    expect(result).toMatchObject({
      month: '2026-09',
      activeVehicleCount: 2,
      selectedVehicle: { id: primaryId, currentOdometerKm: 12_000 },
      documentAttention: { expiringSoon: 1 },
      maintenance: { duePlanCount: 1, dueSoonPlanCount: 1, unknownMileagePlanCount: 0 },
      monitoring: { effectiveStatus: 'ENABLED_BUT_MANUAL', capability: 'MANUAL_ONLY' },
    });
    expect(result.expenses?.month).toBe('2026-09');
    expect(result.fuel?.totalCostVnd).toBe('600000');
    expect(result.refreshedAt).toMatch(/Z$/);
    expect(result.selectedVehicle).not.toHaveProperty('notes');
    expect(expenses.summary).toHaveBeenCalledWith(userId, primaryId, '2026-09');
  });

  it('uses Vietnam month boundaries and preserves unavailable fuel-economy codes', async () => {
    const prisma = prismaFake();
    prisma.fuelLogEntry.findMany.mockResolvedValue([
      {
        id: 'fuel-before',
        refueledAt: new Date('2026-08-31T16:59:59.999Z'),
        odometerKm: 11_000,
        quantity: '10.000',
        totalCostVnd: 100_000n,
        isFullTank: false,
      },
      {
        id: 'fuel-at-start',
        refueledAt: new Date('2026-08-31T17:00:00.000Z'),
        odometerKm: 11_100,
        quantity: '20.000',
        totalCostVnd: 200_000n,
        isFullTank: false,
      },
      {
        id: 'fuel-at-end',
        refueledAt: new Date('2026-09-30T17:00:00.000Z'),
        odometerKm: 11_200,
        quantity: '30.000',
        totalCostVnd: 300_000n,
        isFullTank: false,
      },
    ]);
    const expenses = { summary: vi.fn(async () => expenseSummary('2026-09')) };
    const service = new VehicleDashboardService(prisma as never, expenses as never, provider() as never);
    const result = await service.get(userId, { month: '2026-09' });
    expect(result.fuel).toMatchObject({
      refuelCount: 1,
      totalQuantityLiters: '20.000',
      totalCostVnd: '200000',
      economyAvailability: 'NO_FULL_TANK_BASELINE',
    });
  });

  it('uses a deterministic active fallback when no primary is present', async () => {
    const prisma = prismaFake([vehicle(fallbackId, false), vehicle(primaryId, false)]);
    const expenses = { summary: vi.fn(async () => expenseSummary('2026-09')) };
    const service = new VehicleDashboardService(prisma as never, expenses as never, provider() as never);
    const result = await service.get(userId, {});
    expect(result.selectedVehicle?.id).toBe(fallbackId);
  });

  it('returns one safe 404 for requested foreign, missing, or archived selections', async () => {
    const prisma = prismaFake();
    const expenses = { summary: vi.fn() };
    const service = new VehicleDashboardService(prisma as never, expenses as never, provider() as never);
    await expect(service.get(userId, { vehicleId: foreignId })).rejects.toMatchObject({ status: 404 });
    expect(expenses.summary).not.toHaveBeenCalled();
  });

  it('keeps the Garage state clear when the owner has no active vehicle', async () => {
    const prisma = prismaFake([]);
    const expenses = { summary: vi.fn() };
    const service = new VehicleDashboardService(prisma as never, expenses as never, provider() as never);
    const result = await service.get(userId, {});
    expect(result).toMatchObject({ activeVehicleCount: 0, selectedVehicle: null, expenses: null, fuel: null });
    expect(result.featureLinks).toEqual([{ key: 'GARAGE', path: '/garage' }]);
  });

  it('marks odometer-threshold plans unknown when authoritative mileage is missing', async () => {
    const prisma = prismaFake([vehicle(primaryId, true, null)]);
    const expenses = { summary: vi.fn(async () => expenseSummary('2026-09')) };
    const service = new VehicleDashboardService(prisma as never, expenses as never, provider() as never);
    const result = await service.get(userId, {});
    expect(result.maintenance).toMatchObject({ unknownMileagePlanCount: 1 });
    expect(result.selectedVehicle?.currentOdometerKm).toBeNull();
  });
});
