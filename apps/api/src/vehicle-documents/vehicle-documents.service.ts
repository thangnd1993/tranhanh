import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { VehicleDocumentListResult, VehicleDocumentReminderOffset, VehicleDocumentResult } from '@tranhanh/shared';
import { vehicleDocumentReminderOffsets } from '@tranhanh/shared';
import { PrismaService } from '../database/prisma.service.js';
import { dateOnly, expiryDetails, parseDateOnly } from './vehicle-document-date.js';
import { VehicleDocumentReminderScheduler } from './vehicle-document-reminder.scheduler.js';
import type { CreateVehicleDocumentDto, UpdateVehicleDocumentDto } from './vehicle-documents.dto.js';
const include = { reminders: { orderBy: { daysBefore: 'desc' as const } } };
type DocumentRow = Awaited<ReturnType<VehicleDocumentsService['owned']>>;
@Injectable()
export class VehicleDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduler: VehicleDocumentReminderScheduler,
  ) {}
  async list(
    userId: string,
    vehicleId: string,
    status: 'ACTIVE' | 'ARCHIVED' | 'ALL',
  ): Promise<VehicleDocumentListResult> {
    await this.vehicle(userId, vehicleId, false);
    const rows = await this.prisma.vehicleDocument.findMany({
      where: { userId, vehicleId, ...(status === 'ALL' ? {} : { status }) },
      include,
      orderBy: [{ expiresAt: 'asc' }, { createdAt: 'desc' }],
    });
    const items = rows
      .map((row) => this.result(row))
      .sort((a, b) => this.rank(a) - this.rank(b) || (a.expiresAt ?? '9999').localeCompare(b.expiresAt ?? '9999'));
    return {
      items,
      attention: {
        expired: items.filter((item) => item.expiryState === 'EXPIRED').length,
        expiringSoon: items.filter((item) => item.expiryState === 'EXPIRING_SOON').length,
        nextExpiry: items.find((item) => item.daysUntilExpiry !== null && item.daysUntilExpiry >= 0)?.expiresAt ?? null,
      },
    };
  }
  async get(userId: string, vehicleId: string, documentId: string): Promise<VehicleDocumentResult> {
    return this.result(await this.owned(userId, vehicleId, documentId));
  }
  async create(userId: string, vehicleId: string, input: CreateVehicleDocumentDto): Promise<VehicleDocumentResult> {
    await this.vehicle(userId, vehicleId, true);
    const dates = this.dates(input);
    this.validateDates(dates.issuedAt, dates.effectiveFrom, dates.expiresAt);
    const enabled = new Set(input.reminderDaysBefore ?? []);
    const row = await this.prisma.vehicleDocument.create({
      data: {
        userId,
        vehicleId,
        type: input.type,
        displayName: input.displayName,
        referenceNumber: input.referenceNumber,
        issuer: input.issuer,
        ...dates,
        notes: input.notes,
        reminders: {
          create: vehicleDocumentReminderOffsets.map((daysBefore) => ({
            daysBefore,
            enabled: enabled.has(daysBefore),
          })),
        },
      },
      include,
    });
    await this.scheduler.reconcile(row.id);
    return this.get(userId, vehicleId, row.id);
  }
  async update(
    userId: string,
    vehicleId: string,
    documentId: string,
    input: UpdateVehicleDocumentDto,
  ): Promise<VehicleDocumentResult> {
    const current = await this.owned(userId, vehicleId, documentId);
    const dates = this.dates(input);
    const issuedAt = input.issuedAt === undefined ? current.issuedAt : dates.issuedAt;
    const effectiveFrom = input.effectiveFrom === undefined ? current.effectiveFrom : dates.effectiveFrom;
    const expiresAt = input.expiresAt === undefined ? current.expiresAt : dates.expiresAt;
    this.validateDates(issuedAt, effectiveFrom, expiresAt);
    await this.prisma.$transaction(async (tx) => {
      await tx.vehicleDocument.update({
        where: { id: current.id },
        data: {
          ...(input.type === undefined ? {} : { type: input.type }),
          ...(input.displayName === undefined ? {} : { displayName: input.displayName }),
          ...(input.referenceNumber === undefined ? {} : { referenceNumber: input.referenceNumber }),
          ...(input.issuer === undefined ? {} : { issuer: input.issuer }),
          ...(input.issuedAt === undefined ? {} : { issuedAt }),
          ...(input.effectiveFrom === undefined ? {} : { effectiveFrom }),
          ...(input.expiresAt === undefined ? {} : { expiresAt }),
          ...(input.notes === undefined ? {} : { notes: input.notes }),
        },
      });
      if (input.reminderDaysBefore)
        await Promise.all(
          vehicleDocumentReminderOffsets.map((daysBefore) =>
            tx.vehicleDocumentReminder.update({
              where: { documentId_daysBefore: { documentId, daysBefore } },
              data: { enabled: input.reminderDaysBefore!.includes(daysBefore) },
            }),
          ),
        );
    });
    await this.scheduler.reconcile(documentId);
    return this.get(userId, vehicleId, documentId);
  }
  async archive(userId: string, vehicleId: string, documentId: string): Promise<VehicleDocumentResult> {
    const current = await this.owned(userId, vehicleId, documentId);
    await this.prisma.vehicleDocument.update({
      where: { id: current.id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
        reminders: { updateMany: { where: {}, data: { scheduledFor: null, scheduledForExpiry: null } } },
      },
    });
    return this.get(userId, vehicleId, documentId);
  }
  async restore(userId: string, vehicleId: string, documentId: string): Promise<VehicleDocumentResult> {
    const current = await this.owned(userId, vehicleId, documentId);
    await this.prisma.vehicleDocument.update({
      where: { id: current.id },
      data: { status: 'ACTIVE', archivedAt: null },
    });
    await this.scheduler.reconcile(documentId);
    return this.get(userId, vehicleId, documentId);
  }
  async reminders(
    userId: string,
    vehicleId: string,
    documentId: string,
    enabledDaysBefore: VehicleDocumentReminderOffset[],
  ): Promise<VehicleDocumentResult> {
    await this.owned(userId, vehicleId, documentId);
    await this.prisma.$transaction(
      vehicleDocumentReminderOffsets.map((daysBefore) =>
        this.prisma.vehicleDocumentReminder.update({
          where: { documentId_daysBefore: { documentId, daysBefore } },
          data: { enabled: enabledDaysBefore.includes(daysBefore) },
        }),
      ),
    );
    await this.scheduler.reconcile(documentId);
    return this.get(userId, vehicleId, documentId);
  }
  private async vehicle(userId: string, vehicleId: string, requireActive: boolean) {
    const row = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, userId, ...(requireActive ? { status: 'ACTIVE' } : {}) },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('Vehicle not found.');
    return row;
  }
  private async owned(userId: string, vehicleId: string, documentId: string) {
    const row = await this.prisma.vehicleDocument.findFirst({ where: { id: documentId, userId, vehicleId }, include });
    if (!row) throw new NotFoundException('Vehicle document not found.');
    return row;
  }
  private dates(input: Partial<CreateVehicleDocumentDto>) {
    try {
      return {
        issuedAt: parseDateOnly(input.issuedAt),
        effectiveFrom: parseDateOnly(input.effectiveFrom),
        expiresAt: parseDateOnly(input.expiresAt),
      };
    } catch {
      throw new BadRequestException('Dates must be valid YYYY-MM-DD calendar dates.');
    }
  }
  private validateDates(issuedAt: Date | null, effectiveFrom: Date | null, expiresAt: Date | null) {
    if (expiresAt && ((issuedAt && issuedAt > expiresAt) || (effectiveFrom && effectiveFrom > expiresAt)))
      throw new BadRequestException('Issue and effective dates cannot be after expiry.');
  }
  private rank(item: VehicleDocumentResult) {
    return item.expiryState === 'EXPIRED'
      ? 0
      : item.expiryState === 'EXPIRING_SOON'
        ? 1
        : item.expiryState === 'VALID'
          ? 2
          : 3;
  }
  private result(row: DocumentRow): VehicleDocumentResult {
    const expiry = expiryDetails(row.expiresAt);
    return {
      id: row.id,
      vehicleId: row.vehicleId,
      type: row.type,
      displayName: row.displayName,
      referenceNumber: row.referenceNumber,
      issuer: row.issuer,
      issuedAt: dateOnly(row.issuedAt),
      effectiveFrom: dateOnly(row.effectiveFrom),
      expiresAt: dateOnly(row.expiresAt),
      notes: row.notes,
      verificationStatus: row.verificationStatus,
      status: row.status,
      ...expiry,
      reminders: row.reminders.map((reminder) => ({
        id: reminder.id,
        daysBefore: reminder.daysBefore as VehicleDocumentReminderOffset,
        enabled: reminder.enabled,
        scheduledFor: reminder.scheduledFor?.toISOString() ?? null,
        lastTriggeredForExpiry: dateOnly(reminder.lastTriggeredForExpiry),
      })),
      archivedAt: row.archivedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
