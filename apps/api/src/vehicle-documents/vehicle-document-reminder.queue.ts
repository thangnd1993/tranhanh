import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { JobsOptions, Queue } from 'bullmq';
export const VEHICLE_DOCUMENT_REMINDER_QUEUE = 'vehicle-document-reminders';
export const VEHICLE_DOCUMENT_REMINDER_JOB = 'vehicle-document-reminder-due';
export interface VehicleDocumentReminderJobData {
  reminderId: string;
}
export const vehicleDocumentReminderJobOptions: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 60_000 },
  removeOnComplete: 200,
  removeOnFail: 500,
};
@Injectable()
export class VehicleDocumentReminderQueue {
  constructor(
    @InjectQueue(VEHICLE_DOCUMENT_REMINDER_QUEUE) private readonly queue: Queue<VehicleDocumentReminderJobData>,
  ) {}
  async enqueue(reminderId: string, expiry: string, dueAt: Date): Promise<void> {
    if (process.env['NODE_ENV'] === 'test') return;
    await this.queue.add(
      VEHICLE_DOCUMENT_REMINDER_JOB,
      { reminderId },
      {
        ...vehicleDocumentReminderJobOptions,
        delay: Math.max(0, dueAt.getTime() - Date.now()),
        jobId: `document-reminder-${reminderId}-${expiry}`,
      },
    );
  }
}
