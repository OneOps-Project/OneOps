-- The run log outlives its rule: deleting a rule keeps the history of what it
-- already did to a record, so the reference becomes a plain column.
-- DropForeignKey
ALTER TABLE "tenant_automation"."automation_runs" DROP CONSTRAINT "automation_runs_ruleId_fkey";
