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
const userData = () => ({
  email: `${randomUUID()}@example.test`,
  passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$fixture$fixture',
});
const vehicleData = (userId: string, plate: string) => ({
  userId,
  displayName: plate,
  licensePlate: plate,
  normalizedLicensePlate: plate.replace(/[.-]/g, ''),
  vehicleType: 'CAR' as const,
});
describe('PostgreSQL My Garage invariants', () => {
  it('enforces plate uniqueness per owner while allowing the same plate for another owner', () =>
    isolated(async (tx) => {
      const a = await tx.user.create({ data: userData() }),
        b = await tx.user.create({ data: userData() });
      await tx.vehicle.create({ data: vehicleData(a.id, '51K-123.45') });
      await expect(tx.vehicle.create({ data: vehicleData(a.id, '51K-123.45') })).rejects.toMatchObject({
        code: 'P2002',
      });
      await expect(tx.vehicle.create({ data: vehicleData(b.id, '51K-123.45') })).resolves.toBeDefined();
    }));
  it('permits only one active primary per owner', () =>
    isolated(async (tx) => {
      const user = await tx.user.create({ data: userData() });
      await tx.vehicle.create({ data: { ...vehicleData(user.id, '30A-111.11'), isPrimary: true } });
      await expect(
        tx.vehicle.create({ data: { ...vehicleData(user.id, '30B-222.22'), isPrimary: true } }),
      ).rejects.toMatchObject({ code: 'P2002' });
    }));
  it('requires archived vehicles to be non-primary with an archive timestamp', () =>
    isolated(async (tx) => {
      const user = await tx.user.create({ data: userData() });
      await expect(
        tx.vehicle.create({ data: { ...vehicleData(user.id, '29A-111.11'), status: 'ARCHIVED' } }),
      ).rejects.toThrow();
      await expect(
        tx.vehicle.create({
          data: { ...vehicleData(user.id, '29A-222.22'), status: 'ARCHIVED', archivedAt: new Date(), isPrimary: true },
        }),
      ).rejects.toThrow();
    }));
  it('rejects invalid model years and odometer values at the database boundary', () =>
    isolated(async (tx) => {
      const user = await tx.user.create({ data: userData() });
      await expect(
        tx.vehicle.create({ data: { ...vehicleData(user.id, '43A-111.11'), modelYear: 1800 } }),
      ).rejects.toThrow();
      await expect(
        tx.vehicle.create({ data: { ...vehicleData(user.id, '43A-222.22'), currentOdometerKm: -1 } }),
      ).rejects.toThrow();
    }));
  it('restricts deleting an owner with vehicle history', () =>
    isolated(async (tx) => {
      const user = await tx.user.create({ data: userData() });
      await tx.vehicle.create({ data: vehicleData(user.id, '92A-111.11') });
      await expect(tx.user.delete({ where: { id: user.id } })).rejects.toMatchObject({ code: 'P2003' });
    }));
});
