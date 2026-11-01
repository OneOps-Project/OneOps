-- Extend the existing audit source without deleting historical entries.
ALTER TABLE "tenant_audit"."entries"
 ADD COLUMN "module" VARCHAR(160) NOT NULL DEFAULT 'tenant-system/access-control/accounts',
 ADD COLUMN "result" VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
 ADD COLUMN "entityName" VARCHAR(200) NOT NULL DEFAULT '';
UPDATE "tenant_audit"."entries" SET "entityName"=LEFT(COALESCE("after"->>'name',"after"->>'username',"before"->>'name',"before"->>'username',''),200);
ALTER TABLE "tenant_audit"."entries" ADD CONSTRAINT "entries_result_check" CHECK ("result" IN ('SUCCESS','FAILURE','DENIED'));
CREATE INDEX "entries_module_createdAt_idx" ON "tenant_audit"."entries"("module","createdAt");
CREATE INDEX "entries_action_createdAt_idx" ON "tenant_audit"."entries"("action","createdAt");
CREATE INDEX "entries_result_createdAt_idx" ON "tenant_audit"."entries"("result","createdAt");
CREATE INDEX "entries_createdAt_id_idx" ON "tenant_audit"."entries"("createdAt","id");
