import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  PostalCodeLookupResult,
  PostalCodePage,
  PostalCodeQuery,
  PostalCodeResult,
  PostalCodeSource,
  PostalCodeTargetResult,
} from '@tranhanh/shared';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { normalizeSearch } from '../common/normalize-search.js';
import { normalizePostalCode } from './normalize-postal-code.js';
const evidence = { include: { source: true } } as const;
export const postalCodeInclude = {
  target: { include: { parent: true } },
  sourceReference: evidence,
} satisfies Prisma.PostalCodeAssignmentInclude;
export type PostalCodeRow = Prisma.PostalCodeAssignmentGetPayload<{ include: typeof postalCodeInclude }>;
type Evidence = PostalCodeRow['sourceReference'];
function source(ref: Evidence): PostalCodeSource {
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
function target(row: PostalCodeRow['target'] | NonNullable<PostalCodeRow['target']['parent']>): PostalCodeTargetResult {
  return { key: row.key, name: row.name, aliases: row.aliases, type: row.type };
}
export function postalCodeResult(row: PostalCodeRow): PostalCodeResult {
  return {
    key: row.key,
    code: row.code,
    status: row.status,
    target: target(row.target),
    hierarchy: row.target.parent ? [target(row.target.parent), target(row.target)] : [target(row.target)],
    effectiveFrom: day(row.effectiveFrom),
    effectiveTo: day(row.effectiveTo),
    source: source(row.sourceReference),
    importedAt: row.importedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
@Injectable()
export class PostalCodesService {
  constructor(private readonly prisma: PrismaService) {}
  private textWhere(q: string): Prisma.PostalCodeAssignmentWhereInput {
    return {
      OR: [
        { code: { startsWith: q } },
        { target: { searchName: { contains: q } } },
        { target: { parent: { searchName: { contains: q } } } },
      ],
    };
  }
  async exact(value: string): Promise<PostalCodeLookupResult> {
    const code = normalizePostalCode(value);
    const rows = await this.prisma.postalCodeAssignment.findMany({
      where: { code, status: 'ACTIVE' },
      include: postalCodeInclude,
      orderBy: { key: 'asc' },
    });
    if (!rows.length) throw new NotFoundException('Postal code not found in the reviewed dataset.');
    return { query: code, matches: rows.map(postalCodeResult), ambiguous: rows.length > 1 };
  }
  async lookup(value: string): Promise<PostalCodeLookupResult> {
    const raw = value.trim().normalize('NFKC');
    if (/^\d+$/.test(raw)) return this.exact(raw);
    const q = normalizeSearch(raw);
    if (!q || q.length > 100) throw new NotFoundException('Locality not found in the reviewed dataset.');
    const rows = await this.prisma.postalCodeAssignment.findMany({
      where: { status: 'ACTIVE', ...this.textWhere(q) },
      include: postalCodeInclude,
      orderBy: [{ code: 'asc' }, { key: 'asc' }],
      take: 200,
    });
    if (!rows.length) throw new NotFoundException('Locality not found in the reviewed dataset.');
    return { query: raw, matches: rows.map(postalCodeResult), ambiguous: rows.length > 1 };
  }
  async list(query: PostalCodeQuery): Promise<PostalCodePage> {
    const page = query.page ?? 1,
      pageSize = query.pageSize ?? 20;
    const q = normalizeSearch(query.q?.trim() ?? '');
    const where: Prisma.PostalCodeAssignmentWhereInput = {
      ...(query.code ? { code: { startsWith: query.code } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.targetType || query.province
        ? {
            target: {
              ...(query.targetType ? { type: query.targetType } : {}),
              ...(query.province ? { parent: { key: query.province } } : {}),
            },
          }
        : {}),
      ...(q ? { AND: [this.textWhere(q)] } : {}),
    };
    const [total, rows] = await this.prisma.$transaction(
      [
        this.prisma.postalCodeAssignment.count({ where }),
        this.prisma.postalCodeAssignment.findMany({
          where,
          include: postalCodeInclude,
          orderBy: [{ code: 'asc' }, { key: 'asc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return { page, pageSize, total, items: rows.map(postalCodeResult) };
  }
  async related(value: string): Promise<PostalCodeResult[]> {
    const resolved = await this.exact(value);
    const parentKeys = resolved.matches.map((x) => x.hierarchy[0]?.key).filter(Boolean) as string[];
    const rows = await this.prisma.postalCodeAssignment.findMany({
      where: { code: { notIn: [resolved.query] }, status: 'ACTIVE', target: { parent: { key: { in: parentKeys } } } },
      include: postalCodeInclude,
      orderBy: [{ code: 'asc' }, { key: 'asc' }],
      take: 20,
    });
    return rows.map(postalCodeResult);
  }
}
