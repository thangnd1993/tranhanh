import type { FuelEconomyAvailability, FuelEconomyInterval, FuelLogSummary } from '@tranhanh/shared';
import { Prisma } from '../generated/prisma/client.js';

export interface FuelCalculationRow {
  id: string;
  refueledAt: Date;
  odometerKm: number;
  quantity: Prisma.Decimal | string;
  totalCostVnd: bigint;
  isFullTank: boolean;
}
const decimal = (value: Prisma.Decimal | string | number) => new Prisma.Decimal(value);
const fixed = (value: Prisma.Decimal, places: number) => value.toDecimalPlaces(places).toFixed(places);
export function monthBounds(month: string): { from: Date; to: Date } {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error('Invalid month');
  const [year, value] = month.split('-').map(Number);
  return {
    from: new Date(Date.UTC(year, value - 1, 1) - 7 * 60 * 60 * 1000),
    to: new Date(Date.UTC(year, value, 1) - 7 * 60 * 60 * 1000),
  };
}
export function vietnamMonth(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  return `${parts.find((part) => part.type === 'year')!.value}-${parts.find((part) => part.type === 'month')!.value}`;
}
export function calculateFuelEconomy(rows: FuelCalculationRow[]) {
  const ordered = [...rows].sort(
    (a, b) =>
      a.refueledAt.getTime() - b.refueledAt.getTime() || a.odometerKm - b.odometerKm || a.id.localeCompare(b.id),
  );
  const intervals: FuelEconomyInterval[] = [];
  let opening: FuelCalculationRow | null = null;
  let intervalQuantity = decimal(0);
  let intervalCost = 0n;
  let sawZeroDistance = false;
  let entriesAfterOpening = 0;
  for (const row of ordered) {
    if (!opening) {
      if (row.isFullTank) opening = row;
      continue;
    }
    intervalQuantity = intervalQuantity.plus(row.quantity);
    intervalCost += row.totalCostVnd;
    entriesAfterOpening++;
    if (!row.isFullTank) continue;
    const distanceKm = row.odometerKm - opening.odometerKm;
    if (distanceKm > 0) {
      intervals.push({
        openingEntryId: opening.id,
        closingEntryId: row.id,
        distanceKm,
        quantityLiters: fixed(intervalQuantity, 3),
        totalCostVnd: intervalCost.toString(),
        litersPer100Km: fixed(intervalQuantity.times(100).div(distanceKm), 2),
        costPerKmVnd: fixed(decimal(intervalCost.toString()).div(distanceKm), 2),
      });
    } else {
      sawZeroDistance = true;
    }
    opening = row;
    intervalQuantity = decimal(0);
    intervalCost = 0n;
    entriesAfterOpening = 0;
  }
  const availability: FuelEconomyAvailability = intervals.length
    ? 'AVAILABLE'
    : !opening
      ? 'NO_FULL_TANK_BASELINE'
      : sawZeroDistance
        ? 'ZERO_DISTANCE'
        : entriesAfterOpening
          ? 'OPEN_INTERVAL'
          : 'INSUFFICIENT_DATA';
  return { intervals, availability };
}
export function buildFuelSummary(rows: FuelCalculationRow[], month: string): FuelLogSummary {
  const ordered = [...rows].sort((a, b) => a.refueledAt.getTime() - b.refueledAt.getTime());
  const { from, to } = monthBounds(month);
  const monthly = ordered.filter((row) => row.refueledAt >= from && row.refueledAt < to);
  const totalQuantity = monthly.reduce((sum, row) => sum.plus(row.quantity), decimal(0));
  const totalCost = monthly.reduce((sum, row) => sum + row.totalCostVnd, 0n);
  const economy = calculateFuelEconomy(ordered);
  const totalDistance = economy.intervals.reduce((sum, interval) => sum + interval.distanceKm, 0);
  const economyQuantity = economy.intervals.reduce((sum, interval) => sum.plus(interval.quantityLiters), decimal(0));
  const economyCost = economy.intervals.reduce((sum, interval) => sum + BigInt(interval.totalCostVnd), 0n);
  const latest = ordered.at(-1);
  return {
    month,
    refuelCount: monthly.length,
    totalQuantityLiters: fixed(totalQuantity, 3),
    totalCostVnd: totalCost.toString(),
    averageActualUnitPriceVnd: totalQuantity.gt(0) ? fixed(decimal(totalCost.toString()).div(totalQuantity), 2) : null,
    completedIntervalCount: economy.intervals.length,
    averageLitersPer100Km: totalDistance > 0 ? fixed(economyQuantity.times(100).div(totalDistance), 2) : null,
    costPerKmVnd: totalDistance > 0 ? fixed(decimal(economyCost.toString()).div(totalDistance), 2) : null,
    economyAvailability: economy.availability,
    latestOdometerKm: latest?.odometerKm ?? null,
    latestRefueledAt: latest?.refueledAt.toISOString() ?? null,
    intervals: economy.intervals,
  };
}
