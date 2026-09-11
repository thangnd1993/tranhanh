BEGIN;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('vi', 'en');

-- CreateEnum
CREATE TYPE "ProviderStatus" AS ENUM ('ACTIVE', 'DEGRADED', 'DISABLED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "DataSource" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(250) NOT NULL,
    "homepageUrl" VARCHAR(2048),
    "dataUrl" VARCHAR(2048),
    "termsUrl" VARCHAR(2048),
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSourceTranslation" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "description" TEXT,
    "licenseNotes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DataSourceTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataProvider" (
    "id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(250) NOT NULL,
    "sourceId" UUID NOT NULL,
    "providerType" VARCHAR(100) NOT NULL,
    "status" "ProviderStatus" NOT NULL DEFAULT 'DISABLED',
    "lastSuccessfulSyncAt" TIMESTAMPTZ(3),
    "lastFailedSyncAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "DataProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "jobType" VARCHAR(100) NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'RUNNING',
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMPTZ(3),
    "recordsRead" INTEGER,
    "recordsCreated" INTEGER,
    "recordsUpdated" INTEGER,
    "recordsSkipped" INTEGER,
    "errorCode" VARCHAR(100),
    "errorMessage" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceReference" (
    "id" UUID NOT NULL,
    "sourceId" UUID NOT NULL,
    "externalUrl" VARCHAR(2048),
    "publishedAt" TIMESTAMPTZ(3),
    "retrievedAt" TIMESTAMPTZ(3) NOT NULL,
    "effectiveFrom" TIMESTAMPTZ(3),
    "effectiveTo" TIMESTAMPTZ(3),
    "notes" VARCHAR(2000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SourceReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoPage" (
    "id" UUID NOT NULL,
    "key" VARCHAR(150) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SeoPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeoMetadata" (
    "id" UUID NOT NULL,
    "pageId" UUID NOT NULL,
    "locale" "Locale" NOT NULL,
    "canonicalPath" VARCHAR(500) NOT NULL,
    "titleOverride" VARCHAR(250),
    "descriptionOverride" VARCHAR(1000),
    "noindexOverride" BOOLEAN,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "SeoMetadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DataSource_key_key" ON "DataSource"("key");

-- CreateIndex
CREATE UNIQUE INDEX "DataSourceTranslation_sourceId_locale_key" ON "DataSourceTranslation"("sourceId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "DataProvider_key_key" ON "DataProvider"("key");

-- CreateIndex
CREATE INDEX "DataProvider_sourceId_idx" ON "DataProvider"("sourceId");

-- CreateIndex
CREATE INDEX "DataProvider_status_idx" ON "DataProvider"("status");

-- CreateIndex
CREATE INDEX "SyncRun_providerId_startedAt_id_idx" ON "SyncRun"("providerId", "startedAt" DESC, "id");

-- CreateIndex
CREATE INDEX "SyncRun_status_startedAt_idx" ON "SyncRun"("status", "startedAt");

-- CreateIndex
CREATE INDEX "SourceReference_sourceId_retrievedAt_idx" ON "SourceReference"("sourceId", "retrievedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "SeoPage_key_key" ON "SeoPage"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SeoMetadata_pageId_locale_key" ON "SeoMetadata"("pageId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "SeoMetadata_canonicalPath_key" ON "SeoMetadata"("canonicalPath");

-- AddForeignKey
ALTER TABLE "DataSourceTranslation" ADD CONSTRAINT "DataSourceTranslation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "DataProvider" ADD CONSTRAINT "DataProvider_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "DataProvider"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SourceReference" ADD CONSTRAINT "SourceReference_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "SeoMetadata" ADD CONSTRAINT "SeoMetadata_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "SeoPage"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Reviewed invariants not expressible in Prisma's schema language. Preserve in later migrations.
ALTER TABLE "DataSource" ADD CONSTRAINT "DataSource_key_format"
  CHECK ("key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "DataProvider" ADD CONSTRAINT "DataProvider_key_format"
  CHECK ("key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "SeoPage" ADD CONSTRAINT "SeoPage_key_format"
  CHECK ("key" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');

ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_nonnegative_counts"
  CHECK (("recordsRead" IS NULL OR "recordsRead" >= 0)
    AND ("recordsCreated" IS NULL OR "recordsCreated" >= 0)
    AND ("recordsUpdated" IS NULL OR "recordsUpdated" >= 0)
    AND ("recordsSkipped" IS NULL OR "recordsSkipped" >= 0));
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_completion"
  CHECK (("status" = 'RUNNING' AND "finishedAt" IS NULL)
    OR ("status" IN ('SUCCEEDED', 'FAILED') AND "finishedAt" IS NOT NULL AND "finishedAt" >= "startedAt"));

ALTER TABLE "SourceReference" ADD CONSTRAINT "SourceReference_effective_interval"
  CHECK ("effectiveTo" IS NULL OR ("effectiveFrom" IS NOT NULL AND "effectiveTo" > "effectiveFrom"));
ALTER TABLE "SeoMetadata" ADD CONSTRAINT "SeoMetadata_localized_path"
  CHECK ("canonicalPath" ~ ('^/' || "locale"::text || '(/[a-z0-9]+(-[a-z0-9]+)*)*$'));

COMMIT;
