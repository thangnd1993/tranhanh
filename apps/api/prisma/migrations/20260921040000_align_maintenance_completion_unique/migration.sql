BEGIN;
DROP INDEX IF EXISTS "MaintenancePlan_completionHistoryId_key";
CREATE UNIQUE INDEX "MaintenancePlan_completionHistoryId_userId_vehicleId_key"
  ON "MaintenancePlan"("completionHistoryId", "userId", "vehicleId");
COMMIT;
