import type { VehicleDocumentExpiryState } from '@tranhanh/shared';
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  if (!DATE_ONLY.test(value)) throw new Error('INVALID_DATE_ONLY');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new Error('INVALID_DATE_ONLY');
  return date;
}
export const dateOnly = (value: Date | null | undefined): string | null => value?.toISOString().slice(0, 10) ?? null;
export function vietnamToday(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const read = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${read('year')}-${read('month')}-${read('day')}`;
}
export function addDays(value: string, days: number): string {
  const date = parseDateOnly(value)!;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export const dayDifference = (from: string, to: string): number =>
  Math.round((parseDateOnly(to)!.getTime() - parseDateOnly(from)!.getTime()) / DAY_MS);
export function expiryDetails(
  expiresAt: Date | null,
  now = new Date(),
): { expiryState: VehicleDocumentExpiryState; daysUntilExpiry: number | null } {
  const expiry = dateOnly(expiresAt);
  if (!expiry) return { expiryState: 'NO_EXPIRY', daysUntilExpiry: null };
  const daysUntilExpiry = dayDifference(vietnamToday(now), expiry);
  return {
    expiryState: daysUntilExpiry < 0 ? 'EXPIRED' : daysUntilExpiry <= 30 ? 'EXPIRING_SOON' : 'VALID',
    daysUntilExpiry,
  };
}
export const vietnamStartOfDay = (value: string): Date => new Date(`${value}T00:00:00+07:00`);
