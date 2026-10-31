-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "work_task_links";

-- CreateTable
CREATE TABLE "work_task_links"."task_links" (
    "id" UUID NOT NULL,
    "fromTaskId" UUID NOT NULL,
    "toTaskId" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "note" VARCHAR(500) NOT NULL DEFAULT '',
    "createdById" UUID,
    "createdBy" VARCHAR(200) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_links_fromTaskId_type_idx" ON "work_task_links"."task_links"("fromTaskId", "type");

-- CreateIndex
CREATE INDEX "task_links_toTaskId_type_idx" ON "work_task_links"."task_links"("toTaskId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "task_links_fromTaskId_toTaskId_key" ON "work_task_links"."task_links"("fromTaskId", "toTaskId");
