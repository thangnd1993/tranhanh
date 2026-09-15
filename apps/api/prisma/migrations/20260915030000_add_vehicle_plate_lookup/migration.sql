CREATE TYPE "VehiclePlateTargetType" AS ENUM ('LOCALITY', 'CENTRAL_AUTHORITY');
CREATE TYPE "VehiclePlateAllocationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TABLE "VehiclePlateTarget" (
  "id" UUID NOT NULL,
  "key" VARCHAR(100) NOT NULL,
  "name" VARCHAR(250) NOT NULL,
  "aliases" TEXT[] NOT NULL,
  "searchName" VARCHAR(1000) NOT NULL,
  "type" "VehiclePlateTargetType" NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sourceReferenceId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "VehiclePlateTarget_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VehiclePlateTarget_key_check" CHECK ("key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE "VehiclePlateAllocation" (
  "id" UUID NOT NULL,
  "key" VARCHAR(100) NOT NULL,
  "numericPrefix" VARCHAR(2) NOT NULL,
  "seriesPrefix" VARCHAR(2),
  "targetId" UUID NOT NULL,
  "status" "VehiclePlateAllocationStatus" NOT NULL,
  "effectiveFrom" DATE,
  "effectiveTo" DATE,
  "sourceReferenceId" UUID NOT NULL,
  "importedAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "VehiclePlateAllocation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VehiclePlateAllocation_key_check" CHECK ("key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT "VehiclePlateAllocation_prefix_check" CHECK ("numericPrefix" ~ '^[1-9][0-9]$'),
  CONSTRAINT "VehiclePlateAllocation_series_check" CHECK ("seriesPrefix" IS NULL OR "seriesPrefix" ~ '^([ABCDEFGHKLMNPSTUVXYZ]([ABCDEFGHKLMNPSTUVXYZ0-9])?|RM)$'),
  CONSTRAINT "VehiclePlateAllocation_dates_check" CHECK ("effectiveFrom" IS NULL OR "effectiveTo" IS NULL OR "effectiveFrom" < "effectiveTo")
);

CREATE TABLE "VehiclePlateAllocationHistory" (
  "id" UUID NOT NULL,
  "allocationId" UUID NOT NULL,
  "previousTargetId" UUID NOT NULL,
  "effectiveFrom" DATE,
  "effectiveTo" DATE NOT NULL,
  "sourceReferenceId" UUID NOT NULL,
  "transitionReferenceId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "VehiclePlateAllocationHistory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VehiclePlateAllocationHistory_dates_check" CHECK ("effectiveFrom" IS NULL OR "effectiveFrom" < "effectiveTo")
);

CREATE UNIQUE INDEX "VehiclePlateTarget_key_key" ON "VehiclePlateTarget"("key");
CREATE INDEX "VehiclePlateTarget_type_isActive_name_idx" ON "VehiclePlateTarget"("type", "isActive", "name");
CREATE INDEX "VehiclePlateTarget_sourceReferenceId_idx" ON "VehiclePlateTarget"("sourceReferenceId");
CREATE UNIQUE INDEX "VehiclePlateAllocation_key_key" ON "VehiclePlateAllocation"("key");
CREATE UNIQUE INDEX "VehiclePlateAllocation_identity_key" ON "VehiclePlateAllocation"("numericPrefix", COALESCE("seriesPrefix", ''));
CREATE INDEX "VehiclePlateAllocation_numericPrefix_status_seriesPrefix_idx" ON "VehiclePlateAllocation"("numericPrefix", "status", "seriesPrefix");
CREATE INDEX "VehiclePlateAllocation_targetId_status_numericPrefix_idx" ON "VehiclePlateAllocation"("targetId", "status", "numericPrefix");
CREATE INDEX "VehiclePlateAllocation_sourceReferenceId_idx" ON "VehiclePlateAllocation"("sourceReferenceId");
CREATE UNIQUE INDEX "VehiclePlateAllocationHistory_allocationId_previousTargetId_effectiveTo_key" ON "VehiclePlateAllocationHistory"("allocationId", "previousTargetId", "effectiveTo");
CREATE INDEX "VehiclePlateAllocationHistory_previousTargetId_effectiveTo_idx" ON "VehiclePlateAllocationHistory"("previousTargetId", "effectiveTo");
CREATE INDEX "VehiclePlateAllocationHistory_sourceReferenceId_idx" ON "VehiclePlateAllocationHistory"("sourceReferenceId");
CREATE INDEX "VehiclePlateAllocationHistory_transitionReferenceId_idx" ON "VehiclePlateAllocationHistory"("transitionReferenceId");

ALTER TABLE "VehiclePlateTarget" ADD CONSTRAINT "VehiclePlateTarget_sourceReferenceId_fkey" FOREIGN KEY ("sourceReferenceId") REFERENCES "SourceReference"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "VehiclePlateAllocation" ADD CONSTRAINT "VehiclePlateAllocation_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "VehiclePlateTarget"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "VehiclePlateAllocation" ADD CONSTRAINT "VehiclePlateAllocation_sourceReferenceId_fkey" FOREIGN KEY ("sourceReferenceId") REFERENCES "SourceReference"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "VehiclePlateAllocationHistory" ADD CONSTRAINT "VehiclePlateAllocationHistory_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "VehiclePlateAllocation"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "VehiclePlateAllocationHistory" ADD CONSTRAINT "VehiclePlateAllocationHistory_previousTargetId_fkey" FOREIGN KEY ("previousTargetId") REFERENCES "VehiclePlateTarget"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "VehiclePlateAllocationHistory" ADD CONSTRAINT "VehiclePlateAllocationHistory_sourceReferenceId_fkey" FOREIGN KEY ("sourceReferenceId") REFERENCES "SourceReference"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "VehiclePlateAllocationHistory" ADD CONSTRAINT "VehiclePlateAllocationHistory_transitionReferenceId_fkey" FOREIGN KEY ("transitionReferenceId") REFERENCES "SourceReference"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
