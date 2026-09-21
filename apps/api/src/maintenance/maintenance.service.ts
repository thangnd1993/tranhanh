import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  MaintenanceCompletionResult,
  MaintenanceHistoryListResult,
  MaintenanceHistoryResult,
  MaintenancePlanListResult,
  MaintenancePlanResult,
  MaintenanceSummary,
} from '@tranhanh/shared';
import { PrismaService } from '../database/prisma.service.js';
import { dateOnly, maintenanceDueStatus, parseDateOnly } from './maintenance-due.js';
import type {
  CompleteMaintenancePlanDto,
  CreateMaintenanceHistoryDto,
  CreateMaintenancePlanDto,
  MaintenanceHistoryListQueryDto,
  MaintenancePlanListQueryDto,
  UpdateMaintenanceHistoryDto,
  UpdateMaintenancePlanDto,
} from './maintenance.dto.js';

type Tx = Parameters<Parameters<PrismaService['$transaction']>[0]>[0];
const historyInclude = { completedPlan: { select: { id: true } } } as const;
const planInclude = { completionHistory: { include: historyInclude } } as const;

@Injectable()
export class MaintenanceService {
  constructor(private readonly prisma: PrismaService) {}

  async listHistory(
    userId: string,
    vehicleId: string,
    query: MaintenanceHistoryListQueryDto,
  ): Promise<MaintenanceHistoryListResult> {
    await this.vehicle(this.prisma, userId, vehicleId, false);
    const where = {
      userId,
      vehicleId,
      ...(query.status === 'ALL' ? {} : { status: query.status }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.maintenanceHistory.findMany({
        where,
        include: historyInclude,
        orderBy: [{ serviceDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.maintenanceHistory.count({ where }),
    ]);
    return {
      items: rows.map((row) => this.historyResult(row)),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async getHistory(userId: string, vehicleId: string, historyId: string): Promise<MaintenanceHistoryResult> {
    return this.historyResult(await this.ownedHistory(this.prisma, userId, vehicleId, historyId));
  }

  async createHistory(
    userId: string,
    vehicleId: string,
    input: CreateMaintenanceHistoryDto,
  ): Promise<MaintenanceHistoryResult> {
    const values = this.historyValues(input);
    const row = await this.prisma.$transaction(async (tx) => {
      await this.lockVehicle(tx, vehicleId);
      await this.vehicle(tx, userId, vehicleId, true);
      const created = await tx.maintenanceHistory.create({
        data: { userId, vehicleId, ...values },
        include: historyInclude,
      });
      await this.raiseOdometer(tx, userId, vehicleId, values.odometerKm);
      return created;
    });
    return this.historyResult(row);
  }

  async updateHistory(
    userId: string,
    vehicleId: string,
    historyId: string,
    input: UpdateMaintenanceHistoryDto,
  ): Promise<MaintenanceHistoryResult> {
    const row = await this.prisma.$transaction(async (tx) => {
      await this.lockVehicle(tx, vehicleId);
      await this.vehicle(tx, userId, vehicleId, true);
      const current = await this.ownedHistory(tx, userId, vehicleId, historyId);
      if (input.serviceDate !== undefined) this.requiredDate(input.serviceDate);
      const odometerKm = input.odometerKm === undefined ? current.odometerKm : input.odometerKm;
      const updated = await tx.maintenanceHistory.update({
        where: { id: current.id },
        data: {
          ...(input.title === undefined ? {} : { title: this.requiredText(input.title, 150, 'title') }),
          ...(input.category === undefined ? {} : { category: this.requiredText(input.category, 100, 'category') }),
          ...(input.serviceDate === undefined ? {} : { serviceDate: this.requiredDate(input.serviceDate) }),
          ...(input.odometerKm === undefined ? {} : { odometerKm }),
          ...(input.totalCostVnd === undefined ? {} : { totalCostVnd: this.cost(input.totalCostVnd) }),
          ...(input.workshop === undefined ? {} : { workshop: this.optionalText(input.workshop, 200) }),
          ...(input.notes === undefined ? {} : { notes: this.optionalText(input.notes, 1000) }),
        },
        include: historyInclude,
      });
      await this.raiseOdometer(tx, userId, vehicleId, odometerKm);
      return updated;
    });
    return this.historyResult(row);
  }

  async archiveHistory(userId: string, vehicleId: string, historyId: string): Promise<MaintenanceHistoryResult> {
    const row = await this.prisma.$transaction(async (tx) => {
      await this.lockVehicle(tx, vehicleId);
      await this.vehicle(tx, userId, vehicleId, true);
      const current = await this.ownedHistory(tx, userId, vehicleId, historyId);
      if (current.status === 'ARCHIVED') return current;
      return tx.maintenanceHistory.update({
        where: { id: current.id },
        data: { status: 'ARCHIVED', archivedAt: new Date() },
        include: historyInclude,
      });
    });
    return this.historyResult(row);
  }

  async restoreHistory(userId: string, vehicleId: string, historyId: string): Promise<MaintenanceHistoryResult> {
    const row = await this.prisma.$transaction(async (tx) => {
      await this.lockVehicle(tx, vehicleId);
      await this.vehicle(tx, userId, vehicleId, true);
      const current = await this.ownedHistory(tx, userId, vehicleId, historyId);
      if (current.status === 'ACTIVE') return current;
      return tx.maintenanceHistory.update({
        where: { id: current.id },
        data: { status: 'ACTIVE', archivedAt: null },
        include: historyInclude,
      });
    });
    return this.historyResult(row);
  }

  async listPlans(
    userId: string,
    vehicleId: string,
    query: MaintenancePlanListQueryDto,
  ): Promise<MaintenancePlanListResult> {
    const vehicle = await this.vehicle(this.prisma, userId, vehicleId, false);
    const where = {
      userId,
      vehicleId,
      ...(query.status === 'ALL' ? {} : { status: query.status }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.maintenancePlan.findMany({
        where,
        include: planInclude,
        orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.maintenancePlan.count({ where }),
    ]);
    return {
      items: rows.map((row) => this.planResult(row, vehicle.currentOdometerKm)),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async getPlan(userId: string, vehicleId: string, planId: string): Promise<MaintenancePlanResult> {
    const vehicle = await this.vehicle(this.prisma, userId, vehicleId, false);
    return this.planResult(await this.ownedPlan(this.prisma, userId, vehicleId, planId), vehicle.currentOdometerKm);
  }

  async createPlan(userId: string, vehicleId: string, input: CreateMaintenancePlanDto): Promise<MaintenancePlanResult> {
    const values = this.planValues(input);
    const result = await this.prisma.$transaction(async (tx) => {
      await this.lockVehicle(tx, vehicleId);
      const vehicle = await this.vehicle(tx, userId, vehicleId, true);
      const row = await tx.maintenancePlan.create({
        data: { userId, vehicleId, ...values },
        include: planInclude,
      });
      return { row, currentOdometerKm: vehicle.currentOdometerKm };
    });
    return this.planResult(result.row, result.currentOdometerKm);
  }

  async updatePlan(
    userId: string,
    vehicleId: string,
    planId: string,
    input: UpdateMaintenancePlanDto,
  ): Promise<MaintenancePlanResult> {
    const row = await this.prisma.$transaction(async (tx) => {
      await this.lockVehicle(tx, vehicleId);
      await this.vehicle(tx, userId, vehicleId, true);
      const current = await this.ownedPlan(tx, userId, vehicleId, planId);
      if (current.status === 'COMPLETED' || current.completionHistoryId)
        throw new BadRequestException('A completed maintenance plan cannot be edited.');
      const dueDate = input.dueDate === undefined ? dateOnly(current.dueDate) : input.dueDate;
      const dueOdometerKm = input.dueOdometerKm === undefined ? current.dueOdometerKm : input.dueOdometerKm;
      this.validateDue(dueDate, dueOdometerKm);
      return tx.maintenancePlan.update({
        where: { id: current.id },
        data: {
          ...(input.title === undefined ? {} : { title: this.requiredText(input.title, 150, 'title') }),
          ...(input.dueDate === undefined ? {} : { dueDate: parseDateOnly(input.dueDate) }),
          ...(input.dueOdometerKm === undefined ? {} : { dueOdometerKm }),
          ...(input.notes === undefined ? {} : { notes: this.optionalText(input.notes, 1000) }),
        },
        include: planInclude,
      });
    });
    const vehicle = await this.vehicle(this.prisma, userId, vehicleId, false);
    return this.planResult(row, vehicle.currentOdometerKm);
  }

  async archivePlan(userId: string, vehicleId: string, planId: string): Promise<MaintenancePlanResult> {
    await this.prisma.$transaction(async (tx) => {
      await this.lockVehicle(tx, vehicleId);
      await this.vehicle(tx, userId, vehicleId, true);
      const current = await this.ownedPlan(tx, userId, vehicleId, planId);
      if (current.status !== 'ARCHIVED')
        await tx.maintenancePlan.update({
          where: { id: current.id },
          data: { status: 'ARCHIVED', archivedAt: new Date() },
        });
    });
    return this.getPlan(userId, vehicleId, planId);
  }

  async restorePlan(userId: string, vehicleId: string, planId: string): Promise<MaintenancePlanResult> {
    await this.prisma.$transaction(async (tx) => {
      await this.lockVehicle(tx, vehicleId);
      await this.vehicle(tx, userId, vehicleId, true);
      const current = await this.ownedPlan(tx, userId, vehicleId, planId);
      if (current.status === 'ARCHIVED')
        await tx.maintenancePlan.update({
          where: { id: current.id },
          data: { status: current.completionHistoryId ? 'COMPLETED' : 'ACTIVE', archivedAt: null },
        });
    });
    return this.getPlan(userId, vehicleId, planId);
  }

  async completePlan(
    userId: string,
    vehicleId: string,
    planId: string,
    input: CompleteMaintenancePlanDto,
  ): Promise<MaintenanceCompletionResult> {
    const result = await this.prisma.$transaction(async (tx) => {
      await this.lockVehicle(tx, vehicleId);
      const vehicle = await this.vehicle(tx, userId, vehicleId, true);
      const current = await this.ownedPlan(tx, userId, vehicleId, planId);
      if (current.completionHistory) {
        if (current.status === 'ACTIVE') throw new ConflictException('Maintenance plan completion is inconsistent.');
        return {
          plan: this.planResult(current, vehicle.currentOdometerKm),
          history: this.historyResult(current.completionHistory),
        };
      }
      if (current.status !== 'ACTIVE')
        throw new BadRequestException('Only an active maintenance plan can be completed.');
      const history = await tx.maintenanceHistory.create({
        data: {
          userId,
          vehicleId,
          title: current.title,
          category: this.requiredText(input.category, 100, 'category'),
          serviceDate: this.requiredDate(input.serviceDate),
          odometerKm: input.odometerKm ?? null,
          totalCostVnd: this.cost(input.totalCostVnd),
          workshop: this.optionalText(input.workshop, 200),
          notes: input.notes === undefined ? current.notes : this.optionalText(input.notes, 1000),
        },
        include: historyInclude,
      });
      await this.raiseOdometer(tx, userId, vehicleId, input.odometerKm);
      const completed = await tx.maintenancePlan.update({
        where: { id: current.id },
        data: { status: 'COMPLETED', completedAt: new Date(), completionHistoryId: history.id },
        include: planInclude,
      });
      const linkedHistory = await tx.maintenanceHistory.findFirst({
        where: { id: history.id, userId, vehicleId },
        include: historyInclude,
      });
      if (!linkedHistory) throw new ConflictException('Maintenance completion link was not persisted.');
      const updatedVehicle = await this.vehicle(tx, userId, vehicleId, true);
      return {
        plan: this.planResult(completed, updatedVehicle.currentOdometerKm),
        history: this.historyResult(linkedHistory),
      };
    });
    return result;
  }

  async summary(userId: string, vehicleId: string): Promise<MaintenanceSummary> {
    const vehicle = await this.vehicle(this.prisma, userId, vehicleId, false);
    const [histories, plans] = await this.prisma.$transaction([
      this.prisma.maintenanceHistory.findMany({
        where: { userId, vehicleId, status: 'ACTIVE' },
        orderBy: [{ serviceDate: 'desc' }, { id: 'desc' }],
        select: { serviceDate: true, totalCostVnd: true },
      }),
      this.prisma.maintenancePlan.findMany({ where: { userId, vehicleId, status: 'ACTIVE' }, include: planInclude }),
    ]);
    const due = plans.map((plan) =>
      maintenanceDueStatus(
        { dueDate: dateOnly(plan.dueDate), dueOdometerKm: plan.dueOdometerKm },
        vehicle.currentOdometerKm,
      ),
    );
    const total = histories.reduce((sum, row) => sum + (row.totalCostVnd ?? 0n), 0n);
    return {
      activeHistoryCount: histories.length,
      activePlanCount: plans.length,
      duePlanCount: due.filter((status) => status === 'DUE').length,
      dueSoonPlanCount: due.filter((status) => status === 'DUE_SOON').length,
      totalCostVnd: total.toString(),
      unknownCostHistoryCount: histories.filter((row) => row.totalCostVnd === null).length,
      latestServiceDate: histories[0] ? dateOnly(histories[0].serviceDate) : null,
    };
  }

  private historyValues(input: CreateMaintenanceHistoryDto) {
    return {
      title: this.requiredText(input.title, 150, 'title'),
      category: this.requiredText(input.category, 100, 'category'),
      serviceDate: this.requiredDate(input.serviceDate),
      odometerKm: input.odometerKm ?? null,
      totalCostVnd: this.cost(input.totalCostVnd),
      workshop: this.optionalText(input.workshop, 200),
      notes: this.optionalText(input.notes, 1000),
    };
  }

  private planValues(input: CreateMaintenancePlanDto) {
    this.validateDue(input.dueDate ?? null, input.dueOdometerKm ?? null);
    return {
      title: this.requiredText(input.title, 150, 'title'),
      dueDate: parseDateOnly(input.dueDate),
      dueOdometerKm: input.dueOdometerKm ?? null,
      notes: this.optionalText(input.notes, 1000),
    };
  }

  private validateDue(dueDate: string | null, dueOdometerKm: number | null) {
    if (dueDate === null && dueOdometerKm === null)
      throw new BadRequestException('A due date or odometer threshold is required.');
    try {
      parseDateOnly(dueDate);
    } catch {
      throw new BadRequestException('Due date must be a valid YYYY-MM-DD calendar date.');
    }
  }

  private requiredDate(value: string | null | undefined) {
    if (!value) throw new BadRequestException('A valid calendar date is required.');
    try {
      return parseDateOnly(value)!;
    } catch {
      throw new BadRequestException('Dates must be valid YYYY-MM-DD calendar dates.');
    }
  }

  private requiredText(value: string, maxLength: number, field: string) {
    const trimmed = value?.trim();
    if (!trimmed || trimmed.length > maxLength) throw new BadRequestException(`${field} is invalid.`);
    return trimmed;
  }

  private optionalText(value: string | null | undefined, maxLength: number) {
    if (value === undefined) return null;
    if (value === null) return null;
    const trimmed = value.trim();
    return trimmed
      ? trimmed.length <= maxLength
        ? trimmed
        : (() => {
            throw new BadRequestException('Text is too long.');
          })()
      : null;
  }

  private cost(value: string | null | undefined) {
    if (value === undefined || value === null || value === '') return null;
    if (!/^(?:0|[1-9]\d{0,15})$/.test(value))
      throw new BadRequestException('Cost must be a non-negative integer VND amount.');
    return BigInt(value);
  }

  private async lockVehicle(tx: Tx, vehicleId: string) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${vehicleId}))`;
  }

  private async raiseOdometer(tx: Tx, userId: string, vehicleId: string, value: number | null | undefined) {
    if (value === null || value === undefined) return;
    await tx.vehicle.updateMany({
      where: { id: vehicleId, userId, OR: [{ currentOdometerKm: null }, { currentOdometerKm: { lt: value } }] },
      data: { currentOdometerKm: value },
    });
  }

  private async vehicle(tx: Tx | PrismaService, userId: string, vehicleId: string, active: boolean) {
    const row = await tx.vehicle.findFirst({
      where: { id: vehicleId, userId, ...(active ? { status: 'ACTIVE' } : {}) },
      select: { id: true, currentOdometerKm: true },
    });
    if (!row) throw new NotFoundException('Vehicle not found.');
    return row;
  }

  private async ownedHistory(tx: Tx | PrismaService, userId: string, vehicleId: string, historyId: string) {
    const row = await tx.maintenanceHistory.findFirst({
      where: { id: historyId, userId, vehicleId },
      include: historyInclude,
    });
    if (!row) throw new NotFoundException('Maintenance history not found.');
    return row;
  }

  private async ownedPlan(tx: Tx | PrismaService, userId: string, vehicleId: string, planId: string) {
    const row = await tx.maintenancePlan.findFirst({ where: { id: planId, userId, vehicleId }, include: planInclude });
    if (!row) throw new NotFoundException('Maintenance plan not found.');
    return row;
  }

  private historyResult(row: Awaited<ReturnType<MaintenanceService['ownedHistory']>>): MaintenanceHistoryResult {
    return {
      id: row.id,
      vehicleId: row.vehicleId,
      title: row.title,
      category: row.category,
      serviceDate: dateOnly(row.serviceDate)!,
      odometerKm: row.odometerKm,
      totalCostVnd: row.totalCostVnd?.toString() ?? null,
      workshop: row.workshop,
      notes: row.notes,
      status: row.status,
      archivedAt: row.archivedAt?.toISOString() ?? null,
      completedPlanId: row.completedPlan?.id ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private planResult(
    row: Awaited<ReturnType<MaintenanceService['ownedPlan']>>,
    currentOdometerKm: number | null,
  ): MaintenancePlanResult {
    return {
      id: row.id,
      vehicleId: row.vehicleId,
      title: row.title,
      dueDate: dateOnly(row.dueDate),
      dueOdometerKm: row.dueOdometerKm,
      notes: row.notes,
      status: row.status,
      dueStatus:
        row.status === 'ACTIVE'
          ? maintenanceDueStatus(
              { dueDate: dateOnly(row.dueDate), dueOdometerKm: row.dueOdometerKm },
              currentOdometerKm,
            )
          : 'NOT_DUE',
      currentOdometerKm,
      completedAt: row.completedAt?.toISOString() ?? null,
      completionHistoryId: row.completionHistoryId,
      archivedAt: row.archivedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
