/* eslint-disable @typescript-eslint/no-explicit-any -- Prisma-shaped isolated test adapter. */
import { randomUUID } from 'node:crypto';
import { Prisma } from '../../src/generated/prisma/client.js';

type User = {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string | null;
  status: 'ACTIVE' | 'DISABLED' | 'PENDING_DELETION';
  lastLoginAt: Date | null;
  passwordChangedAt: Date | null;
  deletionRequestedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
type Session = {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  csrfTokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  replacedBySessionId: string | null;
};
type Reset = { id: string; userId: string; tokenHash: string; createdAt: Date; expiresAt: Date; usedAt: Date | null };
export class FakeAuthPrisma {
  readonly users = new Map<string, User>();
  readonly sessions = new Map<string, Session>();
  readonly resets = new Map<string, Reset>();
  user = {} as any;
  authSession = {} as any;
  passwordResetToken = {} as any;
  constructor() {
    this.user = {
      create: async ({ data }: any) => {
        if ([...this.users.values()].some((u) => u.email === data.email))
          throw new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' });
        const now = new Date();
        const row: User = {
          id: data.id ?? randomUUID(),
          email: data.email,
          passwordHash: data.passwordHash,
          displayName: data.displayName ?? null,
          status: data.status ?? 'ACTIVE',
          lastLoginAt: null,
          passwordChangedAt: null,
          deletionRequestedAt: null,
          createdAt: now,
          updatedAt: now,
        };
        this.users.set(row.id, row);
        return structuredClone(row);
      },
      findUnique: async ({ where }: any) => {
        const row = where.id ? this.users.get(where.id) : [...this.users.values()].find((u) => u.email === where.email);
        return row ? structuredClone(row) : null;
      },
      findUniqueOrThrow: async ({ where }: any) => {
        const row = this.users.get(where.id);
        if (!row) throw new Error('not found');
        return structuredClone(row);
      },
      update: async ({ where, data }: any) => {
        const row = this.users.get(where.id);
        if (!row) throw new Error('not found');
        Object.assign(row, data, { updatedAt: new Date() });
        return structuredClone(row);
      },
    };
    this.authSession = {
      create: async ({ data }: any) => {
        const now = new Date();
        const row: Session = {
          id: data.id ?? randomUUID(),
          userId: data.userId,
          familyId: data.familyId,
          tokenHash: data.tokenHash,
          csrfTokenHash: data.csrfTokenHash,
          createdAt: now,
          expiresAt: data.expiresAt,
          lastUsedAt: null,
          revokedAt: null,
          replacedBySessionId: null,
        };
        this.sessions.set(row.id, row);
        return structuredClone(row);
      },
      findUnique: async ({ where, include, select }: any) => {
        const row = this.sessions.get(where.id);
        if (!row) return null;
        if (select)
          return Object.fromEntries(
            Object.keys(select)
              .filter((k) => select[k])
              .map((k) => [k, (row as any)[k]]),
          );
        return include?.user
          ? { ...structuredClone(row), user: structuredClone(this.users.get(row.userId)!) }
          : structuredClone(row);
      },
      findUniqueOrThrow: async ({ where, include }: any) => {
        const row = this.sessions.get(where.id);
        if (!row) throw new Error('not found');
        return include?.user
          ? { ...structuredClone(row), user: structuredClone(this.users.get(row.userId)!) }
          : structuredClone(row);
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const row of this.sessions.values()) {
          if (typeof where.id === 'string' && row.id !== where.id) continue;
          if (where.userId && row.userId !== where.userId) continue;
          if (where.familyId && row.familyId !== where.familyId) continue;
          if (where.revokedAt === null && row.revokedAt !== null) continue;
          if (where.id?.not && row.id === where.id.not) continue;
          Object.assign(row, data);
          count++;
        }
        return { count };
      },
      deleteMany: async () => ({ count: 0 }),
    };
    this.passwordResetToken = {
      create: async ({ data }: any) => {
        const row: Reset = {
          id: data.id ?? randomUUID(),
          userId: data.userId,
          tokenHash: data.tokenHash,
          createdAt: new Date(),
          expiresAt: data.expiresAt,
          usedAt: null,
        };
        this.resets.set(row.id, row);
        return structuredClone(row);
      },
      findUnique: async ({ where, include }: any) => {
        const row = this.resets.get(where.id);
        if (!row) return null;
        return include?.user
          ? { ...structuredClone(row), user: structuredClone(this.users.get(row.userId)!) }
          : structuredClone(row);
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const row of this.resets.values()) {
          if (typeof where.id === 'string' && row.id !== where.id) continue;
          if (where.userId && row.userId !== where.userId) continue;
          if (where.usedAt === null && row.usedAt !== null) continue;
          if (where.expiresAt?.gt && row.expiresAt <= where.expiresAt.gt) continue;
          Object.assign(row, data);
          count++;
        }
        return { count };
      },
      deleteMany: async () => ({ count: 0 }),
    };
  }
  async $transaction(input: any): Promise<any> {
    return typeof input === 'function' ? input(this) : Promise.all(input);
  }
}
