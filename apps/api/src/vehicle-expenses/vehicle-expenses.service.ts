import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  VehicleExpenseCategory,
  VehicleExpenseLedgerEntry,
  VehicleExpenseLedgerResult,
  VehicleExpenseListResult,
  VehicleExpenseResult,
  VehicleExpenseSourceSummary,
  VehicleExpenseSummary,
} from '@tranhanh/shared';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { dateOnly, parseDateOnly } from '../maintenance/maintenance-due.js';
import { monthBounds, vietnamMonth } from '../fuel-log/fuel-log-calculator.js';
import type {
  CreateVehicleExpenseDto,
  ManualVehicleExpenseListQueryDto,
  UpdateVehicleExpenseDto,
  VehicleExpenseListQueryDto,
} from './vehicle-expenses.dto.js';

type Tx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];
type ManualRow = Awaited<ReturnType<VehicleExpenseService['ownedManual']>>;

interface RawLedgerRow {
  source: string;
  source_id: string;
  vehicle_id: string;
  category: string;
  entry_date: string;
  title: string;
  total_cost_vnd: bigint | null;
  status: string;
  created_at: Date;
}

interface RawCountRow {
  count: bigint;
}

interface RawSourceSummaryRow {
  count: bigint;
  recorded_total: string;
  unknown_count: bigint;
}

interface RawCategorySummaryRow {
  category: string;
  count: bigint;
  recorded_total: string;
  unknown_count: bigint;
}

const manualCategories: VehicleExpenseCategory[] = ['INSURANCE', 'REGISTRATION', 'TOLL', 'PARKING', 'OTHER'];

@Injectable()
export class VehicleExpenseService {
  constructor(private readonly prisma: PrismaService) {}

  async listLedger(
    userId: string,
    vehicleId: string,
    query: VehicleExpenseListQueryDto,
  ): Promise<VehicleExpenseLedgerResult> {
    await this.vehicle(this.prisma, userId, vehicleId, false);
    const dateMonthValue = query.month ? this.monthDate(query.month) : null;
    const month = query.month ? monthBounds(query.month) : null;
    const statusValue = query.status ?? 'ACTIVE';
    const status = statusValue === 'ALL' ? Prisma.empty : Prisma.sql`AND "status"::text = ${statusValue}`;
    const fuelMonth = month
      ? Prisma.sql`AND "refueledAt" >= ${month.from.toISOString()}::timestamptz AND "refueledAt" < ${month.to.toISOString()}::timestamptz`
      : Prisma.empty;
    const dateMonth = dateMonthValue
      ? Prisma.sql`AND "serviceDate" >= ${dateMonthValue.from.toISOString().slice(0, 10)}::date AND "serviceDate" < ${dateMonthValue.to.toISOString().slice(0, 10)}::date`
      : Prisma.empty;
    const manualMonth = dateMonthValue
      ? Prisma.sql`AND "expenseDate" >= ${dateMonthValue.from.toISOString().slice(0, 10)}::date AND "expenseDate" < ${dateMonthValue.to.toISOString().slice(0, 10)}::date`
      : Prisma.empty;
    const from = Prisma.sql`
      SELECT 'FUEL'::text AS source, "id" AS source_id, "vehicleId" AS vehicle_id,
        'FUEL'::text AS category,
        (("refueledAt" AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::text AS entry_date,
        COALESCE("customFuelLabel", "fuelProductKey", 'Fuel')::text AS title,
        "totalCostVnd" AS total_cost_vnd, "status"::text AS status, "createdAt" AS created_at
      FROM "FuelLogEntry"
      WHERE "userId" = ${userId}::uuid AND "vehicleId" = ${vehicleId}::uuid ${status} ${fuelMonth}
      UNION ALL
      SELECT 'MAINTENANCE'::text, "id", "vehicleId", "category"::text,
        "serviceDate"::text, "title", "totalCostVnd", "status"::text, "createdAt"
      FROM "MaintenanceHistory"
      WHERE "userId" = ${userId}::uuid AND "vehicleId" = ${vehicleId}::uuid ${status} ${dateMonth}
      UNION ALL
      SELECT 'MANUAL'::text, "id", "vehicleId", "category"::text,
        "expenseDate"::text, "title", "totalCostVnd", "status"::text, "createdAt"
      FROM "VehicleExpense"
      WHERE "userId" = ${userId}::uuid AND "vehicleId" = ${vehicleId}::uuid ${status} ${manualMonth}
    `;
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const offset = (page - 1) * pageSize;
    const [rows, countRows] = await this.prisma.$transaction([
      this.prisma.$queryRaw<RawLedgerRow[]>(Prisma.sql`
        SELECT source, source_id, vehicle_id, category, entry_date, title, total_cost_vnd, status, created_at
        FROM (${from}) AS ledger
        ORDER BY entry_date DESC, created_at DESC, source DESC, source_id DESC
        OFFSET ${offset} LIMIT ${pageSize}
      `),
      this.prisma.$queryRaw<RawCountRow[]>(Prisma.sql`SELECT COUNT(*)::bigint AS count FROM (${from}) AS ledger`),
    ]);
    return {
      items: rows.map((row) => this.ledgerResult(row)),
      page,
      pageSize,
      total: Number(countRows[0]?.count ?? 0n),
    };
  }

