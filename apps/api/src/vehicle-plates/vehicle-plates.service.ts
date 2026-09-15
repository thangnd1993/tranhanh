import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  VehiclePlateAllocationResult,
  VehiclePlateLookupResult,
  VehiclePlatePage,
  VehiclePlateQuery,
  VehiclePlateSource,
} from '@tranhanh/shared';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../database/prisma.service.js';
import { normalizeSearch } from '../common/normalize-search.js';
import { exactVehiclePlatePrefix, parseVehiclePlate, type ParsedVehiclePlate } from './normalize-vehicle-plate.js';

const evidence = { include: { source: true } } as const;
export const vehiclePlateInclude = {
  target: { include: { sourceReference: evidence } },
  sourceReference: evidence,
  history: {
    include: {
      previousTarget: { include: { sourceReference: evidence } },
      sourceReference: evidence,
      transitionReference: evidence,
    },
    orderBy: { effectiveTo: 'desc' },
  },
} satisfies Prisma.VehiclePlateAllocationInclude;
export type VehiclePlateRow = Prisma.VehiclePlateAllocationGetPayload<{ include: typeof vehiclePlateInclude }>;
type Evidence = VehiclePlateRow['sourceReference'];
function source(ref: Evidence): VehiclePlateSource {
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
const day = (value: Date | null): string | null => value?.toISOString().slice(0, 10) ?? null;
function target(row: VehiclePlateRow['target']) {
  return {
    key: row.key,
    name: row.name,
    aliases: row.aliases,
    type: row.type,
    nameContext: 'VEHICLE_PLATE_ALLOCATION' as const,
    source: source(row.sourceReference),
  };
}
export function vehiclePlateResult(row: VehiclePlateRow): VehiclePlateAllocationResult {
  return {
    key: row.key,
    numericPrefix: row.numericPrefix,
    seriesPrefix: row.seriesPrefix,
    status: row.status,
    target: target(row.target),
    effectiveFrom: day(row.effectiveFrom),
    effectiveTo: day(row.effectiveTo),
    previousTargets: row.history.map((item) => ({
      previousTarget: target(item.previousTarget),
      effectiveFrom: day(item.effectiveFrom),
      effectiveTo: day(item.effectiveTo)!,
      source: source(item.sourceReference),
      transitionSource: source(item.transitionReference),
    })),
    source: source(row.sourceReference),
    importedAt: row.importedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
@Injectable()
export class VehiclePlatesService {
  constructor(private readonly prisma: PrismaService) {}
  private async resolve(parsed: ParsedVehiclePlate): Promise<VehiclePlateLookupResult> {
    const rows = await this.prisma.vehiclePlateAllocation.findMany({
      where: {
        numericPrefix: parsed.numericPrefix,
        status: 'ACTIVE',
        ...(parsed.series ? { OR: [{ seriesPrefix: parsed.series }, { seriesPrefix: null }] } : {}),
      },
      include: vehiclePlateInclude,
      orderBy: [{ seriesPrefix: 'asc' }, { key: 'asc' }],
    });
    if (!rows.length) throw new NotFoundException('Vehicle-plate prefix not found in the reviewed dataset.');
    return {
      parsed: {
        numericPrefix: parsed.numericPrefix,
        series: parsed.series,
        seriesAllocationVerified: Boolean(parsed.series && rows.some((row) => row.seriesPrefix === parsed.series)),
      },
      resolution: 'NUMERIC_PREFIX_ALLOCATION',
      allocations: rows.map(vehiclePlateResult),
      ambiguous: rows.length > 1,
      vehicleOrOwnerVerified: false,
    };
  }
  exact(value: string): Promise<VehiclePlateLookupResult> {
    return this.resolve(exactVehiclePlatePrefix(value));
  }
  lookup(value: string): Promise<VehiclePlateLookupResult> {
    return this.resolve(parseVehiclePlate(value));
  }
  async list(query: VehiclePlateQuery): Promise<VehiclePlatePage> {
    const page = query.page ?? 1,
      pageSize = query.pageSize ?? 20;
    const rawQuery = query.q?.trim() ?? '';
    const q = normalizeSearch(rawQuery);
    const allocationInput = /^([1-9]\d)((?:[ABCDEFGHKLMNPSTUVXYZ](?:[ABCDEFGHKLMNPSTUVXYZ0-9])?|RM))?$/i.exec(rawQuery);
    const qWhere: Prisma.VehiclePlateAllocationWhereInput | undefined = allocationInput
      ? {
          numericPrefix: allocationInput[1],
          ...(allocationInput[2]
            ? { OR: [{ seriesPrefix: allocationInput[2].toUpperCase() }, { seriesPrefix: null }] }
            : {}),
        }
      : /^\d{1,2}$/.test(q)
        ? { numericPrefix: { startsWith: q } }
        : q
          ? {
              OR: [{ seriesPrefix: { startsWith: q.toUpperCase() } }, { target: { searchName: { contains: q } } }],
            }
          : undefined;
    const targetWhere: Prisma.VehiclePlateTargetWhereInput = {
      ...(query.target ? { key: query.target } : {}),
      ...(query.targetType ? { type: query.targetType } : {}),
    };
    const where: Prisma.VehiclePlateAllocationWhereInput = {
      ...(query.prefix ? { numericPrefix: { startsWith: query.prefix } } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(Object.keys(targetWhere).length ? { target: targetWhere } : {}),
      ...(qWhere ? { AND: [qWhere] } : {}),
    };
    const [total, rows] = await this.prisma.$transaction(
      [
        this.prisma.vehiclePlateAllocation.count({ where }),
        this.prisma.vehiclePlateAllocation.findMany({
          where,
          include: vehiclePlateInclude,
          orderBy: [{ numericPrefix: 'asc' }, { seriesPrefix: 'asc' }, { key: 'asc' }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
      ],
      { isolationLevel: 'RepeatableRead' },
    );
    return { page, pageSize, total, items: rows.map(vehiclePlateResult) };
  }
  async related(value: string): Promise<VehiclePlateAllocationResult[]> {
    const resolved = await this.resolve(exactVehiclePlatePrefix(value));
    const targetKeys = resolved.allocations.map((row) => row.target.key);
    const keys = resolved.allocations.map((row) => row.key);
    const rows = await this.prisma.vehiclePlateAllocation.findMany({
      where: { key: { notIn: keys }, status: 'ACTIVE', target: { key: { in: targetKeys } } },
      include: vehiclePlateInclude,
      orderBy: [{ numericPrefix: 'asc' }, { seriesPrefix: 'asc' }],
      take: 20,
    });
    return rows.map(vehiclePlateResult);
  }
}
