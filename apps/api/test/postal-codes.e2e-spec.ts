import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { postalPrismaFixture } from './fixtures/postal-code-rows.js';
describe('postal-code HTTP API', () => {
  let app: INestApplication;
  const path = '/api/v1/postal-codes';
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(postalPrismaFixture())
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });
  afterAll(async () => app.close());
  it('resolves exact code and locality queries', async () => {
    expect((await request(app.getHttpServer()).get(`${path}/50206`).expect(200)).body.matches[0].target.name).toBe(
      'Phường Hải Châu',
    );
    expect(
      (await request(app.getHttpServer()).get(`${path}/lookup`).query({ q: 'Da Nang' }).expect(200)).body.matches[0]
        .code,
    ).toBe('50206');
  });
  it('returns ambiguity, pagination and related assignments', async () => {
    expect(
      (await request(app.getHttpServer()).get(`${path}/lookup`).query({ q: 'An Giang' }).expect(200)).body.ambiguous,
    ).toBe(true);
    expect(
      (await request(app.getHttpServer()).get(path).query({ page: 2, pageSize: 2 }).expect(200)).body,
    ).toMatchObject({ page: 2, pageSize: 2, total: 5 });
    expect((await request(app.getHttpServer()).get(`${path}/90456/related`).expect(200)).body[0].code).toBe('90458');
  });
  it('distinguishes malformed 400 from unknown 404', async () => {
    await request(app.getHttpServer()).get(`${path}/1234`).expect(400);
    await request(app.getHttpServer()).get(`${path}/99999`).expect(404);
    await request(app.getHttpServer()).get(path).query({ sort: 'name' }).expect(400);
  });
  it('publishes list, search, lookup, exact and related Swagger routes', () => {
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Test').build());
    for (const route of [path, `${path}/search`, `${path}/lookup`, `${path}/{code}`, `${path}/{code}/related`])
      expect(doc.paths[route]).toBeDefined();
    expect(doc.paths[`${path}/{code}`].get?.responses).toHaveProperty('404');
  });
});
