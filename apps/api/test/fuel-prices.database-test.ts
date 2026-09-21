import { ConfigService } from '@nestjs/config';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/database/prisma.service.js';
import { importFuelPrices } from '../src/fuel-prices/import-fuel-prices.js';
import { ReviewedFuelPriceProvider } from '../src/fuel-prices/reviewed-fuel-price.provider.js';
import { FuelPricesService } from '../src/fuel-prices/fuel-prices.service.js';
let prisma: PrismaService;
beforeAll(async () => {
  const raw = process.env.TEST_DATABASE_URL;
  if (!raw || !new URL(raw).pathname.endsWith('/tranhanh_test'))
    throw new Error('Isolated local tranhanh_test required.');
  prisma = new PrismaService(new ConfigService({ DATABASE_URL: raw }));
  await prisma.$connect();
  await prisma.fuelPriceSnapshot.deleteMany();
  await prisma.fuelProduct.deleteMany();
  await prisma.syncRun.deleteMany({ where: { provider: { key: 'moit-reviewed-fuel-publications' } } });
  await prisma.dataProvider.deleteMany({ where: { key: 'moit-reviewed-fuel-publications' } });
  await prisma.sourceReference.deleteMany({ where: { source: { key: 'moit-fuel-price-notices' } } });
  await prisma.dataSource.deleteMany({ where: { key: 'moit-fuel-price-notices' } });
});
afterAll(async () => {
  await prisma?.$disconnect();
});
describe('fuel-price PostgreSQL integration', () => {
  it('applies reviewed history idempotently with exact BIGINT and source foreign keys', async () => {
    const provider = new ReviewedFuelPriceProvider();
    expect(await importFuelPrices(prisma, provider)).toEqual({ read: 8, created: 8, unchanged: 0 });
    expect(await importFuelPrices(prisma, provider)).toEqual({ read: 8, created: 0, unchanged: 8 });
    const rows = await prisma.fuelPriceSnapshot.findMany({ include: { source: true, sourceReference: true } });
    expect(rows).toHaveLength(8);
    expect(
      rows.every((item) => typeof item.price === 'bigint' && item.source.isOfficial && item.sourceReferenceId),
    ).toBe(true);
  });
  it('resolves current from effective time and immediate previous snapshot with exact changes', async () => {
    const response = await new FuelPricesService(prisma).current(new Date('2026-09-21T00:00:00Z'));
    expect(response.items).toHaveLength(4);
    expect(response.items.find((item) => item.productKey === 'e5-ron-92')).toMatchObject({
      price: '25139',
      previousPrice: '23744',
      changeAmount: '1395',
      changePercentage: '5.88',
    });
  });
  it('orders history newest first and keeps a provider failure from deleting last good data', async () => {
    const service = new FuelPricesService(prisma);
    const history = await service.history({ product: 'e5-ron-92' });
    expect(history.items.map((item) => item.price)).toEqual(['25139', '23744']);
    const provider = await prisma.dataProvider.findUniqueOrThrow({ where: { key: 'moit-reviewed-fuel-publications' } });
    const failedAt = new Date((provider.lastSuccessfulSyncAt?.valueOf() ?? Date.now()) + 1000);
    await prisma.dataProvider.update({
      where: { key: 'moit-reviewed-fuel-publications' },
      data: { lastFailedSyncAt: failedAt },
    });
    const current = await service.current(new Date(failedAt.valueOf() + 1000));
    expect(current.degraded).toBe(true);
    expect(current.items).toHaveLength(4);
  });
  it('enforces publication uniqueness, positive price, and source/provider relations', async () => {
    const existing = await prisma.fuelPriceSnapshot.findFirstOrThrow();
    await expect(
      prisma.fuelPriceSnapshot.create({ data: { ...existing, id: undefined, fingerprint: 'a'.repeat(64) } }),
    ).rejects.toThrow();
    await expect(
      prisma.fuelPriceSnapshot.update({ where: { id: existing.id }, data: { price: 0n } }),
    ).rejects.toThrow();
  });
});
