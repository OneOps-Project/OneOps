-- CreateTable
CREATE TABLE "work_requests"."request_approval_steps" (
    "id" UUID NOT NULL,
    "requestId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "quorum" VARCHAR(20) NOT NULL DEFAULT 'ANY',
    "slaHours" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "decidedAt" TIMESTAMP(3),
    "decidedBy" VARCHAR(200) NOT NULL DEFAULT '',
    "escalatedAt" TIMESTAMP(3),
    "note" VARCHAR(500) NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "request_approval_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_requests"."request_approvers" (
    "id" UUID NOT NULL,
    "stepId" UUID NOT NULL,
    "approver" VARCHAR(150) NOT NULL,
    "displayName" VARCHAR(200) NOT NULL,
    "decision" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "comment" VARCHAR(2000) NOT NULL DEFAULT '',
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_approvers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "request_approval_steps_requestId_status_idx" ON "work_requests"."request_approval_steps"("requestId", "status");

-- CreateIndex
CREATE INDEX "request_approval_steps_status_dueAt_idx" ON "work_requests"."request_approval_steps"("status", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "request_approval_steps_requestId_position_key" ON "work_requests"."request_approval_steps"("requestId", "position");

-- CreateIndex
CREATE INDEX "request_approvers_approver_decision_idx" ON "work_requests"."request_approvers"("approver", "decision");

-- CreateIndex
CREATE UNIQUE INDEX "request_approvers_stepId_approver_key" ON "work_requests"."request_approvers"("stepId", "approver");

-- AddForeignKey
ALTER TABLE "work_requests"."request_approvers" ADD CONSTRAINT "request_approvers_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "work_requests"."request_approval_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

