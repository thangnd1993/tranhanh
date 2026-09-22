import { describe, expect, it, vi } from 'vitest';
import { VehicleExpenseService } from './vehicle-expenses.service.js';

const userId = '11111111-1111-4111-8111-111111111111';
const vehicleId = '22222222-2222-4222-8222-222222222222';
const expenseId = '33333333-3333-4333-8333-333333333333';
const now = new Date('2026-09-21T00:00:00.000Z');

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: expenseId,
    userId,
    vehicleId,
    category: 'PARKING' as const,
    title: 'Parking',
    expenseDate: now,
    totalCostVnd: 0n,
    notes: null,
    status: 'ACTIVE' as const,
    archivedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function prismaFake(options: { vehicle?: { id: string } | null; expense?: Record<string, unknown> | null } = {}) {
  const expense = row(options.expense ?? {});
  const prisma = {
    $transaction: vi.fn(async (operation: unknown) =>
      typeof operation === 'function'
        ? (operation as (tx: unknown) => Promise<unknown>)(prisma)
        : Promise.all(operation as Promise<unknown>[]),
    ),
    $executeRaw: vi.fn(async () => 0),
    vehicle: { findFirst: vi.fn(async () => (options.vehicle === undefined ? { id: vehicleId } : options.vehicle)) },
    vehicleExpense: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...expense, ...data })),
      findFirst: vi.fn(async () => (options.expense === null ? null : expense)),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...expense, ...data })),
    },
  };
  return prisma;
}

describe('VehicleExpenseService', () => {
  it('stores exact zero without Number conversion and trims manual text', async () => {
    const prisma = prismaFake();
    const service = new VehicleExpenseService(prisma as never);
    const result = await service.createManual(userId, vehicleId, {
      category: 'PARKING',
      title: '  Parking  ',
      expenseDate: '2026-09-21',
      totalCostVnd: '0',
      notes: '  Exact zero  ',
    });
    expect(result.totalCostVnd).toBe('0');
    expect(prisma.vehicleExpense.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ title: 'Parking', totalCostVnd: 0n, notes: 'Exact zero' }),
    });
  });

  it('rejects negative, decimal and over-limit money before persistence', async () => {
    const prisma = prismaFake();
    const service = new VehicleExpenseService(prisma as never);
    for (const totalCostVnd of ['-1', '1.5', '10000000000000000']) {
      await expect(
        service.createManual(userId, vehicleId, {
          category: 'OTHER',
          title: 'Invalid',
          expenseDate: '2026-09-21',
          totalCostVnd,
        }),
      ).rejects.toMatchObject({ status: 400 });
    }
    expect(prisma.vehicleExpense.create).not.toHaveBeenCalled();
  });

  it('returns one safe 404 for wrong owner, wrong vehicle, or missing manual record', async () => {
    const prisma = prismaFake({ expense: null });
    const service = new VehicleExpenseService(prisma as never);
    await expect(service.getManual('stranger', vehicleId, expenseId)).rejects.toMatchObject({ status: 404 });
    await expect(service.getManual(userId, '44444444-4444-4444-8444-444444444444', expenseId)).rejects.toMatchObject({
      status: 404,
    });
  });

  it('blocks create on archived vehicles transactionally', async () => {
    const prisma = prismaFake({ vehicle: null });
    const service = new VehicleExpenseService(prisma as never);
    await expect(
      service.createManual(userId, vehicleId, {
        category: 'INSURANCE',
        title: 'Insurance',
        expenseDate: '2026-09-21',
        totalCostVnd: '100',
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(prisma.vehicleExpense.create).not.toHaveBeenCalled();
  });

  it('maps raw DATE strings and keeps ledger pagination bounded', async () => {
    const prisma = Object.assign(prismaFake(), {
      $queryRaw: vi.fn(),
    });
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          source: 'MAINTENANCE',
          source_id: expenseId,
          vehicle_id: vehicleId,
          category: 'Engine',
          entry_date: '2026-01-01',
          title: 'Service',
          total_cost_vnd: null,
          status: 'ACTIVE',
          created_at: now,
        },
      ])
      .mockResolvedValueOnce([{ count: 1n }]);
    const service = new VehicleExpenseService(prisma as never);
    const result = await service.listLedger(userId, vehicleId, {
      status: 'ACTIVE',
      month: '2026-01',
      page: 2,
      pageSize: 100,
    });
    expect(result).toMatchObject({ page: 2, pageSize: 100, total: 1 });
    expect(result.items[0]).toMatchObject({ source: 'MAINTENANCE', date: '2026-01-01', totalCostVnd: null });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it('sums known costs with BigInt and reports unknown maintenance', async () => {
    const prisma = Object.assign(prismaFake(), {
      $queryRaw: vi.fn(),
    });
    prisma.$queryRaw
      .mockResolvedValueOnce([{ count: 1n, recorded_total: '900719925474099312345', unknown_count: 0n }])
      .mockResolvedValueOnce([{ count: 2n, recorded_total: '123', unknown_count: 1n }])
      .mockResolvedValueOnce([{ count: 1n, recorded_total: '0', unknown_count: 0n }])
      .mockResolvedValueOnce([
        { category: 'FUEL', count: 1n, recorded_total: '900719925474099312345', unknown_count: 0n },
        { category: 'MAINTENANCE', count: 2n, recorded_total: '123', unknown_count: 1n },
        { category: 'PARKING', count: 1n, recorded_total: '0', unknown_count: 0n },
      ]);
    const service = new VehicleExpenseService(prisma as never);
    const result = await service.summary(userId, vehicleId, '2026-01');
    expect(result.recordedTotalCostVnd).toBe('900719925474099312468');
    expect(result.fuel.recordedTotalCostVnd).toBe('900719925474099312345');
    expect(result.unknownMaintenanceCostCount).toBe(1);
    expect(result.incomplete).toBe(true);
  });

  it('rejects year zero before querying month boundaries', async () => {
    const prisma = prismaFake();
    const service = new VehicleExpenseService(prisma as never);
    await expect(
      service.listLedger(userId, vehicleId, { status: 'ACTIVE', month: '0000-01', page: 1, pageSize: 20 }),
    ).rejects.toMatchObject({
      status: 400,
    });
  });
});
