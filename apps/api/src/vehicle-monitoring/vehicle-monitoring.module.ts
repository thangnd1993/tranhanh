import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TrafficFinesModule } from '../traffic-fines/traffic-fines.module.js';
import { PrivateResponseInterceptor } from '../vehicles/private-response.interceptor.js';
import { VehicleMonitoringController } from './vehicle-monitoring.controller.js';
import { VEHICLE_MONITORING_QUEUE, VehicleMonitoringQueue } from './vehicle-monitoring.queue.js';
import { VehicleMonitoringProcessor } from './vehicle-monitoring.processor.js';
import { VehicleMonitoringService } from './vehicle-monitoring.service.js';
import { VehicleMonitoringWorker } from './vehicle-monitoring.worker.js';
@Module({
  imports: [AuthModule, TrafficFinesModule, BullModule.registerQueue({ name: VEHICLE_MONITORING_QUEUE })],
  controllers: [VehicleMonitoringController],
  providers: [
    VehicleMonitoringService,
    VehicleMonitoringQueue,
    VehicleMonitoringWorker,
    PrivateResponseInterceptor,
    ...(process.env['NODE_ENV'] === 'test' ? [] : [VehicleMonitoringProcessor]),
  ],
  exports: [VehicleMonitoringService, VehicleMonitoringWorker],
})
export class VehicleMonitoringModule {}
