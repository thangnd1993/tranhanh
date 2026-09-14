import { Injectable, NotFoundException } from '@nestjs/common';
import type { AreaCodePage, AreaCodeQuery, AreaCodeResult, AreaCodeSource } from '@tranhanh/shared';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { normalizeSearch } from '../common/normalize-search.js';
import { exactAreaCode, matchAreaNumber, parseAreaInput } from './normalize-area.js';
const evidence = { include: { source: true } } as const;
export const areaInclude = {
  locality: { include: { sourceReference: evidence, group: { include: { sourceReference: evidence } } } },
  sourceReference: evidence,
  replacement: { include: { newCode: true, sourceReference: evidence } },
  previous: { include: { oldCode: true, sourceReference: evidence }, orderBy: { oldCode: { code: 'asc' } } },
} satisfies Prisma.AreaCodeInclude;
export type AreaRow = Prisma.AreaCodeGetPayload<{ include: typeof areaInclude }>;
function source(ref: AreaRow['sourceReference']): AreaCodeSource {
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
const day = (value: Date | null) => value?.toISOString().slice(0, 10) ?? null;
export function areaResult(row: AreaRow): AreaCodeResult {
  const locality = row.locality;
  return {
    code: row.code,
    currentCode: row.status === 'ACTIVE' ? row.code : (row.replacement?.newCode.code ?? null),
    status: row.status,
    locality: {
      key: locality.key,
      name: locality.name,
      aliases: locality.aliases,
      nameContext: 'TELECOM_SERVICE_AREA',
      source: source(locality.sourceReference),
      group: {
        key: locality.group.key,
        name: locality.group.name,
        effectiveFrom: day(locality.group.effectiveFrom),
        source: source(locality.group.sourceReference),
      },
    },
    resolution: 'GEOGRAPHIC_AREA_CODE',
    subscriberVerified: false,
    effectiveFrom: day(row.effectiveFrom),
    effectiveTo: day(row.effectiveTo),
    previousCodes: row.previous.map((m) => ({
      oldCode: m.oldCode.code,
      newCode: row.code,
      effectiveDate: day(m.effectiveDate),
      source: source(m.sourceReference),
    })),
    replacement: row.replacement
      ? {
          oldCode: row.code,
          newCode: row.replacement.newCode.code,
          effectiveDate: day(row.replacement.effectiveDate),
          source: source(row.replacement.sourceReference),
        }
      : null,
    source: source(row.sourceReference),
    importedAt: row.importedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
@Injectable()
export class AreaCodesService {
  constructor(private readonly prisma: PrismaService) {}
  private async find(code: string): Promise<AreaRow> {
    const row = await this.prisma.areaCode.findUnique({ where: { code }, include: areaInclude });
    if (!row) throw new NotFoundException('Area code not found in the reviewed dataset.');
    return row;
  }
  async exact(value: string): Promise<AreaCodeResult> {
    return areaResult(await this.find(exactAreaCode(value)));
  }
  async lookup(value: string): Promise<AreaCodeResult> {
    const input = parseAreaInput(value);
    if (input.kind === 'CODE') return this.exact(input.code);
    // Read only codes, never send submitted subscriber digits to Prisma or an external provider.
    const known = await this.prisma.areaCode.findMany({ where: { status: 'ACTIVE' }, select: { code: true } });
    const code = matchAreaNumber(
      input.domestic,
      known.map((r) => r.code),
    );
    return this.exact(code);
  }
  async list(query: AreaCodeQuery): Promise<AreaCodePage> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const q = normalizeSearch(query.q ?? '');
    const where: Prisma.AreaCodeWhereInput = {
      ...(query.code ? { code: { startsWith: query.code } } : {}),
      ...(query.locality ? { locality: { key: query.locality } } : {}),
      ...(query.group
        ? { locality: { ...(query.locality ? { key: query.locality } : {}), group: { key: query.group } } }
        : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(q
        ? {
            OR: [
              { code: { startsWith: /^\d+$/.test(q) && !q.startsWith('0') ? '0' + q : q } },
              { locality: { searchName: { contains: q } } },
              { locality: { group: { searchName: { contains: q } } } },
            ],
          }
        : {}),
    };
    const [total, rows] = await this.prisma.$transaction(
      [
        this.prisma.areaCode.count({ where }),
        this.prisma.areaCode.findMany({
          where,
          include: areaInclude,
          orderBy: { code: 'asc' },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return { page, pageSize, total, items: rows.map(areaResult) };
  }
  async related(value: string): Promise<AreaCodeResult[]> {
    const row = await this.find(exactAreaCode(value));
    const rows = await this.prisma.areaCode.findMany({
      where: {
        code: { not: row.code },
        OR: [
          { localityId: row.localityId, status: { in: ['ACTIVE', 'LEGACY'] } },
          { locality: { groupId: row.locality.groupId }, status: 'ACTIVE' },
        ],
      },
      include: areaInclude,
      orderBy: { code: 'asc' },
      take: 20,
    });
    return rows.map(areaResult);
  }
}
