import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma, PrismaClient } from '../src/generated/prisma/client.js';
const rollback = new Error('rollback');
let client: PrismaClient;
beforeAll(async () => {
  const raw = process.env.TEST_DATABASE_URL;
  if (!raw || process.env.NODE_ENV === 'production') throw new Error('An explicit local test database is required.');
  const url = new URL(raw);
  if (
    url.protocol !== 'postgresql:' ||
    !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) ||
    url.pathname !== '/tranhanh_test'
  )
    throw new Error('Database integration tests require local tranhanh_test.');
  client = new PrismaClient({ adapter: new PrismaPg({ connectionString: raw }) });
  await client.$connect();
});
afterAll(async () => client?.$disconnect());
async function isolated(check: (tx: Prisma.TransactionClient) => Promise<void>) {
  try {
    await client.$transaction(async (tx) => {
      await check(tx);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
}
async function fixture(tx: Prisma.TransactionClient) {
  const user = await tx.user.create({
    data: { email: `${randomUUID()}@example.test`, passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$fixture$fixture' },
  });
  const vehicle = await tx.vehicle.create({
    data: { userId: user.id, licensePlate: '51K-123.45', normalizedLicensePlate: '51K12345', vehicleType: 'CAR' },
  });
  return { user, vehicle };
}
describe('PostgreSQL vehicle document invariants', () => {
  it('enforces document ownership through the vehicle composite key', () =>
    isolated(async (tx) => {
      const { vehicle } = await fixture(tx);
      const stranger = await tx.user.create({ data: { email: `${randomUUID()}@example.test`, passwordHash: 'x' } });
      await expect(
        tx.vehicleDocument.create({
          data: {
            userId: stranger.id,
            vehicleId: vehicle.id,
            type: 'VEHICLE_REGISTRATION',
            displayName: 'Registration',
          },
        }),
      ).rejects.toMatchObject({ code: 'P2003' });
    }));
  it('rejects issue or effective dates after expiry', () =>
    isolated(async (tx) => {
      const { user, vehicle } = await fixture(tx);
      await expect(
        tx.vehicleDocument.create({
          data: {
            userId: user.id,
            vehicleId: vehicle.id,
            type: 'PERIODIC_INSPECTION',
            displayName: 'Inspection',
            issuedAt: new Date('2027-01-02'),
            expiresAt: new Date('2027-01-01'),
          },
        }),
      ).rejects.toThrow();
    }));
  it('enforces archive timestamp consistency', () =>
    isolated(async (tx) => {
      const { user, vehicle } = await fixture(tx);
      await expect(
        tx.vehicleDocument.create({
          data: { userId: user.id, vehicleId: vehicle.id, type: 'OTHER', displayName: 'Other', status: 'ARCHIVED' },
        }),
      ).rejects.toThrow();
    }));
  it('allows only reviewed reminder offsets and one row per offset', () =>
    isolated(async (tx) => {
      const { user, vehicle } = await fixture(tx);
      const document = await tx.vehicleDocument.create({
        data: { userId: user.id, vehicleId: vehicle.id, type: 'ROAD_USE_FEE', displayName: 'Fee' },
      });
      await expect(
        tx.vehicleDocumentReminder.create({ data: { documentId: document.id, daysBefore: 2 } }),
      ).rejects.toThrow();
      await tx.vehicleDocumentReminder.create({ data: { documentId: document.id, daysBefore: 7 } });
      await expect(
        tx.vehicleDocumentReminder.create({ data: { documentId: document.id, daysBefore: 7 } }),
      ).rejects.toMatchObject({ code: 'P2002' });
    }));
  it('requires complete schedules only for enabled reminders', () =>
    isolated(async (tx) => {
      const { user, vehicle } = await fixture(tx);
      const document = await tx.vehicleDocument.create({
        data: { userId: user.id, vehicleId: vehicle.id, type: 'OTHER', displayName: 'Other' },
      });
      await expect(
        tx.vehicleDocumentReminder.create({
          data: {
            documentId: document.id,
            daysBefore: 1,
            enabled: false,
            scheduledFor: new Date(),
            scheduledForExpiry: new Date('2027-01-01'),
          },
        }),
      ).rejects.toThrow();
    }));
  it('cascades documents, reminder preferences, and runs with vehicle deletion', () =>
    isolated(async (tx) => {
      const { user, vehicle } = await fixture(tx);
      const document = await tx.vehicleDocument.create({
        data: {
          userId: user.id,
          vehicleId: vehicle.id,
          type: 'VEHICLE_REGISTRATION',
          displayName: 'Registration',
          reminders: {
            create: {
              daysBefore: 30,
              enabled: true,
              scheduledFor: new Date(),
              scheduledForExpiry: new Date('2027-01-01'),
            },
          },
        },
        include: { reminders: true },
      });
      await tx.vehicleDocumentReminderRun.create({
        data: {
          reminderId: document.reminders[0].id,
          dueOn: new Date('2026-12-02'),
          expiresOn: new Date('2027-01-01'),
        },
      });
      await tx.vehicle.delete({ where: { id: vehicle.id } });
      expect(await tx.vehicleDocument.findUnique({ where: { id: document.id } })).toBeNull();
      expect(await tx.vehicleDocumentReminder.findUnique({ where: { id: document.reminders[0].id } })).toBeNull();
    }));
});
