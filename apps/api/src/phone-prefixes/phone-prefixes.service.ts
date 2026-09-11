import { Injectable, NotFoundException } from '@nestjs/common';
import type { PhonePrefixPage, PhonePrefixQuery, PhonePrefixResult, PhoneSource } from '@tranhanh/shared';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { normalizeSearch } from '../common/normalize-search.js';
import { exactPrefix, normalizePhone } from './normalize-phone.js';

export const phoneInclude = {
  operator: true,
  sourceReference: { include: { source: true } },
  replacement: { include: { newPrefix: true, sourceReference: { include: { source: true } } } },
  previous: {
    include: { oldPrefix: true, sourceReference: { include: { source: true } } },
    orderBy: { oldPrefix: { prefix: 'asc' } },
  },
} satisfies Prisma.PhonePrefixInclude;
export type PhoneRow = Prisma.PhonePrefixGetPayload<{ include: typeof phoneInclude }>;
type Evidence = PhoneRow['sourceReference'];

function source(ref: Evidence): PhoneSource {
  return {
    publisher: ref.source.name,
    official: ref.source.isOfficial,
    publisherUrl: ref.source.homepageUrl,
    title: ref.title,
    url: ref.externalUrl,
    publishedAt: ref.publishedAt?.toISOString() ?? null,
    retrievedAt: ref.retrievedAt.toISOString(),
  };
}
export function phoneResult(row: PhoneRow): PhonePrefixResult {
  return {
    prefix: row.prefix,
    currentPrefix: row.status === 'ACTIVE' ? row.prefix : (row.replacement?.newPrefix.prefix ?? null),
    status: row.status,
    operator: { key: row.operator.key, name: row.operator.name, website: row.operator.website },
    operatorResolution: 'PREFIX_ALLOCATION',
    currentSubscriberNetworkVerified: false,
    effectiveFrom: row.effectiveFrom?.toISOString() ?? null,
    effectiveTo: row.effectiveTo?.toISOString() ?? null,
    previousPrefixes: row.previous.map((m) => ({
      oldPrefix: m.oldPrefix.prefix,
      newPrefix: row.prefix,
      effectiveAt: m.effectiveAt?.toISOString() ?? null,
      source: source(m.sourceReference),
    })),
    replacement: row.replacement
      ? {
          oldPrefix: row.prefix,
          newPrefix: row.replacement.newPrefix.prefix,
          effectiveAt: row.replacement.effectiveAt?.toISOString() ?? null,
          source: source(row.replacement.sourceReference),
        }
      : null,
    source: source(row.sourceReference),
    importedAt: row.importedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

@Injectable()
export class PhonePrefixesService {
  constructor(private readonly prisma: PrismaService) {}

  private async find(prefix: string): Promise<PhoneRow> {
    const row = await this.prisma.phonePrefix.findUnique({ where: { prefix }, include: phoneInclude });
    if (!row) {
      throw new NotFoundException('Phone prefix not found in the reviewed dataset.');
    }
    return row;
  }

  async exact(value: string): Promise<PhonePrefixResult> {
    return phoneResult(await this.find(exactPrefix(value)));
  }

  async lookup(value: string): Promise<PhonePrefixResult> {
    const parsed = normalizePhone(value);
    const row = await this.find(parsed.prefix);
    if (parsed.kind === 'LEGACY_NUMBER' && (row.status !== 'LEGACY' || !row.replacement)) {
      throw new NotFoundException('Historical prefix mapping not found.');
    }
    return phoneResult(row);
  }

  async list(query: PhonePrefixQuery): Promise<PhonePrefixPage> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const q = normalizeSearch(query.q ?? '');
    const where: Prisma.PhonePrefixWhereInput = {
      ...(query.prefix ? { prefix: { startsWith: query.prefix } } : {}),
      ...(query.operator ? { operator: { key: query.operator } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(q ? { OR: [{ prefix: { startsWith: q } }, { operator: { searchName: { contains: q } } }] } : {}),
    };
    const [total, rows] = await this.prisma.$transaction(
      [
        this.prisma.phonePrefix.count({ where }),
        this.prisma.phonePrefix.findMany({
          where,
          include: phoneInclude,
          orderBy: { prefix: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return { page, pageSize, total, items: rows.map(phoneResult) };
  }

  async related(value: string): Promise<PhonePrefixResult[]> {
    const current = await this.find(exactPrefix(value));
    const rows = await this.prisma.phonePrefix.findMany({
      where: { operatorId: current.operatorId, status: 'ACTIVE', prefix: { not: current.prefix } },
      include: phoneInclude,
      orderBy: { prefix: 'asc' },
      take: 12,
    });
    return rows.map(phoneResult);
  }
}
