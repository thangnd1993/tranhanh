CREATE TYPE "FuelLogUnit" AS ENUM ('LITER');
CREATE TYPE "FuelLogEntryStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "FuelLogEntry" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "vehicleId" UUID NOT NULL,
  "refueledAt" TIMESTAMPTZ(3) NOT NULL,
  "odometerKm" INTEGER NOT NULL,
  "quantity" DECIMAL(10,3) NOT NULL,
  "unit" "FuelLogUnit" NOT NULL DEFAULT 'LITER',
  "totalCostVnd" BIGINT NOT NULL,
  "fuelProductKey" VARCHAR(100),
  "customFuelLabel" VARCHAR(100),
  "isFullTank" BOOLEAN NOT NULL DEFAULT false,
  "station" VARCHAR(150),
  "notes" VARCHAR(1000),
  "status" "FuelLogEntryStatus" NOT NULL DEFAULT 'ACTIVE',
  "archivedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "FuelLogEntry_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FuelLogEntry_quantity_check" CHECK ("quantity" > 0),
  CONSTRAINT "FuelLogEntry_total_cost_check" CHECK ("totalCostVnd" > 0),
  CONSTRAINT "FuelLogEntry_odometer_check" CHECK ("odometerKm" >= 0 AND "odometerKm" <= 10000000),
  CONSTRAINT "FuelLogEntry_archive_check" CHECK (("status" = 'ARCHIVED') = ("archivedAt" IS NOT NULL)),
  CONSTRAINT "FuelLogEntry_product_check" CHECK ("fuelProductKey" IS NULL OR "fuelProductKey" IN ('e5-ron-92','e10-ron-95-iii','diesel-0-05s','OTHER')),
  CONSTRAINT "FuelLogEntry_custom_label_check" CHECK ("fuelProductKey" = 'OTHER' OR "customFuelLabel" IS NULL)
);
CREATE UNIQUE INDEX "FuelLogEntry_id_userId_vehicleId_key" ON "FuelLogEntry"("id", "userId", "vehicleId");
CREATE INDEX "FuelLogEntry_userId_vehicleId_idx" ON "FuelLogEntry"("userId", "vehicleId");
CREATE INDEX "FuelLogEntry_vehicleId_status_refueledAt_id_idx" ON "FuelLogEntry"("vehicleId", "status", "refueledAt" DESC, "id");
CREATE INDEX "FuelLogEntry_vehicleId_odometerKm_idx" ON "FuelLogEntry"("vehicleId", "odometerKm");
ALTER TABLE "FuelLogEntry" ADD CONSTRAINT "FuelLogEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE "FuelLogEntry" ADD CONSTRAINT "FuelLogEntry_vehicleId_userId_fkey" FOREIGN KEY ("vehicleId", "userId") REFERENCES "Vehicle"("id", "userId") ON DELETE CASCADE ON UPDATE RESTRICT;
