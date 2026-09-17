import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { Job, Queue, QueueEvents, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/database/prisma.service.js';
import { addDays, vietnamToday } from '../src/vehicle-documents/vehicle-document-date.js';
import {
  VEHICLE_DOCUMENT_REMINDER_JOB,
  VehicleDocumentReminderQueue,
} from '../src/vehicle-documents/vehicle-document-reminder.queue.js';
import { VehicleDocumentReminderScheduler } from '../src/vehicle-documents/vehicle-document-reminder.scheduler.js';
import { VehicleDocumentReminderWorker } from '../src/vehicle-documents/vehicle-document-reminder.worker.js';
import {
  VEHICLE_MONITORING_JOB,
  VehicleMonitoringQueue,
  type VehicleMonitoringJobData,
} from '../src/vehicle-monitoring/vehicle-monitoring.queue.js';
import { VehicleMonitoringWorker } from '../src/vehicle-monitoring/vehicle-monitoring.worker.js';

const connection = { host: process.env['REDIS_HOST'] ?? '127.0.0.1', port: Number(process.env['REDIS_PORT'] ?? 6379) };
const runtimeEmail = 'runtime-queues@example.test';
const queues: Queue[] = [];
const events: QueueEvents[] = [];
const workers: Worker[] = [];

async function closeQueueResources(): Promise<void> {
  await Promise.all(workers.splice(0).map((worker) => worker.close()));
  await Promise.all(events.splice(0).map((item) => item.close()));
  for (const queue of queues.splice(0)) {
    await queue.obliterate({ force: true }).catch(() => undefined);
    await queue.close();
  }
}

describe('real Redis and BullMQ runtime', () => {
  let prisma: PrismaService;
  let userId = '';
  let vehicleId = '';

  beforeAll(async () => {
    prisma = new PrismaService(new ConfigService({ DATABASE_URL: process.env['DATABASE_URL'] }));
    await prisma.$connect();
    const existing = await prisma.user.findUnique({ where: { email: runtimeEmail } });
    if (existing) {
      await prisma.vehicle.deleteMany({ where: { userId: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
    }
    const user = await prisma.user.create({
      data: { email: runtimeEmail, passwordHash: 'synthetic-runtime-hash-never-a-real-password' },
    });
    userId = user.id;
    const vehicle = await prisma.vehicle.create({
      data: {
        userId,
        displayName: 'Synthetic queue vehicle',
        licensePlate: '51K-990.01',
        normalizedLicensePlate: '51K99001',
        vehicleType: 'CAR',
        isPrimary: true,
      },
    });
    vehicleId = vehicle.id;
  });

  afterAll(async () => {
    await closeQueueResources();
    if (userId) {
      await prisma.vehicle.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    await prisma.$disconnect();
  });

  it('connects, reads/writes, fails closed, and reconnects to live Redis', async () => {
    const key = `tranhanh:runtime:${randomUUID()}`;
    const first = new Redis({ ...connection, lazyConnect: true, maxRetriesPerRequest: 1 });
    await first.connect();
    expect(await first.ping()).toBe('PONG');
    await first.set(key, 'ok', 'EX', 30);
    expect(await first.get(key)).toBe('ok');
    first.disconnect(false);
    await expect(first.ping()).rejects.toThrow();
    const second = new Redis({ ...connection, lazyConnect: true, maxRetriesPerRequest: 1 });
    await second.connect();
    expect(await second.get(key)).toBe('ok');
    await second.del(key);
    await second.quit();
  });

  it('runs delayed, deduplicated, retried, completed, failed, privacy-safe BullMQ jobs', async () => {
    const name = `runtime-generic-${randomUUID()}`;
    const queue = new Queue(name, { connection });
    const queueEvents = new QueueEvents(name, { connection });
    queues.push(queue);
    events.push(queueEvents);
    await Promise.all([queue.waitUntilReady(), queueEvents.waitUntilReady()]);
    const attempts = new Map<string, number>();
    const seen: string[] = [];
    const worker = new Worker(
      name,
      async (job: Job<{ entityId: string }>) => {
        expect(Object.keys(job.data)).toEqual(['entityId']);
        expect(JSON.stringify(job.data)).not.toMatch(/plate|email|password|cookie|token/i);
        const count = (attempts.get(job.id ?? '') ?? 0) + 1;
        attempts.set(job.id ?? '', count);
        if (job.name === 'retry' && count < 3) throw new Error('synthetic transient failure');
        if (job.name === 'permanent-failure') throw new Error('synthetic permanent failure');
        seen.push(job.name);
        return job.data.entityId;
      },
      { connection },
    );
    workers.push(worker);
    await worker.waitUntilReady();

    const started = Date.now();
    const delayed = await queue.add('delayed', { entityId: 'opaque-delayed' }, { delay: 100, jobId: 'delayed-job' });
    await delayed.waitUntilFinished(queueEvents, 10_000);
    expect(Date.now() - started).toBeGreaterThanOrEqual(70);

    const duplicateA = await queue.add('dedupe', { entityId: 'opaque-dedupe' }, { jobId: 'deterministic-job' });
    const duplicateB = await queue.add('dedupe', { entityId: 'opaque-dedupe' }, { jobId: 'deterministic-job' });
    expect(duplicateA.id).toBe(duplicateB.id);
    await duplicateA.waitUntilFinished(queueEvents, 10_000);
    expect(seen.filter((nameValue) => nameValue === 'dedupe')).toHaveLength(1);

    const retry = await queue.add(
      'retry',
      { entityId: 'opaque-retry' },
      { attempts: 3, backoff: { type: 'fixed', delay: 20 }, jobId: 'retry-job' },
    );
    await retry.waitUntilFinished(queueEvents, 10_000);
    expect(attempts.get('retry-job')).toBe(3);

    const failed = await queue.add(
      'permanent-failure',
      { entityId: 'opaque-failure' },
      { attempts: 2, backoff: { type: 'fixed', delay: 20 }, jobId: 'failed-job' },
    );
    await expect(failed.waitUntilFinished(queueEvents, 10_000)).rejects.toThrow('synthetic permanent failure');
    expect(await failed.getState()).toBe('failed');
    expect(attempts.get('failed-job')).toBe(2);
  });

  it('executes automated monitoring through BullMQ and records snapshots, changes, and retries', async () => {
    const monitoring = await prisma.vehicleMonitoring.create({
      data: {
        userId,
        vehicleId,
        monitoringType: 'TRAFFIC_FINE',
        providerKey: 'runtime-fake-automated',
        capability: 'AUTOMATED',
        status: 'ENABLED_AND_ACTIVE',
        isEnabled: true,
        automationApprovedAt: new Date(),
        nextEligibleCheckAt: new Date(0),
      },
    });
    const name = `runtime-monitoring-${randomUUID()}`;
    const rawQueue = new Queue<VehicleMonitoringJobData>(name, { connection });
    const queueEvents = new QueueEvents(name, { connection });
    queues.push(rawQueue);
    events.push(queueEvents);
    await Promise.all([rawQueue.waitUntilReady(), queueEvents.waitUntilReady()]);

    let fingerprints = ['runtime-fingerprint-a'];
    let transientFailures = 0;
    const trafficFines = {
      providerInfo: () => ({
        key: 'runtime-fake-automated',
        name: 'Runtime fake provider',
        official: false,
        url: 'https://example.test/runtime-provider',
        automation: 'AUTOMATION_ALLOWED',
        status: 'ACTIVE',
        geographicCoverage: 'Synthetic',
        supportedVehicleTypes: ['CAR'],
        requiresCaptcha: false,
        requiresAuthentication: false,
        freshness: 'Synthetic runtime data',
      }),
      lookup: async () => {
        if (transientFailures > 0) {
          transientFailures -= 1;
          throw new Error('synthetic provider failure');
        }
        return {
          outcome: 'RESULTS_AVAILABLE',
          results: fingerprints.map((fingerprint) => ({ fingerprint })),
          retrievedAt: new Date().toISOString(),
        };
      },
    };
    const reschedule = { enqueue: async () => undefined };
    const handler = new VehicleMonitoringWorker(prisma, trafficFines as never, reschedule as never);
    const worker = new Worker<VehicleMonitoringJobData>(name, async (job) => handler.handle(job.data), { connection });
    workers.push(worker);
    await worker.waitUntilReady();

    const queueAdapter = new VehicleMonitoringQueue(rawQueue);
    await rawQueue.pause();
    await queueAdapter.enqueue(monitoring.id);
    const first = (await rawQueue.getJobs(['waiting', 'delayed']))[0];
    expect(first).toBeTruthy();
    await rawQueue.resume();
    expect(first.name).toBe(VEHICLE_MONITORING_JOB);
    expect(first.data).toEqual({ monitoringId: monitoring.id });
    expect(JSON.stringify(first.data)).not.toContain('51K-990.01');
    await first.waitUntilFinished(queueEvents, 10_000);
    let runs = await prisma.vehicleMonitoringRun.findMany({
      where: { monitoringId: monitoring.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(runs.at(-1)).toMatchObject({ outcome: 'CHANGED', changeDetected: true, normalizedResultCount: 1 });
    expect(await prisma.vehicleMonitoringSnapshot.findUnique({ where: { monitoringId: monitoring.id } })).toMatchObject(
      {
        fingerprints: ['runtime-fingerprint-a'],
        resultCount: 1,
      },
    );

    await prisma.vehicleMonitoring.update({ where: { id: monitoring.id }, data: { nextEligibleCheckAt: new Date(0) } });
    const same = await rawQueue.add(
      VEHICLE_MONITORING_JOB,
      { monitoringId: monitoring.id },
      { jobId: 'monitoring-same' },
    );
    await same.waitUntilFinished(queueEvents, 10_000);
    runs = await prisma.vehicleMonitoringRun.findMany({
      where: { monitoringId: monitoring.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(runs.at(-1)).toMatchObject({ outcome: 'NO_CHANGE', changeDetected: false });

    fingerprints = ['runtime-fingerprint-a', 'runtime-fingerprint-b'];
    await prisma.vehicleMonitoring.update({ where: { id: monitoring.id }, data: { nextEligibleCheckAt: new Date(0) } });
    const changed = await rawQueue.add(
      VEHICLE_MONITORING_JOB,
      { monitoringId: monitoring.id },
      { jobId: 'monitoring-changed' },
    );
    await changed.waitUntilFinished(queueEvents, 10_000);
    runs = await prisma.vehicleMonitoringRun.findMany({
      where: { monitoringId: monitoring.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(runs.at(-1)).toMatchObject({ outcome: 'CHANGED', changeDetected: true, normalizedResultCount: 2 });

    transientFailures = 1;
    await prisma.vehicleMonitoring.update({ where: { id: monitoring.id }, data: { nextEligibleCheckAt: new Date(0) } });
    const retry = await rawQueue.add(
      VEHICLE_MONITORING_JOB,
      { monitoringId: monitoring.id },
      { attempts: 2, backoff: { type: 'fixed', delay: 20 }, jobId: 'monitoring-retry' },
    );
    await retry.waitUntilFinished(queueEvents, 10_000);
    expect((attemptsFromJob(await rawQueue.getJob('monitoring-retry')) ?? 0) >= 2).toBe(true);
    runs = await prisma.vehicleMonitoringRun.findMany({
      where: { monitoringId: monitoring.id },
      orderBy: { createdAt: 'asc' },
    });
    expect(runs.slice(-2).map((run) => run.outcome)).toEqual(['FAILED', 'NO_CHANGE']);
  });

  it('schedules, deduplicates, invalidates, archives, and restores document reminders', async () => {
    const expiry = addDays(vietnamToday(), 30);
    const document = await prisma.vehicleDocument.create({
      data: {
        userId,
        vehicleId,
        type: 'PERIODIC_INSPECTION',
        displayName: 'Synthetic runtime inspection',
        referenceNumber: 'SYNTHETIC-QUEUE-ONLY',
        expiresAt: new Date(`${expiry}T00:00:00Z`),
        reminders: { create: [30, 15, 7, 1].map((daysBefore) => ({ daysBefore, enabled: true })) },
      },
      include: { reminders: true },
    });
    const name = `runtime-documents-${randomUUID()}`;
    const rawQueue = new Queue(name, { connection });
    const queueEvents = new QueueEvents(name, { connection });
    queues.push(rawQueue);
    events.push(queueEvents);
    await Promise.all([rawQueue.waitUntilReady(), queueEvents.waitUntilReady()]);
    const queueAdapter = new VehicleDocumentReminderQueue(rawQueue as never);
    const scheduler = new VehicleDocumentReminderScheduler(prisma, queueAdapter);
    const oldNodeEnv = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'development';
    await scheduler.reconcile(document.id);
    await scheduler.reconcile(document.id);
    process.env['NODE_ENV'] = oldNodeEnv;
    const scheduled = await rawQueue.getJobs(['waiting', 'delayed']);
    expect(scheduled).toHaveLength(4);
    expect(scheduled.every((job) => Object.keys(job.data).join(',') === 'reminderId')).toBe(true);
    expect(JSON.stringify(scheduled.map((job) => job.data))).not.toMatch(/plate|reference|email/i);

    const handler = new VehicleDocumentReminderWorker(prisma);
    const worker = new Worker(
      name,
      async (job) => {
        expect(job.name).toBe(VEHICLE_DOCUMENT_REMINDER_JOB);
        await handler.handle(job.data);
      },
      { connection, concurrency: 1 },
    );
    workers.push(worker);
    await worker.waitUntilReady();
    const reminder30 = document.reminders.find((reminder) => reminder.daysBefore === 30)!;
    const dueJob = await rawQueue.getJob(`document-reminder-${reminder30.id}-${expiry}`);
    expect(dueJob).toBeTruthy();
    await dueJob!.waitUntilFinished(queueEvents, 10_000);
    expect(await prisma.vehicleDocumentReminderRun.count({ where: { reminderId: reminder30.id } })).toBe(1);

    const movedExpiry = addDays(vietnamToday(), 60);
    await prisma.vehicleDocument.update({
      where: { id: document.id },
      data: { expiresAt: new Date(`${movedExpiry}T00:00:00Z`) },
    });
    process.env['NODE_ENV'] = 'development';
    await scheduler.reconcile(document.id);
    process.env['NODE_ENV'] = oldNodeEnv;
    await handler.handle({ reminderId: reminder30.id });
    expect(await prisma.vehicleDocumentReminderRun.count({ where: { reminderId: reminder30.id } })).toBe(1);

    await prisma.vehicleDocument.update({
      where: { id: document.id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
        reminders: { updateMany: { where: {}, data: { scheduledFor: null, scheduledForExpiry: null } } },
      },
    });
    await handler.handle({ reminderId: reminder30.id });
    expect(await prisma.vehicleDocumentReminderRun.count({ where: { reminderId: reminder30.id } })).toBe(1);

    await prisma.vehicleDocument.update({ where: { id: document.id }, data: { status: 'ACTIVE', archivedAt: null } });
    process.env['NODE_ENV'] = 'development';
    await scheduler.reconcile(document.id);
    process.env['NODE_ENV'] = oldNodeEnv;
    const restored = await prisma.vehicleDocumentReminder.findUniqueOrThrow({ where: { id: reminder30.id } });
    expect(restored.scheduledForExpiry?.toISOString().slice(0, 10)).toBe(movedExpiry);
  });
});

function attemptsFromJob(job: Job | undefined): number | undefined {
  return job?.attemptsMade;
}
