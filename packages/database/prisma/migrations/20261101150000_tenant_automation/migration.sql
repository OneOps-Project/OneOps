-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tenant_automation";

-- CreateTable
CREATE TABLE "tenant_automation"."automation_rules" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" VARCHAR(500) NOT NULL DEFAULT '',
    "entity" VARCHAR(20) NOT NULL DEFAULT 'task',
    "trigger" VARCHAR(20) NOT NULL DEFAULT 'updated',
    "condition" TEXT NOT NULL DEFAULT '[]',
    "actions" TEXT NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "stopOnMatch" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 100,
    "lockSeconds" INTEGER NOT NULL DEFAULT 3,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "note" VARCHAR(2000) NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_automation"."automation_runs" (
    "id" UUID NOT NULL,
    "ruleId" UUID NOT NULL,
    "ruleName" VARCHAR(160) NOT NULL,
    "entity" VARCHAR(20) NOT NULL,
    "entityId" UUID NOT NULL,
    "code" VARCHAR(40) NOT NULL DEFAULT '',
    "trigger" VARCHAR(20) NOT NULL,
    "outcome" VARCHAR(20) NOT NULL,
    "reason" VARCHAR(500) NOT NULL DEFAULT '',
    "actions" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automation_rules_entity_enabled_position_idx" ON "tenant_automation"."automation_rules"("entity", "enabled", "position");

-- CreateIndex
CREATE UNIQUE INDEX "automation_rules_name_key" ON "tenant_automation"."automation_rules"("name");

-- CreateIndex
CREATE INDEX "automation_runs_ruleId_createdAt_idx" ON "tenant_automation"."automation_runs"("ruleId", "createdAt");

-- CreateIndex
CREATE INDEX "automation_runs_entityId_createdAt_idx" ON "tenant_automation"."automation_runs"("entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "tenant_automation"."automation_runs" ADD CONSTRAINT "automation_runs_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "tenant_automation"."automation_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
