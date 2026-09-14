import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
import { Prisma } from '../src/generated/prisma/client.js';
import { areaPrismaFixture } from './fixtures/area-rows.js';

describe('area-code HTTP API (test-only database adapter)', () => {
  let app: INestApplication;
  const fake = areaPrismaFixture();
  const path = '/api/v1/area-codes';
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
  it('returns sourced geographic assignment and scoped locality/group context', async () => {
    const { body } = await request(app.getHttpServer()).get(`${path}/0236`).expect(200);
    expect(body).toMatchObject({
      code: '0236',
      currentCode: '0236',
      status: 'ACTIVE',
      locality: { name: 'Đà Nẵng', nameContext: 'TELECOM_SERVICE_AREA', group: { name: 'Đà Nẵng' } },
      resolution: 'GEOGRAPHIC_AREA_CODE',
      subscriberVerified: false,
      source: { publisher: 'Test-only publisher' },
    });
    expect(body).not.toHaveProperty('localityId');
  });
  it('preserves old/new mapping and calendar-date precision in both directions', async () => {
    const old = await request(app.getHttpServer()).get(`${path}/0511`).expect(200);
    expect(old.body).toMatchObject({
      code: '0511',
      status: 'LEGACY',
      currentCode: '0236',
      replacement: { newCode: '0236', effectiveDate: '2017-02-11' },
    });
    const current = await request(app.getHttpServer()).get(`${path}/0236`).expect(200);
    expect(current.body.previousCodes[0].oldCode).toBe('0511');
  });
  it('normalizes code forms and full fixed-line input without retaining subscriber digits', async () => {
    for (const value of [
      '236',
      '+84236',
      '0084236',
      '84 236',
      '0236-',
      '0236 ' + '123 4567',
      '+84 236 ' + '123 4567',
    ]) {
      const res = await request(app.getHttpServer()).get(`${path}/lookup`).query({ value }).expect(200);
      expect(res.body.code).toBe('0236');
      expect(res.text).not.toContain('1234567');
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.headers['referrer-policy']).toBe('no-referrer');
    }
  });
  it('distinguishes bad syntax 400 from valid unknown 404', async () => {
    await request(app.getHttpServer()).get(`${path}/abc`).expect(400);
    await request(app.getHttpServer()).get(`${path}/236`).expect(400);
    await request(app.getHttpServer()).get(`${path}/0999`).expect(404);
    await request(app.getHttpServer()).get(`${path}/lookup`).query({ value: '999' }).expect(404);
    await request(app.getHttpServer())
      .get(`${path}/lookup`)
      .query({ value: '0298' + '1234567' })
      .expect(404);
    await request(app.getHttpServer()).get(`${path}/lookup`).query({ value: '+840236' }).expect(400);
    await request(app.getHttpServer()).get(`${path}/lookup`).expect(400);
  });
  it('searches accents, aliases, historical codes and telecom group members', async () => {
    for (const q of ['Đà Nẵng', 'Da Nang']) {
      const res = await request(app.getHttpServer()).get(`${path}/search`).query({ q, status: 'ACTIVE' }).expect(200);
      expect(res.body.items.map((r: { code: string }) => r.code)).toEqual(['0235', '0236']);
    }
    const alias = await request(app.getHttpServer()).get(`${path}/search`).query({ q: 'TP.HCM' }).expect(200);
    expect(alias.body.items[0].code).toBe('028');
    const old = await request(app.getHttpServer()).get(`${path}/search`).query({ q: '0511' }).expect(200);
    expect(old.body.items[0].status).toBe('LEGACY');
  });
  it('paginates deterministically and combines scoped filters', async () => {
    const res = await request(app.getHttpServer())
      .get(path)
      .query({ group: 'da-nang', status: 'ACTIVE', page: 2, pageSize: 1 })
      .expect(200);
    expect(res.body).toMatchObject({ total: 2, page: 2, pageSize: 1, items: [{ code: '0236' }] });
    const filtered = await request(app.getHttpServer())
      .get(path)
      .query({ locality: 'quang-nam', group: 'da-nang' })
      .expect(200);
    expect(filtered.body.items.map((r: { code: string }) => r.code)).toEqual(['0235']);
  });
  it('returns only justified related codes', async () => {
    const res = await request(app.getHttpServer()).get(`${path}/0236/related`).expect(200);
    expect(res.body.map((r: { code: string }) => r.code)).toEqual(['0235', '0511']);
  });
  it('rejects arbitrary filters, oversized pagination and full numbers in search', async () => {
    for (const query of [
      { page: '0' },
      { pageSize: '101' },
      { sort: 'id' },
      { status: 'OTHER' },
      { q: '0236' + '1234567' },
    ]) {
      await request(app.getHttpServer()).get(path).query(query).expect(400);
    }
  });
  it('redacts database internals on service failure', async () => {
    fake.areaCode.findUnique.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('private SQL', { code: 'P1001', clientVersion: '7.10.0' }),
    );
    const res = await request(app.getHttpServer()).get(`${path}/0236`).expect(503);
    expect(res.body.code).toBe('DATABASE_UNAVAILABLE');
    expect(res.text).not.toContain('private');
  });
  it('documents route parameters, nested results and error codes in Swagger', () => {
    const doc = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Test').build());
    expect(doc.paths[`${path}/lookup`].get?.responses).toHaveProperty('400');
    expect(doc.paths[`${path}/{code}`].get?.responses).toHaveProperty('404');
    expect(doc.paths[`${path}/{code}`].get?.responses).toHaveProperty('503');
    expect(doc.components?.schemas?.AreaCodeDto).toBeDefined();
    expect(doc.components?.schemas?.TelecomLocalityDto).toBeDefined();
  });
});
