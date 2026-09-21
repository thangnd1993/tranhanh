export type FuelLogEntryStatus = 'ACTIVE' | 'ARCHIVED';
export type FuelLogUnit = 'LITER';
export type FuelLogProductKey = 'e5-ron-92' | 'e10-ron-95-iii' | 'diesel-0-05s' | 'OTHER';
export type FuelEconomyAvailability =
  'AVAILABLE' | 'NO_FULL_TANK_BASELINE' | 'OPEN_INTERVAL' | 'ZERO_DISTANCE' | 'INSUFFICIENT_DATA';

export interface FuelLogEntryInput {
  refueledAt: string;
  odometerKm: number;
  quantity: string;
  unit?: FuelLogUnit;
  totalCostVnd: string;
  fuelProductKey?: FuelLogProductKey | null;
  customFuelLabel?: string | null;
  isFullTank: boolean;
  station?: string | null;
  notes?: string | null;
}
export type UpdateFuelLogEntryInput = Partial<FuelLogEntryInput>;
export interface FuelLogEntryResult {
  id: string;
  vehicleId: string;
  refueledAt: string;
  odometerKm: number;
  quantity: string;
  unit: FuelLogUnit;
  totalCostVnd: string;
  effectivePricePerLiterVnd: string;
  fuelProductKey: FuelLogProductKey | null;
  customFuelLabel: string | null;
  isFullTank: boolean;
  station: string | null;
  notes: string | null;
  status: FuelLogEntryStatus;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface FuelEconomyInterval {
  openingEntryId: string;
  closingEntryId: string;
  distanceKm: number;
  quantityLiters: string;
  totalCostVnd: string;
  litersPer100Km: string;
  costPerKmVnd: string;
}
export interface FuelLogSummary {
  month: string;
  refuelCount: number;
  totalQuantityLiters: string;
  totalCostVnd: string;
  averageActualUnitPriceVnd: string | null;
  completedIntervalCount: number;
  averageLitersPer100Km: string | null;
  costPerKmVnd: string | null;
  economyAvailability: FuelEconomyAvailability;
  latestOdometerKm: number | null;
  latestRefueledAt: string | null;
  intervals: FuelEconomyInterval[];
}
export interface FuelLogListResult {
  items: FuelLogEntryResult[];
  page: number;
  pageSize: number;
  total: number;
}
