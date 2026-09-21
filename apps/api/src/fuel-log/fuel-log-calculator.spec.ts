import { describe, expect, it } from 'vitest';
import { Prisma } from '../generated/prisma/client.js';
import { buildFuelSummary, calculateFuelEconomy } from './fuel-log-calculator.js';
const row = (id: string, km: number, liters: string, cost: bigint, full: boolean, day = id) => ({
  id,
  odometerKm: km,
  quantity: new Prisma.Decimal(liters),
  totalCostVnd: cost,
  isFullTank: full,
  refueledAt: new Date(`2026-09-${day.padStart(2, '0')}T08:00:00Z`),
});
describe('fuel log full-tank calculations', () => {
  it('handles no entries', () => expect(calculateFuelEconomy([]).availability).toBe('NO_FULL_TANK_BASELINE'));
  it('does not calculate one partial fill', () =>
    expect(calculateFuelEconomy([row('01', 100, '5', 100000n, false)]).intervals).toEqual([]));
  it('uses the first full tank only as baseline', () =>
    expect(calculateFuelEconomy([row('01', 10000, '40', 900000n, true)]).availability).toBe('INSUFFICIENT_DATA'));
  it('calculates two consecutive full tanks', () =>
    expect(
      calculateFuelEconomy([row('01', 10000, '40', 900000n, true), row('02', 10500, '35', 800000n, true)]).intervals[0],
    ).toMatchObject({ distanceKm: 500, quantityLiters: '35.000', litersPer100Km: '7.00' }));
  it('includes a partial fill between full tanks', () =>
    expect(
      calculateFuelEconomy([
        row('01', 10000, '40', 900000n, true),
        row('02', 10300, '20', 500000n, false),
        row('03', 10800, '25', 625000n, true),
      ]).intervals[0].quantityLiters,
    ).toBe('45.000'));
  it('sums multiple partial fills and exact cost through the closing full tank', () => {
    const result = calculateFuelEconomy([
      row('01', 10000, '40', 900000n, true),
      row('02', 10300, '20', 400000n, false),
      row('03', 10550, '15', 300000n, false),
      row('04', 10800, '25', 500000n, true),
    ]).intervals[0];
    expect(result).toMatchObject({
      distanceKm: 800,
      quantityLiters: '60.000',
      totalCostVnd: '1200000',
      litersPer100Km: '7.50',
      costPerKmVnd: '1500.00',
    });
  });
  it('never calculates a zero-distance interval', () =>
    expect(calculateFuelEconomy([row('01', 100, '5', 100n, true), row('02', 100, '5', 100n, true)]).availability).toBe(
      'ZERO_DISTANCE',
    ));
  it('recalculates after quantity edit', () =>
    expect(
      calculateFuelEconomy([row('01', 0, '1', 1n, true), row('02', 100, '8', 8n, true)]).intervals[0].litersPer100Km,
    ).toBe('8.00'));
  it('recalculates after odometer edit', () =>
    expect(
      calculateFuelEconomy([row('01', 0, '1', 1n, true), row('02', 200, '10', 10n, true)]).intervals[0].litersPer100Km,
    ).toBe('5.00'));
  it('recalculates after toggling full-tank flag', () =>
    expect(calculateFuelEconomy([row('01', 0, '1', 1n, true), row('02', 100, '5', 5n, false)]).availability).toBe(
      'OPEN_INTERVAL',
    ));
  it('excludes an archived partial when caller supplies active rows', () =>
    expect(
      calculateFuelEconomy([row('01', 0, '1', 1n, true), row('03', 100, '5', 5n, true)]).intervals[0].quantityLiters,
    ).toBe('5.000'));
  it('leaves an open interval when closing full tank is archived', () =>
    expect(calculateFuelEconomy([row('01', 0, '1', 1n, true), row('02', 50, '2', 2n, false)]).availability).toBe(
      'OPEN_INTERVAL',
    ));
  it('restores calculations when a closing entry returns', () =>
    expect(
      calculateFuelEconomy([row('01', 0, '1', 1n, true), row('02', 50, '2', 2n, false), row('03', 100, '3', 3n, true)])
        .intervals,
    ).toHaveLength(1));
  it('does not finalize the latest incomplete interval', () =>
    expect(
      calculateFuelEconomy([row('01', 0, '1', 1n, true), row('02', 100, '5', 5n, true), row('03', 150, '3', 3n, false)])
        .intervals,
    ).toHaveLength(1));
  it('uses a distance-weighted overall average', () => {
    const summary = buildFuelSummary(
      [row('01', 0, '1', 1n, true), row('02', 100, '10', 100n, true), row('03', 300, '10', 100n, true)],
      '2026-09',
    );
    expect(summary.averageLitersPer100Km).toBe('6.67');
  });
  it('uses Vietnam calendar month boundaries', () => {
    const rows = [
      { ...row('01', 1, '1.250', 100001n, false), refueledAt: new Date('2026-08-31T17:00:00Z') },
      { ...row('02', 2, '2.750', 200002n, false), refueledAt: new Date('2026-09-30T16:59:59Z') },
      { ...row('03', 3, '9', 900000n, false), refueledAt: new Date('2026-09-30T17:00:00Z') },
    ];
    expect(buildFuelSummary(rows, '2026-09')).toMatchObject({
      refuelCount: 2,
      totalQuantityLiters: '4.000',
      totalCostVnd: '300003',
    });
  });
  it('orders a backfilled historical entry into the correct interval', () => {
    const rows = [
      row('01', 10000, '1', 1n, true),
      row('04', 10800, '25', 500000n, true),
      row('02', 10300, '20', 400000n, false),
      row('03', 10550, '15', 300000n, false),
    ];
    expect(calculateFuelEconomy(rows).intervals[0]).toMatchObject({ distanceKm: 800, quantityLiters: '60.000' });
  });
});
