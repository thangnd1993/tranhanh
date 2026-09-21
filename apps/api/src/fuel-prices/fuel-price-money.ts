import type { FuelPriceDirection } from '@tranhanh/shared';

export function priceChange(
  current: bigint,
  previous: bigint | null,
): { amount: bigint | null; direction: FuelPriceDirection | null; percentage: string | null } {
  if (previous === null) return { amount: null, direction: null, percentage: null };
  const amount = current - previous;
  const direction: FuelPriceDirection = amount > 0n ? 'INCREASE' : amount < 0n ? 'DECREASE' : 'UNCHANGED';
  if (previous <= 0n) return { amount, direction, percentage: null };
  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;
  const hundredths = (absolute * 10_000n + previous / 2n) / previous;
  const percentage = `${negative ? '-' : ''}${hundredths / 100n}.${String(hundredths % 100n).padStart(2, '0')}`;
  return { amount, direction, percentage };
}
