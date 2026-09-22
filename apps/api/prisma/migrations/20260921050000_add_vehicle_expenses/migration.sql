BEGIN;

CREATE TYPE "VehicleExpenseCategory" AS ENUM ('INSURANCE', 'REGISTRATION', 'TOLL', 'PARKING', 'OTHER');
CREATE TYPE "VehicleExpenseStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

CREATE TABLE "VehicleExpense" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "vehicleId" UUID NOT NULL,
  "category" "VehicleExpenseCategory" NOT NULL,
  "title" VARCHAR(150) NOT NULL,
  "expenseDate" DATE NOT NULL,
  "totalCostVnd" BIGINT NOT NULL,
  "notes" VARCHAR(1000),
  "status" "VehicleExpenseStatus" NOT NULL DEFAULT 'ACTIVE',
  "archivedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "VehicleExpense_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VehicleExpense_title_check" CHECK (char_length(btrim("title")) BETWEEN 1 AND 150),
  CONSTRAINT "VehicleExpense_total_cost_check" CHECK ("totalCostVnd" >= 0 AND "totalCostVnd" <= 9999999999999999),
  CONSTRAINT "VehicleExpense_archive_check" CHECK (("status" = 'ARCHIVED') = ("archivedAt" IS NOT NULL))
);

CREATE UNIQUE INDEX "VehicleExpense_id_userId_vehicleId_key" ON "VehicleExpense"("id", "userId", "vehicleId");
CREATE INDEX "VehicleExpense_userId_vehicleId_idx" ON "VehicleExpense"("userId", "vehicleId");
CREATE INDEX "VehicleExpense_vehicleId_status_expenseDate_id_idx"
  ON "VehicleExpense"("vehicleId", "status", "expenseDate" DESC, "id");
CREATE INDEX "VehicleExpense_vehicleId_category_status_expenseDate_id_idx"
  ON "VehicleExpense"("vehicleId", "category", "status", "expenseDate" DESC, "id");

ALTER TABLE "VehicleExpense" ADD CONSTRAINT "VehicleExpense_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE RESTRICT;
ALTER TABLE "VehicleExpense" ADD CONSTRAINT "VehicleExpense_vehicleId_userId_fkey"
  FOREIGN KEY ("vehicleId", "userId") REFERENCES "Vehicle"("id", "userId") ON DELETE CASCADE ON UPDATE RESTRICT;

COMMIT;
