export type VehicleExpenseCategory = 'INSURANCE' | 'REGISTRATION' | 'TOLL' | 'PARKING' | 'OTHER';
export type VehicleExpenseStatus = 'ACTIVE' | 'ARCHIVED';
export type VehicleExpenseLedgerSource = 'FUEL' | 'MAINTENANCE' | 'MANUAL';

export interface VehicleExpenseInput {
  category: Exclude<VehicleExpenseCategory, 'FUEL' | 'MAINTENANCE'>;
  title: string;
  expenseDate: string;
  totalCostVnd: string;
  notes?: string | null;
}

export type UpdateVehicleExpenseInput = Partial<VehicleExpenseInput>;
export type ManualVehicleExpenseInput = VehicleExpenseInput;

export interface VehicleExpenseResult {
  id: string;
  vehicleId: string;
  category: VehicleExpenseCategory;
  title: string;
  expenseDate: string;
  totalCostVnd: string;
  notes: string | null;
  status: VehicleExpenseStatus;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ManualVehicleExpenseResult = VehicleExpenseResult;

export interface VehicleExpenseLedgerEntry {
  source: VehicleExpenseLedgerSource;
  sourceId: string;
  originalId: string;
  vehicleId: string;
  category: string;
  date: string;
  title: string;
  totalCostVnd: string | null;
  status: VehicleExpenseStatus;
  sourcePath: string;
}

export interface VehicleExpenseLedgerResult {
  items: VehicleExpenseLedgerEntry[];
  page: number;
  pageSize: number;
  total: number;
}

export interface VehicleExpenseListResult {
  items: VehicleExpenseResult[];
  page: number;
  pageSize: number;
  total: number;
}

export interface VehicleExpenseSourceSummary {
  count: number;
  recordedTotalCostVnd: string;
  unknownCostCount: number;
}

export interface VehicleExpenseCategorySummary {
  category: string;
  count: number;
  recordedTotalCostVnd: string;
  unknownCostCount: number;
}

export interface VehicleExpenseSummary {
  month: string;
  recordedTotalCostVnd: string;
  totalCostVnd: string;
  totalCount: number;
  fuel: VehicleExpenseSourceSummary;
  maintenance: VehicleExpenseSourceSummary;
  manual: VehicleExpenseSourceSummary;
  bySource: {
    FUEL: VehicleExpenseSourceSummary;
    MAINTENANCE: VehicleExpenseSourceSummary;
    MANUAL: VehicleExpenseSourceSummary;
  };
  byCategory: VehicleExpenseCategorySummary[];
  unknownMaintenanceCostCount: number;
  incomplete: boolean;
}

export interface VehicleExpenseListQuery {
  status?: VehicleExpenseStatus | 'ALL';
  month?: string;
  page?: number;
  pageSize?: number;
}
