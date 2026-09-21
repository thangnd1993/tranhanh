import type { MaintenanceDueStatus, MaintenancePlanInput } from '@tranhanh/shared';

export const maintenanceDueSoonDays = 30;
export const maintenanceDueSoonOdometerKm = 1_000;

const vietnamDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function vietnamToday(now = new Date()): string {
  return vietnamDateFormatter.format(now);
}

export function dateOnly(value: Date | null | undefined): string | null {
  return value ? value.toISOString().slice(0, 10) : null;
}

export function parseDateOnly(value: string | null | undefined): Date | null {
  if (value === undefined || value === null || value === '') return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Invalid calendar date.');
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value)
    throw new Error('Invalid calendar date.');
  return parsed;
}

function daysBetween(from: string, to: string): number {
  const fromTime = Date.parse(`${from}T00:00:00.000Z`);
  const toTime = Date.parse(`${to}T00:00:00.000Z`);
  return Math.floor((toTime - fromTime) / 86_400_000);
}

export function maintenanceDueStatus(
  plan: Pick<MaintenancePlanInput, 'dueDate' | 'dueOdometerKm'>,
  currentOdometerKm: number | null,
  today = vietnamToday(),
): MaintenanceDueStatus {
  const dueByDate = !!plan.dueDate && plan.dueDate <= today;
  const dueByOdometer =
    plan.dueOdometerKm !== null && plan.dueOdometerKm !== undefined && currentOdometerKm !== null
      ? currentOdometerKm >= plan.dueOdometerKm
      : false;
  if (dueByDate || dueByOdometer) return 'DUE';

  const dateSoon =
    !!plan.dueDate &&
    daysBetween(today, plan.dueDate) >= 0 &&
    daysBetween(today, plan.dueDate) <= maintenanceDueSoonDays;
  const odometerSoon =
    plan.dueOdometerKm !== null &&
    plan.dueOdometerKm !== undefined &&
    currentOdometerKm !== null &&
    plan.dueOdometerKm - currentOdometerKm <= maintenanceDueSoonOdometerKm &&
    plan.dueOdometerKm - currentOdometerKm >= 0;
  if (dateSoon || odometerSoon) return 'DUE_SOON';

  if (plan.dueOdometerKm !== null && plan.dueOdometerKm !== undefined && currentOdometerKm === null)
    return 'UNKNOWN_MILEAGE';
  return 'NOT_DUE';
}
