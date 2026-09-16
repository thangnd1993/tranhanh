export type VehicleType = 'CAR' | 'MOTORCYCLE' | 'TRUCK' | 'VAN' | 'OTHER';
export type VehicleStatus = 'ACTIVE' | 'ARCHIVED';

export interface VehicleInput {
  displayName?: string;
  licensePlate: string;
  vehicleType: VehicleType;
  make?: string | null;
  model?: string | null;
  modelYear?: number | null;
  currentOdometerKm?: number | null;
  notes?: string | null;
}

export interface UpdateVehicleInput extends Partial<VehicleInput> {
  allowOdometerCorrection?: boolean;
}

export interface VehicleResult {
  id: string;
  displayName: string;
  licensePlate: string;
  vehicleType: VehicleType;
  make: string | null;
  model: string | null;
  modelYear: number | null;
  currentOdometerKm: number | null;
  notes: string | null;
  isPrimary: boolean;
  status: VehicleStatus;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
