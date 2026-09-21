import { BadRequestException, Injectable } from '@nestjs/common';
import type { FuelPriceHistoryResponse, FuelPriceSnapshot, FuelPricesCurrentResponse } from '@tranhanh/shared';
import { PrismaService } from '../database/prisma.service.js';
import { priceChange } from './fuel-price-money.js';

const include = {
  product: true,
  source: true,
  sourceReference: true,
  provider: true,
} as const;
type Row = Awaited<ReturnType<PrismaService['fuelPriceSnapshot']['findMany']>>[number] & {
  product: { key: string; officialName: string; unit: string; semantics: string; displayOrder: number };
  source: { name: string; isOfficial: boolean };
  sourceReference: { title: string | null; externalUrl: string | null };
};
function snapshot(row: Row): FuelPriceSnapshot {
  return {
    id: row.id,
    productKey: row.product.key as FuelPriceSnapshot['productKey'],
    officialName: row.product.officialName,
    price: row.price.toString() as FuelPriceSnapshot['price'],
    unit: row.product.unit as FuelPriceSnapshot['unit'],
    semantics: row.product.semantics as FuelPriceSnapshot['semantics'],
    effectiveFrom: row.effectiveFrom.toISOString(),
    publishedAt: row.publishedAt?.toISOString() ?? null,
    retrievedAt: row.retrievedAt.toISOString(),
    source: {
      publisher: row.source.name,
      official: row.source.isOfficial,
      title: row.sourceReference.title ?? row.publicationNumber,
      url: row.sourceReference.externalUrl ?? 'https://minhbach.moit.gov.vn/',
      publicationNumber: row.publicationNumber,
    },
  };
}
@Injectable()
export class FuelPricesService {
  constructor(private readonly prisma: PrismaService) {}
  async current(now = new Date()): Promise<FuelPricesCurrentResponse> {
    const products = await this.prisma.fuelProduct.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { key: 'asc' }],
      include: {
        snapshots: {
          where: { effectiveFrom: { lte: now } },
          orderBy: [{ effectiveFrom: 'desc' }, { id: 'desc' }],
          take: 2,
          include,
        },
      },
    });
    const items = products.flatMap((product) => {
      const [current, previous] = product.snapshots as unknown as Row[];
      if (!current) return [];
      const change = priceChange(current.price, previous?.price ?? null);
      return [
        {
          ...snapshot(current),
          previousPrice: previous ? (previous.price.toString() as `${bigint}`) : null,
          changeAmount: change.amount === null ? null : (change.amount.toString() as `${bigint}`),
          changeDirection: change.direction,
          changePercentage: change.percentage,
        },
      ];
    });
    const retrievedAt = items.reduce<string | null>(
      (latest, item) => (!latest || item.retrievedAt > latest ? item.retrievedAt : latest),
      null,
    );
    const latestEffective = items.reduce<string | null>(
      (latest, item) => (!latest || item.effectiveFrom > latest ? item.effectiveFrom : latest),
      null,
    );
    const staleAfter = latestEffective
      ? new Date(new Date(latestEffective).valueOf() + 10 * 86_400_000).toISOString()
      : null;
    const provider = await this.prisma.dataProvider.findUnique({ where: { key: 'moit-reviewed-fuel-publications' } });
    const degraded = Boolean(
      provider?.lastFailedSyncAt &&
      (!provider.lastSuccessfulSyncAt || provider.lastFailedSyncAt > provider.lastSuccessfulSyncAt),
    );
    return { items, retrievedAt, stale: !staleAfter || now >= new Date(staleAfter), degraded, staleAfter };
  }
  async history(query: {
    product?: string;
    from?: string;
    to?: string;
    page?: number;
    pageSize?: number;
  }): Promise<FuelPriceHistoryResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;
    if (from && to && from > to) throw new BadRequestException('from must be before or equal to to.');
    if (from && to && to.valueOf() - from.valueOf() > 366 * 86_400_000)
      throw new BadRequestException('Date range cannot exceed 366 days.');
    const where = {
      ...(query.product ? { product: { key: query.product } } : {}),
      ...(from || to ? { effectiveFrom: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.fuelPriceSnapshot.findMany({
        where,
        include,
        orderBy: [{ effectiveFrom: 'desc' }, { product: { displayOrder: 'asc' } }, { id: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.fuelPriceSnapshot.count({ where }),
    ]);
    return { items: (rows as unknown as Row[]).map(snapshot), page, pageSize, total };
  }
}
