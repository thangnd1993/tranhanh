import { BadRequestException } from '@nestjs/common';
import type { VehicleInput, VehicleType } from '@tranhanh/shared';
import { normalizeFullVehiclePlate } from '../common/normalize-full-vehicle-plate.js';
export { normalizeFullVehiclePlate as normalizeFullPlate } from '../common/normalize-full-vehicle-plate.js';

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

export function normalizeVehicleInput(input: VehicleInput): NormalizedVehicleInput {
  const plate = normalizeFullVehiclePlate(input.licensePlate);
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
