import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  VEHICLE_DOCUMENT_REMINDER_JOB,
  VEHICLE_DOCUMENT_REMINDER_QUEUE,
  type VehicleDocumentReminderJobData,
} from './vehicle-document-reminder.queue.js';
import { VehicleDocumentReminderWorker } from './vehicle-document-reminder.worker.js';
@Processor(VEHICLE_DOCUMENT_REMINDER_QUEUE, { concurrency: 4 })
@Injectable()
export class VehicleDocumentReminderProcessor extends WorkerHost {
  constructor(private readonly handler: VehicleDocumentReminderWorker) {
    super();
  }
  async process(job: Job<VehicleDocumentReminderJobData>): Promise<void> {
    if (job.name !== VEHICLE_DOCUMENT_REMINDER_JOB) throw new Error('Unsupported document reminder job.');
    await this.handler.handle(job.data);
  }
}
