BEGIN;

-- CreateEnum
CREATE TYPE "AreaCodeStatus" AS ENUM ('ACTIVE', 'LEGACY', 'INACTIVE');

-- CreateTable
CREATE TABLE "TelecomLocalityGroup" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(250) NOT NULL,
    "aliases" TEXT[] NOT NULL,
    "searchName" VARCHAR(1000) NOT NULL,
    "effectiveFrom" DATE,
    "sourceReferenceId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TelecomLocalityGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelecomLocality" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(250) NOT NULL,
    "aliases" TEXT[] NOT NULL,
    "searchName" VARCHAR(1000) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "groupId" UUID NOT NULL,
    "sourceReferenceId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TelecomLocality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaCode" (
    "id" UUID NOT NULL,
    "code" VARCHAR(4) NOT NULL,
    "localityId" UUID NOT NULL,
    "status" "AreaCodeStatus" NOT NULL,
    "effectiveFrom" DATE,
    "effectiveTo" DATE,
    "sourceReferenceId" UUID NOT NULL,
    "importedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AreaCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AreaCodeMigration" (
    "id" UUID NOT NULL,
    "oldCodeId" UUID NOT NULL,
    "newCodeId" UUID NOT NULL,
    "effectiveDate" DATE,
    "sourceReferenceId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "AreaCodeMigration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelecomLocalityGroup_key_key" ON "TelecomLocalityGroup"("key");

-- CreateIndex
CREATE INDEX "TelecomLocalityGroup_sourceReferenceId_idx" ON "TelecomLocalityGroup"("sourceReferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "TelecomLocality_key_key" ON "TelecomLocality"("key");

-- CreateIndex
CREATE INDEX "TelecomLocality_groupId_idx" ON "TelecomLocality"("groupId");

-- CreateIndex
CREATE INDEX "TelecomLocality_sourceReferenceId_idx" ON "TelecomLocality"("sourceReferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "AreaCode_code_key" ON "AreaCode"("code");

-- CreateIndex
CREATE INDEX "AreaCode_localityId_status_code_idx" ON "AreaCode"("localityId", "status", "code");

-- CreateIndex
CREATE INDEX "AreaCode_status_code_idx" ON "AreaCode"("status", "code");

-- CreateIndex
CREATE INDEX "AreaCode_sourceReferenceId_idx" ON "AreaCode"("sourceReferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "AreaCodeMigration_oldCodeId_key" ON "AreaCodeMigration"("oldCodeId");

-- CreateIndex
CREATE INDEX "AreaCodeMigration_newCodeId_idx" ON "AreaCodeMigration"("newCodeId");

-- CreateIndex
CREATE INDEX "AreaCodeMigration_sourceReferenceId_idx" ON "AreaCodeMigration"("sourceReferenceId");

-- AddForeignKey
ALTER TABLE "TelecomLocalityGroup" ADD CONSTRAINT "TelecomLocalityGroup_sourceReferenceId_fkey" FOREIGN KEY ("sourceReferenceId") REFERENCES "SourceReference"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "TelecomLocality" ADD CONSTRAINT "TelecomLocality_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "TelecomLocalityGroup"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "TelecomLocality" ADD CONSTRAINT "TelecomLocality_sourceReferenceId_fkey" FOREIGN KEY ("sourceReferenceId") REFERENCES "SourceReference"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AreaCode" ADD CONSTRAINT "AreaCode_localityId_fkey" FOREIGN KEY ("localityId") REFERENCES "TelecomLocality"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AreaCode" ADD CONSTRAINT "AreaCode_sourceReferenceId_fkey" FOREIGN KEY ("sourceReferenceId") REFERENCES "SourceReference"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AreaCodeMigration" ADD CONSTRAINT "AreaCodeMigration_oldCodeId_fkey" FOREIGN KEY ("oldCodeId") REFERENCES "AreaCode"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AreaCodeMigration" ADD CONSTRAINT "AreaCodeMigration_newCodeId_fkey" FOREIGN KEY ("newCodeId") REFERENCES "AreaCode"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AreaCodeMigration" ADD CONSTRAINT "AreaCodeMigration_sourceReferenceId_fkey" FOREIGN KEY ("sourceReferenceId") REFERENCES "SourceReference"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
-- Reviewed SQL-only invariants. Date endpoints are calendar dates; unknown endpoints remain nullable.
ALTER TABLE "TelecomLocalityGroup" ADD CONSTRAINT "TelecomLocalityGroup_key_format"
  CHECK ("key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "TelecomLocality" ADD CONSTRAINT "TelecomLocality_key_format"
  CHECK ("key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "AreaCode" ADD CONSTRAINT "AreaCode_format_status"
  CHECK ("code" ~ '^0[1-9][0-9]{0,2}$' AND ("status" <> 'ACTIVE' OR "code" ~ '^02[0-9]{1,2}$'));
ALTER TABLE "AreaCode" ADD CONSTRAINT "AreaCode_effective_interval"
  CHECK ("effectiveFrom" IS NULL OR "effectiveTo" IS NULL OR "effectiveFrom" < "effectiveTo");
ALTER TABLE "AreaCodeMigration" ADD CONSTRAINT "AreaCodeMigration_distinct_codes"
  CHECK ("oldCodeId" <> "newCodeId");

COMMIT;
