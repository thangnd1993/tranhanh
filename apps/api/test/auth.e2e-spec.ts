import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { DevelopmentPasswordResetDelivery } from '../src/auth/auth-delivery.service.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { FakeAuthPrisma } from './fixtures/auth-prisma.js';

function cookieValue(response: request.Response, name: string): string {
  const values = response.headers['set-cookie'] as unknown as string[] | undefined;
  const value = values
    ?.find((cookie) => cookie.startsWith(`${name}=`))
    ?.split(';', 1)[0]
    .slice(name.length + 1);
  if (!value) throw new Error(`Missing ${name} cookie`);
  return decodeURIComponent(value);
}
describe('authentication lifecycle (e2e)', () => {
  let app: INestApplication;
  let agent: ReturnType<typeof request.agent>;
  let delivery: DevelopmentPasswordResetDelivery;
  const fake = new FakeAuthPrisma();
  beforeAll(async () => {
    process.env['NODE_ENV'] = 'test';
    const moduleFixture = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fake)
      .compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
    await app.init();
    agent = request.agent(app.getHttpServer());
    delivery = app.get(DevelopmentPasswordResetDelivery);
  });
  afterAll(async () => {
    await app.close();
  });
  it('registers, reads me, rotates, logs out, and rejects the revoked session', async () => {
    const registration = await agent
      .post('/api/v1/auth/register')
      .send({ email: ' Driver@Example.com ', password: 'correct horse battery staple', displayName: 'Driver' })
      .expect(201);
    expect(registration.body.user).toMatchObject({
      email: 'driver@example.com',
      displayName: 'Driver',
      status: 'ACTIVE',
    });
    expect(JSON.stringify(registration.body)).not.toMatch(/password|tokenHash|refreshToken/i);
    await agent
      .get('/api/v1/auth/me')
      .expect(200)
      .expect(({ body }) => expect(body.email).toBe('driver@example.com'));
    let csrf = cookieValue(registration, 'tn_csrf');
    const refresh = await agent.post('/api/v1/auth/refresh').set('X-CSRF-Token', csrf).send({}).expect(201);
    csrf = cookieValue(refresh, 'tn_csrf');
    await agent.post('/api/v1/auth/logout').set('X-CSRF-Token', csrf).send({}).expect(201);
    await agent.get('/api/v1/auth/me').expect(401);
  });
  it('keeps forgot-password generic, consumes one-time reset, rejects old password, and accepts the replacement', async () => {
    const genericMissing = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'missing@example.com' })
      .expect(201);
    const genericExisting = await request(app.getHttpServer())
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'driver@example.com' })
      .expect(201);
    expect(genericExisting.body).toEqual(genericMissing.body);
    const token = delivery.take('driver@example.com');
    expect(token).toBeDefined();
    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'a completely new password' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'another replacement password' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'driver@example.com', password: 'correct horse battery staple' })
      .expect(401);
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'driver@example.com', password: 'a completely new password' })
      .expect(201);
    expect(login.headers['set-cookie']).toBeDefined();
  });
  it('rejects cross-site mutation origins and never stores raw reset/refresh capabilities', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ email: 'driver@example.com', password: 'a completely new password' })
      .expect(403);
    for (const row of fake.sessions.values()) expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    for (const row of fake.resets.values()) expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
