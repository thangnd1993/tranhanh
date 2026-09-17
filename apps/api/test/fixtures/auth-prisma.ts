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
type Vehicle = {
  id: string;
  userId: string;
  displayName: string;
  licensePlate: string;
  normalizedLicensePlate: string;
  vehicleType: 'CAR' | 'MOTORCYCLE' | 'TRUCK' | 'VAN' | 'OTHER';
  make: string | null;
  model: string | null;
  modelYear: number | null;
  currentOdometerKm: number | null;
  notes: string | null;
  isPrimary: boolean;
  status: 'ACTIVE' | 'ARCHIVED';
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
function vehicleMatches(row: Vehicle, where: any): boolean {
  if (where.id && row.id !== where.id) return false;
  if (where.userId && row.userId !== where.userId) return false;
  if (where.normalizedLicensePlate && row.normalizedLicensePlate !== where.normalizedLicensePlate) return false;
  if (where.status && row.status !== where.status) return false;
  if (typeof where.isPrimary === 'boolean' && row.isPrimary !== where.isPrimary) return false;
  return true;
}
export class FakeAuthPrisma {
  readonly users = new Map<string, User>();
  readonly sessions = new Map<string, Session>();
  readonly resets = new Map<string, Reset>();
  readonly vehicles = new Map<string, Vehicle>();
  readonly monitorings = new Map<string, any>();
  user = {} as any;
  authSession = {} as any;
  passwordResetToken = {} as any;
  vehicle = {} as any;
  vehicleMonitoring = {} as any;
  vehicleMonitoringRun = {} as any;
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
    this.vehicle = {
      count: async ({ where }: any) => [...this.vehicles.values()].filter((row) => vehicleMatches(row, where)).length,
      findFirst: async ({ where }: any) => {
        const row = [...this.vehicles.values()].find((item) => vehicleMatches(item, where));
        return row ? structuredClone(row) : null;
      },
      findMany: async ({ where }: any) =>
        [...this.vehicles.values()]
          .filter((row) => vehicleMatches(row, where))
          .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || b.createdAt.getTime() - a.createdAt.getTime())
          .map((row) => structuredClone(row)),
      create: async ({ data }: any) => {
        if (
          [...this.vehicles.values()].some(
            (row) => row.userId === data.userId && row.normalizedLicensePlate === data.normalizedLicensePlate,
          )
        )
          throw new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' });
        if (
          data.isPrimary &&
          [...this.vehicles.values()].some(
            (row) => row.userId === data.userId && row.status === 'ACTIVE' && row.isPrimary,
          )
        )
          throw new Prisma.PrismaClientKnownRequestError('primary', { code: 'P2002', clientVersion: 'test' });
        const now = new Date();
        const { monitorings, ...vehicleData } = data;
        const row: Vehicle = {
          id: randomUUID(),
          status: 'ACTIVE',
          archivedAt: null,
          createdAt: now,
          updatedAt: now,
          make: null,
          model: null,
          modelYear: null,
          currentOdometerKm: null,
          notes: null,
          ...vehicleData,
        };
        this.vehicles.set(row.id, row);
        if (monitorings?.create) {
          const monitoring = {
            id: randomUUID(),
            userId: monitorings.create.userId,
            vehicleId: row.id,
            monitoringType: monitorings.create.monitoringType,
            providerKey: monitorings.create.providerKey,
            capability: monitorings.create.capability,
            status: 'DISABLED',
            isEnabled: false,
            automationApprovedAt: null,
            lastAttemptAt: null,
            lastSuccessfulCheckAt: null,
            nextEligibleCheckAt: null,
            lastOutcome: null,
            failureCount: 0,
            lastErrorCode: null,
            createdAt: now,
            updatedAt: now,
          };
          this.monitorings.set(monitoring.id, monitoring);
        }
        return structuredClone(row);
      },
      update: async ({ where, data }: any) => {
        const row = this.vehicles.get(where.id);
        if (!row) throw new Error('not found');
        if (
          data.normalizedLicensePlate &&
          [...this.vehicles.values()].some(
            (other) =>
              other.id !== row.id &&
              other.userId === row.userId &&
              other.normalizedLicensePlate === data.normalizedLicensePlate,
          )
        )
          throw new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' });
        Object.assign(row, data, { updatedAt: new Date() });
        return structuredClone(row);
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const row of this.vehicles.values()) {
          if (!vehicleMatches(row, where)) continue;
          Object.assign(row, data, { updatedAt: new Date() });
          count++;
        }
        return { count };
      },
    };
    this.vehicleMonitoring = {
      findFirst: async ({ where, include }: any) => {
        const row = [...this.monitorings.values()].find(
          (item) =>
            (!where.userId || item.userId === where.userId) &&
            (!where.vehicleId || item.vehicleId === where.vehicleId) &&
            (!where.monitoringType || item.monitoringType === where.monitoringType),
        );
        if (!row) return null;
        return include?.vehicle
          ? { ...structuredClone(row), vehicle: { status: this.vehicles.get(row.vehicleId)!.status } }
          : structuredClone(row);
      },
      update: async ({ where, data, include }: any) => {
        const row = this.monitorings.get(where.id);
        if (!row) throw new Error('not found');
        Object.assign(row, data, { updatedAt: new Date() });
        return include?.vehicle
          ? { ...structuredClone(row), vehicle: { status: this.vehicles.get(row.vehicleId)!.status } }
          : structuredClone(row);
      },
      updateMany: async ({ where, data }: any) => {
        let count = 0;
        for (const row of this.monitorings.values()) {
          if (where.vehicleId && row.vehicleId !== where.vehicleId) continue;
          if (where.userId && row.userId !== where.userId) continue;
          if (typeof where.isEnabled === 'boolean' && row.isEnabled !== where.isEnabled) continue;
          Object.assign(row, data, { updatedAt: new Date() });
          count++;
        }
        return { count };
      },
    };
    this.vehicleMonitoringRun = { findMany: async () => [] };
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
