import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { addDays, dateOnly, vietnamToday } from './vehicle-document-date.js';
import type { VehicleDocumentReminderJobData } from './vehicle-document-reminder.queue.js';
@Injectable()
export class VehicleDocumentReminderWorker {
  constructor(private readonly prisma: PrismaService) {}
  async handle(data: VehicleDocumentReminderJobData): Promise<void> {
    if (!data || typeof data.reminderId !== 'string' || Object.keys(data).some((key) => key !== 'reminderId'))
      throw new Error('Invalid privacy-safe document reminder payload.');
    const reminder = await this.prisma.vehicleDocumentReminder.findUnique({
      where: { id: data.reminderId },
      include: { document: { include: { vehicle: { select: { status: true } } } } },
    });
    const expiry = dateOnly(reminder?.document.expiresAt);
    if (
      !reminder?.enabled ||
      reminder.document.status !== 'ACTIVE' ||
      reminder.document.vehicle.status !== 'ACTIVE' ||
      !expiry ||
      dateOnly(reminder.scheduledForExpiry) !== expiry
    )
      return;
    const today = vietnamToday();
    const dueOn = addDays(expiry, -reminder.daysBefore);
    if (today < dueOn || dueOn < addDays(today, -7) || today > expiry) return;
    try {
      await this.prisma.$transaction([
        this.prisma.vehicleDocumentReminderRun.create({
          data: {
            reminderId: reminder.id,
            dueOn: new Date(`${dueOn}T00:00:00Z`),
            expiresOn: reminder.document.expiresAt!,
          },
        }),
        this.prisma.vehicleDocumentReminder.update({
          where: { id: reminder.id },
          data: { lastTriggeredForExpiry: reminder.document.expiresAt },
        }),
      ]);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return;
      throw error;
    }
  }
}
