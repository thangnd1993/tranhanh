import { BadRequestException } from '@nestjs/common';
import type { VehicleInput, VehicleType } from '@tranhanh/shared';

export interface NormalizedVehicleInput {
  displayName: string;
  licensePlate: string;
  normalizedLicensePlate: string;
  vehicleType: VehicleType;
  make: string | null;
  model: string | null;
  modelYear: number | null;
  currentOdometerKm: number | null;
  notes: string | null;
}

const cleanOptional = (value: string | null | undefined, max: number): string | null => {
  if (value == null) return null;
  const cleaned = value.normalize('NFC').replace(/\s+/gu, ' ').trim();
  if (!cleaned) return null;
  if (cleaned.length > max || /[\p{Cc}\p{Cf}]/u.test(cleaned))
    throw new BadRequestException('Invalid vehicle details.');
  return cleaned;
};

export function normalizeFullPlate(value: string): { display: string; normalized: string } {
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

export function normalizeVehicleInput(input: VehicleInput): NormalizedVehicleInput {
  const plate = normalizeFullPlate(input.licensePlate);
  const make = cleanOptional(input.make, 100);
  const model = cleanOptional(input.model, 100);
  const explicitName = cleanOptional(input.displayName, 100);
  const displayName = explicitName ?? ([make, model].filter(Boolean).join(' ') || plate.display);
  const currentYear = new Date().getUTCFullYear();
  if (
    input.modelYear != null &&
    (!Number.isInteger(input.modelYear) || input.modelYear < 1886 || input.modelYear > currentYear + 1)
  )
    throw new BadRequestException('Invalid model year.');
  if (
    input.currentOdometerKm != null &&
    (!Number.isInteger(input.currentOdometerKm) || input.currentOdometerKm < 0 || input.currentOdometerKm > 10_000_000)
  )
    throw new BadRequestException('Invalid odometer value.');
  return {
    displayName,
    licensePlate: plate.display,
    normalizedLicensePlate: plate.normalized,
    vehicleType: input.vehicleType,
    make,
    model,
    modelYear: input.modelYear ?? null,
    currentOdometerKm: input.currentOdometerKm ?? null,
    notes: cleanOptional(input.notes, 1000),
  };
}
