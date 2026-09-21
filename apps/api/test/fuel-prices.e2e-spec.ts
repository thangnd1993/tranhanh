import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DatabaseModule } from '../src/database/database.module.js';
import { FuelPricesModule } from '../src/fuel-prices/fuel-prices.module.js';
import { PrismaService } from '../src/database/prisma.service.js';
const source = { name: 'Bộ Công Thương', isOfficial: true };
const sourceReference = { title: 'Official notice', externalUrl: 'https://minhbach.moit.gov.vn/test' };
const provider = {
  key: 'moit-reviewed-fuel-publications',
  lastFailedSyncAt: null,
  lastSuccessfulSyncAt: new Date('2026-09-21'),
};
const row = (price: bigint, effectiveFrom: string, id: string) => ({
  id,
  price,
  effectiveFrom: new Date(effectiveFrom),
  effectiveTo: null,
  publishedAt: new Date(effectiveFrom),
  retrievedAt: new Date('2026-09-21'),
  publicationNumber: id,
  product: {
    key: 'e5-ron-92',
    officialName: 'Xăng E5RON92',
    unit: 'VND_PER_LITER',
    semantics: 'MAXIMUM_RETAIL_PRICE',
    displayOrder: 0,
  },
  source,
  sourceReference,
  provider,
});
const currentRows = [
  row(25139n, '2026-09-17T08:00:00Z', '7458/BCT-TTTN'),
  row(23744n, '2026-09-10T08:00:00Z', '7251/BCT-TTTN'),
];
let productRows = [{ key: 'e5-ron-92', snapshots: currentRows }];
const fake = {
  fuelProduct: { findMany: async () => productRows },
  dataProvider: { findUnique: async () => provider },
  fuelPriceSnapshot: { findMany: async () => currentRows, count: async () => 2 },
  $transaction: async (operations: Promise<unknown>[]) => Promise.all(operations),
};
describe('fuel-price HTTP API', () => {
  let app: INestApplication;
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [DatabaseModule, FuelPricesModule] })
      .overrideProvider(PrismaService)
      .useValue(fake)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });
  afterAll(() => app.close());
  it('returns exact current price, previous comparison, attribution and cache policy', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/fuel-prices/current').expect(200);
    expect(response.body.items[0]).toMatchObject({
      price: '25139',
      previousPrice: '23744',
      changeAmount: '1395',
      changeDirection: 'INCREASE',
      changePercentage: '5.88',
      source: { official: true, publisher: 'Bộ Công Thương' },
    });
    expect(response.headers['cache-control']).toContain('stale-if-error');
  });
  it('returns an honest empty current state without fabricated zero prices', async () => {
    productRows = [];
    const response = await request(app.getHttpServer()).get('/api/v1/fuel-prices/current').expect(200);
    expect(response.body).toMatchObject({ items: [], retrievedAt: null, stale: true });
    expect(response.text).not.toContain('"price":"0"');
    productRows = [{ key: 'e5-ron-92', snapshots: currentRows }];
  });
  it('returns bounded history and validates filters', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/fuel-prices/history?product=e5-ron-92&pageSize=20')
      .expect(200);
    expect(response.body).toMatchObject({ total: 2, page: 1, pageSize: 20 });
    await request(app.getHttpServer()).get('/api/v1/fuel-prices/history?product=unknown').expect(400);
    await request(app.getHttpServer()).get('/api/v1/fuel-prices/history?pageSize=101').expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/fuel-prices/history?from=2025-01-01T00:00:00.000Z&to=2026-09-01T00:00:00.000Z')
      .expect(400);
  });
});
