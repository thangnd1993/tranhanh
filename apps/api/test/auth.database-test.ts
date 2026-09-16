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
describe('PostgreSQL auth invariants (real database, rolled-back fixtures)', () => {
  it('enforces normalized unique email', () =>
    isolated(async (tx) => {
      const user = await tx.user.create({ data: userData() });
      await expect(tx.user.create({ data: { ...userData(), email: user.email } })).rejects.toMatchObject({
        code: 'P2002',
      });
      await expect(
        tx.$executeRaw`UPDATE "User" SET "email" = 'UPPER@example.test' WHERE "id" = ${user.id}::uuid`,
      ).rejects.toThrow();
    }));
  it('enforces account deletion status semantics', () =>
    isolated(async (tx) => {
      await expect(tx.user.create({ data: { ...userData(), status: 'PENDING_DELETION' } })).rejects.toThrow();
    }));
  it('keeps session hashes unique and requires a real user', () =>
    isolated(async (tx) => {
      const user = await tx.user.create({ data: userData() });
      const token = 'a'.repeat(64);
      const csrf = 'b'.repeat(64);
      await tx.authSession.create({
        data: {
          userId: user.id,
          familyId: randomUUID(),
          tokenHash: token,
          csrfTokenHash: csrf,
          expiresAt: new Date(Date.now() + 60000),
        },
      });
      await expect(
        tx.authSession.create({
          data: {
            userId: user.id,
            familyId: randomUUID(),
            tokenHash: token,
            csrfTokenHash: csrf,
            expiresAt: new Date(Date.now() + 60000),
          },
        }),
      ).rejects.toMatchObject({ code: 'P2002' });
      await expect(
        tx.authSession.create({
          data: {
            userId: randomUUID(),
            familyId: randomUUID(),
            tokenHash: 'c'.repeat(64),
            csrfTokenHash: csrf,
            expiresAt: new Date(Date.now() + 60000),
          },
        }),
      ).rejects.toMatchObject({ code: 'P2003' });
    }));
  it('rejects malformed hashes and invalid expiry', () =>
    isolated(async (tx) => {
      const user = await tx.user.create({ data: userData() });
      await expect(
        tx.authSession.create({
          data: {
            userId: user.id,
            familyId: randomUUID(),
            tokenHash: 'raw-token',
            csrfTokenHash: 'b'.repeat(64),
            expiresAt: new Date(Date.now() - 60000),
          },
        }),
      ).rejects.toThrow();
    }));
  it('restricts user deletion when security history exists', () =>
    isolated(async (tx) => {
      const user = await tx.user.create({ data: userData() });
      await tx.passwordResetToken.create({
        data: { userId: user.id, tokenHash: 'd'.repeat(64), expiresAt: new Date(Date.now() + 60000) },
      });
      await expect(tx.user.delete({ where: { id: user.id } })).rejects.toMatchObject({ code: 'P2003' });
    }));
});
