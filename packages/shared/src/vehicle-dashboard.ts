import type { FuelLogSummary } from './fuel-log.js';
import type { VehicleDocumentListResult } from './vehicle-documents.js';
import type { VehicleExpenseSummary } from './vehicle-expenses.js';
import type { VehicleMonitoringResult } from './vehicle-monitoring.js';
import type { VehicleType } from './vehicles.js';

/** The small, non-editable vehicle shape used by the dashboard selector. */
export interface VehicleDashboardOption {
  id: string;
  displayName: string;
  licensePlate: string;
  vehicleType: VehicleType;
  isPrimary: boolean;
}

export interface VehicleDashboardSelectedVehicle extends VehicleDashboardOption {
  currentOdometerKm: number | null;
}

export interface VehicleDashboardMaintenanceSummary {
  activePlanCount: number;
  duePlanCount: number;
  dueSoonPlanCount: number;
  unknownMileagePlanCount: number;
}

export interface VehicleDashboardFeatureLink {
  key: 'GARAGE' | 'DOCUMENTS' | 'FUEL_LOG' | 'MAINTENANCE' | 'EXPENSES' | 'MONITORING';
  path: string;
}

/**
 * A private read-only dashboard. Card values are read independently and are
 * therefore intentionally accompanied by one response refresh timestamp,
 * rather than presented as an atomic account-wide snapshot.
 */
export interface VehicleDashboardResult {
  month: string;
  refreshedAt: string;
  activeVehicleCount: number;
  vehicles: VehicleDashboardOption[];
  selectedVehicle: VehicleDashboardSelectedVehicle | null;
  documentAttention: VehicleDocumentListResult['attention'] | null;
  maintenance: VehicleDashboardMaintenanceSummary | null;
  expenses: VehicleExpenseSummary | null;
  fuel: FuelLogSummary | null;
  monitoring: VehicleMonitoringResult | null;
  featureLinks: VehicleDashboardFeatureLink[];
}
