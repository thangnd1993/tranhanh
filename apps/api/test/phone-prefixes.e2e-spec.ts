import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { Prisma } from '../src/generated/prisma/client.js';
import { phonePrismaFixture } from './fixtures/phone-rows.js';

describe('phone-prefix HTTP API (database fixture; live constraints tested separately)', () => {
  let app: INestApplication;
  const fake = phonePrismaFixture();
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(fake)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  const path = '/api/v1/phone-prefixes';

  it('returns structured allocation and source evidence', async () => {
    const { body } = await request(app.getHttpServer()).get(`${path}/086`).expect(200);
    expect(body).toMatchObject({
      prefix: '086',
      currentPrefix: '086',
      operator: { key: 'viettel' },
      operatorResolution: 'PREFIX_ALLOCATION',
      currentSubscriberNetworkVerified: false,
      source: { publisher: 'Test-only publisher', retrievedAt: '2020-01-01T00:00:00.000Z' },
    });
    expect(body).not.toHaveProperty('operatorId');
  });
  it('preserves old/new conversion context in both directions', async () => {
    const old = await request(app.getHttpServer()).get(`${path}/0168`).expect(200);
    expect(old.body).toMatchObject({ status: 'LEGACY', currentPrefix: '038', replacement: { newPrefix: '038' } });
    const current = await request(app.getHttpServer()).get(`${path}/038`).expect(200);
    expect(current.body.previousPrefixes[0].oldPrefix).toBe('0168');
  });
  it('extracts full-number prefixes without returning subscriber digits or allowing caching', async () => {
    const response = await request(app.getHttpServer())
      .get(`${path}/lookup`)
      .query({ value: '+84861234567' })
      .expect(200);
    expect(response.body.prefix).toBe('086');
    expect(response.text).not.toContain('1234567');
    expect(response.headers['cache-control']).toBe('no-store');
  });
  it('returns 404 for unknown numeric prefixes and 400 for malformed input', async () => {
    await request(app.getHttpServer()).get(`${path}/999`).expect(404);
    await request(app.getHttpServer()).get(`${path}/abc`).expect(400);
    await request(app.getHttpServer()).get(`${path}/lookup`).query({ value: '0241234567' }).expect(400);
    await request(app.getHttpServer()).get(`${path}/lookup`).expect(400);
  });
  it('filters operator/status, searches case/accents, and paginates deterministically', async () => {
    const list = await request(app.getHttpServer())
      .get(path)
      .query({ operator: 'viettel', status: 'ACTIVE', pageSize: 1, page: 2 })
      .expect(200);
    expect(list.body).toMatchObject({ total: 2, page: 2, pageSize: 1, items: [{ prefix: '086' }] });
    const search = await request(app.getHttpServer()).get(`${path}/search`).query({ q: 'VÍNAPHONE' }).expect(200);
    expect(search.body.items.map((x: { prefix: string }) => x.prefix)).toEqual(['091']);
    const legacy = await request(app.getHttpServer()).get(`${path}/search`).query({ q: '0168' }).expect(200);
    expect(legacy.body.items[0].status).toBe('LEGACY');
  });
  it('rejects unbounded pagination and arbitrary query fields', async () => {
    for (const query of [{ pageSize: '101' }, { page: '0' }, { page: 'abc' }, { status: 'UNKNOWN' }, { sort: 'id' }]) {
      await request(app.getHttpServer()).get(path).query(query).expect(400);
    }
  });
  it('returns active related prefixes without duplicating the requested prefix', async () => {
    const { body } = await request(app.getHttpServer()).get(`${path}/086/related`).expect(200);
    expect(body.map((x: { prefix: string }) => x.prefix)).toEqual(['038']);
  });
  it('retains safe database-unavailable errors', async () => {
    fake.phonePrefix.findUnique.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('secret SQL', {
        code: 'P1001',
        clientVersion: '7.10.0',
      }),
    );
    const response = await request(app.getHttpServer()).get(`${path}/086`).expect(503);
    expect(response.body.code).toBe('DATABASE_UNAVAILABLE');
    expect(response.text).not.toContain('secret');
  });
  it('publishes parameters, nested response schemas and errors in Swagger', () => {
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Test').build());
    expect(doc.paths[`${path}/lookup`].get?.responses).toHaveProperty('400');
    expect(doc.paths[`${path}/{prefix}`].get?.responses).toHaveProperty('404');
    expect(doc.components?.schemas?.PhonePrefixDto).toBeDefined();
    expect(doc.components?.schemas?.PhoneSourceDto).toBeDefined();
  });
});
