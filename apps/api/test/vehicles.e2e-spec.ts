import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { FakeAuthPrisma } from './fixtures/auth-prisma.js';
function cookieValue(response: request.Response, name: string): string {
  const values = response.headers['set-cookie'] as unknown as string[] | undefined;
  const raw = values
    ?.find((v) => v.startsWith(`${name}=`))
    ?.split(';', 1)[0]
    .slice(name.length + 1);
  if (!raw) throw new Error(`Missing ${name}`);
  return decodeURIComponent(raw);
}
describe('My Garage ownership (e2e)', () => {
  let app: INestApplication;
  let owner: ReturnType<typeof request.agent>;
  let stranger: ReturnType<typeof request.agent>;
  let ownerCsrf = '';
  let strangerCsrf = '';
  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    const fixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(new FakeAuthPrisma())
      .compile();
    app = fixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
    await app.init();
    owner = request.agent(app.getHttpServer());
    stranger = request.agent(app.getHttpServer());
    const a = await owner
      .post('/api/v1/auth/register')
      .send({ email: 'owner@example.com', password: 'correct horse battery staple' })
      .expect(201);
    ownerCsrf = cookieValue(a, 'tn_csrf');
    const b = await stranger
      .post('/api/v1/auth/register')
      .send({ email: 'stranger@example.com', password: 'correct horse battery staple' })
      .expect(201);
    strangerCsrf = cookieValue(b, 'tn_csrf');
  });
  afterAll(async () => app.close());
  it('requires authentication and CSRF while public health remains available', async () => {
    await request(app.getHttpServer()).get('/api/v1/vehicles').expect(401);
    await owner.post('/api/v1/vehicles').send({ licensePlate: '51K-123.45', vehicleType: 'CAR' }).expect(403);
    await request(app.getHttpServer()).get('/api/v1/health').expect(200);
  });
  it('supports owner CRUD/actions and returns safe 404 for every cross-owner id operation', async () => {
    const created = await owner
      .post('/api/v1/vehicles')
      .set('X-CSRF-Token', ownerCsrf)
      .send({ licensePlate: '51K-123.45', vehicleType: 'CAR', currentOdometerKm: 1000 })
      .expect(201);
    const id = created.body.id as string;
    expect(created.body).toMatchObject({ isPrimary: true, licensePlate: '51K-123.45' });
    expect(created.headers['cache-control']).toBe('private, no-store');
    await stranger.get(`/api/v1/vehicles/${id}`).expect(404);
    await stranger.patch(`/api/v1/vehicles/${id}`).set('X-CSRF-Token', strangerCsrf).send({ notes: 'x' }).expect(404);
    await stranger.post(`/api/v1/vehicles/${id}/primary`).set('X-CSRF-Token', strangerCsrf).send({}).expect(404);
    await stranger.delete(`/api/v1/vehicles/${id}`).set('X-CSRF-Token', strangerCsrf).expect(404);
    await owner.delete(`/api/v1/vehicles/${id}`).set('X-CSRF-Token', ownerCsrf).expect(200);
    await stranger.post(`/api/v1/vehicles/${id}/restore`).set('X-CSRF-Token', strangerCsrf).send({}).expect(404);
    await owner
      .post(`/api/v1/vehicles/${id}/restore`)
      .set('X-CSRF-Token', ownerCsrf)
      .send({})
      .expect(201)
      .expect(({ body }) => expect(body).toMatchObject({ status: 'ACTIVE', isPrimary: false }));
  });
});
