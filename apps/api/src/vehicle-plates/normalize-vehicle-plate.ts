import { BadRequestException } from '@nestjs/common';

export interface ParsedVehiclePlate {
  numericPrefix: string;
  series: string | null;
  kind: 'NUMERIC_PREFIX' | 'ALLOCATION_PREFIX' | 'FULL_PLATE';
}
const SERIES =
  '(?:[ABCDEFGHKLMNPSTUVXYZabcdefghklmnpstuvxyz](?:[ABCDEFGHKLMNPSTUVXYZabcdefghklmnpstuvxyz0-9])?|[Rr][Mm])';
const prefixPattern = new RegExp(`^([1-9]\\d)(${SERIES})?$`);
const fullPattern = new RegExp(`^([1-9]\\d)(${SERIES})[- ](\\d{3})(?:\\.(\\d{2})|(\\d{1,2}))$`);

/** Extract public allocation components only. The registration serial is intentionally discarded. */
export function parseVehiclePlate(value: string, allowFullPlate = true): ParsedVehiclePlate {
  const input = value.trim();
  if (!input || input.length > 24 || /[\r\n\t]/.test(input)) {
    throw new BadRequestException('Invalid or unsupported Vietnamese vehicle-plate input.');
  }
  const exact = prefixPattern.exec(input);
  if (exact) {
    const series = exact[2]?.toUpperCase() ?? null;
    return { numericPrefix: exact[1], series, kind: series ? 'ALLOCATION_PREFIX' : 'NUMERIC_PREFIX' };
  }
  const full = allowFullPlate ? fullPattern.exec(input) : null;
  if (full) {
    return { numericPrefix: full[1], series: full[2].toUpperCase(), kind: 'FULL_PLATE' };
  }
  throw new BadRequestException('Invalid or unsupported Vietnamese vehicle-plate input.');
}

export function exactVehiclePlatePrefix(value: string): ParsedVehiclePlate {
  return parseVehiclePlate(value, false);
}
