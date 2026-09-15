import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { vehiclePlatePrismaFixture } from './fixtures/vehicle-plate-rows.js';
describe('vehicle-plate HTTP API (test-only database adapter)', () => {
  let app: INestApplication;
  const fake = vehiclePlatePrismaFixture();
  const path = '/api/v1/vehicle-plates';
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
  afterAll(async () => app.close());
  it('normalizes all required forms and discards a full registration serial', async () => {
    for (const value of ['51', '51K', '51k', '51K-123.45', '51K 12345']) {
      const res = await request(app.getHttpServer()).get(`${path}/lookup`).query({ value }).expect(200);
      expect(res.body).toMatchObject({
        parsed: { numericPrefix: '51', series: value === '51' ? null : 'K', seriesAllocationVerified: false },
        resolution: 'NUMERIC_PREFIX_ALLOCATION',
        ambiguous: false,
        vehicleOrOwnerVerified: false,
      });
      expect(res.text).not.toContain('123.45');
      expect(res.text).not.toContain('12345');
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.headers['referrer-policy']).toBe('no-referrer');
    }
  });
  it('returns a source-backed list for ambiguous numeric/series allocation', async () => {
    const res = await request(app.getHttpServer()).get(`${path}/30K`).expect(200);
    expect(res.body.ambiguous).toBe(true);
    expect(res.body.allocations).toHaveLength(2);
    expect(res.body.parsed.seriesAllocationVerified).toBe(true);
  });
  it('lists, searches and filters deterministic public allocation rows', async () => {
    const search = await request(app.getHttpServer()).get(`${path}/search`).query({ q: 'Da Nang' }).expect(200);
    expect(search.body.items[0].numericPrefix).toBe('43');
    const seriesSearch = await request(app.getHttpServer()).get(`${path}/search`).query({ q: '51K' }).expect(200);
    expect(seriesSearch.body.items.map((item: { numericPrefix: string }) => item.numericPrefix)).toEqual(['51']);
    const page = await request(app.getHttpServer())
      .get(path)
      .query({ target: 'ho-chi-minh', pageSize: 1, page: 2 })
      .expect(200);
    expect(page.body).toMatchObject({ total: 2, page: 2, pageSize: 1, items: [{ numericPrefix: '61' }] });
  });
  it('returns related current allocations and historical target context', async () => {
    const related = await request(app.getHttpServer()).get(`${path}/51/related`).expect(200);
    expect(related.body.map((x: { numericPrefix: string }) => x.numericPrefix)).toEqual(['61']);
    expect(related.body[0].previousTargets[0]).toMatchObject({
      previousTarget: { name: 'Bình Dương' },
      effectiveTo: '2025-07-01',
    });
  });
  it('distinguishes malformed 400 from unknown 404 and rejects unlisted filters', async () => {
    await request(app.getHttpServer()).get(`${path}/lookup`).query({ value: '51K/12345' }).expect(400);
    await request(app.getHttpServer()).get(`${path}/42`).expect(404);
    await request(app.getHttpServer()).get(path).query({ sort: 'name' }).expect(400);
    await request(app.getHttpServer()).get(`${path}/51K-123.45`).expect(400);
  });
  it('documents routes, nested history, ambiguity and errors in Swagger', () => {
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Test').build());
    expect(doc.paths[`${path}/lookup`].get?.responses).toHaveProperty('400');
    expect(doc.paths[`${path}/{prefix}`].get?.responses).toHaveProperty('404');
    expect(doc.components?.schemas?.VehiclePlateLookupResultDto).toBeDefined();
    expect(doc.components?.schemas?.VehiclePlateHistoryDto).toBeDefined();
  });
});
