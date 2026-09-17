import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { JobsOptions, Queue } from 'bullmq';
export const VEHICLE_MONITORING_QUEUE = 'vehicle-monitoring';
export const VEHICLE_MONITORING_JOB = 'vehicle-monitoring-check';
export interface VehicleMonitoringJobData {
  monitoringId: string;
}
export const monitoringJobOptions: JobsOptions = {
  attempts: 4,
  backoff: { type: 'exponential', delay: 60_000 },
  removeOnComplete: 100,
  removeOnFail: 500,
};
@Injectable()
export class VehicleMonitoringQueue {
  constructor(@InjectQueue(VEHICLE_MONITORING_QUEUE) private readonly queue: Queue<VehicleMonitoringJobData>) {}
  async enqueue(monitoringId: string, dueAt = new Date()): Promise<void> {
    const due = Math.max(dueAt.getTime(), Date.now());
    await this.queue.add(
      VEHICLE_MONITORING_JOB,
      { monitoringId },
      {
        ...monitoringJobOptions,
        delay: Math.max(0, due - Date.now()),
        jobId: `monitoring-${monitoringId}-${due}`,
      },
    );
  }
}
