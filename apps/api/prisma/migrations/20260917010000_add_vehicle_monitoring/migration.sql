BEGIN;
CREATE TYPE "VehicleMonitoringType" AS ENUM ('TRAFFIC_FINE');
CREATE TYPE "VehicleMonitoringStatus" AS ENUM ('DISABLED', 'ENABLED_AND_ACTIVE', 'ENABLED_BUT_MANUAL', 'SUSPENDED', 'PROVIDER_UNAVAILABLE');
CREATE TYPE "MonitoringProviderCapability" AS ENUM ('AUTOMATED', 'LIMITED', 'MANUAL_ONLY', 'UNAVAILABLE');
CREATE TYPE "VehicleMonitoringOutcome" AS ENUM ('SUCCEEDED', 'NO_CHANGE', 'CHANGED', 'FAILED');
CREATE TABLE "VehicleMonitoring" (
  "id" UUID NOT NULL, "userId" UUID NOT NULL, "vehicleId" UUID NOT NULL,
  "monitoringType" "VehicleMonitoringType" NOT NULL, "providerKey" VARCHAR(100) NOT NULL,
  "status" "VehicleMonitoringStatus" NOT NULL DEFAULT 'DISABLED', "isEnabled" BOOLEAN NOT NULL DEFAULT false,
  "capability" "MonitoringProviderCapability" NOT NULL, "automationApprovedAt" TIMESTAMPTZ(3),
  "lastAttemptAt" TIMESTAMPTZ(3), "lastSuccessfulCheckAt" TIMESTAMPTZ(3), "nextEligibleCheckAt" TIMESTAMPTZ(3),
  "lastOutcome" "VehicleMonitoringOutcome", "failureCount" INTEGER NOT NULL DEFAULT 0, "lastErrorCode" VARCHAR(100),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "VehicleMonitoring_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VehicleMonitoring_failure_count_check" CHECK ("failureCount" >= 0),
  CONSTRAINT "VehicleMonitoring_disabled_schedule_check" CHECK ("isEnabled" OR "nextEligibleCheckAt" IS NULL)
);
CREATE TABLE "VehicleMonitoringRun" (
  "id" UUID NOT NULL, "monitoringId" UUID NOT NULL, "providerKey" VARCHAR(100) NOT NULL,
  "startedAt" TIMESTAMPTZ(3) NOT NULL, "finishedAt" TIMESTAMPTZ(3) NOT NULL,
  "outcome" "VehicleMonitoringOutcome" NOT NULL, "normalizedResultCount" INTEGER NOT NULL,
  "changeDetected" BOOLEAN NOT NULL DEFAULT false, "errorCode" VARCHAR(100),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleMonitoringRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VehicleMonitoringRun_time_check" CHECK ("finishedAt" >= "startedAt"),
  CONSTRAINT "VehicleMonitoringRun_count_check" CHECK ("normalizedResultCount" >= 0)
);
CREATE TABLE "VehicleMonitoringSnapshot" (
  "id" UUID NOT NULL, "monitoringId" UUID NOT NULL, "providerKey" VARCHAR(100) NOT NULL,
  "fingerprints" TEXT[] NOT NULL, "resultCount" INTEGER NOT NULL, "retrievedAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "VehicleMonitoringSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VehicleMonitoringSnapshot_count_check" CHECK ("resultCount" >= 0 AND "resultCount" = cardinality("fingerprints"))
);
CREATE UNIQUE INDEX "Vehicle_id_userId_key" ON "Vehicle"("id", "userId");
CREATE UNIQUE INDEX "VehicleMonitoring_vehicleId_monitoringType_key" ON "VehicleMonitoring"("vehicleId", "monitoringType");
CREATE INDEX "VehicleMonitoring_userId_idx" ON "VehicleMonitoring"("userId");
CREATE INDEX "VehicleMonitoring_status_isEnabled_nextEligibleCheckAt_idx" ON "VehicleMonitoring"("status", "isEnabled", "nextEligibleCheckAt");
CREATE INDEX "VehicleMonitoring_providerKey_idx" ON "VehicleMonitoring"("providerKey");
CREATE INDEX "VehicleMonitoringRun_monitoringId_startedAt_idx" ON "VehicleMonitoringRun"("monitoringId", "startedAt" DESC);
CREATE UNIQUE INDEX "VehicleMonitoringSnapshot_monitoringId_key" ON "VehicleMonitoringSnapshot"("monitoringId");
CREATE INDEX "VehicleMonitoringSnapshot_providerKey_retrievedAt_idx" ON "VehicleMonitoringSnapshot"("providerKey", "retrievedAt" DESC);
ALTER TABLE "VehicleMonitoring" ADD CONSTRAINT "VehicleMonitoring_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE "VehicleMonitoring" ADD CONSTRAINT "VehicleMonitoring_vehicleId_fkey" FOREIGN KEY ("vehicleId", "userId") REFERENCES "Vehicle"("id", "userId") ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE "VehicleMonitoringRun" ADD CONSTRAINT "VehicleMonitoringRun_monitoringId_fkey" FOREIGN KEY ("monitoringId") REFERENCES "VehicleMonitoring"("id") ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE "VehicleMonitoringSnapshot" ADD CONSTRAINT "VehicleMonitoringSnapshot_monitoringId_fkey" FOREIGN KEY ("monitoringId") REFERENCES "VehicleMonitoring"("id") ON DELETE CASCADE ON UPDATE RESTRICT;
INSERT INTO "VehicleMonitoring" ("id", "userId", "vehicleId", "monitoringType", "providerKey", "capability", "createdAt", "updatedAt")
SELECT gen_random_uuid(), "userId", "id", 'TRAFFIC_FINE', 'csgt-manual', 'MANUAL_ONLY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP FROM "Vehicle";
COMMIT;
