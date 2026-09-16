import { BadRequestException } from '@nestjs/common';

export interface NormalizedFullVehiclePlate {
  display: string;
  normalized: string;
}

export function normalizeFullVehiclePlate(value: string): NormalizedFullVehiclePlate {
  const normalized = value
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[\s.-]+/gu, '');
  const match =
    normalized.match(/^([1-9]\d)([A-Z][A-Z0-9]?)(\d{5,6})$/) ?? normalized.match(/^([1-9]\d)([A-Z][A-Z0-9]?)(\d{4})$/);
  if (!match) throw new BadRequestException('Invalid Vietnamese vehicle plate.');
  const [, area, series, serial] = match;
  const displaySerial = serial.length === 5 ? `${serial.slice(0, 3)}.${serial.slice(3)}` : serial;
  return { display: `${area}${series}-${displaySerial}`, normalized };
}

export function maskFullVehiclePlate(display: string): string {
  const [head, serialPart] = display.split('-', 2);
  const serial = serialPart?.replace(/\D/gu, '') ?? '';
  if (!head || serial.length < 4) throw new BadRequestException('Invalid Vietnamese vehicle plate.');
  return `${head}-${'*'.repeat(Math.max(2, serial.length - 2))}.${serial.slice(-2)}`;
}
