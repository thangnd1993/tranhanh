BEGIN;
CREATE TYPE "PostalCodeTargetType" AS ENUM ('PROVINCE_CITY', 'WARD', 'COMMUNE', 'SPECIAL_ZONE');
CREATE TYPE "PostalCodeStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TABLE "PostalCodeTarget" (
  "id" UUID NOT NULL, "key" VARCHAR(100) NOT NULL, "name" VARCHAR(250) NOT NULL, "aliases" TEXT[] NOT NULL,
  "searchName" VARCHAR(1000) NOT NULL, "type" "PostalCodeTargetType" NOT NULL, "parentId" UUID,
  "isActive" BOOLEAN NOT NULL DEFAULT true, "sourceReferenceId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "PostalCodeTarget_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PostalCodeTarget_key_check" CHECK ("key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT "PostalCodeTarget_parent_depth_check" CHECK (("type" = 'PROVINCE_CITY' AND "parentId" IS NULL) OR ("type" <> 'PROVINCE_CITY' AND "parentId" IS NOT NULL))
);
CREATE TABLE "PostalCodeAssignment" (
  "id" UUID NOT NULL, "key" VARCHAR(100) NOT NULL, "code" VARCHAR(5) NOT NULL, "targetId" UUID NOT NULL,
  "status" "PostalCodeStatus" NOT NULL, "effectiveFrom" DATE, "effectiveTo" DATE,
  "sourceReferenceId" UUID NOT NULL, "importedAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "PostalCodeAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PostalCodeAssignment_key_check" CHECK ("key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT "PostalCodeAssignment_code_check" CHECK ("code" ~ '^[0-9]{5}$'),
  CONSTRAINT "PostalCodeAssignment_effective_interval_check" CHECK ("effectiveFrom" IS NULL OR "effectiveTo" IS NULL OR "effectiveFrom" < "effectiveTo")
);
CREATE UNIQUE INDEX "PostalCodeTarget_key_key" ON "PostalCodeTarget"("key");
CREATE INDEX "PostalCodeTarget_parentId_type_isActive_name_idx" ON "PostalCodeTarget"("parentId", "type", "isActive", "name");
CREATE INDEX "PostalCodeTarget_searchName_idx" ON "PostalCodeTarget"("searchName");
CREATE INDEX "PostalCodeTarget_sourceReferenceId_idx" ON "PostalCodeTarget"("sourceReferenceId");
CREATE UNIQUE INDEX "PostalCodeAssignment_key_key" ON "PostalCodeAssignment"("key");
CREATE UNIQUE INDEX "PostalCodeAssignment_code_targetId_key" ON "PostalCodeAssignment"("code", "targetId");
CREATE INDEX "PostalCodeAssignment_code_status_idx" ON "PostalCodeAssignment"("code", "status");
CREATE INDEX "PostalCodeAssignment_targetId_status_code_idx" ON "PostalCodeAssignment"("targetId", "status", "code");
CREATE INDEX "PostalCodeAssignment_sourceReferenceId_idx" ON "PostalCodeAssignment"("sourceReferenceId");
ALTER TABLE "PostalCodeTarget" ADD CONSTRAINT "PostalCodeTarget_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PostalCodeTarget"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "PostalCodeTarget" ADD CONSTRAINT "PostalCodeTarget_sourceReferenceId_fkey" FOREIGN KEY ("sourceReferenceId") REFERENCES "SourceReference"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "PostalCodeAssignment" ADD CONSTRAINT "PostalCodeAssignment_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "PostalCodeTarget"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "PostalCodeAssignment" ADD CONSTRAINT "PostalCodeAssignment_sourceReferenceId_fkey" FOREIGN KEY ("sourceReferenceId") REFERENCES "SourceReference"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
COMMIT;
