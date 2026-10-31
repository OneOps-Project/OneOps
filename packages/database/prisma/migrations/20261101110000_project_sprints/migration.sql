-- CreateTable
CREATE TABLE "work_projects"."project_sprints" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "goal" VARCHAR(2000) NOT NULL DEFAULT '',
    "status" VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "committed" INTEGER NOT NULL DEFAULT 0,
    "completed" INTEGER NOT NULL DEFAULT 0,
    "carried" INTEGER NOT NULL DEFAULT 0,
    "activatedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "note" VARCHAR(2000) NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_sprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_projects"."project_backlog_items" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "sprintId" UUID,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "carriedFrom" UUID,
    "carriedTimes" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_backlog_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_sprints_projectId_status_idx" ON "work_projects"."project_sprints"("projectId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "project_sprints_projectId_name_key" ON "work_projects"."project_sprints"("projectId", "name");

-- CreateIndex
CREATE INDEX "project_backlog_items_projectId_sprintId_rank_idx" ON "work_projects"."project_backlog_items"("projectId", "sprintId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "project_backlog_items_projectId_taskId_key" ON "work_projects"."project_backlog_items"("projectId", "taskId");

-- AddForeignKey
ALTER TABLE "work_projects"."project_backlog_items" ADD CONSTRAINT "project_backlog_items_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "work_projects"."project_sprints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

