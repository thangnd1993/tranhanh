BEGIN;

-- CreateEnum
CREATE TYPE "PhonePrefixStatus" AS ENUM ('ACTIVE', 'LEGACY', 'INACTIVE');

-- AlterTable
ALTER TABLE "SourceReference" ADD COLUMN     "title" VARCHAR(500);

-- CreateTable
CREATE TABLE "TelecomOperator" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(250) NOT NULL,
    "searchName" VARCHAR(500) NOT NULL,
    "website" VARCHAR(2048),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sourceReferenceId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "TelecomOperator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhonePrefix" (
    "id" UUID NOT NULL,
    "prefix" VARCHAR(4) NOT NULL,
    "operatorId" UUID NOT NULL,
    "status" "PhonePrefixStatus" NOT NULL,
    "effectiveFrom" TIMESTAMPTZ(3),
    "effectiveTo" TIMESTAMPTZ(3),
    "sourceReferenceId" UUID NOT NULL,
    "importedAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PhonePrefix_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhonePrefixMigration" (
    "id" UUID NOT NULL,
    "oldPrefixId" UUID NOT NULL,
    "newPrefixId" UUID NOT NULL,
    "effectiveAt" TIMESTAMPTZ(3),
    "sourceReferenceId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PhonePrefixMigration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelecomOperator_key_key" ON "TelecomOperator"("key");

-- CreateIndex
CREATE INDEX "TelecomOperator_sourceReferenceId_idx" ON "TelecomOperator"("sourceReferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "PhonePrefix_prefix_key" ON "PhonePrefix"("prefix");

-- CreateIndex
CREATE INDEX "PhonePrefix_operatorId_status_prefix_idx" ON "PhonePrefix"("operatorId", "status", "prefix");

-- CreateIndex
CREATE INDEX "PhonePrefix_status_prefix_idx" ON "PhonePrefix"("status", "prefix");

-- CreateIndex
CREATE INDEX "PhonePrefix_sourceReferenceId_idx" ON "PhonePrefix"("sourceReferenceId");

-- CreateIndex
CREATE UNIQUE INDEX "PhonePrefixMigration_oldPrefixId_key" ON "PhonePrefixMigration"("oldPrefixId");

-- CreateIndex
CREATE INDEX "PhonePrefixMigration_newPrefixId_idx" ON "PhonePrefixMigration"("newPrefixId");

-- CreateIndex
CREATE INDEX "PhonePrefixMigration_sourceReferenceId_idx" ON "PhonePrefixMigration"("sourceReferenceId");

-- AddForeignKey
ALTER TABLE "TelecomOperator" ADD CONSTRAINT "TelecomOperator_sourceReferenceId_fkey" FOREIGN KEY ("sourceReferenceId") REFERENCES "SourceReference"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PhonePrefix" ADD CONSTRAINT "PhonePrefix_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "TelecomOperator"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PhonePrefix" ADD CONSTRAINT "PhonePrefix_sourceReferenceId_fkey" FOREIGN KEY ("sourceReferenceId") REFERENCES "SourceReference"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PhonePrefixMigration" ADD CONSTRAINT "PhonePrefixMigration_oldPrefixId_fkey" FOREIGN KEY ("oldPrefixId") REFERENCES "PhonePrefix"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PhonePrefixMigration" ADD CONSTRAINT "PhonePrefixMigration_newPrefixId_fkey" FOREIGN KEY ("newPrefixId") REFERENCES "PhonePrefix"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "PhonePrefixMigration" ADD CONSTRAINT "PhonePrefixMigration_sourceReferenceId_fkey" FOREIGN KEY ("sourceReferenceId") REFERENCES "SourceReference"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Domain CHECKs are maintained in SQL; all relations preserve evidence/history with RESTRICT.
ALTER TABLE "TelecomOperator" ADD CONSTRAINT "TelecomOperator_key_format"
  CHECK ("key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "PhonePrefix" ADD CONSTRAINT "PhonePrefix_format_status"
  CHECK (("status" = 'LEGACY' AND "prefix" ~ '^01[2689][0-9]$')
    OR ("status" IN ('ACTIVE', 'INACTIVE') AND "prefix" ~ '^0[35789][0-9]$'));
ALTER TABLE "PhonePrefix" ADD CONSTRAINT "PhonePrefix_effective_interval"
  CHECK ("effectiveTo" IS NULL OR ("effectiveFrom" IS NOT NULL AND "effectiveTo" > "effectiveFrom"));
ALTER TABLE "PhonePrefixMigration" ADD CONSTRAINT "PhonePrefixMigration_distinct_endpoints"
  CHECK ("oldPrefixId" <> "newPrefixId");

COMMIT;