  async listManual(
    userId: string,
    vehicleId: string,
    query: ManualVehicleExpenseListQueryDto,
  ): Promise<VehicleExpenseListResult> {
    await this.vehicle(this.prisma, userId, vehicleId, false);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const status = query.status ?? 'ACTIVE';
    const bounds = query.month ? this.monthDate(query.month) : null;
    const where = {
      userId,
      vehicleId,
      ...(status === 'ALL' ? {} : { status }),
      ...(bounds ? { expenseDate: { gte: bounds.from, lt: bounds.to } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.vehicleExpense.findMany({
        where,
        orderBy: [{ expenseDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.vehicleExpense.count({ where }),
    ]);
    return { items: rows.map((row) => this.result(row)), page, pageSize, total };
  }

  async getManual(userId: string, vehicleId: string, expenseId: string): Promise<VehicleExpenseResult> {
    return this.result(await this.ownedManual(this.prisma, userId, vehicleId, expenseId));
  }

  async createManual(userId: string, vehicleId: string, input: CreateVehicleExpenseDto): Promise<VehicleExpenseResult> {
    const values = this.values(input);
    const row = await this.prisma.$transaction(async (tx) => {
      await this.lockVehicle(tx, vehicleId);
      await this.vehicle(tx, userId, vehicleId, true);
      return tx.vehicleExpense.create({ data: { userId, vehicleId, ...values } });
    });
    return this.result(row);
  }

  async updateManual(
    userId: string,
    vehicleId: string,
    expenseId: string,
    input: UpdateVehicleExpenseDto,
  ): Promise<VehicleExpenseResult> {
    const row = await this.prisma.$transaction(async (tx) => {
      await this.lockVehicle(tx, vehicleId);
      await this.vehicle(tx, userId, vehicleId, true);
      const current = await this.ownedManual(tx, userId, vehicleId, expenseId);
      return tx.vehicleExpense.update({
        where: { id: current.id },
        data: {
          ...(input.category === undefined ? {} : { category: this.category(input.category) }),
          ...(input.title === undefined ? {} : { title: this.requiredText(input.title, 150, 'title') }),
          ...(input.expenseDate === undefined ? {} : { expenseDate: this.requiredDate(input.expenseDate) }),
          ...(input.totalCostVnd === undefined ? {} : { totalCostVnd: this.cost(input.totalCostVnd) }),
          ...(input.notes === undefined ? {} : { notes: this.optionalText(input.notes, 1000) }),
        },
      });
    });
    return this.result(row);
  }

  async archiveManual(userId: string, vehicleId: string, expenseId: string): Promise<VehicleExpenseResult> {
    const row = await this.prisma.$transaction(async (tx) => {
      await this.lockVehicle(tx, vehicleId);
      await this.vehicle(tx, userId, vehicleId, true);
      const current = await this.ownedManual(tx, userId, vehicleId, expenseId);
      if (current.status === 'ARCHIVED') return current;
      return tx.vehicleExpense.update({
        where: { id: current.id },
        data: { status: 'ARCHIVED', archivedAt: new Date() },
      });
    });
    return this.result(row);
  }

  async restoreManual(userId: string, vehicleId: string, expenseId: string): Promise<VehicleExpenseResult> {
    const row = await this.prisma.$transaction(async (tx) => {
      await this.lockVehicle(tx, vehicleId);
      await this.vehicle(tx, userId, vehicleId, true);
      const current = await this.ownedManual(tx, userId, vehicleId, expenseId);
      if (current.status === 'ACTIVE') return current;
      return tx.vehicleExpense.update({
        where: { id: current.id },
        data: { status: 'ACTIVE', archivedAt: null },
      });
    });
    return this.result(row);
  }

  async summary(userId: string, vehicleId: string, month = vietnamMonth()): Promise<VehicleExpenseSummary> {
    await this.vehicle(this.prisma, userId, vehicleId, false);
    const dateBounds = this.monthDate(month);
    const instantBounds = monthBounds(month);
    const { fuelRows, maintenanceRows, manualRows, categoryRows } = await this.prisma.$transaction(
      async (tx) => {
        const [fuelRows, maintenanceRows, manualRows] = await Promise.all([
          tx.$queryRaw<RawSourceSummaryRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count, COALESCE(SUM("totalCostVnd"), 0)::text AS recorded_total,
          0::bigint AS unknown_count
        FROM "FuelLogEntry"
        WHERE "userId" = ${userId}::uuid AND "vehicleId" = ${vehicleId}::uuid AND "status" = 'ACTIVE'
          AND "refueledAt" >= ${instantBounds.from.toISOString()}::timestamptz AND "refueledAt" < ${instantBounds.to.toISOString()}::timestamptz
      `),
          tx.$queryRaw<RawSourceSummaryRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count, COALESCE(SUM("totalCostVnd"), 0)::text AS recorded_total,
          COUNT(*) FILTER (WHERE "totalCostVnd" IS NULL)::bigint AS unknown_count
        FROM "MaintenanceHistory"
        WHERE "userId" = ${userId}::uuid AND "vehicleId" = ${vehicleId}::uuid AND "status" = 'ACTIVE'
          AND "serviceDate" >= ${dateBounds.from.toISOString().slice(0, 10)}::date AND "serviceDate" < ${dateBounds.to.toISOString().slice(0, 10)}::date
      `),
          tx.$queryRaw<RawSourceSummaryRow[]>(Prisma.sql`
        SELECT COUNT(*)::bigint AS count, COALESCE(SUM("totalCostVnd"), 0)::text AS recorded_total,
          0::bigint AS unknown_count
        FROM "VehicleExpense"
        WHERE "userId" = ${userId}::uuid AND "vehicleId" = ${vehicleId}::uuid AND "status" = 'ACTIVE'
          AND "expenseDate" >= ${dateBounds.from.toISOString().slice(0, 10)}::date AND "expenseDate" < ${dateBounds.to.toISOString().slice(0, 10)}::date
      `),
        ]);
        const categoryRows = await tx.$queryRaw<RawCategorySummaryRow[]>(Prisma.sql`
      SELECT category, COUNT(*)::bigint AS count, COALESCE(SUM(recorded_cost), 0)::text AS recorded_total,
        COUNT(*) FILTER (WHERE recorded_cost IS NULL)::bigint AS unknown_count
      FROM (
        SELECT 'FUEL'::text AS category, "totalCostVnd" AS recorded_cost
        FROM "FuelLogEntry"
        WHERE "userId" = ${userId}::uuid AND "vehicleId" = ${vehicleId}::uuid AND "status" = 'ACTIVE'
          AND "refueledAt" >= ${instantBounds.from.toISOString()}::timestamptz AND "refueledAt" < ${instantBounds.to.toISOString()}::timestamptz
        UNION ALL
        SELECT 'MAINTENANCE'::text, "totalCostVnd"
        FROM "MaintenanceHistory"
        WHERE "userId" = ${userId}::uuid AND "vehicleId" = ${vehicleId}::uuid AND "status" = 'ACTIVE'
          AND "serviceDate" >= ${dateBounds.from.toISOString().slice(0, 10)}::date AND "serviceDate" < ${dateBounds.to.toISOString().slice(0, 10)}::date
        UNION ALL
        SELECT "category"::text, "totalCostVnd"
        FROM "VehicleExpense"
        WHERE "userId" = ${userId}::uuid AND "vehicleId" = ${vehicleId}::uuid AND "status" = 'ACTIVE'
          AND "expenseDate" >= ${dateBounds.from.toISOString().slice(0, 10)}::date AND "expenseDate" < ${dateBounds.to.toISOString().slice(0, 10)}::date
      ) AS categories
      GROUP BY category
      ORDER BY category ASC
        `);
        return { fuelRows, maintenanceRows, manualRows, categoryRows };
      },
      { isolationLevel: 'RepeatableRead' },
    );
    const fuel = this.sourceSummary(fuelRows[0]);
    const maintenance = this.sourceSummary(maintenanceRows[0]);
    const manual = this.sourceSummary(manualRows[0]);
    const total =
      BigInt(fuel.recordedTotalCostVnd) +
      BigInt(maintenance.recordedTotalCostVnd) +
      BigInt(manual.recordedTotalCostVnd);
    const totalCount = fuel.count + maintenance.count + manual.count;
    return {
      month,
      recordedTotalCostVnd: total.toString(),
      totalCostVnd: total.toString(),
      totalCount,
      fuel,
      maintenance,
      manual,
      bySource: { FUEL: fuel, MAINTENANCE: maintenance, MANUAL: manual },
      byCategory: categoryRows.map((row) => ({
        category: row.category,
        count: Number(row.count),
        recordedTotalCostVnd: row.recorded_total,
        unknownCostCount: Number(row.unknown_count),
      })),
      unknownMaintenanceCostCount: maintenance.unknownCostCount,
      incomplete: maintenance.unknownCostCount > 0,
    };
  }

  private monthDate(month: string) {
    if (!/^[1-9]\d{3}-(0[1-9]|1[0-2])$/.test(month)) throw new BadRequestException('Month must use YYYY-MM.');
    const [year, value] = month.split('-').map(Number);
    return { from: new Date(Date.UTC(year, value - 1, 1)), to: new Date(Date.UTC(year, value, 1)) };
  }

  private values(input: CreateVehicleExpenseDto) {
    return {
      category: this.category(input.category),
      title: this.requiredText(input.title, 150, 'title'),
      expenseDate: this.requiredDate(input.expenseDate),
      totalCostVnd: this.cost(input.totalCostVnd),
      notes: this.optionalText(input.notes, 1000),
    };
  }

  private category(value: string): VehicleExpenseCategory {
    if (!manualCategories.includes(value as VehicleExpenseCategory))
      throw new BadRequestException('Category is invalid.');
    return value as VehicleExpenseCategory;
  }

  private requiredDate(value: string | null | undefined) {
    if (!value) throw new BadRequestException('A valid calendar date is required.');
    try {
      return parseDateOnly(value)!;
    } catch {
      throw new BadRequestException('Date must be a valid YYYY-MM-DD calendar date.');
    }
  }

  private requiredText(value: string, maxLength: number, field: string) {
    const trimmed = value?.trim();
    if (!trimmed || trimmed.length > maxLength) throw new BadRequestException(`${field} is invalid.`);
    return trimmed;
  }

  private optionalText(value: string | null | undefined, maxLength: number) {
    if (value === undefined || value === null) return null;
    const trimmed = value.trim();
    if (trimmed.length > maxLength) throw new BadRequestException('Text is too long.');
    return trimmed || null;
  }

  private cost(value: string | null | undefined) {
    if (value === undefined || value === null || !/^(?:0|[1-9]\d{0,15})$/.test(value))
      throw new BadRequestException('Cost must be a non-negative integer VND amount.');
    return BigInt(value);
  }

  private async lockVehicle(tx: Tx, vehicleId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${vehicleId}))`;
  }

  private async vehicle(tx: Tx | PrismaService, userId: string, vehicleId: string, active: boolean) {
    const row = await tx.vehicle.findFirst({
      where: { id: vehicleId, userId, ...(active ? { status: 'ACTIVE' } : {}) },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('Vehicle not found.');
    return row;
  }

  private async ownedManual(tx: Tx | PrismaService, userId: string, vehicleId: string, expenseId: string) {
    const row = await tx.vehicleExpense.findFirst({ where: { id: expenseId, userId, vehicleId } });
    if (!row) throw new NotFoundException('Vehicle expense not found.');
    return row;
  }

  private sourceSummary(row: RawSourceSummaryRow | undefined): VehicleExpenseSourceSummary {
    return {
      count: Number(row?.count ?? 0n),
      recordedTotalCostVnd: row?.recorded_total ?? '0',
      unknownCostCount: Number(row?.unknown_count ?? 0n),
    };
  }

  private ledgerResult(row: RawLedgerRow): VehicleExpenseLedgerEntry {
    const source = row.source as VehicleExpenseLedgerEntry['source'];
    const sourcePath =
      source === 'FUEL'
        ? `/fuel-log/${row.source_id}`
        : source === 'MAINTENANCE'
          ? `/maintenance/history/${row.source_id}`
          : `/expenses/manual/${row.source_id}`;
    return {
      source,
      sourceId: row.source_id,
      originalId: row.source_id,
      vehicleId: row.vehicle_id,
      category: row.category,
      date: row.entry_date.slice(0, 10),
      title: row.title,
      totalCostVnd: row.total_cost_vnd?.toString() ?? null,
      status: row.status as VehicleExpenseLedgerEntry['status'],
      sourcePath,
    };
  }

  private result(row: ManualRow): VehicleExpenseResult {
    return {
      id: row.id,
      vehicleId: row.vehicleId,
      category: row.category,
      title: row.title,
      expenseDate: dateOnly(row.expenseDate)!,
      totalCostVnd: row.totalCostVnd.toString(),
      notes: row.notes,
      status: row.status,
      archivedAt: row.archivedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
