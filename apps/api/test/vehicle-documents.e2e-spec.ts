import { NotFoundException, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { VehicleDocumentsService } from '../src/vehicle-documents/vehicle-documents.service.js';
import { FakeAuthPrisma } from './fixtures/auth-prisma.js';
function cookieValue(response: request.Response, name: string): string {
  const values = response.headers['set-cookie'] as unknown as string[] | undefined;
  const raw = values
    ?.find((value) => value.startsWith(`${name}=`))
    ?.split(';', 1)[0]
    .slice(name.length + 1);
  if (!raw) throw new Error(`Missing ${name}`);
  return decodeURIComponent(raw);
}
describe('Vehicle documents privacy (e2e)', () => {
  let app: INestApplication;
  let owner: ReturnType<typeof request.agent>;
  let stranger: ReturnType<typeof request.agent>;
  let ownerCsrf = '';
  let strangerCsrf = '';
  let ownerId = '';
  const row = {
    id: '22222222-2222-4222-8222-222222222222',
    vehicleId: '11111111-1111-4111-8111-111111111111',
    type: 'VEHICLE_REGISTRATION',
    displayName: 'Registration',
    referenceNumber: 'SECRET-123',
    issuer: null,
    issuedAt: null,
    effectiveFrom: null,
    expiresAt: '2027-01-01',
    notes: null,
    verificationStatus: 'USER_PROVIDED',
    status: 'ACTIVE',
    expiryState: 'VALID',
    daysUntilExpiry: 100,
    reminders: [],
    archivedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const owned = (userId: string) => {
    if (userId !== ownerId) throw new NotFoundException('Vehicle document not found.');
    return row;
  };
  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    const service = {
      list: async (userId: string) => ({
        items: [owned(userId)],
        attention: { expired: 0, expiringSoon: 0, nextExpiry: '2027-01-01' },
      }),
      create: async (userId: string) => {
        ownerId ||= userId;
        return row;
      },
      get: async (userId: string) => owned(userId),
      update: async (userId: string) => owned(userId),
      archive: async (userId: string) => owned(userId),
      restore: async (userId: string) => owned(userId),
      reminders: async (userId: string) => owned(userId),
    };
    const fixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(new FakeAuthPrisma())
      .overrideProvider(VehicleDocumentsService)
      .useValue(service)
      .compile();
    app = fixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
    await app.init();
    owner = request.agent(app.getHttpServer());
    stranger = request.agent(app.getHttpServer());
    ownerCsrf = cookieValue(
      await owner
        .post('/api/v1/auth/register')
        .send({ email: 'document-owner@example.com', password: 'correct horse battery staple' })
        .expect(201),
      'tn_csrf',
    );
    strangerCsrf = cookieValue(
      await stranger
        .post('/api/v1/auth/register')
        .send({ email: 'document-stranger@example.com', password: 'correct horse battery staple' })
        .expect(201),
      'tn_csrf',
    );
  });
  afterAll(async () => app.close());
  it('requires authentication and CSRF, marks responses private, and never exposes an owner document cross-account', async () => {
    const base = '/api/v1/vehicles/11111111-1111-4111-8111-111111111111/documents';
    await request(app.getHttpServer()).get(base).expect(401);
    await owner.post(base).send({ type: 'VEHICLE_REGISTRATION', displayName: 'Registration' }).expect(403);
    const created = await owner
      .post(base)
      .set('X-CSRF-Token', ownerCsrf)
      .send({ type: 'VEHICLE_REGISTRATION', displayName: 'Registration' })
      .expect(201);
    expect(created.headers['cache-control']).toBe('private, no-store');
    const path = `${base}/${row.id}`;
    await stranger.get(path).expect(404);
    await stranger.patch(path).set('X-CSRF-Token', strangerCsrf).send({ displayName: 'x' }).expect(404);
    await stranger.delete(path).set('X-CSRF-Token', strangerCsrf).expect(404);
    await stranger
      .post(path + '/restore')
      .set('X-CSRF-Token', strangerCsrf)
      .send({})
      .expect(404);
    await stranger
      .put(path + '/reminders')
      .set('X-CSRF-Token', strangerCsrf)
      .send({ enabledDaysBefore: [7] })
      .expect(404);
    await owner
      .get(path)
      .expect(200)
      .expect(({ body }) => expect(body.referenceNumber).toBe('SECRET-123'));
  });
});
