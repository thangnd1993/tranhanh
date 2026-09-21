-- Additive Phase 19 fuel-price history. No prior data is rewritten.
CREATE TYPE "FuelPriceUnit" AS ENUM ('VND_PER_LITER', 'VND_PER_KILOGRAM');
CREATE TYPE "FuelPriceSemantics" AS ENUM ('MAXIMUM_RETAIL_PRICE');

CREATE TABLE "FuelProduct" (
  "id" UUID NOT NULL,
  "key" VARCHAR(100) NOT NULL,
  "officialName" VARCHAR(250) NOT NULL,
  "unit" "FuelPriceUnit" NOT NULL,
  "semantics" "FuelPriceSemantics" NOT NULL DEFAULT 'MAXIMUM_RETAIL_PRICE',
  "sourceId" UUID NOT NULL,
  "displayOrder" SMALLINT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "FuelProduct_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FuelProduct_displayOrder_check" CHECK ("displayOrder" >= 0)
);

CREATE TABLE "FuelPriceSnapshot" (
  "id" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "price" BIGINT NOT NULL,
  "effectiveFrom" TIMESTAMPTZ(3) NOT NULL,
  "effectiveTo" TIMESTAMPTZ(3),
  "publishedAt" TIMESTAMPTZ(3),
  "retrievedAt" TIMESTAMPTZ(3) NOT NULL,
  "publicationNumber" VARCHAR(100) NOT NULL,
  "fingerprint" CHAR(64) NOT NULL,
  "sourceId" UUID NOT NULL,
  "sourceReferenceId" UUID NOT NULL,
  "providerId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FuelPriceSnapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FuelPriceSnapshot_price_check" CHECK ("price" > 0),
  CONSTRAINT "FuelPriceSnapshot_effective_check" CHECK ("effectiveTo" IS NULL OR "effectiveTo" > "effectiveFrom")
);

CREATE UNIQUE INDEX "FuelProduct_key_key" ON "FuelProduct"("key");
CREATE INDEX "FuelProduct_isActive_displayOrder_idx" ON "FuelProduct"("isActive", "displayOrder");
CREATE INDEX "FuelProduct_sourceId_idx" ON "FuelProduct"("sourceId");
CREATE UNIQUE INDEX "FuelPriceSnapshot_fingerprint_key" ON "FuelPriceSnapshot"("fingerprint");
CREATE UNIQUE INDEX "FuelPriceSnapshot_productId_effectiveFrom_key" ON "FuelPriceSnapshot"("productId", "effectiveFrom");
CREATE INDEX "FuelPriceSnapshot_productId_effectiveFrom_idx" ON "FuelPriceSnapshot"("productId", "effectiveFrom" DESC);
CREATE INDEX "FuelPriceSnapshot_productId_publishedAt_idx" ON "FuelPriceSnapshot"("productId", "publishedAt" DESC);
CREATE INDEX "FuelPriceSnapshot_sourceId_providerId_idx" ON "FuelPriceSnapshot"("sourceId", "providerId");

ALTER TABLE "FuelProduct" ADD CONSTRAINT "FuelProduct_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "FuelPriceSnapshot" ADD CONSTRAINT "FuelPriceSnapshot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "FuelProduct"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "FuelPriceSnapshot" ADD CONSTRAINT "FuelPriceSnapshot_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "FuelPriceSnapshot" ADD CONSTRAINT "FuelPriceSnapshot_sourceReferenceId_fkey" FOREIGN KEY ("sourceReferenceId") REFERENCES "SourceReference"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "FuelPriceSnapshot" ADD CONSTRAINT "FuelPriceSnapshot_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "DataProvider"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
