CREATE TYPE "VehicleType" AS ENUM ('CAR', 'MOTORCYCLE', 'TRUCK', 'VAN', 'OTHER');
CREATE TYPE "VehicleStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "Vehicle" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "displayName" VARCHAR(100) NOT NULL,
  "licensePlate" VARCHAR(20) NOT NULL,
  "normalizedLicensePlate" VARCHAR(20) NOT NULL,
  "vehicleType" "VehicleType" NOT NULL,
  "make" VARCHAR(100),
  "model" VARCHAR(100),
  "modelYear" SMALLINT,
  "currentOdometerKm" INTEGER,
  "notes" VARCHAR(1000),
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "status" "VehicleStatus" NOT NULL DEFAULT 'ACTIVE',
  "archivedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Vehicle_year_check" CHECK ("modelYear" IS NULL OR "modelYear" BETWEEN 1886 AND 2100),
  CONSTRAINT "Vehicle_odometer_check" CHECK ("currentOdometerKm" IS NULL OR "currentOdometerKm" BETWEEN 0 AND 10000000),
  CONSTRAINT "Vehicle_archive_state_check" CHECK (
    ("status" = 'ACTIVE' AND "archivedAt" IS NULL) OR
    ("status" = 'ARCHIVED' AND "archivedAt" IS NOT NULL AND "isPrimary" = false)
  )
);

CREATE UNIQUE INDEX "Vehicle_userId_normalizedLicensePlate_key" ON "Vehicle"("userId", "normalizedLicensePlate");
CREATE INDEX "Vehicle_userId_status_isPrimary_createdAt_idx" ON "Vehicle"("userId", "status", "isPrimary", "createdAt" DESC);
CREATE UNIQUE INDEX "Vehicle_one_active_primary_per_user" ON "Vehicle"("userId") WHERE "isPrimary" = true AND "status" = 'ACTIVE';
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
