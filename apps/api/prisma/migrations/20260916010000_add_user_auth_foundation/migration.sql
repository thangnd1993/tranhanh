BEGIN;
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'DISABLED', 'PENDING_DELETION');
CREATE TABLE "User" (
  "id" UUID NOT NULL,
  "email" VARCHAR(320) NOT NULL,
  "passwordHash" VARCHAR(255) NOT NULL,
  "displayName" VARCHAR(100),
  "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
  "lastLoginAt" TIMESTAMPTZ(3),
  "passwordChangedAt" TIMESTAMPTZ(3),
  "deletionRequestedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "User_email_normalized_check" CHECK ("email" = lower(btrim("email")) AND length("email") BETWEEN 3 AND 320),
  CONSTRAINT "User_display_name_check" CHECK ("displayName" IS NULL OR ("displayName" = btrim("displayName") AND length("displayName") BETWEEN 1 AND 100)),
  CONSTRAINT "User_deletion_status_check" CHECK (("status" = 'PENDING_DELETION') = ("deletionRequestedAt" IS NOT NULL))
);
CREATE TABLE "AuthSession" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "familyId" UUID NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "csrfTokenHash" CHAR(64) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "lastUsedAt" TIMESTAMPTZ(3),
  "revokedAt" TIMESTAMPTZ(3),
  "replacedBySessionId" UUID,
  CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AuthSession_token_hash_check" CHECK ("tokenHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "AuthSession_csrf_hash_check" CHECK ("csrfTokenHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "AuthSession_expiry_check" CHECK ("expiresAt" > "createdAt"),
  CONSTRAINT "AuthSession_last_used_check" CHECK ("lastUsedAt" IS NULL OR "lastUsedAt" >= "createdAt"),
  CONSTRAINT "AuthSession_replacement_check" CHECK ("replacedBySessionId" IS NULL OR "revokedAt" IS NOT NULL)
);
CREATE TABLE "PasswordResetToken" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "tokenHash" CHAR(64) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "usedAt" TIMESTAMPTZ(3),
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PasswordResetToken_hash_check" CHECK ("tokenHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "PasswordResetToken_expiry_check" CHECK ("expiresAt" > "createdAt"),
  CONSTRAINT "PasswordResetToken_used_check" CHECK ("usedAt" IS NULL OR "usedAt" >= "createdAt")
);
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_status_createdAt_idx" ON "User"("status", "createdAt");
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");
CREATE UNIQUE INDEX "AuthSession_replacedBySessionId_key" ON "AuthSession"("replacedBySessionId");
CREATE INDEX "AuthSession_userId_revokedAt_expiresAt_idx" ON "AuthSession"("userId", "revokedAt", "expiresAt");
CREATE INDEX "AuthSession_familyId_revokedAt_idx" ON "AuthSession"("familyId", "revokedAt");
CREATE INDEX "AuthSession_expiresAt_idx" ON "AuthSession"("expiresAt");
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_usedAt_expiresAt_idx" ON "PasswordResetToken"("userId", "usedAt", "expiresAt");
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_replacedBySessionId_fkey" FOREIGN KEY ("replacedBySessionId") REFERENCES "AuthSession"("id") ON DELETE SET NULL ON UPDATE RESTRICT;
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;
COMMIT;
