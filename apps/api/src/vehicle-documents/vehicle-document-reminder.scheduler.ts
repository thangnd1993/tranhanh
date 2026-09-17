import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { addDays, dateOnly, vietnamStartOfDay, vietnamToday } from './vehicle-document-date.js';
import { VehicleDocumentReminderQueue } from './vehicle-document-reminder.queue.js';
@Injectable()
export class VehicleDocumentReminderScheduler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: VehicleDocumentReminderQueue,
  ) {}
  async reconcileVehicle(userId: string, vehicleId: string): Promise<void> {
    const delegate = (this.prisma as Partial<PrismaService>).vehicleDocument;
    if (!delegate) return;
    const documents = await delegate.findMany({
      where: { userId, vehicleId, status: 'ACTIVE' },
      select: { id: true },
    });
    await Promise.all(documents.map(({ id }) => this.reconcile(id)));
  }

  async reconcile(documentId: string): Promise<void> {
    const document = await this.prisma.vehicleDocument.findUnique({
      where: { id: documentId },
      include: { vehicle: { select: { status: true } }, reminders: true },
    });
    const expiry = dateOnly(document?.expiresAt);
    const active = document?.status === 'ACTIVE' && document.vehicle.status === 'ACTIVE' && Boolean(expiry);
    await Promise.all(
      (document?.reminders ?? []).map(async (reminder) => {
        const dueOn = expiry ? addDays(expiry, -reminder.daysBefore) : null;
        const today = vietnamToday();
        const schedulable =
          active && reminder.enabled && dueOn !== null && today <= expiry! && dueOn >= addDays(today, -7);
        const scheduledFor = schedulable ? vietnamStartOfDay(dueOn! < today ? today : dueOn!) : null;
        await this.prisma.vehicleDocumentReminder.update({
          where: { id: reminder.id },
          data: { scheduledFor, scheduledForExpiry: scheduledFor ? document!.expiresAt : null },
        });
        if (scheduledFor) await this.queue.enqueue(reminder.id, expiry!, scheduledFor).catch(() => undefined);
      }),
    );
  }
}
