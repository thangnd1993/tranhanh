export type MaintenanceHistoryStatus = 'ACTIVE' | 'ARCHIVED';
export type MaintenancePlanStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
export type MaintenanceDueStatus = 'DUE' | 'DUE_SOON' | 'NOT_DUE' | 'UNKNOWN_MILEAGE';

export interface MaintenanceHistoryInput {
  title: string;
  category: string;
  serviceDate: string;
  odometerKm?: number | null;
  totalCostVnd?: string | null;
  workshop?: string | null;
  notes?: string | null;
}

export type UpdateMaintenanceHistoryInput = Partial<MaintenanceHistoryInput>;

export interface MaintenanceHistoryResult {
  id: string;
  vehicleId: string;
  title: string;
  category: string;
  serviceDate: string;
  odometerKm: number | null;
  totalCostVnd: string | null;
  workshop: string | null;
  notes: string | null;
  status: MaintenanceHistoryStatus;
  archivedAt: string | null;
  completedPlanId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenancePlanInput {
  title: string;
  dueDate?: string | null;
  dueOdometerKm?: number | null;
  notes?: string | null;
}

export type UpdateMaintenancePlanInput = Partial<MaintenancePlanInput>;

export interface MaintenancePlanResult {
  id: string;
  vehicleId: string;
  title: string;
  dueDate: string | null;
  dueOdometerKm: number | null;
  notes: string | null;
  status: MaintenancePlanStatus;
  dueStatus: MaintenanceDueStatus;
  currentOdometerKm: number | null;
  completedAt: string | null;
  completionHistoryId: string | null;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CompleteMaintenancePlanInput {
  serviceDate: string;
  category: string;
  odometerKm?: number | null;
  totalCostVnd?: string | null;
  workshop?: string | null;
  notes?: string | null;
}

export interface MaintenanceCompletionResult {
  plan: MaintenancePlanResult;
  history: MaintenanceHistoryResult;
}

export interface MaintenanceHistoryListResult {
  items: MaintenanceHistoryResult[];
  page: number;
  pageSize: number;
  total: number;
}

export interface MaintenancePlanListResult {
  items: MaintenancePlanResult[];
  page: number;
  pageSize: number;
  total: number;
}

export interface MaintenanceSummary {
  activeHistoryCount: number;
  activePlanCount: number;
  duePlanCount: number;
  dueSoonPlanCount: number;
  totalCostVnd: string;
  unknownCostHistoryCount: number;
  latestServiceDate: string | null;
}
