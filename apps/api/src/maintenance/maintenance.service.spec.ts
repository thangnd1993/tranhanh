import { describe, expect, it, vi } from 'vitest';
import { MaintenanceService } from './maintenance.service.js';

const userId = '11111111-1111-4111-8111-111111111111';
const vehicleId = '22222222-2222-4222-8222-222222222222';
const planId = '33333333-3333-4333-8333-333333333333';
const historyId = '44444444-4444-4444-8444-444444444444';
const now = new Date('2026-09-21T00:00:00.000Z');

function history(overrides: Record<string, unknown> = {}) {
  return {
    id: historyId,
    userId,
    vehicleId,
    title: 'Oil service',
    category: 'Engine',
    serviceDate: new Date('2026-09-21T00:00:00.000Z'),
    odometerKm: 50000,
    totalCostVnd: 0n,
    workshop: null,
    notes: null,
    status: 'ACTIVE' as const,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    completedPlan: null,
    ...overrides,
  };
}

function plan(overrides: Record<string, unknown> = {}) {
  return {
    id: planId,
    userId,
    vehicleId,
    title: 'Brake inspection',
    dueDate: new Date('2026-10-01T00:00:00.000Z'),
    dueOdometerKm: null,
    notes: null,
    status: 'ACTIVE' as const,
    completedAt: null,
    completionHistoryId: null,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    completionHistory: null,
    ...overrides,
  };
}

function prismaFake(overrides: Record<string, unknown> = {}) {
  const historyOverrides = (overrides.maintenanceHistory ?? {}) as Record<string, unknown>;
  const planOverrides = (overrides.maintenancePlan ?? {}) as Record<string, unknown>;
  const prisma = {
    $transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback(prisma)),
    $executeRaw: vi.fn(async () => 0),
    vehicle: {
      findFirst: vi.fn(async () => ({ id: vehicleId, currentOdometerKm: 50000 })),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    maintenanceHistory: {
      create: vi.fn(async () => history()),
      findFirst: vi.fn(async () => history()),
      update: vi.fn(async () => history()),
      ...historyOverrides,
    },
    maintenancePlan: {
      create: vi.fn(async () => plan()),
      findFirst: vi.fn(async () => plan()),
      update: vi.fn(async () => plan()),
      ...planOverrides,
    },
  };
  return prisma;
}

describe('MaintenanceService', () => {
  it('passes exact zero VND as BigInt and raises odometer only upward', async () => {
    const prisma = prismaFake();
    const service = new MaintenanceService(prisma as never);
    const result = await service.createHistory(userId, vehicleId, {
      title: 'Zero cost check',
      category: 'Other',
      serviceDate: '2026-09-21',
      odometerKm: 60000,
      totalCostVnd: '0',
    } as never);
    expect(result.totalCostVnd).toBe('0');
    expect(prisma.maintenanceHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ totalCostVnd: 0n }) }),
    );
    expect(prisma.vehicle.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { currentOdometerKm: 60000 } }),
    );
  });

  it('serializes the linked history on first completion and retry', async () => {
    let completed = false;
    const completedHistory = history({ completedPlan: { id: planId } });
    const completedPlan = plan({
      status: 'COMPLETED',
      completedAt: now,
      completionHistoryId: historyId,
      completionHistory: completedHistory,
    });
    const prisma = prismaFake({
      maintenanceHistory: { findFirst: vi.fn(async () => completedHistory) },
      maintenancePlan: {
        findFirst: vi.fn(async () => (completed ? completedPlan : plan())),
        update: vi.fn(async () => {
          completed = true;
          return completedPlan;
        }),
      },
    });
    const service = new MaintenanceService(prisma as never);
    const input = { serviceDate: '2026-09-21', category: 'Engine', totalCostVnd: '0' };
    const first = await service.completePlan(userId, vehicleId, planId, input as never);
    expect(first.history.completedPlanId).toBe(planId);
    expect(first.plan.completionHistoryId).toBe(historyId);
    const retry = await service.completePlan(userId, vehicleId, planId, input as never);
    expect(retry.history.completedPlanId).toBe(planId);
    expect(prisma.maintenanceHistory.create).toHaveBeenCalledTimes(1);
  });
  it('returns a previously linked completion on retry without creating another history row', async () => {
    const completedHistory = history({ completedPlan: { id: planId } });
    const completedPlan = plan({
      status: 'COMPLETED',
      completedAt: now,
      completionHistoryId: historyId,
      completionHistory: completedHistory,
    });
    const prisma = prismaFake({
      maintenancePlan: { findFirst: vi.fn(async () => completedPlan), update: vi.fn(), create: vi.fn() },
    });
    const service = new MaintenanceService(prisma as never);
    const result = await service.completePlan(userId, vehicleId, planId, {
      serviceDate: '2026-09-22',
      category: 'Different retry payload',
      totalCostVnd: '999',
    } as never);
    expect(result.history.id).toBe(historyId);
    expect(result.plan.status).toBe('COMPLETED');
    expect(prisma.maintenanceHistory.create).not.toHaveBeenCalled();
    expect(prisma.maintenancePlan.update).not.toHaveBeenCalled();
  });

  it('does not edit a completed plan after it is archived', async () => {
    const completedPlan = plan({ status: 'ARCHIVED', completionHistoryId: historyId, completionHistory: history() });
    const prisma = prismaFake({
      maintenancePlan: { findFirst: vi.fn(async () => completedPlan), update: vi.fn(), create: vi.fn() },
    });
    const service = new MaintenanceService(prisma as never);
    await expect(service.updatePlan(userId, vehicleId, planId, { title: 'Correction' } as never)).rejects.toMatchObject(
      {
        status: 400,
      },
    );
    expect(prisma.maintenancePlan.update).not.toHaveBeenCalled();
  });

  it('uses owner and vehicle together for missing history', async () => {
    const prisma = prismaFake({ maintenanceHistory: { findFirst: vi.fn(async () => null) } });
    const service = new MaintenanceService(prisma as never);
    await expect(service.getHistory('stranger', vehicleId, historyId)).rejects.toMatchObject({ status: 404 });
    expect(prisma.maintenanceHistory.findFirst).toHaveBeenCalledWith({
      where: { id: historyId, userId: 'stranger', vehicleId },
      include: expect.anything(),
    });
  });
});
