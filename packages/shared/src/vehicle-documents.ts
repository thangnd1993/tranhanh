export type VehicleDocumentType =
  | 'VEHICLE_REGISTRATION'
  | 'PERIODIC_INSPECTION'
  | 'COMPULSORY_CIVIL_LIABILITY_INSURANCE'
  | 'VOLUNTARY_VEHICLE_INSURANCE'
  | 'ROAD_USE_FEE'
  | 'OTHER';
export type VehicleDocumentVerificationStatus = 'USER_PROVIDED';
export type VehicleDocumentStatus = 'ACTIVE' | 'ARCHIVED';
export type VehicleDocumentExpiryState = 'NO_EXPIRY' | 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
export const vehicleDocumentReminderOffsets = [30, 15, 7, 1] as const;
export type VehicleDocumentReminderOffset = (typeof vehicleDocumentReminderOffsets)[number];

export interface VehicleDocumentInput {
  type: VehicleDocumentType;
  displayName: string;
  referenceNumber?: string | null;
  issuer?: string | null;
  issuedAt?: string | null;
  effectiveFrom?: string | null;
  expiresAt?: string | null;
  notes?: string | null;
  reminderDaysBefore?: VehicleDocumentReminderOffset[];
}
export type UpdateVehicleDocumentInput = Partial<VehicleDocumentInput>;
export interface VehicleDocumentReminderConfig {
  id: string;
  daysBefore: VehicleDocumentReminderOffset;
  enabled: boolean;
  scheduledFor: string | null;
  lastTriggeredForExpiry: string | null;
}
export interface VehicleDocumentResult {
  id: string;
  vehicleId: string;
  type: VehicleDocumentType;
  displayName: string;
  referenceNumber: string | null;
  issuer: string | null;
  issuedAt: string | null;
  effectiveFrom: string | null;
  expiresAt: string | null;
  notes: string | null;
  verificationStatus: VehicleDocumentVerificationStatus;
  status: VehicleDocumentStatus;
  expiryState: VehicleDocumentExpiryState;
  daysUntilExpiry: number | null;
  reminders: VehicleDocumentReminderConfig[];
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface VehicleDocumentListResult {
  items: VehicleDocumentResult[];
  attention: { expired: number; expiringSoon: number; nextExpiry: string | null };
}
export interface UpdateVehicleDocumentRemindersRequest {
  enabledDaysBefore: VehicleDocumentReminderOffset[];
}
