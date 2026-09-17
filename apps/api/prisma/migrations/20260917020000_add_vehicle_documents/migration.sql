BEGIN;

CREATE TYPE "VehicleDocumentType" AS ENUM ('VEHICLE_REGISTRATION', 'PERIODIC_INSPECTION', 'COMPULSORY_CIVIL_LIABILITY_INSURANCE', 'VOLUNTARY_VEHICLE_INSURANCE', 'ROAD_USE_FEE', 'OTHER');
CREATE TYPE "VehicleDocumentVerificationStatus" AS ENUM ('USER_PROVIDED');
CREATE TYPE "VehicleDocumentStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "VehicleDocument" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "vehicleId" UUID NOT NULL,
  "type" "VehicleDocumentType" NOT NULL,
  "displayName" VARCHAR(150) NOT NULL,
  "referenceNumber" VARCHAR(150),
  "issuer" VARCHAR(200),
  "issuedAt" DATE,
  "effectiveFrom" DATE,
  "expiresAt" DATE,
  "notes" VARCHAR(1000),
  "verificationStatus" "VehicleDocumentVerificationStatus" NOT NULL DEFAULT 'USER_PROVIDED',
  "status" "VehicleDocumentStatus" NOT NULL DEFAULT 'ACTIVE',
  "archivedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "VehicleDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VehicleDocument_archive_check" CHECK (("status" = 'ARCHIVED') = ("archivedAt" IS NOT NULL)),
  CONSTRAINT "VehicleDocument_date_check" CHECK (
    ("issuedAt" IS NULL OR "expiresAt" IS NULL OR "issuedAt" <= "expiresAt")
    AND ("effectiveFrom" IS NULL OR "expiresAt" IS NULL OR "effectiveFrom" <= "expiresAt")
  )
);

CREATE TABLE "VehicleDocumentReminder" (
  "id" UUID NOT NULL,
  "documentId" UUID NOT NULL,
  "daysBefore" SMALLINT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "scheduledFor" TIMESTAMPTZ(3),
  "scheduledForExpiry" DATE,
  "lastTriggeredForExpiry" DATE,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "VehicleDocumentReminder_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VehicleDocumentReminder_days_check" CHECK ("daysBefore" IN (1, 7, 15, 30)),
  CONSTRAINT "VehicleDocumentReminder_schedule_check" CHECK (
    ("scheduledFor" IS NULL AND "scheduledForExpiry" IS NULL)
    OR ("enabled" AND "scheduledFor" IS NOT NULL AND "scheduledForExpiry" IS NOT NULL)
  )
);

CREATE TABLE "VehicleDocumentReminderRun" (
  "id" UUID NOT NULL,
  "reminderId" UUID NOT NULL,
  "dueOn" DATE NOT NULL,
  "expiresOn" DATE NOT NULL,
  "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "VehicleDocumentReminderRun_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VehicleDocumentReminderRun_date_check" CHECK ("dueOn" <= "expiresOn")
);

CREATE UNIQUE INDEX "VehicleDocument_id_userId_vehicleId_key" ON "VehicleDocument"("id", "userId", "vehicleId");
CREATE INDEX "VehicleDocument_userId_idx" ON "VehicleDocument"("userId");
CREATE INDEX "VehicleDocument_vehicleId_status_expiresAt_idx" ON "VehicleDocument"("vehicleId", "status", "expiresAt");
CREATE INDEX "VehicleDocument_status_expiresAt_idx" ON "VehicleDocument"("status", "expiresAt");
CREATE UNIQUE INDEX "VehicleDocumentReminder_documentId_daysBefore_key" ON "VehicleDocumentReminder"("documentId", "daysBefore");
CREATE INDEX "VehicleDocumentReminder_enabled_scheduledFor_idx" ON "VehicleDocumentReminder"("enabled", "scheduledFor");
CREATE UNIQUE INDEX "VehicleDocumentReminderRun_reminderId_expiresOn_key" ON "VehicleDocumentReminderRun"("reminderId", "expiresOn");
CREATE INDEX "VehicleDocumentReminderRun_reminderId_recordedAt_idx" ON "VehicleDocumentReminderRun"("reminderId", "recordedAt" DESC);

ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE "VehicleDocument" ADD CONSTRAINT "VehicleDocument_vehicleId_fkey" FOREIGN KEY ("vehicleId", "userId") REFERENCES "Vehicle"("id", "userId") ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE "VehicleDocumentReminder" ADD CONSTRAINT "VehicleDocumentReminder_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "VehicleDocument"("id") ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE "VehicleDocumentReminderRun" ADD CONSTRAINT "VehicleDocumentReminderRun_reminderId_fkey" FOREIGN KEY ("reminderId") REFERENCES "VehicleDocumentReminder"("id") ON DELETE CASCADE ON UPDATE RESTRICT;

COMMIT;
