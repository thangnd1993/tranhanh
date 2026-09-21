import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { FuelLogEntryResult, FuelLogListResult, FuelLogSummary } from '@tranhanh/shared';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { buildFuelSummary, monthBounds, vietnamMonth } from './fuel-log-calculator.js';
import type { CreateFuelLogEntryDto, FuelLogListQueryDto, UpdateFuelLogEntryDto } from './fuel-log.dto.js';

type Tx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];
const orderAsc = [{ refueledAt: 'asc' as const }, { odometerKm: 'asc' as const }, { id: 'asc' as const }];
@Injectable()
export class FuelLogService {
  constructor(private readonly prisma: PrismaService) {}
  async list(userId: string, vehicleId: string, query: FuelLogListQueryDto): Promise<FuelLogListResult> {
    await this.vehicle(this.prisma, userId, vehicleId, false);
    const month = query.month ? monthBounds(query.month) : null;
    const where = {
      userId,
      vehicleId,
      ...(query.status === 'ALL' ? {} : { status: query.status }),
      ...(month ? { refueledAt: { gte: month.from, lt: month.to } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.fuelLogEntry.findMany({
        where,
        orderBy: [{ refueledAt: 'desc' }, { createdAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.fuelLogEntry.count({ where }),
    ]);
    return { items: rows.map((row) => this.result(row)), page: query.page, pageSize: query.pageSize, total };
  }
  async get(userId: string, vehicleId: string, entryId: string): Promise<FuelLogEntryResult> {
    return this.result(await this.owned(this.prisma, userId, vehicleId, entryId));
  }
  async create(userId: string, vehicleId: string, input: CreateFuelLogEntryDto): Promise<FuelLogEntryResult> {
    this.validateProduct(input.fuelProductKey, input.customFuelLabel);
    const row = await this.prisma.$transaction(async (tx) => {
      await this.vehicle(tx, userId, vehicleId, true);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${vehicleId}))`;
      await this.validateChronology(tx, userId, vehicleId, input.refueledAt, input.odometerKm);
      const created = await tx.fuelLogEntry.create({
        data: {
          userId,
          vehicleId,
          refueledAt: new Date(input.refueledAt),
          odometerKm: input.odometerKm,
          quantity: new Prisma.Decimal(input.quantity),
          unit: input.unit ?? 'LITER',
          totalCostVnd: BigInt(input.totalCostVnd),
          fuelProductKey: input.fuelProductKey,
          customFuelLabel: input.fuelProductKey === 'OTHER' ? input.customFuelLabel : null,
          isFullTank: input.isFullTank,
          station: input.station,
          notes: input.notes,
        },
      });
      await this.raiseOdometer(tx, userId, vehicleId, input.odometerKm);
      return created;
    });
    return this.result(row);
  }
  async update(
    userId: string,
    vehicleId: string,
    entryId: string,
    input: UpdateFuelLogEntryDto,
  ): Promise<FuelLogEntryResult> {
    const row = await this.prisma.$transaction(async (tx) => {
      const current = await this.owned(tx, userId, vehicleId, entryId);
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${vehicleId}))`;
      const refueledAt = input.refueledAt ?? current.refueledAt.toISOString();
      const odometerKm = input.odometerKm ?? current.odometerKm;
      const product = input.fuelProductKey === undefined ? current.fuelProductKey : input.fuelProductKey;
      const label = input.customFuelLabel === undefined ? current.customFuelLabel : input.customFuelLabel;
      this.validateProduct(product, label);
      if (current.status === 'ACTIVE')
        await this.validateChronology(tx, userId, vehicleId, refueledAt, odometerKm, entryId);
      const updated = await tx.fuelLogEntry.update({
        where: { id: current.id },
        data: {
          ...(input.refueledAt === undefined ? {} : { refueledAt: new Date(input.refueledAt) }),
          ...(input.odometerKm === undefined ? {} : { odometerKm }),
          ...(input.quantity === undefined ? {} : { quantity: new Prisma.Decimal(input.quantity) }),
          ...(input.unit === undefined ? {} : { unit: input.unit }),
          ...(input.totalCostVnd === undefined ? {} : { totalCostVnd: BigInt(input.totalCostVnd) }),
          ...(input.fuelProductKey === undefined ? {} : { fuelProductKey: input.fuelProductKey }),
          ...(input.fuelProductKey === undefined && input.customFuelLabel === undefined
            ? {}
            : { customFuelLabel: product === 'OTHER' ? label : null }),
          ...(input.isFullTank === undefined ? {} : { isFullTank: input.isFullTank }),
          ...(input.station === undefined ? {} : { station: input.station }),
          ...(input.notes === undefined ? {} : { notes: input.notes }),
        },
      });
      if (current.status === 'ACTIVE') await this.raiseOdometer(tx, userId, vehicleId, odometerKm);
      return updated;
    });
    return this.result(row);
  }
  async archive(userId: string, vehicleId: string, entryId: string): Promise<FuelLogEntryResult> {
    const current = await this.owned(this.prisma, userId, vehicleId, entryId);
    if (current.status === 'ARCHIVED') return this.result(current);
    return this.result(
      await this.prisma.fuelLogEntry.update({
        where: { id: current.id },
        data: { status: 'ARCHIVED', archivedAt: new Date() },
      }),
    );
  }
  async restore(userId: string, vehicleId: string, entryId: string): Promise<FuelLogEntryResult> {
    const row = await this.prisma.$transaction(async (tx) => {
      const current = await this.owned(tx, userId, vehicleId, entryId);
      if (current.status === 'ACTIVE') return current;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${vehicleId}))`;
      await this.validateChronology(
        tx,
        userId,
        vehicleId,
        current.refueledAt.toISOString(),
        current.odometerKm,
        entryId,
      );
      const restored = await tx.fuelLogEntry.update({
        where: { id: current.id },
        data: { status: 'ACTIVE', archivedAt: null },
      });
      await this.raiseOdometer(tx, userId, vehicleId, current.odometerKm);
      return restored;
    });
    return this.result(row);
  }
  async summary(userId: string, vehicleId: string, month = vietnamMonth()): Promise<FuelLogSummary> {
    await this.vehicle(this.prisma, userId, vehicleId, false);
    const rows = await this.prisma.fuelLogEntry.findMany({
      where: { userId, vehicleId, status: 'ACTIVE' },
      orderBy: orderAsc,
    });
    return buildFuelSummary(rows, month);
  }
  private validateProduct(product: string | null | undefined, label: string | null | undefined) {
    if (product === 'OTHER' && !label) throw new BadRequestException('A custom fuel label is required for OTHER.');
    if (product !== 'OTHER' && label) throw new BadRequestException('Custom fuel label is only valid for OTHER.');
  }
  private async validateChronology(
    tx: Tx | PrismaService,
    userId: string,
    vehicleId: string,
    refueledAt: string,
    odometerKm: number,
    excludeId?: string,
  ) {
    const rows = await tx.fuelLogEntry.findMany({
      where: { userId, vehicleId, status: 'ACTIVE', ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true, refueledAt: true, odometerKm: true },
      orderBy: orderAsc,
    });
    const candidate = { id: '', refueledAt: new Date(refueledAt), odometerKm };
    const ordered = [...rows, candidate].sort(
      (a, b) =>
        a.refueledAt.getTime() - b.refueledAt.getTime() || a.odometerKm - b.odometerKm || a.id.localeCompare(b.id),
    );
    const index = ordered.indexOf(candidate);
    const previous = ordered[index - 1];
    const next = ordered[index + 1];
    if (previous && previous.odometerKm > odometerKm)
      throw new BadRequestException('Odometer must be at least the previous chronological fuel entry.');
    if (next && next.odometerKm < odometerKm)
      throw new BadRequestException('Odometer must not exceed the next chronological fuel entry.');
  }
  private async raiseOdometer(tx: Tx, userId: string, vehicleId: string, value: number) {
    await tx.vehicle.updateMany({
      where: { id: vehicleId, userId, OR: [{ currentOdometerKm: null }, { currentOdometerKm: { lt: value } }] },
      data: { currentOdometerKm: value },
    });
  }
  private async vehicle(tx: Tx | PrismaService, userId: string, vehicleId: string, active: boolean) {
    const row = await tx.vehicle.findFirst({
      where: { id: vehicleId, userId, ...(active ? { status: 'ACTIVE' } : {}) },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('Vehicle not found.');
    return row;
  }
  private async owned(tx: Tx | PrismaService, userId: string, vehicleId: string, entryId: string) {
    const row = await tx.fuelLogEntry.findFirst({ where: { id: entryId, userId, vehicleId } });
    if (!row) throw new NotFoundException('Fuel log entry not found.');
    return row;
  }
  private result(row: Awaited<ReturnType<FuelLogService['owned']>>): FuelLogEntryResult {
    return {
      id: row.id,
      vehicleId: row.vehicleId,
      refueledAt: row.refueledAt.toISOString(),
      odometerKm: row.odometerKm,
      quantity: row.quantity.toFixed(3),
      unit: row.unit,
      totalCostVnd: row.totalCostVnd.toString(),
      effectivePricePerLiterVnd: new Prisma.Decimal(row.totalCostVnd.toString())
        .div(row.quantity)
        .toDecimalPlaces(2)
        .toFixed(2),
      fuelProductKey: row.fuelProductKey as FuelLogEntryResult['fuelProductKey'],
      customFuelLabel: row.customFuelLabel,
      isFullTank: row.isFullTank,
      station: row.station,
      notes: row.notes,
      status: row.status,
      archivedAt: row.archivedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
