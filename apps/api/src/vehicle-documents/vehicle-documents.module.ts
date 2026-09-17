import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrivateResponseInterceptor } from '../vehicles/private-response.interceptor.js';
import { VehicleDocumentReminderProcessor } from './vehicle-document-reminder.processor.js';
import { VEHICLE_DOCUMENT_REMINDER_QUEUE, VehicleDocumentReminderQueue } from './vehicle-document-reminder.queue.js';
import { VehicleDocumentReminderScheduler } from './vehicle-document-reminder.scheduler.js';
import { VehicleDocumentReminderWorker } from './vehicle-document-reminder.worker.js';
import { VehicleDocumentsController } from './vehicle-documents.controller.js';
import { VehicleDocumentsService } from './vehicle-documents.service.js';
@Module({
  imports: [AuthModule, BullModule.registerQueue({ name: VEHICLE_DOCUMENT_REMINDER_QUEUE })],
  controllers: [VehicleDocumentsController],
  providers: [
    VehicleDocumentsService,
    VehicleDocumentReminderQueue,
    VehicleDocumentReminderScheduler,
    VehicleDocumentReminderWorker,
    PrivateResponseInterceptor,
    ...(process.env['NODE_ENV'] === 'test' ? [] : [VehicleDocumentReminderProcessor]),
  ],
  exports: [VehicleDocumentsService, VehicleDocumentReminderScheduler, VehicleDocumentReminderWorker],
})
export class VehicleDocumentsModule {}
