BEGIN;

CREATE TYPE "MaintenanceHistoryStatus" AS ENUM ('ACTIVE', 'ARCHIVED');
CREATE TYPE "MaintenancePlanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'ARCHIVED');

CREATE TABLE "MaintenanceHistory" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "vehicleId" UUID NOT NULL,
  "title" VARCHAR(150) NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "serviceDate" DATE NOT NULL,
  "odometerKm" INTEGER,
  "totalCostVnd" BIGINT,
  "workshop" VARCHAR(200),
  "notes" VARCHAR(1000),
  "status" "MaintenanceHistoryStatus" NOT NULL DEFAULT 'ACTIVE',
  "archivedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "MaintenanceHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MaintenanceHistory_odometer_check" CHECK ("odometerKm" IS NULL OR ("odometerKm" >= 0 AND "odometerKm" <= 10000000)),
  CONSTRAINT "MaintenanceHistory_total_cost_check" CHECK ("totalCostVnd" IS NULL OR "totalCostVnd" >= 0),
  CONSTRAINT "MaintenanceHistory_archive_check" CHECK (("status" = 'ARCHIVED') = ("archivedAt" IS NOT NULL))
);

CREATE TABLE "MaintenancePlan" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "vehicleId" UUID NOT NULL,
  "title" VARCHAR(150) NOT NULL,
  "dueDate" DATE,
  "dueOdometerKm" INTEGER,
  "notes" VARCHAR(1000),
  "status" "MaintenancePlanStatus" NOT NULL DEFAULT 'ACTIVE',
  "completedAt" TIMESTAMPTZ(3),
  "completionHistoryId" UUID,
  "archivedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "MaintenancePlan_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "MaintenancePlan_due_check" CHECK ("dueDate" IS NOT NULL OR "dueOdometerKm" IS NOT NULL),
  CONSTRAINT "MaintenancePlan_odometer_check" CHECK ("dueOdometerKm" IS NULL OR ("dueOdometerKm" >= 0 AND "dueOdometerKm" <= 10000000)),
  CONSTRAINT "MaintenancePlan_archive_check" CHECK (("status" = 'ARCHIVED') = ("archivedAt" IS NOT NULL)),
  CONSTRAINT "MaintenancePlan_completion_check" CHECK (
    ("status" = 'ACTIVE' AND "completedAt" IS NULL AND "completionHistoryId" IS NULL)
    OR ("status" = 'COMPLETED' AND "completedAt" IS NOT NULL AND "completionHistoryId" IS NOT NULL)
    OR ("status" = 'ARCHIVED' AND (("completedAt" IS NULL AND "completionHistoryId" IS NULL)
      OR ("completedAt" IS NOT NULL AND "completionHistoryId" IS NOT NULL)))
  )
);

CREATE UNIQUE INDEX "MaintenanceHistory_id_userId_vehicleId_key" ON "MaintenanceHistory"("id", "userId", "vehicleId");
CREATE INDEX "MaintenanceHistory_userId_vehicleId_idx" ON "MaintenanceHistory"("userId", "vehicleId");
CREATE INDEX "MaintenanceHistory_vehicleId_status_serviceDate_id_idx" ON "MaintenanceHistory"("vehicleId", "status", "serviceDate" DESC, "id");
CREATE INDEX "MaintenanceHistory_vehicleId_serviceDate_idx" ON "MaintenanceHistory"("vehicleId", "serviceDate");
CREATE UNIQUE INDEX "MaintenancePlan_id_userId_vehicleId_key" ON "MaintenancePlan"("id", "userId", "vehicleId");
CREATE UNIQUE INDEX "MaintenancePlan_completionHistoryId_key" ON "MaintenancePlan"("completionHistoryId");
CREATE INDEX "MaintenancePlan_userId_vehicleId_idx" ON "MaintenancePlan"("userId", "vehicleId");
CREATE INDEX "MaintenancePlan_vehicleId_status_dueDate_idx" ON "MaintenancePlan"("vehicleId", "status", "dueDate");
CREATE INDEX "MaintenancePlan_vehicleId_status_dueOdometerKm_idx" ON "MaintenancePlan"("vehicleId", "status", "dueOdometerKm");

ALTER TABLE "MaintenanceHistory" ADD CONSTRAINT "MaintenanceHistory_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE "MaintenanceHistory" ADD CONSTRAINT "MaintenanceHistory_vehicleId_userId_fkey"
  FOREIGN KEY ("vehicleId", "userId") REFERENCES "Vehicle"("id", "userId") ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_vehicleId_userId_fkey"
  FOREIGN KEY ("vehicleId", "userId") REFERENCES "Vehicle"("id", "userId") ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE "MaintenancePlan" ADD CONSTRAINT "MaintenancePlan_completionHistoryId_fkey"
  FOREIGN KEY ("completionHistoryId", "userId", "vehicleId") REFERENCES "MaintenanceHistory"("id", "userId", "vehicleId") ON DELETE CASCADE ON UPDATE RESTRICT;

COMMIT;
