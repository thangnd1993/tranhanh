import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';
import {
  VEHICLE_MONITORING_JOB,
  VEHICLE_MONITORING_QUEUE,
  type VehicleMonitoringJobData,
} from './vehicle-monitoring.queue.js';
import { monitoringWorkerPolicy, VehicleMonitoringWorker } from './vehicle-monitoring.worker.js';

@Processor(VEHICLE_MONITORING_QUEUE, {
  concurrency: monitoringWorkerPolicy.concurrency,
  limiter: { max: 1, duration: monitoringWorkerPolicy.providerMinimumIntervalMs },
})
@Injectable()
export class VehicleMonitoringProcessor extends WorkerHost {
  constructor(private readonly handler: VehicleMonitoringWorker) {
    super();
  }
  async process(job: Job<VehicleMonitoringJobData>): Promise<void> {
    if (job.name !== VEHICLE_MONITORING_JOB) throw new Error('Unsupported monitoring job.');
    await this.handler.handle(job.data);
  }
}
